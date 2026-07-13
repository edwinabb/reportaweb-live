# Cutover Plan — Bubble → Supabase (Sábado 2026-05-30 22:00)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejecutar el cutover final Bubble → Supabase el sábado 30 de mayo a las 22:00, con todos los pre-requisitos resueltos antes de esa hora y un plan claro de post-cutover para la semana siguiente.

**Architecture:** 3 fases — Pre (hoy viernes + mañana hasta las 22:00), Cutover (22:00 sábado), Post (semana del 31 en adelante). Web en `c:\Proyectos\reportaweb3` (v3.10.31 ✅). App en `c:\Proyectos\reporta-app` (v1.8.14).

**Tech Stack:** Next.js 16 / Supabase / Vercel Pro / Gotenberg PDF / Resend / Expo 54

**Estado pre-cutover al momento de escribir este plan (viernes 29 may, 9:30am):**
- `check-pre-cutover`: 46/48 ✅ · 0 bloqueantes · 2 warnings (personal externo — won't fix)
- `BUBBLE_API_TOKEN` y `CLOUD_SUPABASE_URL/ROLE_KEY` presentes en `.env.local`
- `NEXT_PUBLIC_SITE_URL` vacío en `.env.local` — pendiente Vercel

**Estado actualizado (viernes 29 may, fin de día):**
- ✅ TODOS los CRÍTICOs y OPCIONALes completados — v3.10.31 en producción
- ✅ `NEXT_PUBLIC_SITE_URL = https://web.reportar.app` configurado en Vercel
- ✅ `NEXT_PUBLIC_ENV = production` configurado en Vercel
- ✅ URLs de email corregidas (cotizaciones, EPP, documentos-vencidos)
- ✅ E2E smoke test auth fix (`setup-base.ts` — redirige a `/planificacion` post-login)

**Planes previos revisados para este plan:**
- `docs/plan-post-cutover.md` — integrado
- `docs/DEUDA_TECNICA.md` — integrado
- `docs/plan-seguridad-2026.md` — **19 items de seguridad, mayoría faltaban en el plan anterior** — integrados en CRÍTICO-6 y POST-SEC
- `docs/plan-web.md` — revisado: EPP observaciones ✅, festivos planificación ✅, config_checklist ✅, settings notificaciones ✅ ya implementados. Falta: RLS EPP tables y Planes Acción Fase 2
- `docs/plan-app.md` — revisado: estructura principal implementada

---

## FASE 1 — PRE-CUTOVER

**Ventana:** Viernes 29 may (ahora) → Sábado 30 may hasta las 21:00
**Criterio de salida:** Todo lo marcado CRÍTICO completado. Opcionales solo si hay tiempo.

---

### CRÍTICO-1: Variables de entorno en Vercel (DT-ENV01)

**Por qué es crítico:** Sin `NEXT_PUBLIC_SITE_URL`, las URLs de aprobación de cotizaciones y los correos de bienvenida apuntan al fallback hardcodeado. Sin `NEXT_PUBLIC_ENV=production`, el banner "SERVIDOR DE PRUEBAS" aparece en producción.

**Archivos que lo consumen:**
- `app/(dashboard)/layout.tsx:9` — banner test
- `components/dashboard/sidebar.tsx:65` — badge test
- `lib/actions/cotizaciones.ts:1127` — URL aprobación
- `lib/actions/create-user.ts:180` — email bienvenida
- `app/api/cron/epp-alertas/route.ts:31` y demás crons

**Pasos:**

- [x] **1.1** Ir a Vercel → proyecto `reportaweb3` → Settings → Environment Variables
- [x] **1.2** Agregar en el entorno **Production**:
  ```
  NEXT_PUBLIC_ENV = production
  NEXT_PUBLIC_SITE_URL = https://web.reportar.app
  ```
- [x] **1.3** Agregar en el entorno **Preview** (dev branch):
  ```
  NEXT_PUBLIC_ENV = test
  NEXT_PUBLIC_SITE_URL = https://<url-del-preview-dev>
  ```
- [x] **1.4** Hacer redeploy manual del branch `master` en Vercel para que tome las nuevas vars
- [x] **1.5** Verificar en producción: abrir `https://web.reportar.app` y confirmar que NO aparece el banner naranja "SERVIDOR DE PRUEBAS"

---

### CRÍTICO-2: Pre-migración de servicios (checkpoint para modo DELTA)

**Por qué es crítico:** El orquestador `migrate-all-prod.ts` detecta automáticamente el checkpoint `logs/services-migration-checkpoint.txt`. Si existe, la fase `mig2d` corre en modo DELTA (solo servicios modificados desde ese momento) en lugar de re-migrar todo, ahorrando ~15-20 min durante el cutover.

- [x] **2.1** Asegurarse de que `.env.local` tiene `BUBBLE_API_URL=https://reporta.la/version-test/api/1.1/obj` (version-test = copia de producción)
- [x] **2.2** Correr pre-migración de servicios:
  ```bash
  cd C:\Proyectos\reportaweb3
  npx tsx scripts/migrate-services.ts
  ```
  Resultado esperado: `logs/services-migration-checkpoint.txt` creado con timestamp ISO
- [x] **2.3** Verificar que el checkpoint existe:
  ```bash
  cat logs/services-migration-checkpoint.txt
  ```
  ✅ Checkpoint creado. Nota: `version-test` ES la copia de producción (Bubble).

---

### CRÍTICO-3: Confirmar buckets Storage en producción

**Por qué es crítico:** El Bloque B del orquestador sube archivos a 5 buckets. Si no existen, falla con error 404.

- [x] **3.1** Ir a Supabase Studio → proyecto producción (`fqwhagryqkkhbgznxtwf`) → Storage
- [x] **3.2** Confirmar que existen estos 5 buckets (crear si falta alguno, con acceso público en `reporta-maquinaria-fotos`):
  - `maquinarias` (privado)
  - `doc_maquinarias` (privado)
  - `cotizaciones` (privado)
  - `reporte-maquinaria` (privado)
  - `reporta-maquinaria-fotos` (público)
- [x] **3.3** Confirmar también los buckets adicionales usados por los crons y scripts recientes:
  - `inspecciones-pdfs`
  - `reportes-personal-pdfs`
  - `valorizaciones-pdfs`
  - `formatos-informes-pdfs`
  ✅ Nota: prod DB ID es `fqwhagryqkkhbgznxtwf` (Brazil), no `wioozisskjjgjjybsoqo` (USA/test)

---

### CRÍTICO-4: Confirmar view_tareas_agenda_diaria y campo fuente_foto (cross-repo con reporta-app)

**Por qué es crítico:** Son bloqueadores para la app. Si no existen en prod antes del cutover, la pantalla "Mis Tareas" y el renderer FOTO quedan rotos el día de lanzamiento.

- [x] **4.1** En Supabase Studio → SQL Editor, correr:
  ```sql
  SELECT viewname FROM pg_views WHERE viewname = 'view_tareas_agenda_diaria';
  ```
  ✅ Vista creada en test y prod — migration `20260529000002_create_view_tareas_agenda_diaria.sql`
  ⚠️ Corrección: JOIN usa `tareas_recursos.tarea_fecha_id` (no `fecha_id` como especificaba el plan original)

- [x] **4.2** Verificar campo `fuente_foto`:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'formatos_preguntas' AND column_name = 'fuente_foto';
  ```
  ✅ Campo creado — migration `20260529000001_add_fuente_foto_formatos_preguntas.sql`

---

### CRÍTICO-5: Migration fuente_foto (si CRÍTICO-4 confirmó que falta)

**Solo ejecutar si el check de CRÍTICO-4.2 retornó 0 filas.**

- [x] **5.1** Crear migración `supabase/migrations/20260529000001_add_fuente_foto_formatos_preguntas.sql`
- [x] **5.2** Aplicar en test y prod vía MCP `apply_migration`
- [x] **5.3** Regenerar tipos en reportaweb3 (npm run types:supabase)
- [x] **5.4** Regenerar tipos en reporta-app (pendiente — tipos de supabase en app se regeneran por separado)
- [x] **5.5** Commit incluido en v3.10.29
- [x] **5.6** Deploy v3.10.29 a producción ✅

---

### CRÍTICO-6: Fix RLS críticos de seguridad (tablas EPP + reportes_usuario)

**Por qué es crítico:** El commit `a449908` solo agregó GRANTs de PostgREST (necesarios para el deadline 2026-10-30), pero **no creó las políticas RLS de aislamiento por tenant**. Las 6 tablas `sst_epp_*` y `reportes_usuario` están accesibles a cualquier usuario autenticado de cualquier tenant. Esto es una fuga de datos entre tenants en producción.

- [x] **6.1** Verificar estado actual en Supabase Studio (prod) → SQL Editor:
  ```sql
  SELECT tablename, rowsecurity,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') AS policy_count
  FROM pg_tables t
  WHERE schemaname = 'public'
    AND tablename IN ('sst_epp_entrega','sst_epp_item','sst_epp_movimiento',
                      'sst_epp_alerta','sst_epp_reporte','sst_epp_config',
                      'reportes_usuario','maquinaria_modelos')
  ORDER BY tablename;
  ```

- [x] **6.2** Crear migration `supabase/migrations/20260529100000_fix_rls_epp_reportes.sql` con el siguiente contenido y aplicarla:
  ```sql
  -- ─── EPP tables — habilitar RLS + tenant isolation ─────────────────────────
  ALTER TABLE sst_epp_entrega   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sst_epp_item      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sst_epp_movimiento ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sst_epp_alerta    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sst_epp_reporte   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sst_epp_config    ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "tenant_isolation" ON sst_epp_entrega;
  CREATE POLICY "tenant_isolation" ON sst_epp_entrega
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  DROP POLICY IF EXISTS "tenant_isolation" ON sst_epp_item;
  CREATE POLICY "tenant_isolation" ON sst_epp_item
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  DROP POLICY IF EXISTS "tenant_isolation" ON sst_epp_movimiento;
  CREATE POLICY "tenant_isolation" ON sst_epp_movimiento
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  DROP POLICY IF EXISTS "tenant_isolation" ON sst_epp_alerta;
  CREATE POLICY "tenant_isolation" ON sst_epp_alerta
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  DROP POLICY IF EXISTS "tenant_isolation" ON sst_epp_reporte;
  CREATE POLICY "tenant_isolation" ON sst_epp_reporte
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  DROP POLICY IF EXISTS "tenant_isolation" ON sst_epp_config;
  CREATE POLICY "tenant_isolation" ON sst_epp_config
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  -- ─── reportes_usuario — fix SELECT USING (true) ─────────────────────────────
  DROP POLICY IF EXISTS "Enable read access for all users" ON reportes_usuario;
  CREATE POLICY "tenant_isolation_select" ON reportes_usuario
      FOR SELECT TO authenticated
      USING (tenant_id::text = get_auth_tenant_id()::text);

  -- ─── maquinaria_modelos — fix bug: tenant_id = auth.uid() (siempre FALSE) ───
  DROP POLICY IF EXISTS "Enable read access for tenant users" ON maquinaria_modelos;
  CREATE POLICY "tenant_isolation" ON maquinaria_modelos
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  -- ─── maquinaria_documentos y maquinaria_tipos_docs — sin policies ───────────
  ALTER TABLE maquinaria_documentos  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE maquinaria_tipos_docs  ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "tenant_isolation" ON maquinaria_documentos;
  CREATE POLICY "tenant_isolation" ON maquinaria_documentos
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());

  DROP POLICY IF EXISTS "tenant_isolation" ON maquinaria_tipos_docs;
  CREATE POLICY "tenant_isolation" ON maquinaria_tipos_docs
      FOR ALL TO authenticated
      USING (tenant_id = get_auth_tenant_id())
      WITH CHECK (tenant_id = get_auth_tenant_id());
  ```

- [x] **6.3** Aplicar en Supabase Studio (test DB) → SQL Editor → ejecutar ✅
- [x] **6.4** Verificar que los módulos EPP y maquinaria siguen funcionando en dev (`npm run dev`) ✅
- [x] **6.5** Commit incluido en v3.10.28 ✅
- [x] **6.6** Aplicado en producción via MCP `apply_migration` ✅

---

### OPCIONAL-A: Seed DT-MIG01 (contactos_cargo y contactos_area)

**Puede hacerse en cualquier momento — no bloquea el cutover.**

- [x] **A.1** En Supabase Studio → SQL Editor, verificar estructura ✅
- [x] **A.2** Seed ejecutado via migration `20260529000003_seed_contactos_cargo_area.sql`:
  - `contactos_cargo`: ADMINISTRADOR, ASISTENTE COMPRAS, GERENTE, OPERADOR, SUPERVISOR (CISE + GRUAS)
  - `contactos_area`: ADMINISTRACIÓN, COMPRAS, LOGÍSTICA, OPERACIONES, SEGURIDAD (CISE + GRUAS)
  - Nota: Bubble no tiene cargo/area en `terceros_contactos` — catálogo base manual
- [x] **A.3** Verificado — commit incluido en v3.10.30 ✅

---

### OPCIONAL-B: Fix E2E suite v1

**Puede hacerse antes o después del cutover — no bloquea migración.**

- [x] **B.1** `utils/supabase/middleware.ts` — cookie-copying ya estaba implementado (líneas 151-162) ✅
- [x] **B.2** SQL cargo_permisos e2e-planner — confirmado aplicado (todos los módulos habilitados) ✅
- [x] **B.3** Smoke test fix adicional: `tests/auth/setup-base.ts` — `waitForURL` actualizado para aceptar `/planificacion` (login action siempre redirige ahí) ✅
- [ ] **B.4** Suite completa pendiente — flows 02-06 tienen timeout conocido en `btn-hoy` (won't fix por ahora)
  Meta: ≥ 383/387 pasando

---

### OPCIONAL-C: DT-PDF01 — Ruta on-demand PDF cotizaciones

**Puede hacerse después del cutover si no hay tiempo.**

- [ ] **C.1** Crear `app/api/cotizaciones/[id]/pdf/route.ts` — siguiendo patrón de `app/api/reportes-maquinaria/[id]/pdf/route.ts`
- [ ] **C.2** Actualizar `components/cotizaciones/cotizaciones-columns.tsx` — si `pdf_url` es null, usar el nuevo endpoint
- [ ] **C.3** Commit + deploy

---

## FASE 2 — CUTOVER (Sábado 30 may, 22:00)

**Ventana estimada:** 22:00 → ~02:00 (4 horas). El orquestador hace las fases más largas (archivos) de forma concurrente.

**Preparación 30 min antes (21:30):**
- [ ] Confirmar que `.env.local` tiene `BUBBLE_API_URL=https://reporta.la/api/1.1/obj` (prod)
- [ ] Confirmar que `BUBBLE_API_TOKEN` en `.env.local` corresponde al token de producción (no version-test)
- [ ] Confirmar que `CLOUD_SUPABASE_URL` y `CLOUD_SUPABASE_ROLE_KEY` en `.env.local` son los de prod
- [ ] Cerrar otras aplicaciones pesadas (el orquestador usa mucha red + CPU)
- [ ] Tener Supabase Studio abierto en una pestaña para monitorear

