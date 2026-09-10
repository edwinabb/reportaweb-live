# Auditoría UI ↔ Datos — 10 · Planes de Acción

**Fecha:** 2026-09-09 · **Módulo:** 10/15 del roadmap original
**Fuente Bubble (UI):** `reporta.la/version-test` (tenant GRÚAS DEL PACÍFICO)
**Fuente Bubble (datos):** API Data LIVE (`https://reporta.la/api/1.1/obj`, tipo `Plan_de_accion`)
**Fuente Supabase:** PROD (`fqwhagryqkkhbgznxtwf`)

---

## Resumen Ejecutivo

A diferencia de EPP (módulo 8), Planes de Acción **sí venía migrado** desde antes de esta sesión
(406 filas con `bubble_id`, no nativas) — confirma que la lección de EPP ("verificar si el módulo
tuvo fase de migración antes de asumir datos") se aplicó correctamente acá: se encontró un gap
real pero **chico** (delta-sync, no migración completa), y se cerró. La UI mapea 1:1 en estructura
(2 sub-páginas en ambos sistemas), con reportaweb3 mostrando más columnas y más detalle de KPIs que
Bubble.

## 1. Mapeo de menú

| Bubble | reportaweb3 | Status |
|---|---|---|
| Panel Plan De Acción | Panel (`/planes-accion/panel`) | ✅ |
| Planes De Acción (listado) | Listado (`/planes-accion`) | ✅ |
| — | Detalle (`/planes-accion/[id]`) | ➕ mejora |

## 2. Datos — gap encontrado y cerrado (2026-09-09)

| Tenant | Bubble (`Plan_de_accion`) | Supabase antes | Supabase después |
|---|---:|---:|---:|
| CISE | 20 | 20 (exacto) | 20 |
| GRUAS | 414 | 386 (**gap de 28**) | **414 (exacto)** |

**Script:** `scripts/migrate-planes-accion-gruas.ts` (gitignored, dry-run por defecto), mismo
patrón `fetchAllBubble`/upsert por `(tenant_id, bubble_id)` — la tabla ya tenía el índice único
necesario (`planes_accion_tenant_bubble_id_key`), no requirió DDL nuevo.

**Mapeo aplicado:**
- `titulo`/`descripcion_problema` ← `titulo` de Bubble (idéntico en ambos campos, mismo patrón que
  las 386 filas ya existentes).
- `estado`: `Nuevo`→`PENDIENTE`, `Con Avance`→`EN_PROCESO`, `Finalizado`→`CERRADO` (confirmado
  contra el CHECK constraint real y contra el patrón de las filas ya migradas).
- `maquinaria_id`/`plantilla_id`: resueltos por `bubble_id` contra `maquinarias`/`plantillas` — 9/9
  y 1/1 resueltas, 0 huérfanas.
- `responsable_id` (campo singular) = primer elemento de `lista_responsables`; el resto se insertó
  en la tabla puente `planes_accion_responsables` (+84 filas, 992→1.076 para GRUAS).
- `informe_bubble_id`/`pregunta_ref`: se dejaron como referencia cruda (bubble_id / jsonb), mismo
  patrón que las filas preexistentes — no se resolvieron a FK reales porque las 386 filas ya
  migradas tampoco lo hacían (consistencia con lo ya establecido, no una decisión nueva).
- `evidencia_cierre_url`/`fecha_cierre`/`comentario_cierre`: quedaron en `NULL` en las 28 filas
  nuevas, igual que en las 386 preexistentes — confirmado que Bubble no trae esos datos para
  ningún plan de acción de GRUAS (mismo residual ya anotado en memoria del proyecto:
  `planes_accion.evidencia_cierre_url` nunca migró para ningún tenant).
- **No migrado en esta pasada:** `lista_avance` (avances/comentarios de seguimiento de cada plan).
  No se encontró el nombre del tipo Bubble correspondiente en el tiempo disponible — la tabla
  `planes_accion_avances` ya tiene 44 filas para GRUAS (de los 386 planes previos), pero los 28
  planes nuevos no tienen sus avances migrados. Residual documentado, no bloqueante (son 28 planes
  recientes, la mayoría `PENDIENTE` sin avance todavía según el propio estado de Bubble).

Verificado con join completo (`planes_accion` + `maquinarias` + `plantillas` +
`planes_accion_responsables`) contra la fila de ejemplo usada para diseñar el mapeo — título,
estado, maquinaria, plantilla y cantidad de responsables coinciden exactamente con Bubble.

## 3. UI — Listado

**Bubble:** columnas CÓDIGO / TAREA / FECHA TAREA / INFORME / AUTOR / FECHA CREACIÓN / CLIENTE /
CANT. / TÍTULO / MAQUINARIA / ESTADO (badge) / RESPONSABLES, buscador por título, filtro embudo,
Select "Pendientes/Finalizados/Todos", exportar, 3 tarjetas KPI (Total/Pendientes/Finalizados),
paginado.
**reportaweb3:** `components/planes/planes-columns.tsx` — columnas Código / Problema-Hallazgo /
Maquinaria / Prioridad / Estado / Responsables / Fecha Límite. 5 tarjetas KPI (`planes-stats.tsx`:
Total activos / Abiertos / Críticos / Vencidos / Cerrados — más granular que Bubble).

| Elemento | Status |
|---|---|
| Columnas CÓDIGO/MAQUINARIA/ESTADO/RESPONSABLES | ✅ presentes |
| Columnas TAREA/FECHA TAREA/INFORME/AUTOR/FECHA CREACIÓN/CLIENTE/CANT. | ❌ no presentes en la tabla (dato sí existe: `informe_bubble_id`, `created_by`, `created_at`, `cantidad` no vistos en el schema pero `titulo` sí) — **TK-PA1 (BAJA)**: evaluar si agregar Informe/Autor/Fecha Creación como columnas, dato ya disponible parcialmente |
| Filtro por Estado | Sin filtro embudo por columna (Bubble usa un Select "Pendientes/Finalizados") — **TK-PA2 (BAJA)**: aplicar `ColumnFilterHeader` en `estado` (y `prioridad`), mismo estándar ya usado en Cotizaciones/EPP hoy |
| Exportar a Excel | No confirmado si existe (no visto en `page.tsx`) — **TK-PA3 (BAJA)** |
| Tarjetas KPI | ✅ reportaweb3 tiene MÁS detalle que Bubble (5 vs 3), mejora no gap |

**TK-PA4 (BAJA, riesgo latente):** `getPlanesAccion()` (`lib/actions/planes.ts`) no usa
`.range()`/paginación — mismo patrón de bug ya encontrado y corregido en
`getAllReportesMaquinaria`/`getAllReportesPersonal`/`getCotizaciones`. GRUAS tiene 414 filas hoy
(bajo el cap de 1.000 de PostgREST), así que no se manifestó todavía, pero es el mismo riesgo
latente — anotarlo para cuando se traten los tickets de UI de este módulo.

## Gaps y tickets

| ID | Severidad | Descripción |
|---|---|---|
| TK-PA1 | 🟢 BAJA | Columnas Informe/Autor/Fecha Creación/Cliente/Cantidad de Bubble no están en el listado nuevo |
| TK-PA2 | 🟢 BAJA | Sin filtro embudo por columna en Estado/Prioridad |
| TK-PA3 | 🟢 BAJA | Exportar a Excel no confirmado |
| TK-PA4 | 🟡 MEDIA (preventivo) | `getPlanesAccion()` sin `.range()` — mismo patrón de bug ya visto en otros módulos, no manifestado aún (414 < 1.000) |
| TK-PA5 | 🟢 BAJA | `lista_avance` de los 28 planes nuevos de GRUAS no migrado (tipo Bubble no identificado) |
| TK-PA6 | ✅ CERRADO 2026-09-10 | `cliente_id`/`cantidad` de Bubble (`id_cliente`/`cantidad` en `Plan_de_accion`) nunca se migraron como columnas propias en `planes_accion`. Migración `20260910050000_planes_accion_cliente_cantidad.sql` agregó ambas columnas + backfill (434/434 filas: GRUAS 414 con ambos campos, CISE 20 con `cliente_id` parcial y `cantidad` siempre `NULL` — dato real ausente en el origen para CISE, no un error). Columnas Cliente/Cantidad agregadas al listado (`components/planes/planes-columns.tsx` + Excel export). |
| TK-PA7 | ✅ CERRADO 2026-09-10 | La columna **"Maquinaria"** del listado nunca estuvo realmente poblada — `getPlanesAccion()`/`getPlanAccionById()` (`lib/actions/planes.ts`) jamás resolvían `maquinaria_id` contra `maquinarias`. Encontrado al implementar TK-PA6. Corregido con el mismo patrón de lookup aparte ya usado para `cliente_id` (sin FK formal, igual que `maquinaria_id`/`plantilla_id`) — agregado a ambas funciones. `getPlanAccionById()` también quedó resolviendo `cliente_id` (no lo hacía, aunque el campo ya estaba tipado). Verificado: `tsc` limpio + 11/11 tests reales (`13-planes-accion.spec.ts` + `29-pre-cutover-planes-full.spec.ts`). |

## Cierre (actualización 2026-09-09 — TK-PA2/PA3/PA4 + parcial TK-PA1)

- **TK-PA2 (CERRADO):** `components/planes/planes-columns.tsx` migrado a `getColumns(filters)`
  (mismo patrón que Cotizaciones/Maquinaria); `Estado` y `Prioridad` ahora usan
  `ColumnFilterHeader` con `filterFn` propio. Opciones fijas: Estado = `PENDIENTE`, `EN_PROCESO`,
  `REVISION`, `CERRADO`, `VERIFICADO`, `RECHAZADO` (6 valores — nota: `RECHAZADO` se usa en
  `estadoClass()`/`PlanRowActions` y la columna es `text` sin CHECK constraint en DB, pero **no**
  está en el union type `PlanAccionEstado` de `types/formatos.ts`, que solo tiene 5 valores — se
  incluyó igual en las opciones de filtro porque es un valor real y alcanzable desde la UI, pero
  queda como inconsistencia de tipos preexistente, no corregida en esta tarea por estar fuera de
  alcance). Prioridad = `CRITICA`, `ALTA`, `MEDIA`, `BAJA`. `app/(dashboard)/planes-accion/page.tsx`
  ahora llama `getColumns({estadoOptions, prioridadOptions})` en vez de importar `columns` directo.
- **TK-PA3 (CERRADO):** botón "Descargar Excel" agregado en el toolbar de
  `components/planes/planes-table.tsx`, mismo patrón `exportToExcel` de
  `@/lib/utils/export-excel`. Exporta `table.getFilteredRowModel().rows` con columnas Código /
  Problema-Hallazgo / Maquinaria / Prioridad / Estado / Fecha Límite. Nombre de página: `'PLANES DE
  ACCION'`.
- **TK-PA4 (CERRADO):** `.range(0, 9999)` agregado a la query de `getPlanesAccion()` en
  `lib/actions/planes.ts` (mismo criterio ya usado en `getCotizacionesDashboardStats` — cap
  generoso, no paginación real completa). El resto de la función (filtros server-side `estado`/
  `prioridad`) no se tocó.
- **TK-PA1 (parcial, cerrado lo viable):** se verificó el schema real de `planes_accion` en
  `fqwhagryqkkhbgznxtwf` (`information_schema.columns` vía MCP Supabase, read-only) antes de tocar
  código:
  - **Fecha Creación** agregada como columna nueva (`created_at`, formateada con `formatDateInTZ`,
    sin lógica de "vencido").
  - **Informe** agregada como columna nueva (`informe_bubble_id`, texto monoespaciado truncado con
    `title` completo al hover) — se presenta explícitamente como ID técnico de Bubble, no como
    número de informe legible.
  - **Autor:** NO agregada. Confirmado por constraint real (`planes_accion_created_by_fkey →
    auth.users(id)`, no `profiles`) que `created_by` referencia `auth.users`, tabla que no se
    expone vía el cliente Supabase del proyecto igual que `profiles` (sin PostgREST embed
    disponible) — se dejó fuera para no forzar un join no soportado por el setup actual. `created_by`
    está poblado en 405/434 filas en PROD, así que el dato existe pero no es resoluble a nombre sin
    trabajo adicional (posible ticket futuro si se necesita).
  - **TAREA/FECHA TAREA:** NO agregadas. Se verificó vía SQL que `inspeccion_id`,
    `inspeccion_detalle_id` y `reporte_maquinaria_id` están en `NULL` en el 100% de las 434 filas de
    `planes_accion` en PROD (`count(inspeccion_id)=0`, etc.) — aunque `inspecciones` (`codigo`/
    `fecha_inspeccion`) y `reportes_maquinaria` (`codigo_documento_interno`/`fecha_reporte`) sí
    tienen columnas legibles para un join, no hay ninguna fila hoy que lo aproveche. No se agregó la
    columna porque mostraría `—` en el 100% de los casos actuales; queda documentado como gap, no
    como algo a inventar.
  - **`cliente_id`/`cantidad`:** confirmado que NO existen como columnas en `planes_accion` (schema
    real vía MCP, sin `cliente_id` ni `cantidad` en `information_schema.columns`). No se inventaron
    ni se les puso dato falso. Ver **TK-PA6** arriba (nuevo ticket, dato/negocio, no UI).

**Estado:** 🟢 **CERRADO 2026-09-09** — dato al día (GRUAS 414/414 exacto, CISE 20/20 exacto), UI
mapea 1:1 en estructura. TK-PA2/PA3/PA4 cerrados y TK-PA1 parcialmente cerrado (Fecha Creación +
Informe agregadas; Autor y Tarea/Fecha Tarea documentados como no viables hoy) en esta pasada
(2026-09-09, ver arriba). TK-PA5 ya resuelto sin acción (Bubble no tiene avances para los 28 planes
nuevos de GRUAS).

## Cierre TK-PA6 (actualización 2026-09-10)

- Migración `supabase/migrations/20260910050000_planes_accion_cliente_cantidad.sql` aplicada en
  TEST+PROD: agrega `cliente_id uuid` (referencia conceptual a `terceros.id`, sin FK constraint
  formal — mismo patrón que `maquinaria_id`/`plantilla_id` en esta misma tabla, confirmado vía MCP
  Supabase read-only que ninguna de las 3 tiene constraint) y `cantidad integer`.
- Backfill `scripts/backfill-planes-accion-cliente-cantidad.ts`: 434/434 filas (GRUAS 414 con ambos
  campos, CISE 20 con `cliente_id` parcial y `cantidad` siempre `NULL` — Bubble nunca trajo
  `cantidad` para CISE, dato real ausente en el origen, no un error de migración).
- `lib/actions/planes.ts` (`getPlanesAccion()`): como `cliente_id` no tiene FK formal, el embed
  PostgREST `cliente:terceros!cliente_id(...)` no es resoluble por schema cache — se resuelve con
  un segundo `select` a `terceros` por los `cliente_id` distintos de la página actual (mismo patrón
  usado en otras partes del código para catálogos sin FK), y se anexa `plan.cliente` en memoria.
- `types/formatos.ts`: `PlanAccion.cliente_id`, `PlanAccion.cantidad` y la relación opcional
  `PlanAccion.cliente`.
- `components/planes/planes-columns.tsx`: columna **Cliente** (cerca de Maquinaria, con fallback
  `—`) y columna **Cantidad** (cerca de Código, número o `—` si `null`).
- `components/planes/planes-table.tsx`: Excel export (`handleDownloadExcel`) incluye `Cantidad` y
  `Cliente`.

**TK-PA6:** 🟢 **CERRADO 2026-09-10** — columnas + backfill + UI cerrados. Único residual conocido:
`cantidad` seguirá en `—` para los 20 planes de CISE porque Bubble nunca tuvo ese dato (documentado,
no es un bug).
