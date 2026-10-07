# E5 — Auditoría paginación en server actions

**Fecha:** 2026-10-06 · **SHA base:** `fc72a27` · **Plan:** `docs/superpowers/plans/2026-10-05-cierre-pendientes-y-deudas.md` FASE E5.
**Alcance:** `lib/actions/**` + `app/api/**` + `app/(dashboard)/**`.

## Resumen
- Archivos escaneados: 46 (`lib/actions/`) + 13 (`app/api/`) + 5 (`app/(dashboard)/`).
- Queries totales: ~130.
- (a) Legit (`.single/.maybeSingle/.eq('id', …)`): ~75.
- (b) Count puro (`count:'exact', head:true`): 6.
- (c) **Risk — array sin `.limit()/.range()`: 13**.
- (d) Ya paginadas correctamente: 15.

## (c) Hallazgos — ordenados por severidad

| # | Archivo:línea | Función | Tabla | Tamaño PROD estimado | Severidad |
|---|---|---|---|---|---|
| 1 | `lib/actions/cotizaciones.ts:19` | `getCotizaciones(onlyActive, estado)` | `cotizaciones` + embeds (detalles, ofertas, cliente) | GRUAS >1.000 vivas; línea 62-66 avisa del bug | **CRÍTICA** |
| 2 | `lib/actions/reportes.ts:227` | `getAllReportesGastos()` | `reportes_combustible` | GRUAS: miles | **CRÍTICA** |
| 3 | `lib/actions/planificacion.ts:19` | `getTareas(startDate, endDate)` → `mv_planificacion_diaria` | MV expande tarea×día | GRUAS: 1 mes × ~500 tareas ≈ 15.000 filas | **CRÍTICA** |
| 4 | `lib/actions/planificacion.ts:47` | `getTareas` (sub-query `tareasMeta`) | `tareas` via `.in('id', tareaIds)` | Deriva de (3) | **ALTA** |
| 5 | `lib/actions/planificacion.ts:782` | `getAvailability(startDate, endDate)` | `tareas_recursos` + embeds | ~500 tareas × 2-3 recursos × intervalos | **ALTA** |
| 6 | `lib/actions/tareas.ts:15` | `getTareas(estado)` | `tareas` + embeds | GRUAS podría pasar 1.000 (histórico sin fecha) | **ALTA** |
| 7 | `lib/actions/inspecciones.ts:17` | `getInspecciones(maq, fIni, fFin)` | `inspecciones` | >1.000 históricas sin fechas obligatorias | **ALTA** |
| 8 | `lib/actions/planificacion.ts:929` | `getInformesCount(tareaIds, startDate, endDate)` | `mv_planificacion_diaria` filtrada | Depende de tareaIds | **MEDIA** |
| 9 | `lib/actions/compras.ts:423` | `deshacerValorizacionCompra(codigo)` | `reportes_maquinaria` por valorizacion | <1.000 por valorización; borde | **MEDIA** |
| 10 | `lib/actions/planificacion.ts:971` | `getTareasBorrador()` | `tareas` BORRADOR | <<1.000 | **MEDIA** |
| 11 | `lib/actions/epp.ts:542` | `getAlertasPendientes(filters)` | `sst_epp_item` + joins | GRUAS: miles EPP activos posibles | **MEDIA** |
| 12 | `lib/actions/epp.ts:378` | `getStockColaborador(colaboradorId)` | `sst_epp_item` por colaborador | <100 por persona | BAJA |
| 13 | `lib/actions/ventas.ts:803` | `getCobrosByFactura(facturaId)` | `cobros_venta` por factura | <50/factura | BAJA |

## Catálogos low-risk (<100 filas, filtrados por FK) — seguimiento, no bloqueantes

`getMaquinariaModelosList`, `getBancos`, `getTiposPrecio`, `getMaquinarias`, `getTerceros*`, `getServicios`, `getNotificacionReceptores`, `getUserDocuments(userId)`, `getMaquinariaDocsForMaquinaria`, `getInspeccionesForTarea`, `getReportes[Personal|Maquinaria|Combustible](tareaId)`.

## (d) Queries ya paginadas correctamente

- `getAllReportesPersonal` (reportes.ts:189) ✓
- `getAllReportesMaquinaria` (reportes.ts:212) ✓ (fix 2026-09-08)
- `getValoracionesCompra` (compras.ts:189) ✓
- `getFacturasCompra` (compras.ts:512) ✓
- `getValoracionesVenta` (ventas.ts:192) ✓
- `getFacturasVenta` (ventas.ts:588) ✓
- `getTicketsSoporte` (soporte.ts:47) ✓
- `getMaquinariaDocuments` (maquinaria-docs-query.ts:59→134) ✓
- `getDepurableMaquinariaDocuments` (maquinaria-docs-depuracion.ts:23) ✓
- `getUserDocumentsAll` (user-documents-query.ts:25→75) ✓
- `getDepurableUserDocuments` (user-documents-depuracion.ts:22) ✓
- `getCotizacionesDashboardStats` (cotizaciones.ts:98/123) — `.range(0, 9999)` cap explícito ✓
- `cotizaciones.ts:1641/1695` ✓
- `searchTareasConFiltros` (tareas.ts:180) `.limit(30)` ✓
- `epp.ts:360/409` `.limit(opts?.limit ?? N)` ✓

## Patrón recomendado

```ts
export async function getXxx({ page = 1, limit = 50 }: { page?: number; limit?: number } = {}) {
  const { adminClient, tenantId } = await getSupabaseContext()
  if (!adminClient || !tenantId) return { data: [], count: 0 }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count } = await adminClient
    .from('tabla')
    .select('… columnas livianas …', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('fecha', { ascending: false })
    .range(from, to)

  return { data: data || [], count: count || 0 }
}
```

Para queries internas que necesitan todo el array (no paginadas en UI): usar bucles con `.range()` o cap explícito `.range(0, 9999)` como en `getCotizacionesDashboardStats`.

## Orden sugerido de fixes

1. `getCotizaciones` (cotizaciones.ts:19) — bug conocido, afecta panel Cotizaciones.
2. `getTareas` + sub-query `tareasMeta` (planificacion.ts:19, 47) — motor del timeline, el que más duele en GRUAS.
3. `getAvailability` (planificacion.ts:782) — timeline recursos.
4. `getAllReportesGastos` (reportes.ts:227) — mismo bug que ya se fijó para personal/maquinaria.
5. `getInspecciones` (inspecciones.ts:17) — listado global sin filtros obligatorios.

Luego: `getTareas` (tareas.ts:15), `getInformesCount`, `getAlertasPendientes`, `deshacerValorizacionCompra`, `getTareasBorrador`.

## Observaciones adicionales

- Ningún error de sintaxis encontrado.
- `getTareas` (planificacion.ts) refresca la MV antes de leer sin control de concurrencia — fuera del scope E5, anotar como deuda aparte.
