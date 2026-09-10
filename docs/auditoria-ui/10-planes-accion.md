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

## Cierre

**Estado:** 🟢 **CERRADO 2026-09-09** — dato al día (GRUAS 414/414 exacto, CISE 20/20 exacto), UI
mapea 1:1 en estructura. TK-PA1-5 quedan en backlog de UI/datos menores, no bloqueantes.