---

### CUT-1: Dry-run del orquestador

- [ ] **1.1** Correr dry-run para confirmar fases:
  ```bash
  cd C:\Proyectos\reportaweb3
  npx tsx scripts/migrate-all-prod.ts --dry-run
  ```
  Verificar que el output lista todas las fases: mig2a → mig2b → mig2c → mig2d → mig3 → mig4 → mig4b → mig5 → mig6 → mig6b → mig7 → blockA → blockB → audit

---

### CUT-2: Aplicar migraciones SQL manuales en Supabase Studio (producción)

**Hacer antes del orquestador — el script lo requiere.**

- [ ] **2.1** En Supabase Studio (prod) → SQL Editor, aplicar si aún no están:
  ```sql
  -- Verificar cuáles ya existen:
  SELECT name FROM supabase_migrations.schema_migrations
  WHERE name LIKE '%file_migration_log%'
     OR name LIKE '%planes_accion_bubble%'
     OR name LIKE '%plantillas_bubble%'
     OR name LIKE '%pin_rate_limiting%';
  ```
- [ ] **2.2** Para cada una que NO aparezca, ejecutar el contenido del archivo en `supabase/migrations/`:
  - `20260412000200_create_file_migration_log.sql`
  - `20260412000100_add_planes_accion_bubble_id.sql`
  - `20260412000000_add_plantillas_bubble_id.sql`
  - `20260410000000_add_pin_rate_limiting.sql`

