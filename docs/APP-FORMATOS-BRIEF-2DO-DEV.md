# Brief APP móvil Formatos — 2do dev (paralelo a cutover 2026-05-02)

> **Propósito:** este documento es autocontenido para que una segunda sesión de Claude Code arranque la APP móvil en paralelo a la implementación web. No requiere leer el resto de `docs/auditoria/` salvo que se indique explícitamente.

---

## 1. Contexto del proyecto macro (mínimo necesario)

**Reporta Web 3** es un sistema multi-tenant (hoy CISE + GRUAS del Pacífico) para gestión de operaciones con maquinaria pesada, construido en **Next.js 16 + Supabase**, migrado recientemente desde Bubble. El proyecto principal vive en `c:\Proyectos\reportaweb3`.

- **Tenants fijos:**
  - GRUAS: `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
  - CISE: `1cb97ec7-326c-4376-93ee-ed317d3da51b`
- **Supabase project-id:** `wioozisskjjgjjybsoqo`
- **Backend:** Supabase (Postgres + Auth + Storage + RLS). Credenciales y anon key en `.env.local` del repo principal.
- **Cutover del sistema web:** sábado 2026-05-02. Tu trabajo en la APP **no bloquea** ese cutover — los operadores seguirán usando la web durante 6-8 semanas hasta que la APP esté lista.

---

## 2. Tu misión

Construir una **APP móvil offline-first** en **Expo + React Native** que permita a los operadores de campo (sin buena conectividad) responder formatos (checklists e inspecciones) desde sitio y sincronizarlos cuando vuelvan a tener red.

**Stack obligatorio** (definido por el equipo, no re-decidir):

- Expo + React Native (nada de bare RN)
- expo-router para navegación
- expo-sqlite + Drizzle ORM para storage local
- Supabase JS client para auth + storage + edge functions
- TypeScript estricto
- Outbox pattern + pull-based refresh (sync propio, **sin PowerSync**)

**Módulos que debes entregar** (spec v3, secciones 5-6 del doc fuente):

1. Auth con email/password usando Supabase Auth (reusa el mismo `profiles.role`: `admin_tenant | supervisor | member`).
2. Bottom tabs: Home · Nuevo Informe · Mis Informes · Perfil · Tareas (agenda del día).
3. Flujo de llenado multi-step: formato → tarea → recursos → preguntas → observaciones → firma + PIN.
4. Worker de sync con outbox pattern (retry exponencial) + background fetch (iOS+Android).
5. Firma dibujada canvas + PIN + biometría (expo-local-authentication).

---

## 3. Schema del backend — lo que ya está listo

El usuario (1er dev) ya aplicó en Supabase las 10 tablas del módulo Formatos. **No migres nada** — son tu contrato API.

**Prefijo obligatorio:** `formatos_*` (NO `checklist_*`). Decisión del usuario — bajo ningún motivo revertir a `checklist_`.

### 3.1 Tablas relevantes (ver migration `20260419210000_formatos_schema.sql` en el repo web)

| Tabla | Rol |
|---|---|
| `formatos` | Plantilla conceptual (ej. INF-3298 Checklist de Grúas) |
| `formatos_versiones` | Versión publicada (inmutable una vez `PUBLICADA`) — la APP sólo lee versiones con `estado='PUBLICADA'` |
| `formatos_preguntas` | Preguntas de una versión — tipos: `SELECCION_UNICA`, `SELECCION_MULTIPLE`, `TEXTO_CORTO`, `TEXTO_LARGO`, `NUMERO`, `FECHA`, `BOOLEANO`, `FOTO` |
| `formatos_opciones` | Opciones para preguntas de selección — cada opción tiene `es_conforme` (true/false/null) |
| `formatos_informes` | Instancia llenada — la APP crea aquí al finalizar el flujo |
| `formatos_informes_respuestas` | 1 fila por pregunta respondida |
| `formatos_informes_maquinarias` | N:M con `maquinarias` (con snapshot JSONB) |
| `formatos_informes_personal` | N:M con `profiles` (propio) o `terceros_personal` (externo) |
| `formatos_informes_comentarios` | Feedback de admin/cliente sobre el informe |
| `formatos_correlativos` | Secuencial `INF-{codigo}-{anio}-{6_dig}` — **NO asignes desde la APP**, lo hace el servidor |

### 3.2 Campos clave de `formatos_informes` para sync

```ts
uuid_local: UUID       // generado en el device (idempotencia de sync)
dispositivo_id: TEXT   // para trazabilidad
app_version: TEXT      // para bloquear apps viejas vía min_app_version
sincronizado_at: TIMESTAMPTZ

