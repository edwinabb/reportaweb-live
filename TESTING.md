# Testing — REPORTA WEB v3

Guía de tests E2E con Playwright. Arrancado 2026-04-18. Multi-rol desde 2026-04-26.

## Cómo correr

```bash
npm run test:e2e              # suite completa (todos los proyectos/roles)
npm run test:e2e:ui           # modo interactivo (recomendado la primera vez)
npm run test:e2e:smoke        # solo tests con tag @smoke (~30s)
npm run test:e2e:report       # abre el último reporte HTML

# Por rol
npm run test:e2e:planner      # tests con rol planner (project: chromium)
npm run test:e2e:admin        # tests con rol admin_tenant (project: chromium-admin)
npm run test:e2e:viewer       # tests con rol viewer (project: chromium-viewer)
```

Para correr un solo archivo:

```bash
npx playwright test tests/smoke.spec.ts
npx playwright test tests/flows/10-terceros.spec.ts --headed   # con navegador visible
npx playwright test --debug                                     # debugger línea por línea
```

## Setup inicial (una vez)

### 1. Crear 3 usuarios de test en Supabase

Crear en Supabase Auth > Users > Add User los siguientes 3 usuarios:

| Email                      | Contraseña       | Rol            |
|----------------------------|------------------|----------------|
| `e2e-planner@reporta.la`   | (generar fuerte) | `planner`      |
| `e2e-admin@reporta.la`     | (generar fuerte) | `admin_tenant` |
| `e2e-viewer@reporta.la`    | (generar fuerte) | `viewer`       |

Luego ejecutar el script SQL para asignar tenant y rol en `profiles`:

```bash
# En Supabase SQL Editor o psql:
scripts/seed-e2e-users.sql
```

El script hace `INSERT ... ON CONFLICT DO UPDATE` — es idempotente.

**Tenant CISE** (por default): `1cb97ec7-326c-4376-93ee-ed317d3da51b`

### 2. Crear `.env.test` en la raíz (gitignoreado)

```env
# ── Usuarios multi-rol ────────────────────────────────────────────────────────
TEST_PLANNER_EMAIL=e2e-planner@reporta.la
TEST_PLANNER_PASSWORD=<contraseña del planner>

TEST_ADMIN_EMAIL=e2e-admin@reporta.la
TEST_ADMIN_PASSWORD=<contraseña del admin>

TEST_VIEWER_EMAIL=e2e-viewer@reporta.la
TEST_VIEWER_PASSWORD=<contraseña del viewer>

# ── Retrocompatibilidad (usado por factories legacy) ───────────────────────────
TEST_USER_EMAIL=e2e-planner@reporta.la
TEST_USER_PASSWORD=<igual que PLANNER_PASSWORD>

# ── Tenant y URL ──────────────────────────────────────────────────────────────
TEST_TENANT_ID=1cb97ec7-326c-4376-93ee-ed317d3da51b  # CISE por default
# TEST_BASE_URL=https://staging.reporta.la             # override para staging
```

### 3. Correr el setup

```bash
npm run test:e2e:smoke
```

Si todo está bien:

1. Auto-arranca `npm run dev`.
2. Logea con los 3 usuarios y guarda cookies en `.auth/planner.json`, `.auth/admin.json`, `.auth/viewer.json`.
3. Ejecuta los tests de smoke.

## Cobertura actual