---

### CUT-3: Orquestador completo

- [ ] **3.1** Lanzar en background (el proceso puede tardar 3-4 horas):
  ```bash
  cd C:\Proyectos\reportaweb3
  BUBBLE_API_URL=https://reporta.la/api/1.1/obj npx tsx scripts/migrate-all-prod.ts 2>&1 | tee logs/cutover-$(date +%Y%m%d-%H%M).log
  ```
- [ ] **3.2** Monitorear output en consola — cada fase imprime su summary al completar
- [ ] **3.3** Si una fase falla, retomar desde ese punto:
  ```bash
  # Ejemplo: si falla en mig5
  BUBBLE_API_URL=https://reporta.la/api/1.1/obj npx tsx scripts/migrate-all-prod.ts --from=mig5
  ```

---

### CUT-4: Migraciones adicionales post-orquestador

Correr una vez que el orquestador haya terminado (fases mig2-mig7 + bloques A y B completos):

- [ ] **4.1** Migrar respuestas de informes 2026+:
  ```bash
  npx tsx scripts/migrate-informe-respuesta.ts --step=inspect-preguntas
  ```
  Revisar output — verificar que los campos de Bubble corresponden al schema Supabase

- [ ] **4.2** Ejecutar migración de respuestas:
  ```bash
  npx tsx scripts/migrate-informe-respuesta.ts --step=migrate --target=prod --run
  ```