estado: 'BORRADOR' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO' | 'CON_COMENTARIOS'
// Al hacer sync de un informe ENVIADO, el servidor asigna automáticamente
// numero_correlativo + codigo_informe (trigger + función atómica).

// Firma final (sólo profiles — terceros_personal NO firma con PIN)
firmante_profile_id: UUID
firma_url: TEXT        // Supabase Storage
firma_hash: TEXT       // SHA-256 del payload firmado
firma_metadata: JSONB  // { timestamp, lat, lng, device_id, app_version }
pin_validado_at: TIMESTAMPTZ
```

### 3.3 Catálogos que la APP debe cachear localmente

La APP sincroniza estos catálogos como lectura:

- `tareas` — filtra por usuario asignado vía `tareas_recursos.personal_id = auth.uid()` (NO `tareas.asignado_a` como decía el spec v3 original — eso fue ajustado)
- `terceros` (clientes) — `tipo='cliente'`
- `terceros_contactos`
- `terceros_sitios`
- `maquinarias`
- `terceros_personal`
- `profiles` (mínimo el propio + los que aparecen como firmantes posibles)

---

## 4. Spec técnico fuente

El spec v3 completo (con naming "checklist") está en `checklist-spec-v3.md`. **Aplicá el rename** `checklist_* → formatos_*` en cualquier referencia. Secciones relevantes del spec:

| Spec v3 sección | Contenido | Aplicable a tu trabajo |
|---|---|---|
| 1 | Mapeo tablas existentes | ✅ Referencia — OK |
| 2 | Schema nuevo | ⚠️ Los nombres son distintos: usar los de `formatos_*` del punto 3.1 acá |
| 3 | RLS | ✅ Ya está aplicado. Ajuste: roles son `admin_tenant/supervisor/member`, no `admin/supervisor/field` |
| 4 | Admin Web | ❌ No te toca (es del 1er dev) |
| **5** | **APP Móvil (Expo)** | ✅ **Tu trabajo principal** |
| **6** | **Edge Functions de sync** | ✅ **Tu trabajo** (4 funciones) |
| 7 | Arquitectura repos | ⚠️ Ver punto 5 acá — tiene cambios |
| 8 | Orden implementación | ⚠️ Ver punto 7 acá — tu orden |
| 9 | Decisiones críticas | ✅ Todas validadas por el usuario — respetá |
| 10 | Riesgos | ✅ Leer obligatorio |
| 11 | Módulo tareas del día | ✅ Tu trabajo (pantalla "Mis tareas" en la APP) |
| 12 | Correlativo | ✅ El servidor lo asigna, la APP muestra placeholder |
| 13 | Orden actualizado | ⚠️ Ignorar — tu orden es el del punto 7 acá |

**Ajustes del spec aplicables a la APP** (importante — no reintentar lo que ya se descartó):

1. **Rename obligatorio** `checklist_* → formatos_*` en TODO (types, queries, snapshots).
2. **No ALTER TABLE tareas** — la fecha programada no vive en `tareas` sino que se deriva de `MIN(tareas_fechas.fecha_inicio)`. Crear una vista `view_tareas_agenda_diaria` si necesitas simplificar el query.
3. **Asignación de tarea a usuario** va por `tareas_recursos.personal_id = auth.uid()`, no por `asignado_a`. Una tarea puede tener N personas asignadas en distintas fechas.
4. **Enum de roles:** `admin_tenant | supervisor | member` (no `admin | supervisor | field`).
5. **PowerSync: NO.** Outbox propio, ya definido.

---

## 5. Arquitectura de repos — decisión provisional

**Provisional por ahora** (validar con el usuario en la 1er conversación): crear un **repo nuevo separado** `reportaweb3-field` con la APP. Al final del cutover del sistema web (2026-05-02), el usuario decide si se convierte en monorepo con `reportaweb3` o se queda separado.

Estructura inicial propuesta:

```
reportaweb3-field/
├── app/              # expo-router
│   ├── (tabs)/
│   │   ├── index.tsx           # Home
│   │   ├── nuevo.tsx           # Nuevo Informe (stack modal)
│   │   ├── mis-informes.tsx
│   │   ├── tareas.tsx          # Mis tareas del día
│   │   └── perfil.tsx
│   └── llenado/
│       └── [informeId].tsx     # Multi-step
├── db/
│   ├── schema.ts               # Drizzle local (ver spec §5.4)
│   └── migrations/
├── sync/
│   ├── worker.ts               # Outbox (ver spec §5.5)
│   ├── background.ts           # Background fetch (ver spec §5.6)
│   └── endpoints.ts            # Clientes de las 4 Edge Functions
├── lib/
│   ├── supabase.ts             # cliente SDK
│   └── pin.ts                  # validación PIN + biometría
└── types/
    └── db.ts                   # types generados del backend Supabase
