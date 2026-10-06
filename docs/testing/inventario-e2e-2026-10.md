# Inventario E2E vs Template de Listados UI v1.2

**Fecha:** 2026-10-05
**Autor:** FASE C, tarea C2 del plan `docs/superpowers/plans/2026-10-05-cierre-pendientes-y-deudas.md`
**Base:** SHA `d2edc29`, rama `chore/fase-c-c2-inventario`
**Suite:** 48 specs totales en `tests/flows/` + `tests/smoke.spec.ts` + `tests/09-auth-flows.spec.ts` (~388 tests)
**Template UI:** `docs/UI-TEMPLATE-LISTADOS.md` v1.2 (2026-07-14) — aplicado en PROD a Usuarios, Maquinaria, Terceros, Cotizaciones y los demás 15/15 módulos de la auditoría UI.

---

## 1. Resultado del último run (`npm run test:e2e`)

```
startTime: 2026-10-06T04:19:06Z
duration:  62.9 s
expected:  0
skipped:   376
unexpected: 4   (los 4 proyectos "setup" fallaron antes de poder correr nada)
flaky:     0
```

**Causa raíz del cero-pasa:**

1. **Dev server ausente** — `setup-admin`, `setup-planner`, `setup-viewer` fallan con
   `page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login`. Playwright
   no levanta el dev server automáticamente (no hay `webServer` en
   `playwright.config.ts`). Al reventar los 3 setups, Playwright marca como `skipped` los
   376 tests que dependen de `.auth/*.json`.
2. **Env incompleto** — `setup-reporta-admin` falla con
   `Missing TEST_REPORTA_ADMIN_EMAIL / TEST_REPORTA_ADMIN_PASSWORD` (no están en
   `.env.test`). Esto bloquea todos los specs con tag `@sistema` (ej. `45-permisos-cargo`).

Hasta que (1) y (2) se resuelvan **el inventario de fallas intra-spec no se puede
tomar con un solo `npm run test:e2e`**. Por eso este documento prioriza análisis
estático de los specs — grep por selectores incompatibles con el template v1.2 — y lo
cruza con los módulos que ya están en PROD con CISE/GRUAS.

> Nota: parte de este estado concuerda con la DUDA-E2E-001 (`docs/TECHNICAL_DEBTS.md`),
> ya re-verificada el 2026-09-26 como "no se reproduce" cuando el dev server corre. Lo
> nuevo acá es la falta de `TEST_REPORTA_ADMIN_*` (bloquea los 4 roles al estar
> `setup-reporta-admin` en el DAG), que no estaba documentada.

---

## 2. Inventario por spec (static-pass)

Columna "Rotura prob." se calcula con grep de patrones del v1 que la UI v1.2 cambió, no por run real. Codificación:

- **(a)** selectores de template v1.2 desactualizados (tabs Papelera/Activos, headers removidos, columnas de Estado, filtros embudo, placeholder de búsqueda)
- **(b)** cambio `terceros_personal` → `profiles` (DUDA-TER-006)
- **(c)** sesión/auth (ex DUDA-E2E-001 — hoy = dev server + env)
- **(d)** data/fixtures viejas
- **(e)** bug real de la app

