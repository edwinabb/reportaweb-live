# Gestión de Formatos en reporta-admin (cross-tenant, con PIN) — Plan

> **Para agentes que ejecuten esto:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Repo objetivo principal: `C:\Proyectos\reporta-admin` (repo git local, **sin remoto configurado** — no hay flujo de PR, se commitea directo a `master` local, el usuario decide cuándo lo publica). Task 1 toca `C:\Proyectos\reportaweb3` (migración RLS, sí tiene remoto/PR).

**Goal:** El usuario (único usuario real de `reporta-admin`, rol `reporta_admin`) puede gestionar Formatos (plantillas de inspección/checklist: secciones, preguntas, opciones) de **cualquier tenant** desde `reporta-admin`, con edición completa equivalente a la que ya existe en reportaweb3 por tenant — protegido por una verificación adicional de PIN enviado a su email.

**Contexto:** DUDA D-02 (`docs/auditoria-ui/00-sidebar.md`, reportaweb3) preguntaba si "Gestión Formatos" debía ser visible para tenant admins. El usuario respondió: sí (ya resuelto en reportaweb3, PR #3 mergeado) **y además** debe poder gestionar formatos de todos los tenants desde `reporta-admin`, con una capa extra de seguridad (PIN) porque es edición sensible cross-tenant.

**Arquitectura:** `reporta-admin` es un Next.js 16 App Router aparte (mismo patrón que `app/templates/*` ya existente ahí), conectado a la MISMA base Supabase PROD (`fqwhagryqkkhbgznxtwf`) vía cliente anon+RLS (`utils/supabase/server.ts`) — NO usa un admin client con service-role para las queries normales. El middleware (`utils/supabase/middleware.ts`) ya exige `role = 'reporta_admin'` en TODA la app — es de un solo usuario. Las tablas `formatos`/`formatos_versiones`/`formatos_preguntas`/`formatos_opciones` hoy tienen RLS estrictamente tenant-scoped (`tenant_id = get_auth_tenant_id()`), sin bypass para `reporta_admin` — hace falta agregarlo (Task 1).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (`@supabase/ssr`), Resend (ya usado en reportaweb3, mismo `RESEND_API_KEY`), Tailwind plano (reporta-admin NO usa shadcn/Radix, solo clases utilitarias — seguir el estilo de `app/templates/page.tsx`).

**Spec:** Este documento. Referencia de comportamiento a replicar (no copiar literal, es tenant-scoped y usa shadcn): `components/formatos/version-editor.tsx`, `components/formatos/plantillas-list.tsx`, `components/formatos/formato-detalle.tsx`, `lib/actions/formatos.ts` en `C:\Proyectos\reportaweb3` (728+732+207+153 líneas) — leer antes de implementar Task 3.

## Global Constraints

- Nunca commitear el `SUPABASE_SERVICE_ROLE_KEY` ni exponerlo en el cliente (`NEXT_PUBLIC_*`) — solo en server actions/route handlers, vía `process.env.SUPABASE_SERVICE_ROLE_KEY` sin prefijo público.
- El código PIN nunca se devuelve al cliente en la respuesta de "solicitar código" — solo se envía por email.
- La tabla de códigos PIN no debe tener política RLS que permita lectura desde el cliente anon — solo se toca con un cliente service-role del lado servidor.
- Mantener el estilo existente de reporta-admin: tablas HTML planas + Tailwind, sin librerías de componentes nuevas.
- Las políticas RLS nuevas son ADITIVAS (`FOR ALL/SELECT ... TO authenticated USING (...)`) — nunca reemplazar ni deshabilitar las políticas tenant-scoped existentes, que siguen protegiendo el acceso normal de reportaweb3.
- Todo cambio de RLS se aplica a PROD (`fqwhagryqkkhbgznxtwf`) vía migración versionada en `reportaweb3/supabase/migrations/`, igual que el resto del proyecto — no aplicar cambios de schema sueltos sin migración.

---

### Task 1: Migración RLS — acceso cross-tenant de `reporta_admin` a Formatos

**Repo:** `C:\Proyectos\reportaweb3` (worktree nuevo, PR normal).

**Files:**
- Create: `supabase/migrations/20260910120000_formatos_reporta_admin_rls.sql`

**Interfaces:**
- Produce: 4 nuevas policies (`formatos`, `formatos_versiones`, `formatos_preguntas`, `formatos_opciones`), cada una `FOR ALL TO authenticated USING (is_reporta_admin()) WITH CHECK (is_reporta_admin())` o equivalente inline sin depender de una función nueva si no existe — usar el mismo patrón que la policy `sdt_reporta_admin_only` de `system_document_templates`:
  ```sql
  ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  ```

- [ ] **Paso 1: Confirmar el patrón exacto de `system_document_templates`**

Antes de escribir la migración, correr esta consulta vía `mcp__claude_ai_Supabase__execute_sql` contra `fqwhagryqkkhbgznxtwf` para copiar la definición exacta (incluye el cast a `app_role` y el nombre de función si usa una, verificar si `is_admin()` ya existe y qué hace — aparece referenciada en las policies `rls_update` de `formatos`):

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where tablename = 'system_document_templates';

select proname, prosrc from pg_proc where proname in ('is_admin', 'get_auth_tenant_id');
```

- [ ] **Paso 2: Escribir la migración**

```sql
-- Acceso cross-tenant de solo reporta_admin a Formatos (para reporta-admin app)
-- Aditivo: no reemplaza las policies tenant-scoped existentes (rls_select, rls_insert,
-- rls_update, tenant_isolation_select), que siguen protegiendo el acceso normal.

CREATE POLICY "formatos_reporta_admin_all" ON public.formatos
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);