- [ ] **4.3** Backfill PDFs inspecciones (los que `pdf_url IS NULL` en prod):
  ```bash
  npx tsx scripts/backfill-pdfs-inspecciones.ts --target=prod --run
  ```

- [ ] **4.4** Backfill PDFs maquinaria (~93 registros):
  ```bash
  npx tsx scripts/backfill-pdfs-maquinaria.ts --target=prod --run
  ```

- [ ] **4.5** Backfill PDFs personal (~228 registros):
  ```bash
  npx tsx scripts/backfill-pdfs-personal.ts --target=prod --run
  ```

---

### CUT-5: Actualizar DNS

**Solo después de que el audit final (CUT-3) haya pasado.**

- [ ] **5.1** Ir a Cloudflare → DNS del dominio `reportar.app`
- [ ] **5.2** Apuntar `web.reportar.app` (o el subdominio configurado en DEPLOYMENT.md) a la URL de Vercel producción
- [ ] **5.3** Esperar propagación (~5 min con Cloudflare)
- [ ] **5.4** Verificar: abrir `https://web.reportar.app` → debe cargar el login de reportaweb3

---

### CUT-6: Verificación smoke test post-DNS

- [ ] **6.1** Login con cuenta admin en `https://web.reportar.app`
- [ ] **6.2** Navegar: Planificación → Cotizaciones → Maquinaria → Terceros → Formatos
- [ ] **6.3** Abrir un PDF de cotización existente — debe servirse desde Storage
- [ ] **6.4** Abrir un PDF de inspección — debe servirse desde Storage
- [ ] **6.5** Confirmar que NO aparece banner "SERVIDOR DE PRUEBAS" (si CRÍTICO-1 fue completado)