```

**Types de Supabase:** generalos con `npx supabase gen types typescript --project-id wioozisskjjgjjybsoqo > types/db.ts`. Anon key y project URL los tiene el 1er dev en `reportaweb3/.env.local`.

---

## 6. Edge Functions a implementar

Las 4 funciones del spec §6. Viven en `reportaweb3/supabase/functions/` (mismo proyecto Supabase). Coordinar con 1er dev para merge.

| Función | Propósito | Filtro crítico |
|---|---|---|
| `sync-catalogos` | Devuelve cambios de `tareas`, `terceros`, `terceros_contactos`, `terceros_sitios`, `maquinarias`, `terceros_personal` desde `since` | `tareas` filtrar por `personal_id` del usuario en `tareas_recursos`, no por `asignado_a`. Rango temporal: ±7 días desde hoy |
| `sync-formatos` | Devuelve versiones `PUBLICADA` + preguntas + opciones | Respetar `min_app_version` |
| `sync-informes` | Recibe informe completo del dispositivo. Idempotente por `uuid_local`. Inserta todo en transacción (crear RPC `formatos_insert_informe_completo`) | Validar que `version_id` esté `PUBLICADA`. Si estado=`ENVIADO`, el trigger de la tabla asigna el correlativo automáticamente |
| `sync-feedback` | Pull de comentarios/aprobaciones de los informes ya sincronizados | Filtrar por `tenant_id` del usuario |

---

## 7. Orden de implementación sugerido (para vos, 2do dev)

1. Setup Expo + expo-router + auth con Supabase (login simple con email/password).
2. expo-sqlite + Drizzle + schema local (ver spec §5.4 completo).
3. Generar types de Supabase (`gen types typescript`) y guardarlos en `types/db.ts`.
4. Cliente Supabase + helpers de tenant (`current_tenant_id()` via profiles).
5. Pantalla "Mis tareas" (agenda del día) — la más simple para probar el sync.
6. Edge function `sync-catalogos` — coordinar merge con 1er dev en `supabase/functions/`.
7. Pantalla "Nuevo Informe": selector de formato + selector de tarea + recursos.
8. Edge function `sync-formatos` + caché local de plantillas.
9. Renderer dinámico de preguntas según tipo (SELECCION_UNICA, TEXTO, FOTO con expo-image-manipulator, etc.).
10. Firma canvas (react-native-signature-canvas o equivalente) + validación PIN local (comparando con `profiles.pin`).
11. Biometría con expo-local-authentication (opcional, como alternativa al PIN).
12. Outbox (tabla `informes` local con sync_status) + worker con retry exponencial.
13. Edge function `sync-informes` con RPC transaccional.
14. Background fetch con expo-background-fetch + expo-task-manager.
15. Edge function `sync-feedback` + pantalla de comentarios en detalle de informe.
16. Sentry (expo) + mixpanel/posthog (opcional) + pulido UX.
17. Compresión de fotos < 500KB antes de sync (expo-image-manipulator).
18. Manejo de errores + UI de reintentos manuales en pantalla "Mis Informes".

---

## 8. Riesgos explícitamente declarados (spec §10)

1. **Versión de formato cambia mientras hay borradores locales:** detectar `min_app_version > app_actual` al sincronizar catálogo → bloquear creación de nuevos informes hasta actualizar.
2. **Fotos inflan storage:** comprimir a <500KB con expo-image-manipulator ANTES de subir.
3. **PIN olvidado:** flujo de reset vía admin (resetea `profiles.pin` del usuario).
4. **Dispositivo perdido con borradores:** es pérdida de datos real. Comunicar en onboarding.
5. **Firma sin valor legal:** canvas + PIN + metadatos tiene valor probatorio pero NO es firma digital certificada. Si un cliente lo exige en el futuro, integrar con Llama.pe/Camerfirma.

---

## 9. Cómo coordinar con el 1er dev (web)

- **Issue/PR labels:** usar prefijo `[field]` en commits/PRs de este repo APP.
- **Supabase compartido:** cualquier migration nueva que requieras, coordinar con 1er dev para no chocar timestamps. Typical flow: vos sugerís el SQL, el 1er dev aplica en Studio y regenera types.
- **Edge Functions:** viven en el mismo proyecto Supabase → PRs a `reportaweb3/supabase/functions/` con prefijo `[field]`.
- **Canal de Qs:** si algo requiere decisión de producto (UX, scope), hablar directo con el usuario (no intentar deducir).

---

## 10. Decisiones pendientes (preguntar al usuario al arrancar)

Estas las debés resolver vos en la primera conversación con el usuario:

1. **Firma legal:** ¿con canvas + PIN es suficiente o necesitamos firma digital certificada? (Respuesta actual: canvas + PIN, valor probatorio, no certificado — confirmar).
2. **Biometría opcional o obligatoria:** ¿Face ID/huella sustituye al PIN o es alternativa?
3. **Offline sin login previo:** ¿puede un operador crear un borrador sin haber autenticado nunca, y sincronizar cuando se loguee? (Respuesta default del spec: NO — debe loguearse al menos una vez antes de operar).
4. **Target devices:** ¿Android e iOS ambos desde el día 1 o Android primero (más común en obra)?
5. **Build & distribution:** ¿TestFlight/Google Play Internal Testing o EAS Update OTA?
6. **Fotos — ¿desde galería o solo desde cámara?**
7. **Idioma:** español Perú (supongo) — confirmar.

---

## 11. Entregables esperados

- Repo `reportaweb3-field` con la APP funcional en Expo Go + build de desarrollo.
- 4 Edge Functions en el repo web (`reportaweb3/supabase/functions/`).
- Documento `README.md` con setup local + cómo correr + cómo buildear.
- Tests básicos (expo-vitest) para el flujo de outbox + firma + PIN.
- Manual de usuario simple (1-2 páginas) para los operadores.

**Timeline objetivo:** ~6-8 semanas desde arranque. No hay deadline duro — la APP cierra el gap del cutover 2026-05-02 pero mientras no esté, los operadores usan la web.

---

## 12. Recursos de referencia

- Spec técnico completo: `checklist-spec-v3.md` (con renames aplicados según punto 4 de este brief).
- Schema SQL: `reportaweb3/supabase/migrations/20260419210000_formatos_schema.sql` (ya aplicado en prod).
- Audit del módulo Formatos (contexto adicional, no crítico): `reportaweb3/docs/auditoria/08-formatos.md`.
- Proyecto web principal: `c:\Proyectos\reportaweb3` — revisar `lib/epp-pdf-template.ts` para ver el patrón de generación de PDF (mismo pattern sirve si necesitás PDFs client-side).

---

**Primer paso al abrir sesión:** leé este brief + spec v3 + audit 08 (todos juntos ~40 min de lectura) y devuelve al usuario un plan de ataque de las primeras 2 semanas con hitos concretos. No empieces a codear sin ese plan aprobado.