CREATE POLICY "formatos_versiones_reporta_admin_all" ON public.formatos_versiones
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);

CREATE POLICY "formatos_preguntas_reporta_admin_all" ON public.formatos_preguntas
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);

CREATE POLICY "formatos_opciones_reporta_admin_all" ON public.formatos_opciones
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);
```

Ajustar el nombre exacto de la función/cast según lo que confirme el Paso 1 (si `formatos_preguntas`/`formatos_opciones` no tienen columna `role`/RLS previa comparable, verificar igual que existan como tablas con RLS habilitado antes de agregar policy — si RLS no está habilitado en alguna, agregar `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` primero, pero NO si ya estaba deshabilitado intencionalmente).

- [ ] **Paso 3: Aplicar a PROD**

Vía `mcp__claude_ai_Supabase__apply_migration` (project_id `fqwhagryqkkhbgznxtwf`) o `supabase db push` si el flujo del repo lo usa — seguir el patrón ya establecido en migraciones recientes del repo (`ls supabase/migrations/ | tail -5` para confirmar convención).

- [ ] **Paso 4: Verificar**

```sql
select count(*) from formatos; -- corrido como si fuera reporta_admin, vía el propio flujo de reporta-admin en Task 2/3
```
No se puede probar el bypass de RLS directamente desde `execute_sql` (corre con service role, ya bypassea todo) — la verificación real ocurre cuando Task 3 pruebe la UI en vivo.

- [ ] **Paso 5: Commit + PR + merge** (mismo flujo que el resto de la sesión: worktree → PR → merge tras `tsc --noEmit` limpio, esta migración no toca TypeScript así que alcanza con confirmar que el build no rompe).

---

### Task 2: PIN de verificación por email — infraestructura en reporta-admin

**Repo:** `C:\Proyectos\reporta-admin` (sin remoto — trabajar directo, commits locales a `master`).

**Files:**
- Create: `supabase/migrations/` — reporta-admin no parece tener carpeta de migraciones propia (verificar con `find . -iname migrations`); si no existe, crear la tabla vía `mcp__claude_ai_Supabase__apply_migration` directamente contra `fqwhagryqkkhbgznxtwf` y documentar el SQL en un comentario o archivo `db/formatos-pin-schema.sql` dentro de `reporta-admin` para que quede versionado igual.
- Create: `utils/supabase/admin.ts` (cliente service-role, server-only — mismo patrón que `C:\Proyectos\reportaweb3\utils\supabase\admin.ts`, revisar ese archivo como referencia exacta de cómo se instancia).
- Create: `app/formatos/verificar/page.tsx`
- Create: `app/formatos/verificar/actions.ts`
- Modify: `utils/supabase/middleware.ts`
- Modify: `.env.example` (agregar `RESEND_API_KEY` si no está)

**Interfaces:**
- Produce: cookie `formatos_verified` (httpOnly, secure en prod, sin `maxAge` — cookie de sesión, se borra sola al cerrar el navegador; adicionalmente debe borrarse en logout si existe una action de logout — buscarla, y si no existe, no es parte de este task crearla, dejar nota).
- Produce: server actions `requestFormatosPin(): Promise<{success: boolean; message: string}>` y `verifyFormatosPin(code: string): Promise<{success: boolean; message: string}>`, ambas en `app/formatos/verificar/actions.ts`.

- [ ] **Paso 1: Tabla de códigos**

```sql
CREATE TABLE IF NOT EXISTS public.admin_formatos_pin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Sin políticas RLS permisivas para anon/authenticated: solo se toca vía
-- service-role client (bypassea RLS). Habilitar RLS igual, sin policies,
-- para que quede denegado por defecto a cualquier acceso no service-role:
ALTER TABLE public.admin_formatos_pin ENABLE ROW LEVEL SECURITY;
```

Aplicar vía `mcp__claude_ai_Supabase__apply_migration` contra `fqwhagryqkkhbgznxtwf`.

- [ ] **Paso 2: Cliente service-role**

Leer `C:\Proyectos\reportaweb3\utils\supabase\admin.ts` y replicar el patrón exacto (createClient con `SUPABASE_SERVICE_ROLE_KEY`, `auth: { persistSession: false }`) en `C:\Proyectos\reporta-admin\utils\supabase\admin.ts`. Confirmar que `SUPABASE_SERVICE_ROLE_KEY` (mismo valor que reportaweb3 usa para PROD — pedir al usuario o leer de `C:\Proyectos\reportaweb3\.env.local` la línea comentada `#SUPABASE_SERVICE_ROLE_KEY=...` bajo "SUPABASE ENTORNO DE PRODUCCION") está en `C:\Proyectos\reporta-admin\.env.local` — si ese archivo no existe, crearlo con las mismas `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` que ya debe tener configuradas (verificar primero si existe) más `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` (mismo valor que `C:\Proyectos\reportaweb3\.env.local`).

