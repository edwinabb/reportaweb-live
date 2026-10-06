# Plan maestro — Cierre de pendientes, deudas técnicas, pruebas, seguridad y desempeño

**Fecha:** 2026-10-05 · **Branch base:** `master` (v3.12.6) · **Modo:** fases con agentes autónomos (fork / subagent / Explore / Plan según el tipo de trabajo).

## 0. Convenciones de ejecución

- **Agente por tarea** — cada tarea nombra qué tipo de agente usarla:
  - `Explore` → mapear archivos, grep, levantar inventarios (read-only).
  - `Plan` → diseñar sub-plan técnico cuando una tarea sea no trivial.
  - `fork` → ejecución autónoma heredando contexto (edits + commits dentro de su scope).
  - `general-purpose` → investigaciones multi-paso con tool access completo.
  - `claude` (default) → implementación cuando no aplique otro.
- **Paralelismo** — tareas sin dependencia se despachan en un solo mensaje con múltiples `Agent` calls (ver `superpowers:dispatching-parallel-agents`).
- **Gates** — cada fase termina con `verification-before-completion`: `npm run build`, grep de secrets, y suite E2E del subset tocado antes de pasar a la siguiente.
- **Branch strategy** — una rama por fase (`chore/fase-N-<slug>`), merge a `master` tras review. Fases G/H pueden ir a `develop` largo si Growth Engine entra.
- **Scope control** — nada de refactors oportunistas; cada agente recibe lista cerrada de archivos/tablas a tocar.

---

## FASE A — Seguridad (ALTA, bloquea deploy live)

Objetivo: dejar rotadas todas las credenciales ya expuestas antes de que el apex se bindee a `reportaweb-live`.

| # | Tarea | Agente | Dependencia |
|---|---|---|---|
| A1 | **DUDA-SEC-001** — cargar `sb_secret_` en worker `reportaweb-live`, smoke-test login + acción admin, deshabilitar legacy service_role en Supabase. Runbook: `docs/RUNBOOK-ROTAR-SERVICE-ROLE-PROD.md`. | usuario (credenciales) + `fork` para generar checklist de verificación post-rotación | — |
| A2 | **DUDA-SEC-002** — rotar `BUBBLE_API_TOKEN` en `reporta.la`, revocar los 2 viejos (`2539…`, `5532c3bb…`), reemplazar en `.env.local`, limpiar los 4 docs trackeados que lo tienen hardcoded. | `fork` (edita docs) + usuario (rotación) | — |
| A3 | **DUDA-SEC-003** — revocar `sbp_2135…` y `sbp_bd7c…` en Supabase Dashboard. | usuario | — |
| A4 | **Audit de secretos vigentes** — `general-purpose`: grep contra `.env*`, `wrangler*.toml`, `.claude/*`, historia reciente de git (`git log -p -S sb_secret_ -S sbp_ -S Bearer`) para confirmar que ningún secret quedó committeado. Reporte en `docs/auditoria-seguridad-2026-10-05.md`. | `general-purpose` | A1, A2, A3 |
| A5 | **Baseline de dependencias vulnerables** — `fork`: correr `npm audit --omit=dev --json`, `npm outdated`, snapshot en `docs/auditoria-seguridad-2026-10-05.md`. Preparar PR separado para fixables (sin romper semver). | `fork` | — |

**Gate A:** `git grep -E 'sb_secret_|sbp_|Bearer [0-9a-f]{30}'` vacío + login real + commit "chore(sec): rotación de credenciales".

---

## FASE B — Integridad de datos (cutover residual CISE/GRUAS)

Objetivo: cerrar P-005 completo y los residuales del recorrido Fases 1-9.