| Spec | Módulo PROD | # tests | Categoría probable | Notas estáticas |
|------|-------------|--------:|--------------------|-----------------|
| 02-tarea-con-recursos | Planificación | 1 | (c) | Depende de dev + planner.json |
| 03-editar-fechas-tarea | Planificación | 1 | (c) | |
| 04-add-remove-recursos | Planificación | 1 | (c) | |
| 05-recursos-por-fecha-distinta | Planificación | 1 | (c) | |
| 06-ver-reportes | Reportes Maquinaria/Personal | 1 | (c) | |
| 07-epp-alertas-emails | EPP | 1 | (c) | |
| 08-formatos-informes | Informes/Formatos | 1 | (c) | |
| 10-terceros | Terceros | 4 | (a)(c) | Usa `input[placeholder*="Buscar"]` (compatible), pero `h1 heading` ya no existe (v1.2 lo hace `sr-only`); verificar `page.locator('h1').first()` |
| 11-maquinaria | Maquinaria | 4 | (a)(c) | Igual que 10 — heading `h1` ahora sr-only; búsqueda genérica compatible |
| 12-cotizaciones | Cotizaciones | 2 (11 asserts) | (a)(c)(e) | `embudo de la columna Estado` — v1.2 regla 6b: **sin columna Estado**. Probable rot. Además TK-OI7 test tiene `Runtime Error: Jest worker` ya documentado |
| 13-planes-accion | Planes de Acción | 2 | (c) | |
| 14-epp-completo | EPP | 2 | (c) | |
| 15-ventas | Ventas | 2 | (c) | |
| 16-compras | Compras | 2 | (c) | |
| 17-usuarios | Usuarios | 2 | (c) | `h1` sr-only — assert `h1.first().toContainText(/Usuarios/)` sigue pasando porque sr-only tiene el texto |
| 18-role-access | RBAC | 3 | (c) | tag `@roles` |
| 19-settings | Settings | 1 | (c) | |
| 20-pre-cutover-settings-crud | Settings | 3 | (c)(d) | |
| 21-pre-cutover-usuarios-crud | Usuarios | 1 | **(a)**(c) | **`page.getByRole('tab', { name: /Papelera\|Inactivos/i })`** — v1.2 usa toggle de botón `[Activos\|Papelera]`, no tab role |
| 22-pre-cutover-maquinaria-crud | Maquinaria | 3 | **(a)**(c) | mismo patrón tab Papelera |
| 23-pre-cutover-terceros-crud | Terceros | 3 | **(a)**(c) | mismo patrón tab Papelera |
| 24-pre-cutover-epp-full | EPP | 2 | (c) | |
| 25-pre-cutover-cotizacion-full | Cotizaciones | 2 | (c)(d) | |
| 26-cotizaciones-panel | Cotizaciones | 1 | (c) | |
| 26-pre-cutover-planificacion-full | Planificación | 3 | (c) | Doble numeración 26 (ver §4) |
| 27-pre-cutover-reportes-full | Reportes | 3 | (c) | |
| 28-acceso-denegado-planner | RBAC | 1 | (c) | |
| 28-pre-cutover-informes-full | Informes | 3 | (c) | Doble numeración 28 |
| 29-pre-cutover-planes-full | Planes de Acción | 2 | (c) | |
| 30-pre-cutover-ventas-full | Ventas | 2 | (c) | |
| 31-pre-cutover-compras-full | Compras | 2 | (c) | |
| 32-pre-cutover-tasas-cambio | Settings/Finanzas | 3 | (c) | |
| 33-pre-cutover-ciclo-venta | Ventas | 3 | (c) | |
| 34-pre-cutover-ciclo-compra | Compras | 3 | (c) | |
| 35-pre-cutover-agenda-sistema | Agenda | 2 | (c) | |
| 36-pre-cutover-epp-extra | EPP | 3 | (c) | |
| 37-pre-cutover-settings-avanzados | Settings | 3 | (c) | |
| 38-pre-cutover-terceros-modulos | Terceros | 2 | (c) | |
| 39-pre-cutover-auth | Auth | 3 | **(c)** | tag `@auth` |
| 40-pre-cutover-informes-checklist | Informes | 3 | (c) | |
| 41-pre-cutover-validaciones | Varios | 4 | (c) | |
| 42-pre-cutover-navegacion | Nav/Breadcrumbs | 3 | (a)(c) | v1.2 regla 1: SIN breadcrumb. Tests de nav deberían no asumir breadcrumb visible |
| 43-pre-cutover-personal-tercero-reportes | Personal/Reportes | 3 | **(b)**(c) | Usa `createTerceroPersonal` → `terceros_personal` (tabla aún existe en types/supabase.ts con 21 referencias, pero DUDA-TER-006 dice que la fuente de verdad migró a `profiles`). Spec propio imprime "verificar que terceros_personal existe en el tenant de test" |
| 44-pre-cutover-maquinaria-alquiler | Maquinaria | 2 | (c) | |
| 45-permisos-cargo | Sistema (Superadmin) | 5 | **(c)** | tag `@sistema` — bloqueado hoy por `TEST_REPORTA_ADMIN_*` faltante |
| 46-soporte-tickets | Soporte | 6 | **(c)** | tag `@soporte @pre-cutover` — también `@sistema` en algunos |
| tests/smoke.spec.ts | Home/Smoke | — | (c) | |
| tests/09-auth-flows.spec.ts | Auth | — | (c) | |