- [ ] **Paso 3: `requestFormatosPin`**

**Corrección 2026-09-10:** reportaweb3 migró su envío de correo de Resend a Postmark (`lib/email.ts`), pero `POSTMARK_API_KEY` NO está configurado en este entorno — hoy todo el envío de esa app cae al fallback de consola (no manda nada real). `RESEND_API_KEY` sigue presente y poblado en `.env.local` (dominio `reportar.app` ya verificado en Resend según `CLAUDE.md`), y no lo usa ningún código actualmente — es el canal que SÍ funciona hoy. Para este feature nuevo, usar el SDK `resend` (`npm install resend` en reporta-admin) directo, NO Postmark — es standalone, no depende de que `lib/email.ts` de reportaweb3 quede resuelto.

Genera código de 6 dígitos (`Math.floor(100000 + Math.random() * 900000)`), lo hashea (ej. `crypto.createHash('sha256')`), inserta fila con `expires_at = now() + 10 minutos` vía el cliente service-role, envía email vía `new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'Reporta Admin <noreply@reportar.app>', to, subject, html })` al email del usuario autenticado (`(await supabase.auth.getUser()).data.user?.email`). Asunto: "Código de verificación — Gestión de Formatos". Cuerpo: el código de 6 dígitos, texto plano/HTML simple, menciona que expira en 10 minutos.

- [ ] **Paso 4: `verifyFormatosPin`**

Busca la fila más reciente no usada y no expirada para ese `user_id`, compara el hash del código ingresado, si coincide marca `used_at = now()` y setea la cookie `formatos_verified` (usar `cookies()` de `next/headers`, `httpOnly: true, secure: true, sameSite: 'lax'`, sin `maxAge`/`expires` para que sea cookie de sesión). Si no coincide o está vencido/usado, retorna error sin dar pistas de cuál fue el problema exacto (mensaje genérico "Código inválido o vencido").