| # | Tarea | Agente | Dependencia |
|---|---|---|---|
| B1 | **P-005-A** — ejecutar en PROD el SQL de `docs/superpowers/plans/2026-09-26-p005-backfill-cobros-cise.md` dentro de transacción. Verificar counts (513, 465, 0). | usuario (aprobación + ejecución) + `fork` para validación post-insert | — |
| B2 | **P-005-B** — extraer de Bubble: (a) pagos de venta GRUAS, (b) `bancos` (CISE+GRUAS), (c) `valorizaciones` GRUAS si existen. Script en `scripts/sync-fase9-pagos-gruas.ts` siguiendo el patrón de `sync-fase*.ts`. | `general-purpose` (lee Bubble + genera script) + usuario (ejecución) | B1 |
| B3 | **Relink `banco_id`** — una vez `bancos` migrada, UPDATE sobre `cobros_venta` parseando `comentarios` para resolver `[Banco (Bubble): X]` → `banco_id`. | `fork` | B2 |
| B4 | **DT-RES-001** — cerrar formalmente los residuales no recuperables (685 PDFs, 149 reportes_maquinaria sin FK, GRUAS banco/firma inexistentes). Documento `docs/auditoria-ui/residuales-cierre-definitivo.md` con listas inmutables + decisión del usuario (ignorar vs rehacer manualmente). | `Explore` + usuario | — |
| B5 | **DT-VAL-001** — decisión: backfill opcional de 758 valorizaciones huérfanas 2021 o cerrar como wontfix. | `fork` (análisis) + usuario | — |
| B6 | **DT-TYPES-001** — `npm run types:supabase` + commit `chore(types): regen desde Supabase`. Verificar `npm run build` + `npx tsc --noEmit`. | `fork` | — |

**Gate B:** reporte en `docs/auditoria-ui/estado-datos-2026-10-N.md` con los 4 hallazgos del 10-sep en verde + `npm run build` ok.

---

## FASE C — Pruebas (CRUD + proceso + E2E) · DUDA-E2E-001

Objetivo: dejar la suite E2E verde con el template UI v1.2 + agregar cobertura de flujos de negocio que hoy no se testean.

| # | Tarea | Agente | Dependencia |
|---|---|---|---|
| C1 | **Diagnóstico Turbopack / `/cotizaciones/[id]`** — reproducir sin Playwright el `Runtime Error: Jest worker` tras submit; aislar si es dev-server viciado, race, o bug Next 16. | `general-purpose` (sistemático-debug) | — |
| C2 | **Inventario de specs rotos vs template v1.2** — correr `npm run test:e2e` headless, categorizar fallos por módulo. Output: `docs/testing/inventario-e2e-2026-10.md`. | `Explore` | — |
| C3 | **Helpers reutilizables template v1.2** — crear `tests/helpers/listado-v12.ts` con asserts estándar (búsqueda multicampo, embudos, Activos/Papelera, XLS, paginación, responsive). | `fork` | C2 |
| C4 | **Fix por grupos de módulos** — 3 agentes `fork` en paralelo, uno por grupo: (grupo-a) Usuarios/Maquinaria/Terceros, (grupo-b) Planificación/Informes/EPP, (grupo-c) Ventas/Compras/Cotizaciones. Cada uno usa C3, limita cambios a su grupo. | 3 × `fork` paralelos | C2, C3 |
| C5 | **Nuevas pruebas de proceso de negocio** — flujos end-to-end críticos que hoy no se testean: (1) Lead-trial-pago (cuando Growth Engine arranque), (2) Cotización → aprobación → OT → reporte → factura → cobro (encadenado), (3) Permisos por cargo (cross-tenant isolation). | `Plan` para diseñar casos + `fork` para implementar | C3 |
| C6 | **Pruebas de seguridad** — test-case por tipo: (a) tenant-isolation (usuario de tenant X no ve datos de Y en ninguna action/API), (b) `requireReportaAdmin()` donde debe estar, (c) RLS probada con `anon_key` directo contra las tablas sensibles. | `general-purpose` (lista superficie) + `fork` (tests) | C3 |
| C7 | **CI job** — habilitar `test:e2e:grupo-c` como gate en workflow de PR (que hoy no corre). | `fork` | C4 |

**Gate C:** `npm run test:e2e` verde en local + badge en README actualizado + commit "test: cierre DUDA-E2E-001 + cobertura CRUD/seguridad".

---

## FASE D — Deploy & dominios

Objetivo: cerrar el estándar de dominios 2026-07-22 y dejar `dev.reportar.app` + `reportar.app` apex vivos.