### Resumen de categorías (static)

| Categoría | # specs probable | % |
|-----------|-----------------:|--:|
| (a) Template v1.2 desactualizado | **5** (12, 21, 22, 23, 42) | 10% |
| (b) `terceros_personal` → `profiles` | **1** (43) | 2% |
| (c) Sesión/dev/env (bloqueo global HOY) | **46** (todos) | 100% |
| (d) Fixtures viejas | *indeterminado* (requiere run con dev up) | — |
| (e) Bug real de la app | **1 conocido** (12 TK-OI7 Jest worker Turbopack) | 2% |

- **Static-ok (sin señal de rotura v1.2):** ~39 specs → quedan sujetos a lo que revele un run real.
- **Static-roto por v1.2:** 4 specs (21, 22, 23, 42) → tab `Papelera`, breadcrumbs.
- **Static-roto parcial por v1.2:** 1 spec (12) → columna Estado + `Runtime Error` ya reportado.
- **Static-roto por DUDA-TER-006:** 1 spec (43).

> El 100% está "bloqueado-por-c" hoy porque sin dev server + env no corre nada; esa capa (c) se desbloquea con una sola acción de infraestructura (ver §5) y después queda el verdadero inventario.

---

## 3. Patrones repetidos que un helper reutilizable debería cubrir (input para C3)

De grep sobre `tests/flows/*.spec.ts`:

### Top 3 helpers que más tracción tendrían

1. **`openListado(page, ruta)`** — espera `networkidle` + asserta "no Application error" + localiza `h1.sr-only` para validar que la página de listado cargó. Hoy este patrón se repite en al menos 14 archivos (`page.goto` + `waitForLoadState('networkidle', { timeout })` + `expect(body).not.toContainText('Application error')`). Equivale a lo que la auditoría UI 15/15 define como el "shell" común del listado v1.2.
2. **`toggleActivosPapelera(page, 'papelera' | 'activos')`** — hoy 4 specs usan `getByRole('tab', { name: /Papelera/ })` o `getByRole('button', { name: /Papelera/ })` con `.or(...)` encadenado. El template v1.2 define esto como un toggle Activos|Papelera en la botonera derecha, no como tab. Un helper único con el selector real evita 4 roturas y futuras regresiones.
3. **`buscarEnListado(page, query)`** — hoy 14 specs usan variaciones de `input[placeholder*="Buscar"]`, `input[type="search"]`, `getByPlaceholder(...)`. v1.2 regla 2 estandariza el placeholder (`"Buscar por nombre, documento o email..."`). Un helper centraliza el selector y encapsula el `waitForTimeout(600)` para el debounce que casi todos los specs copian.

### Helpers secundarios recomendados

