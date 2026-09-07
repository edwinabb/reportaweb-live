# App `reporta-admin` — Panel superadmin para plantillas de sistema

**Fecha:** 2026-09-06
**Contexto:** Resuelve el bloqueo Critical #1 de la revisión final de Fase 0 (`docs/superpowers/plans/2026-09-06-fase0-pdf-bridge-bubble.md`): `lib/bubble-docx-pdf.ts` usa `fs.readFileSync` sobre `public/templates/bubble/`, que no es accesible en el runtime de Cloudflare Workers (confirmado en producción: `404 Plantilla no encontrada` desplegando a `demo.reportar.app`). En vez de un fix mínimo (subir el archivo a mano a un bucket), el usuario pidió una interfaz de administración propia para gestionar estas plantillas (y, a futuro, otra información de sistema oculta al usuario final) — nueva app, nuevo dominio.

**Alcance de este documento:** diseño completo de la primera versión (solo gestión de plantillas `.docx`). Otros tipos de contenido admin quedan fuera de alcance — se agregan como módulos nuevos más adelante, no se diseña una estructura genérica todavía (decisión explícita del usuario, YAGNI).

---

## Arquitectura

**Repo nuevo:** `C:\Proyectos\reporta-admin` — proyecto Next.js 16 independiente (mismo stack que `reportaweb3`: TypeScript, Tailwind, Radix, App Router), con su propio `package.json`, deploy propio a Cloudflare Workers (OpenNext), dominio `admin.reporta.la`.

**Auth:** Supabase Auth JS Client apuntando al **mismo proyecto Supabase** que usa `reportaweb3` (mismas URLs/keys por entorno — test y prod). Login con email + password (sin OAuth, mismo patrón que reportaweb3). Tras autenticar, se valida server-side que `profiles.role === 'reporta_admin'` — este rol **ya existe** en el `app_role` enum del sistema (`CREATE TYPE app_role AS ENUM ('reporta_admin', 'admin_tenant', 'supervisor', 'member')`, `supabase/migrations/20251206163000_user_management.sql`), es cross-tenant y sin restricciones (`supabase/migrations/20260504000000_permisos_cargo.sql`: "`reporta_admin` no tiene restricciones de rutas"). No se crea ningún rol nuevo. Cualquier usuario autenticado con otro rol recibe 403 al intentar entrar.

**Base de datos:** tabla nueva `system_document_templates`, creada en la **misma base Supabase** que usa `reportaweb3` (ambas apps comparten proyecto — test y prod), vía migración aplicada desde `reportaweb3/supabase/migrations/` (no hay carpeta de migraciones separada en el repo nuevo; una sola fuente de verdad de schema).

```sql
CREATE TABLE public.system_document_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    tipo          TEXT NOT NULL CHECK (tipo IN (
                      'cotizacion', 'valorizacion_venta', 'valorizacion_compra',
                      'reporte_maquinaria', 'reporte_horas_maquinaria', 'reporte_personal'
                  )),
    version       INT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT false,
    storage_path  TEXT NOT NULL,
    created_by    UUID NOT NULL REFERENCES auth.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by    UUID REFERENCES auth.users(id),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, tipo, version)
);

-- Solo una version activa por tenant+tipo
CREATE UNIQUE INDEX system_document_templates_active_unique
    ON public.system_document_templates (tenant_id, tipo)
    WHERE is_active = true;

ALTER TABLE public.system_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sdt_reporta_admin_only" ON public.system_document_templates
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin');

GRANT ALL ON public.system_document_templates TO service_role;
```

**Mapeo tenant_id → slug** (para la ruta de Storage, mismo patrón ya usado en `app/api/bubble/pdf/generate/route.ts` con `ALLOWED_TENANT_IDS`):
```ts
const TENANT_SLUGS: Record<string, string> = {
    '1cb97ec7-326c-4376-93ee-ed317d3da51b': 'cise',
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73': 'gruas',
}
```