| # | Tarea | Agente | Dependencia |
|---|---|---|---|
| D1 | `npx wrangler deploy --config wrangler.demo.toml` (routes `dev.reportar.app` + `demo.reportar.app` ya actualizadas, pendiente push). Verificar que `dev.reportar.app` sirve el worker y `demo.reportar.app` sigue funcionando durante la transición. | usuario + `fork` (smoke-test con `curl`) | — |
| D2 | **Reporta-admin TEST** — ejecutar `scripts/test-promote-info-reporta-admin.sql` + deploy `wrangler.test.toml` + cargar secret TEST. | usuario + `fork` | — |
| D3 | **Reporta-admin PROD** — deploy real a `admin.reporta.la`, cargar secrets, bind dominio, smoke-test de login. | usuario | A1 |
| D4 | **6 plantillas en `system_document_templates`** — conseguir los `.docx` de docmaker (los 5 que faltan: `valorizacion_venta`, `valorizacion_compra`, `reporte_maquinaria`, `reporte_horas_maquinaria`, `reporte_personal`), subir vía reporta-admin para CISE y GRUAS. | usuario (origen) + `fork` (verificación en Storage) | D3 |
| D5 | **Smoke test bridge PDF Bubble** — las 6 combinaciones tipo × {CISE, GRUAS} deben devolver `status: done` con `pdf_url` válido. | `fork` | D4 |
| D6 | **Bind apex `reportar.app` → `reportaweb-live`** — postergado hasta que Growth Engine tenga home; mantener en el plan como pre-requisito de FASE G. | usuario | FASE G |
| D7 | **Cron jobs Vercel → Cloudflare** — migrar los crons restantes (menos `/api/cron/pdf-jobs` ya resuelto via `pg_cron`+`pg_net`). Inventario con `Explore`. | `Explore` + `fork` | — |

**Gate D:** `curl -I https://dev.reportar.app/` 200 + bridge PDF smoke verde + inventario de crons migrados.

---

## FASE E — Desempeño

Objetivo: baseline de métricas y aplicar las optimizaciones ya decididas, sin tocar nada que haga daño sin medición previa.

| # | Tarea | Agente | Dependencia |
|---|---|---|---|
| E1 | **Baseline Core Web Vitals** — Lighthouse CI sobre home + 5 páginas más visitadas de la app. Snapshot en `docs/perf/baseline-2026-10.md`. | `general-purpose` | — |
| E2 | **DUDA-CACHE-001** — medir TTFB + cache hit rate actual (Cloudflare Analytics). Si hit rate < 70% o TTFB > 500ms, aplicar Opción B (`max-age=3600, stale-while-revalidate=86400`) en `next.config.ts`. | `fork` | E1 |
| E3 | **Bundle size audit** — `@next/bundle-analyzer`, identificar top-10 pesados, mover a `dynamic()` lo que corresponda. Reporte: `docs/perf/bundle-2026-10.md`. | `general-purpose` | E1 |
| E4 | **DUDA-DEPS-001** — xlsx: evaluar `exceljs` vs `xlsx` desde CDN SheetJS. Si solo exportamos (no importamos input de usuario), ir por CDN; si vamos a importar en algún módulo nuevo, pasarse a exceljs. | `Plan` + `fork` | — |
| E5 | **Paginación auditada** — grep de `.select(` sin `.range()` ni `.limit()` en `lib/actions/`; el bug del recorrido Fases 1-9 (`getAllReportesMaquinaria/Personal`) ya se arregló, pero puede haber otros. | `Explore` + `fork` | — |
| E6 | **Caché server-side** — revisar actions con queries pesadas repetidas (listados que agregan `monto_pagado`), evaluar `unstable_cache` o cachear en PG con materialized view si tiempo render > 1s. | `Plan` | E1, E3 |
| E7 | **Plan Workers Free vs Paid** — si bundle gzip baja de 1 MB tras E3, quedarse en Free; si no, aceptar los $5/mes del Paid y documentarlo. | `fork` | E3 |

**Gate E:** p75 LCP < 2.5s en 3 páginas top + bundle gzip reportado + commit "perf: baseline + optimizaciones aplicadas".

---

## FASE F — Deudas residuales de UI/UX y catálogos

Objetivo: cerrar las deudas BAJA/MEDIA que están abiertas desde la auditoría UI 15/15 pero no bloquean.