- **`exportarXLS(page)`** — **ningún** spec actualmente ejercita el botón `↓XLS` del v1.2. Es gap de cobertura; agregarlo como helper en C3 habilita escribir tests pequeños en C4 que cubran la regla 5 del template en los 15 módulos.
- **`abrirEmbudoColumna(page, 'Rol')`** — `ColumnFilterHeader` es componente propio y nadie lo testea; un helper evita que cada módulo reinvente el selector del botón-embudo.
- **`paginar(page, { pagina?, tamañoPagina? })`** — `DataTablePagination` / `TablePaginationBar` v1.2 son uniformes; sin helper, cada spec reinventa `getByRole('button', { name: 'Siguiente' })`.
- **`loginComo(page, 'admin'|'planner'|'viewer'|'reporta_admin')`** — los setup files duplican la lógica del `/login` cuatro veces; consolidar reduce la zona de impacto cuando se renombra un selector del login.

---

## 4. Observaciones adicionales (fuera del template)

- **Doble numeración de specs:** `26-cotizaciones-panel.spec.ts` + `26-pre-cutover-planificacion-full.spec.ts`, idem con `28-acceso-denegado-planner.spec.ts` + `28-pre-cutover-informes-full.spec.ts`. Playwright los corre bien, pero el reporte HTML los agrupa mal. Renombrar en una pasada de limpieza (nota, no incluido en C4).
- **No hay cobertura del `+ Nuevo` naranja (regla 5c)** como test de contrato visual — queda fuera del scope v1.2 pero vale anotarlo.
- **46-soporte-tickets** tiene 54 occurrencias de `test(` para 6 tests reales — abusa de `test.describe` anidado; no es roto, solo ruidoso.

---

## 5. Priorización para C3/C4

### Primero (módulos ya en PROD con CISE/GRUAS, con rotura real por v1.2):

1. **21-pre-cutover-usuarios-crud** — Usuarios es el piloto del template v1.2; su spec Papelera es la primera señal clara de rotura (a). Fix = helper `toggleActivosPapelera`.
2. **22-pre-cutover-maquinaria-crud** — Maquinaria tiene v1.2 aplicado; mismo helper cubre.
3. **23-pre-cutover-terceros-crud** — Terceros tiene v1.2 aplicado; mismo helper cubre.
4. **12-cotizaciones** — Cotizaciones tuvo TK-OI7 recién mergeado (v3.12.6); el embudo de la columna Estado contradice la regla 6b del v1.2. Fix = eliminar el test o re-apuntar a embudos legítimos (Vendedor, Cliente, Área).
5. **43-pre-cutover-personal-tercero-reportes** — único bloqueado por DUDA-TER-006; requiere decidir si re-apuntar `createTerceroPersonal` a `profiles` o deprecarlo cuando el UI del módulo externo desaparezca.

### Segundo (desbloqueo global):

6. **Pre-requisito único para C4**: Playwright `webServer` config + `.env.test` con `TEST_REPORTA_ADMIN_*`. Sin eso, cualquier arreglo de spec no se puede validar en CI.

### Tercero (verdadero inventario de fallas):

7. Correr `npm run test:e2e` con el dev server arriba. Lo que caiga ahí es el inventario real de (d)/(e) que hoy no se puede ver.

---

## 6. Comparación resumida

Hasta no desbloquear el pre-requisito de §5, el conteo "ok vs roto vs parcial" solo puede darse de forma estática:

| Estado | # specs | Nota |
|--------|--------:|------|
| 100% ok (static-pass + v1.2 compat) | ~39 | subject-to-change tras run real |
| Rotos (static) | 5 | 21, 22, 23, 42, 43 |
| Parcialmente rotos (static) | 1 | 12 |
| Setup-blocker | 4 proyectos | setup-admin/planner/viewer/reporta-admin |

---

## 7. Siguiente paso recomendado

- **C3**: implementar los 3 helpers top (`openListado`, `toggleActivosPapelera`, `buscarEnListado`) + los 4 secundarios como stubs. Son ortogonales a dev server y bloqueo de env.
- **C4**: dividido en dos sub-tareas paralelas: (i) desbloqueo infra (webServer + env), (ii) pass de arreglos spec-por-spec usando los helpers de C3, atacando primero los 5 specs listados en §5.