**Storage:** bucket nuevo **`system-templates`**, **privado** (nadie fuera de `service_role`/`reporta_admin` puede leerlo — cumple el requisito de "información que no puede ver el usuario"). Ruta: `docs/{tenant_slug}/{tipo}-{version}.docx` (patrón literal pedido por el usuario).

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('system-templates', 'system-templates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "st_reporta_admin_only" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'system-templates' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin')
    WITH CHECK (bucket_id = 'system-templates' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin');
```

---

## UX (MVP)

- **`/login`** — email + password, redirige a `/templates` si `role = reporta_admin`, 403 si no.
- **`/templates`** — listado (tabla): tenant, tipo, versión, ¿activa? (badge/toggle), creado por/el, actualizado por/el, acción "Descargar" (signed URL de 60s), acción "Activar" (si no está activa).
- **`/templates/nueva`** — formulario: dropdown tenant (CISE/GRUAS), dropdown tipo (los 6 valores fijos), input de archivo (solo `.docx`, valida extensión/mimetype client-side). Al subir:
  - Calcula `version = max(version WHERE tenant_id+tipo) + 1` (empieza en 1).
  - Sube el archivo a `docs/{tenant_slug}/{tipo}-{version}.docx`.
  - Inserta la fila con `created_by = auth.uid()`.
  - **Si es la primera versión de ese tenant+tipo** (no había ninguna previa) → se crea con `is_active = true` automáticamente. Si ya existe una activa → se crea con `is_active = false`, el admin la activa manualmente después (evita romper producción con un upload accidental).
- **Acción "Activar"** en el listado: pone `is_active = true` en la fila elegida y `false` en cualquier otra del mismo tenant+tipo (transacción), actualiza `updated_by`/`updated_at`.
- **Acción "Copiar desde otro tenant"** (en `/templates/nueva` o como botón separado): elige un tenant origen → copia todas sus plantillas **activas** (todas las combinaciones tipo) al tenant destino como nuevas filas versión 1, activas, copiando el archivo en Storage (`storage.copy` o download+upload) — pensado para el día que se sume un tenant nuevo además de CISE/GRUAS.

---

## Cambio en `reportaweb3` (parte del mismo trabajo, cierra el bloqueo #1)

`lib/bubble-docx-pdf.ts`: `renderBubbleDocxPdf(templateKey, data)` deja de usar `fs.readFileSync`. Nueva resolución:

1. Recibe también `tenantId` (ya disponible: la Fase 0 lo pasa desde `app/api/bubble/pdf/generate/route.ts` y `app/api/cron/pdf-jobs/route.ts`, que ya tienen `tenant_id`/`job.tenant_id`).
2. Query: `SELECT storage_path FROM system_document_templates WHERE tenant_id = $1 AND tipo = $2 AND is_active = true`. Si no hay fila → mismo `BubbleTemplateNotFoundError` que ya existe (mensaje actualizado a "no hay plantilla activa para este tenant/tipo").
3. Descarga con `adminClient.storage.from('system-templates').download(storage_path)` (bucket privado, requiere service_role — `createAdminClient()` ya se usa en ambos call sites).
4. El resto de la función (docxtemplater + Gotenberg) no cambia.

**Nota de compatibilidad:** el `template_key` que manda Bubble en su request ahora debe ser exactamente uno de los 6 valores de `tipo` (no un nombre de archivo libre como `cotizacion-bubble`). El validador de formato ya existente (`^[a-zA-Z0-9_-]+$`) sigue aplicando; se agrega opcionalmente una validación contra la lista fija de 6 tipos en el endpoint bridge (mismo lugar que ya valida `doc_category`).

---

## Fuera de alcance (explícito)

- Otros tipos de "información de sistema" más allá de plantillas `.docx` — se diseñan cuando surjan, no ahora.
- Multi-tenant más allá de CISE/GRUAS (la función "copiar desde otro tenant" prepara el terreno pero no se prueba con un tercer tenant real todavía).
- Migrar `app/api/pdf/generate-docx/route.ts` (cotizaciones internas de la v3, mismo problema de `fs` sin verificar) — deuda técnica anotada, no parte de este trabajo.

---

## Self-review

- Sin placeholders: el schema, las políticas RLS y el flujo de resolución están completos y ejecutables tal cual.
- Consistencia: el mapeo `TENANT_SLUGS` se reutiliza igual en `reporta-admin` (para armar `storage_path` al subir) y en `reportaweb3` (implícito, ya que el `storage_path` queda guardado en la fila — `reportaweb3` no necesita recalcularlo, solo lo lee de la tabla).
- Alcance: acotado a plantillas únicamente, con "fuera de alcance" explícito para no repetir el problema histórico de este proyecto (funcionalidad que crece sin límite y nunca cierra).
- Ambigüedad resuelta: activación automática solo en el primer upload de un tenant+tipo; el resto requiere activación manual — decisión explícita para no romper producción con una subida accidental.