| # | Tarea | Agente |
|---|---|---|
| F1 | **DT-CAT-001** — editor de `personal_cargos` en `/settings` (igual al resto de catálogos). | `fork` |
| F2 | **DT-CAT-002** — decidir con el usuario: borrar `terceros_tipos` o conectar la UI al catálogo. | usuario + `fork` |
| F3 | **DUDA-SERV-001** — limpiar las 670 referencias huérfanas en `servicios.precio_N_tipo` + agregar FK con `ON DELETE SET NULL`. | `fork` |
| F4 | **DUDA-MAQ-HORAS** — crear UI de `maquinaria_horas` si la auditoría de Informes/Planificación mostró que falta, o cerrar como wontfix. | `Plan` + `fork` |
| F5 | **Numeración de Órdenes de Trabajo** — reescribir `finalizeAprobacionCotizacion` igual que TK-OI7 (parse del máximo real de `T-YYYY-XXXX`, no `count(*)+1`). Test unitario + E2E. | `fork` |
| F6 | **DUDA-DEPS-002** — monitor mensual del changelog de `@opennextjs/cloudflare` para migrar `middleware.ts` → `proxy.ts` cuando salga soporte Node. | `ScheduleWakeup` / cron de recordatorio |

**Gate F:** `docs/TECHNICAL_DEBTS.md` sin filas ALTA/MEDIA abiertas (solo BAJA aceptadas).

---

## FASE G — Growth Engine (desbloqueo del apex)

Fuera del scope "cerrar pendientes", pero es la **condición para que FASE D6 se complete**. Mantener aquí para visibilidad.

- Specs A–E diseñados: `docs/superpowers/plans/2026-07-*.md` + `PLAN-GROWTH-ENGINE-JOURNEY.md`.
- Orden sugerido: A → C → D → B → E.
- Un plan dedicado se abre cuando el usuario dé la señal de retomar. No se arranca aquí.

---

## FASE H — Hardening continuo (post-cierre)

Automatismos para que esto no vuelva a acumularse:

| # | Tarea | Agente |
|---|---|---|
| H1 | **Pre-commit hook** que corra `git grep -E 'sb_secret_|sbp_|Bearer [0-9a-f]{30}'` y bloquee si matchea. | `fork` |
| H2 | **GitHub Action** semanal: `npm audit`, `npm outdated`, reporte en issue si hay nuevos criticals. | `fork` |
| H3 | **Loop de monitoreo** del bundle gzip + Core Web Vitals, posteando a Slack/discord si p75 LCP se degrada > 20%. | `fork` + `schedule` |
| H4 | **Doc de postmortem** del cutover residual (CISE/GRUAS → v3) para que el próximo cliente no repita los mismos gaps. | `fork` |

---

## Orden recomendado de ejecución

1. **A** (seguridad) y **B** (datos) en **paralelo** — distintos archivos, distinto blast radius.
2. **D1–D2** apenas FASE A3 esté lista (dev.reportar.app no depende de la rotación de la service_role).
3. **C** en paralelo con **B** cuando B1 esté hecho (los tests van a necesitar datos consistentes).
4. **D3–D5** después de A1 (reporta-admin usa service_role).
5. **E** una vez que la suite esté verde (C), para no mezclar refactor de perf con fixes de test.
6. **F** last, en PRs pequeños individuales.
7. **H** se puede intercalar; el pre-commit (H1) idealmente antes de empezar A.

## Mapa de agentes paralelos por fase

- **FASE A:** 1 `fork` (docs) + 1 `general-purpose` (audit) + usuario → en 1 solo mensaje.
- **FASE B:** 1 `general-purpose` (Bubble extraction) + 1 `fork` (regen types) → en paralelo.
- **FASE C4:** 3 `fork` paralelos, uno por grupo de módulos → en 1 solo mensaje.
- **FASE E1/E3/E5:** 3 agentes en paralelo (Lighthouse / bundle / paginación grep).

Al cierre de cada fase: `verification-before-completion` + commit + update de `CLAUDE.md` § Estado Actual + marcar en `docs/TECHNICAL_DEBTS.md` las filas resueltas.

---

## Working tree actual (antes de arrancar)

Modificaciones sin commitear que hay que decidir si entran como "setup" o si se descartan:
- `CLAUDE.md`, `docs/TECHNICAL_DEBTS.md`, `docs/pendientes_por_resolver.md` → ya tienen los updates del 2026-09-26, commit "docs: snapshot pre-plan de cierre".
- `tests/flows/12-cotizaciones.spec.ts` → fix del selector del `SearchableSelect` (FASE C los usará como base).
- `wrangler.demo.toml` → `routes` nuevas, va con FASE D1.
- `docs/superpowers/plans/2026-09-26-p005-backfill-cobros-cise.md` → trackear + commit "docs(plan): P-005-A backfill cobros CISE".

Hacer este commit de setup **antes** de arrancar FASE A para que cada fase arranque sobre árbol limpio.