| Módulo                                     | Archivo                                                    | N  | Tags                | Roles         | Estado |
| ------------------------------------------ | ---------------------------------------------------------- | -- | ------------------- | ------------- | ------ |
| Smoke (sidebar)                            | `tests/smoke.spec.ts`                                      | 18 | @smoke              | planner       | ✅     |
| Flow 02 — Tarea con recursos               | `tests/flows/02-tarea-con-recursos.spec.ts`                | 1  | @critical           | planner       | ✅     |
| Flow 03 — Editar fechas tarea              | `tests/flows/03-editar-fechas-tarea.spec.ts`               | 1  | @critical           | planner       | ✅     |
| Flow 04 — Add/remove recursos              | `tests/flows/04-add-remove-recursos.spec.ts`               | 1  | @critical           | planner       | ✅     |
| Flow 05 — Recursos por fecha distinta      | `tests/flows/05-recursos-por-fecha-distinta.spec.ts`       | 1  | @critical           | planner       | ✅     |
| Flow 06 — Ver reportes                     | `tests/flows/06-ver-reportes.spec.ts`                      | 1  | @critical           | planner       | ✅     |
| Flow 07 — EPP alertas + emails             | `tests/flows/07-epp-alertas-emails.spec.ts`                | 5  | @epp                | planner       | ✅     |
| Flow 08 — Formatos + Informes              | `tests/flows/08-formatos-informes.spec.ts`                 | 4  | @formatos           | planner       | ✅     |
| Flow 09 — Auth flows                       | `tests/09-auth-flows.spec.ts`                              | 5  | @auth @smoke        | todos         | ✅     |
| Flow 10 — Terceros CRUD                    | `tests/flows/10-terceros.spec.ts`                          | 7  | @critical           | admin         | ✅     |
| Flow 11 — Maquinaria CRUD                  | `tests/flows/11-maquinaria.spec.ts`                        | 6  | @critical           | admin         | ✅     |
| Flow 12 — Cotizaciones + roles             | `tests/flows/12-cotizaciones.spec.ts`                      | 7  | @critical @roles    | admin+viewer  | ✅     |
| Flow 13 — Planes de Acción                 | `tests/flows/13-planes-accion.spec.ts`                     | 5  | @critical @roles    | planner+viewer| ✅     |
| Flow 14 — EPP completo                     | `tests/flows/14-epp-completo.spec.ts`                      | 7  | @epp @critical      | planner       | ✅     |
| Flow 15 — Ventas                           | `tests/flows/15-ventas.spec.ts`                            | 5  | @critical @roles    | admin+viewer  | ✅     |
| Flow 16 — Compras                          | `tests/flows/16-compras.spec.ts`                           | 5  | @critical @roles    | admin+viewer  | ✅     |
| Flow 17 — Usuarios                         | `tests/flows/17-usuarios.spec.ts`                          | 5  | @critical @roles    | admin+viewer  | ✅     |
| Flow 18 — RBAC access control              | `tests/flows/18-role-access.spec.ts`                       | 8  | @roles @smoke       | todos         | ✅     |
| Flow 19 — Settings catálogos               | `tests/flows/19-settings.spec.ts`                          | 8  | @settings @critical | admin         | ✅     |

Total estimado: ~100 tests

## Tests con problemas conocidos (fixme/skip activos)

### TEST-001 — `tests/smoke.spec.ts` (filtro de consola)

- **Síntoma**: hydration mismatch de Radix intermitente en `/formatos` y `/planes-accion/panel`
- **Causa**: Radix UI + React 19 `useId()` genera IDs distintos server/client cuando hay Suspense boundaries
- **Fix parcial (v3.5.3)**: `/planes-accion/panel` — eliminado Suspense in-component, migrado a `loading.tsx`. El warning en `/formatos` puede persistir intermitentemente por el `DropdownMenu` del layout. Ver DT-001 en `DEUDA_TECNICA.md`.
- **Estado**: Baja prioridad — no bloquea

### TEST-002 — 6 tests RBAC marcados `test.fixme` (bloqueo DT-002)

Archivos afectados:

| Archivo | Test fixme |
| ------- | --------- |
| `tests/flows/12-cotizaciones.spec.ts` | viewer no ve botón nueva cotización |
| `tests/flows/17-usuarios.spec.ts` | viewer no puede acceder a /users |
| `tests/flows/18-role-access.spec.ts` | 4 tests de roles (admin sidebar, viewer planificación/settings) |

**Bloqueado por**: DT-002 — los 3 usuarios de test (`e2e-planner`, `e2e-admin`, `e2e-viewer`) deben crearse en Supabase Auth antes de activar estos tests.

**Para desbloquear**: seguir pasos en DT-002 en `DEUDA_TECNICA.md`, luego quitar `test.fixme` de los 6 tests.

### TEST-003 — Personal externo migrado a `profiles` (DUDA-TER-006, 2026-07-17)

El módulo Terceros cambió el modelo de personal externo: ya no se usa la tabla
`terceros_personal` (deprecada y vaciada — los residuos E2E `E2E_TP_%` fueron
borrados de TEST y PROD el 2026-07-17); el personal externo son `profiles` con
`tercero_id` y/o `personal_externo = true`.

Impacto en la suite:

| Pieza | Estado | Qué cambiar |
| ----- | ------ | ----------- |
| `tests/flows/43-pre-cutover-personal-tercero-reportes.spec.ts` | 🔴 Desactualizado | El flujo EXTERNO ya no escribe `tercero_personal_id`: el form guarda el profile externo en `personal_id`. Reescribir el caso EXTERNO creando un profile con `tercero_id` (no una fila en `terceros_personal`). |
| `tests/helpers/data-factory.ts` → `createTerceroPersonal` | 🔴 Deprecado | Inserta en `terceros_personal` (tabla deprecada). Sustituir por un helper que cree un profile vinculado a un tercero. |
| Picker "personal del proveedor" en reportes | Cambió | `getTerceroPersonalList` ahora lee `profiles` (externos por `tercero_id`/`personal_externo`). Los selectores E2E siguen válidos, pero los datos seed deben ser profiles. |
| Alta de personal externo | Nuevo flujo | `/terceros/personal` → "Nuevo Personal" redirige a `/users/create?personal_externo=1`; el editor de tercero tiene tab **Personal** con alta vía `/users/create?tercero_id=...`. El form de usuarios tiene checkbox "Personal externo" + selector de tercero. |

Además el módulo Terceros aplicó el template v1.2 (ver DUDA-E2E-001 en
`docs/TECHNICAL_DEBTS.md`): búsqueda multicampo, botones Activos/Papelera/XLS,
columna "Estado SUNAT" restaurada en la lista de terceros, y validación de
formularios relajada en modo edición (rubro/RUC en tercero, cargo en contacto
solo son requeridos al crear).

## Regresiones registradas

| Fecha | Test | Pasó en | Rompió en | Fix en | Notas |
| ----- | ---- | ------- | --------- | ------ | ----- |
| —     | —    | —       | —         | —      | —     |

## Convenciones

### Tags

- `@smoke` — tests rápidos (< 5s) que cubren el happy path. Canario post-deploy.
- `@critical` — flujos que si fallan bloquean producción.
- `@roles` — tests de control de acceso por rol.
- `@epp` — módulo EPP.
- `@auth` — flujos de autenticación/autorización.
- `@settings` — configuración de tenant.
- `@slow` — tests que tardan > 30s (uploads, PDFs, etc.). Excluidos en dev por default.

```ts
test('crear cotización @critical @smoke', async ({ page }) => { ... })
```

### Anotaciones

- `test.fixme('...', async () => {})` — test conocido como roto, no bloquea la suite. **Siempre** dejar un comment con ID referenciando la tabla de arriba.
- `test.skip('...', async () => {})` — test salteado por decisión (feature deprecada, etc.).
- `test.only('...', ...)` — **nunca commitear**. Solo para debug local.

### Multi-rol en specs

Cada spec declara el storageState de rol que necesita:

```ts
// Admin
test.use({ storageState: '.auth/admin.json' })

// Viewer
test.use({ storageState: '.auth/viewer.json' })

// Planner (default del project 'chromium' — se puede omitir)
// test.use({ storageState: '.auth/planner.json' })

// Sin sesión (para tests de auth)
test.use({ storageState: undefined })
```

### Page Object Model

Cuando un selector o flujo se repite en varios tests, extraerlo a `tests/pages/<modulo>.page.ts`:

```ts
// tests/pages/planes.page.ts
export class PlanesPage {
    constructor(private page: Page) {}

    async goto() { await this.page.goto('/planes-accion') }
    async firstRowMenu() { return this.page.locator('table tbody tr').first().getByRole('button') }
}
```

Regla de dedo: 3+ repeticiones del mismo selector → extraer.

## Infraestructura

- [playwright.config.ts](playwright.config.ts) — 3 proyectos setup + 3 proyectos chromium (uno por rol).
- [tests/auth/setup-base.ts](tests/auth/setup-base.ts) — lógica compartida de login.
- [tests/auth/setup-planner.ts](tests/auth/setup-planner.ts) — setup para rol planner.
- [tests/auth/setup-admin.ts](tests/auth/setup-admin.ts) — setup para rol admin_tenant.
- [tests/auth/setup-viewer.ts](tests/auth/setup-viewer.ts) — setup para rol viewer.
- [tests/smoke.spec.ts](tests/smoke.spec.ts) — smoke sobre 17 rutas del sidebar.
- [tests/helpers/data-factory.ts](tests/helpers/data-factory.ts) — factories + cleanup automático.
- [tests/helpers/supabase-admin.ts](tests/helpers/supabase-admin.ts) — cliente admin + helpers multi-usuario.
- [scripts/seed-e2e-users.sql](scripts/seed-e2e-users.sql) — SQL one-time para crear los 3 usuarios E2E.
- `.auth/planner.json`, `.auth/admin.json`, `.auth/viewer.json` — cookies persistidas (gitignored).
- `playwright-report/` — último reporte HTML (gitignored).
- `test-results/` — screenshots/vídeos de corridas fallidas (gitignored).