- [ ] **Paso 5: Página de verificación**

`app/formatos/verificar/page.tsx`: formulario simple (input de 6 dígitos + botón "Verificar"), botón separado "Reenviar código" que llama `requestFormatosPin`. Mismo estilo Tailwind plano que `app/login/page.tsx`.

- [ ] **Paso 6: Middleware**

En `utils/supabase/middleware.ts`, después de la verificación de `role === 'reporta_admin'` ya existente, agregar: si `pathname.startsWith('/formatos')` y `pathname !== '/formatos/verificar'`, chequear la cookie `formatos_verified` — si no está presente, redirigir a `/formatos/verificar`.

- [ ] **Paso 7: Probar el flujo completo manualmente**

Login → navegar a `/formatos` (aún no existe la página real, Task 3 la crea — para probar el guard en este task, verificar que redirige a `/formatos/verificar` aunque la ruta destino todavía no exista, o crear un placeholder `app/formatos/page.tsx` mínimo con `<div>Formatos (pendiente Task 3)</div>` para poder probar el flujo end-to-end) → pedir código → revisar que llega el email real (o loggear el código en consola en dev si no se puede verificar el email real, y quitar ese log antes de terminar) → ingresar código → confirmar redirect exitoso a `/formatos` sin loop.

- [ ] **Paso 8: Commit**

Commit local (no hay remoto) con mensaje describiendo la infraestructura de PIN.

---

### Task 3: CRUD completo de Formatos en reporta-admin (cross-tenant)

**Repo:** `C:\Proyectos\reporta-admin`. Depende de Task 1 (RLS) y Task 2 (PIN gate) ya aplicadas.

**Files:**
- Create: `lib/tenants.ts` — ya existe, reusar (`TENANTS`, `TENANT_SLUGS`).
- Create: `app/formatos/page.tsx` — listado cross-tenant.
- Create: `app/formatos/actions.ts` — server actions CRUD.
- Create: `app/formatos/nueva/page.tsx` + `app/formatos/nueva/actions.ts` — crear formato nuevo (elegir tenant vía `TENANTS`, código, nombre, descripción).
- Create: `app/formatos/[id]/page.tsx` — detalle: metadata + lista de versiones + botón "Nueva versión".
- Create: `app/formatos/[id]/versiones/nueva/page.tsx` + actions — crear versión nueva (copia estructura de la versión actual si existe, o arranca vacía).
- Create: `app/formatos/[id]/versiones/[versionId]/page.tsx` — el editor completo: metadata de la versión (bloques, requisitos, estado BORRADOR/PUBLICADA/ARCHIVADA) + gestión de preguntas (crear/editar/eliminar/reordenar) + por cada pregunta tipo SELECCION_UNICA/SELECCION_MULTIPLE, gestión de opciones.
- Modify: `app/layout.tsx` — agregar una barra de navegación mínima (hoy no existe ninguna) con links a "Plantillas de sistema" (`/templates`) y "Formatos" (`/formatos`), visible solo si el usuario está autenticado (puede ser tan simple como un `<nav>` fijo con 2 links, sin lógica de auth — el middleware ya protege ambas rutas).

**Antes de escribir código:** leer completos estos 4 archivos de `C:\Proyectos\reportaweb3` para entender el modelo de datos y comportamiento exacto a replicar (no es opcional, son la especificación real de este task):
- `lib/actions/formatos.ts` (732 líneas) — todas las queries/mutations: tipos `PlantillaListItem`, `PreguntaRow`, `VersionDetalle`, funciones `getFormatos`, `getFormatoDetalle` (o como se llame la de detalle), crear/editar/eliminar formato, crear/editar/eliminar versión, crear/editar/eliminar/reordenar pregunta, crear/editar/eliminar opción, publicar versión.
- `components/formatos/version-editor.tsx` (728 líneas) — la UI del editor: cómo se agregan secciones (campo `seccion` de texto libre en cada pregunta, no una tabla de secciones separada — confirmar esto leyendo el archivo), cómo se reordenan preguntas, qué campos tiene cada tipo de pregunta.
- `components/formatos/plantillas-list.tsx` (207 líneas) — el listado tenant-scoped, para adaptar a la versión cross-tenant con columna "Tenant" agregada (usar `TENANTS`/`nombreTenant` como en `app/templates/page.tsx`).
- `components/formatos/formato-detalle.tsx` (153 líneas) — vista de detalle de un formato con sus versiones.