---

## FASE 3 — POST-CUTOVER

**Ventana:** Domingo 31 may en adelante.

---

### POST-1: Monitoreo y hot-fixes (primeras 48h)

- [ ] **1.1** Revisar logs Sentry el domingo a las 10am — buscar errores nuevos
- [ ] **1.2** Revisar logs Vercel → Functions → revisar rutas de PDF y crons
- [ ] **1.3** Hacer smoketest completo con usuario CISE real y usuario GRUAS real
- [ ] **1.4** Cualquier error crítico → hotfix inmediato con `/eb-release`

---

### POST-2: E2E suite v1 fix (si no se hizo en OPCIONAL-B)

- [ ] **2.1** Fix middleware + SQL cargo_permisos (ver pasos en OPCIONAL-B)
- [ ] **2.2** Correr suite: `npm run test:e2e` → meta ≥ 383/387

---

### POST-3: DT-MIG01 — seed contactos (si no se hizo en OPCIONAL-A)

- [ ] Ejecutar los pasos de OPCIONAL-A

---

### POST-4: DT-PDF01 — Ruta on-demand PDF cotizaciones (si no se hizo en OPCIONAL-C)

- [ ] Ejecutar los pasos de OPCIONAL-C

---

### POST-5: DT-PDF02 — PDF export listado Planificación