## Cutover day

Agregar al [RUNBOOK-DOMINGO.md](RUNBOOK-DOMINGO.md) después de "7. Anunciar el cierre de ventana":

```bash
# Validar que la app funciona contra los datos migrados
TEST_BASE_URL=https://app.reporta.la npm run test:e2e:smoke
```

Si falla algo, abrir el reporte HTML y diagnosticar antes de cerrar la ventana formalmente.

## E2E Test Architecture: @roles Tests

### Design Pattern

Tests with `@roles` tag validate **role-based access** to UI and features:

- **chromium-admin:** Admin context viewing viewer's UI (validates admin sees the same UI and cannot edit)
- **chromium-viewer:** Viewer context viewing own UI (validates viewer sees restricted UI without creation buttons)
- **chromium:** Planner context — does NOT run @roles tests (see "Why @roles Excluded from chromium?" below)

### Why @roles Excluded from chromium?

The same test (e.g., "viewer ve listado de cotizaciones") running in chromium (planner context) with viewer credentials is **redundant**:

1. It validates viewer access, not planner access
2. Sharing `.auth/viewer.json` file across multiple browser contexts causes Supabase refresh_token rotation conflicts
   - Supabase rotates refresh_token on first use
   - Token rotates in browser context but NOT in `.auth/viewer.json` file on disk
   - Next test loads stale token → rejected → redirect to /login
3. Planner access is validated separately via dedicated access-denial tests

### Access-Denial Tests

Separate test suite (`tests/flows/28-acceso-denegado-planner.spec.ts`) validates that **planner is denied access** to restricted modules (cotizaciones, ventas, compras).

This complements the @roles tests:
- **@roles tests:** "Viewer CAN access /cotizaciones and sees correct UI"
- **Access-denial tests:** "Planner CANNOT access /cotizaciones and is redirected"

Together they provide complete coverage: viewer has access (not denied), planner does not (properly denied).

---

## E2E Test Results (Post-Refresh_Token Fix)

**Date:** 2026-06-08  
**Suite Duration:** 28.3 minutes  
**Configuration:** JWT TTL = 3600s (1 hour)

### Results

| Metric | Before Fix | After Fix | Change |
|--------|-----------|-----------|--------|
| Tests Passing | 366/388 | 347/374 | -19 tests removed (redundant @roles) |
| Pass Rate | 94.3% | 92.8% | -1.5% (expected: removed redundancy) |
| Tests Skipped | 0 | 3 | New: intentional skips |

### What Changed

**Removed:** 14 @roles tests from chromium (planner context)
- Tests like "viewer ve listado de cotizaciones" no longer run in planner context
- Reason: Redundant (same test, same user, different browser context)
- Solution: Tests now run ONLY in chromium-admin (admin sees viewer UI) and chromium-viewer (viewer sees own UI)

**Added:** 4 access-denial tests (28-acceso-denegado-planner.spec.ts)
- `planner intenta /cotizaciones → redirigido`
- `planner intenta /ventas → redirigido`
- `planner intenta /compras → redirigido`
- `planner PUEDE acceder a /formatos (permitido)`

**Why This Matters:** The fix eliminates refresh_token rotation conflicts when auth files are shared across contexts. Tests are now properly isolated by role.

---

## E2E Architecture: @roles Tests (Reference)

See [CLAUDE.md documentation index](../CLAUDE.md) for ARCHITECTURE.md + ROADMAP.md links.

---

## Next Steps (Post-TTL Increase)

1. **Increase JWT TTL** in Supabase TEST: 3600s → 7200s (manual in dashboard)
2. **Re-run E2E suite:** Expected 370+/374 passing (95%+)
3. **Resolve remaining P1-P5 items:** See ROADMAP.md for blockers + timeline