**Adaptación clave:** en reportaweb3 todo está scoped al `tenant_id` de la sesión (`getSupabaseContext()`). En reporta-admin NO hay un tenant de sesión — cada acción debe recibir `tenant_id` explícito (de la URL o de un selector), y las queries/inserts deben incluir ese `tenant_id` explícitamente en vez de inferirlo del contexto. Usar el cliente RLS normal (`utils/supabase/server.ts`, el mismo `createClient()` que ya usa `app/templates/page.tsx`) para las queries — ya no hace falta el cliente service-role acá, las policies de Task 1 lo permiten directamente vía RLS normal. El cliente service-role de Task 2 es solo para la tabla de PIN.

**Estilo:** Tailwind plano + tablas HTML (`<table>`, `<button>`, sin componentes de librería), igual que `app/templates/page.tsx` — no introducir shadcn/Radix en este repo.

- [ ] **Paso 1: Leer los 4 archivos de referencia completos**
- [ ] **Paso 2: Listado `/formatos`** — tabla con Tenant, Código, Nombre, Versión actual, Estado, # Informes, Activo, Acciones (Ver/Editar, Nueva versión). Link "+ Nuevo formato" arriba.
- [ ] **Paso 3: `/formatos/nueva`** — formulario: selector de tenant (`<select>` con `TENANTS`), código, nombre, descripción. Al crear, redirige a `/formatos/[id]`.
- [ ] **Paso 4: `/formatos/[id]`** — metadata editable inline o con formulario simple, lista de versiones (numero, etiqueta, estado, publicado_at, # preguntas), botón activar/publicar una versión (si aplica según el modelo real — confirmar en `formatos.ts` qué acción existe para eso), botón "Nueva versión".
- [ ] **Paso 5: `/formatos/[id]/versiones/[versionId]`** — el editor completo: toggles de bloques (empresa/cliente/cotización/tarea/observaciones/firma), campos de requisito_maquinaria/requisito_personal, lista de preguntas agrupadas por sección (texto libre) con drag-free reorder simple (botones subir/bajar por fila, más sencillo que drag-and-drop para este repo sin librerías de UI), cada pregunta editable (texto, tipo, requerida, permite_nota, texto_ayuda) y si el tipo es de selección, gestión de sus opciones (etiqueta, valor, es_conforme, orden).
- [ ] **Paso 6: Nav en `layout.tsx`**
- [ ] **Paso 7: Probar en vivo** — crear un formato de prueba para un tenant (ej. CISE), agregarle una versión, agregar 2-3 preguntas de distintos tipos (incluida una de selección con opciones), confirmar que se ve correctamente reflejado si se abre el mismo formato desde reportaweb3 (`/formatos` en `localhost:3000` con sesión de ese tenant) — esto valida que el modelo de datos es 100% compatible. Limpiar el dato de prueba al terminar (eliminar el formato de prueba) si no corresponde a un formato real.
- [ ] **Paso 8: `tsc --noEmit` en reporta-admin** (confirmar que el proyecto tiene ese script; si no, `npx tsc --noEmit` directo).
- [ ] **Paso 9: Commit** local final.

---

## Notas de ejecución

- Task 1 vive en reportaweb3 y sigue el flujo normal de PR de esa sesión (worktree → PR → merge).
- Tasks 2 y 3 viven en reporta-admin, que **no tiene remoto** — cada task termina con un commit local a `master` de ese repo, sin PR. El usuario decide cuándo/cómo publicar ese repo (Cloudflare Workers, ver referencias a `admin.reporta.la` en `docs/superpowers/plans/2026-09-06-reporta-admin.md` de reportaweb3).
- Task 2 debe completarse y verificarse ANTES de Task 3 (el guard debe funcionar antes de exponer el CRUD real).
- Ningún dato de prueba debe quedar en PROD al cerrar — limpiar cualquier fila sintética creada durante pruebas manuales.