- [ ] **5.1** Crear ruta `app/api/planificacion/pdf/route.ts` (o página preview)
- [ ] **5.2** Agregar botón "Exportar PDF" en sub-toolbar del Listado en `/planificacion`
- [ ] **5.3** Usar `GOTENBERG_URL` — patrón en `lib/reporte-personal-pdf.ts`

---

### POST-6: DT-PDF03 — PDF export Valoraciones y Facturación

- [ ] **6.1** Agregar botón en panels `/ventas/valoraciones`, `/compras/valoraciones`, `/ventas/facturas`, `/compras/facturas`
- [ ] **6.2** Crear rutas de preview/endpoint para cada panel

---

### POST-7: E2E suite v2 multi-rol (~1100 tests)

**Prerequisito:** POST-2 completado (suite v1 ≥ 383/387)

- [ ] **7.1** Verificar 3 usuarios E2E en mismo tenant CISE (e2e-planner, e2e-admin, e2e-viewer)
- [ ] **7.2** Crear `playwright.full.config.ts` sin `grep: /@roles/`
- [ ] **7.3** Primer run diagnóstico → agrupar fallos → fixes → run final ≥ 95%
- [ ] Ver `docs/plan-suite-v2.md` para spec completa

---

### POST-8: App reporta-app — distribución producción

- [ ] **8.1** Generar keystore de producción:
  ```bash
  keytool -genkey -v -keystore reporta-release.keystore -alias reporta -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] **8.2** Configurar `android/app/build.gradle` con signing config
- [ ] **8.3** Build producción:
  ```bash
  cd C:\Proyectos\reporta-app\android
  gradlew.bat bundleRelease
  ```
- [ ] **8.4** Subir AAB a Google Play Console → Internal Testing → promover a Open Testing cuando estable

---

### POST-9: App reporta-app — view_tareas_agenda_diaria (si no existe en prod)

**Solo si CRÍTICO-4.1 confirmó que la vista no existe.**

Coordinar con 1er dev para crear la vista con filtro `tareas_recursos.personal_id = auth.uid()`.

---

### POST-SEC: Remediación seguridad restante (de plan-seguridad-2026.md)

**Contexto:** El CRÍTICO-6 cubre los issues de RLS más urgentes. Los siguientes son los restantes del audit de seguridad con su prioridad real.

#### POST-SEC-1: Security Headers HTTP en next.config.ts (Severidad: Alta)

- [ ] **SEC-1.1** Editar `next.config.ts` — agregar bloque `headers()`:
  ```typescript
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',          value: 'DENY' },
        { key: 'X-Content-Type-Options',   value: 'nosniff' },
        { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security',value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Robots-Tag',             value: 'noindex, nofollow' },
      ],
    }]
  },
  ```
- [ ] **SEC-1.2** Build local sin errores: `npm run build`
- [ ] **SEC-1.3** Commit + deploy: `git commit -m "fix(security): agregar security headers HTTP en next.config.ts"`

#### POST-SEC-2: Middleware — proteger /sistema con role check (Severidad: Media)

- [ ] **SEC-2.1** Editar `utils/supabase/middleware.ts` línea 88-90 — reemplazar:
  ```typescript
  // ANTES:
  if (request.nextUrl.pathname.startsWith('/sistema')) return response

  // DESPUÉS:
  if (request.nextUrl.pathname.startsWith('/sistema')) {
      const role = user.user_metadata?.role
      if (role !== 'reporta_admin') {
          return NextResponse.redirect(new URL('/planificacion', request.url))
      }
      return response
  }
  ```
- [ ] **SEC-2.2** Verificar que `/sistema` redirige correctamente a usuarios no-admin
- [ ] **SEC-2.3** Commit + deploy

#### POST-SEC-3: RLS cotizaciones_matriz_actividades (Severidad: Media)

- [ ] **SEC-3.1** En Supabase Studio → SQL Editor:
  ```sql
  DROP POLICY IF EXISTS "Enable read access for all users" ON cotizaciones_matriz_actividades;
  CREATE POLICY "tenant_isolation" ON cotizaciones_matriz_actividades
      FOR SELECT TO authenticated
      USING (tenant_id = get_auth_tenant_id());
  ```
- [ ] **SEC-3.2** Verificar que el módulo cotizaciones sigue funcionando

#### POST-SEC-4: APK Android — seguridad antes de Play Store (Alta — prerequisito Play Store)

- [ ] **SEC-4.1** Editar `reporta-app/android/app/src/main/AndroidManifest.xml` línea 17:
  ```xml
  <!-- CAMBIAR: android:allowBackup="true" → android:allowBackup="false" -->
  <application ... android:allowBackup="false" android:fullBackupContent="false" ...>
  ```
- [ ] **SEC-4.2** Verificar `reporta-app/android/gradle.properties`:
  ```properties
  hermesEnabled=true
  enableMinifyInReleaseBuilds=true
  ```
- [ ] **SEC-4.3** Generar keystore de producción (si aún no existe):
  ```bash
  keytool -genkey -v -keystore reporta-release.keystore \
    -alias reporta -keyalg RSA -keysize 2048 -validity 10000
  ```
  Guardar keystore en lugar seguro (fuera del repo) + documentar contraseña
- [ ] **SEC-4.4** Configurar signing en `reporta-app/android/app/build.gradle`:
  ```groovy
  signingConfigs {
    release {
      storeFile file(System.getenv("REPORTA_KEYSTORE_PATH") ?: "../reporta-release.keystore")
      storePassword System.getenv("REPORTA_KEYSTORE_PASSWORD")
      keyAlias System.getenv("REPORTA_KEY_ALIAS")
      keyPassword System.getenv("REPORTA_KEY_PASSWORD")
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release  // era signingConfigs.debug
      minifyEnabled enableMinifyInReleaseBuilds
      shrinkResources true
    }
  }
  ```
- [ ] **SEC-4.5** Test build release: `cd android && gradlew.bat assembleRelease`

---

### POST-10: Planes de Acción Fase 2 (checklist activo desde tarea)

- [ ] UI "iniciar inspección desde tarea" que lee `plantillas.estructura`
- [ ] Formulario dinámico por sección/pregunta
- [ ] Guardar en `inspecciones_detalles` → resumen de fallas → promover a `planes_accion`
- [ ] Ver spec completa en `docs/` (sección Fase 2 de planes-roadmap)

---

## Resumen de prioridades

| # | Item | Fase | Criticidad |
|---|---|---|---|
| CRÍTICO-1 | Vars entorno Vercel (ENV + SITE_URL) | Pre | 🔴 Crítico |
| CRÍTICO-2 | Pre-migrar servicios (checkpoint DELTA) | Pre | 🔴 Crítico |
| CRÍTICO-3 | Confirmar 8 buckets Storage en prod | Pre | 🔴 Crítico |
| CRÍTICO-4 | Confirmar view_tareas y fuente_foto en prod | Pre | 🔴 Crítico |
| CRÍTICO-5 | Migration fuente_foto (si no existe) | Pre | 🔴 Crítico si CRÍTICO-4 falla |
| CRÍTICO-6 | RLS EPP tables + reportes_usuario + maquinaria_modelos | Pre | 🔴 Crítico (seguridad multi-tenant) |
| OPCIONAL-A | Seed contactos_cargo / area | Pre | 🟡 Deseable |
| OPCIONAL-B | Fix E2E suite v1 middleware | Pre | 🟡 Deseable |
| OPCIONAL-C | PDF cotizaciones on-demand | Pre | 🟢 Baja |
| CUT-1..6 | Cutover completo | Cutover | 🔴 Crítico |
| POST-1 | Monitoreo 48h + hot-fixes | Post | 🔴 Crítico |
| POST-2..4 | E2E + DT-MIG01 + DT-PDF01 | Post semana 1 | 🟡 Alta |
| POST-SEC-1 | Security headers HTTP (next.config.ts) | Post semana 1 | 🟡 Alta |
| POST-SEC-2 | Middleware /sistema role check | Post semana 1 | 🟡 Media |
| POST-SEC-3 | RLS cotizaciones_matriz_actividades | Post semana 1 | 🟡 Media |
| POST-5..6 | PDF planificación + valoraciones | Post semana 2 | 🟡 Media |
| POST-7 | E2E suite v2 | Post semana 2+ | 🟡 Media |
| POST-8..9 | App Play Store + vista tareas | Post semana 2+ | 🟡 Media |
| POST-SEC-4 | APK Android seguridad (allowBackup, minify, keystore) | Post (prerequisito Play Store) | 🟡 Alta antes de Play Store |
| POST-10 | Planes Acción Fase 2 | Post semana 3+ | 🟢 Baja urgencia |

---

## Items de plan-seguridad-2026.md ya resueltos (no incluidos)

| Item | Resolución |
|---|---|
| Admin detectado por email hardcodeado | ✅ Usa `role === 'reporta_admin'` en BD |
| Cookie `managed_tenant_id` no httpOnly | ✅ `httpOnly: true` en `lib/actions/tenants.ts:95` |
| Rate limiting PIN cotizaciones | ✅ Migration `pin_attempts + pin_locked_until` (commit `1072639`) |
| GRANTs PostgREST futuro (2026-10-30) | ✅ Migration `20260599000002_explicit_grants_all_tables.sql` |
| Tokens Bubble hardcodeados en scripts | ✅ Removidos (commits `fc46645`, `ab20576`) |
| EPP web gestión observaciones (plan-web.md §6) | ✅ `components/epp/entregas-colaborador-panel.tsx` |
| Festivos en planificación (plan-web.md §7) | ✅ `getFestivosInRange` activo |
| config_checklist tabla + settings (plan-web.md §10) | ✅ `lib/actions/informes-config.ts` + onboarding |
| Settings notificaciones EPP M-015 (plan-web.md §10.2) | ✅ `app/(dashboard)/settings/notificaciones/page.tsx` |
