# Auditoría UI ↔ Datos — 12 · Compras (Valoraciones + Facturas)

**Fecha:** 2026-09-10 · **Módulo 12/15** (roadmap original, ver `00-sidebar.md` fila 4) · **Tenant:** GRUAS (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`)
**Fuente datos:** `mcp__claude_ai_Supabase__execute_sql` + re-ejecución de `scripts/fase9-finanzas-delta.ts` contra PROD (script idempotente, ya usado para Ventas)
**Fuente UI:** código en `app/(dashboard)/compras/**`, `components/compras/**`, `lib/actions/compras.ts` (dev local)

> **Nota de alcance:** igual que en `11-ventas.md`, este cierre no incluyó sesión en vivo contra Bubble. Se apoyó en el delta-sync ya reconciliado y en una revisión de código dirigida específicamente a comparar Compras contra su módulo hermano Ventas (mismo patrón de componentes), a pedido del usuario, que pidió revisar en detalle el menú de fila y el menú de acciones masivas de Valoraciones en ambos módulos.

## Resumen Ejecutivo

Datos: **100% reconciliados**, 0 gap (re-ejecución de `fase9-finanzas-delta.ts`: `facturas_compra` 0 nuevas, `facturas_compra_item` 0 nuevas — todo lo "faltante" es post-cutoff). UI: 3 violaciones del estándar v1.2 (idénticas a las que tenía Ventas antes de su fix) + 1 feature completamente ausente (PDF de Valorización de Compra) encontrados y corregidos en PR [#2](https://github.com/edwinabb/reportaweb3/pull/2) (commit de merge `e735eed`). Módulo cerrado.

## Datos

| Chequeo | Resultado |
|---|---|
| Delta-sync `facturas_compra`/`facturas_compra_item` (GRUAS+CISE) | 0 filas nuevas al re-ejecutar `fase9-finanzas-delta.ts` contra PROD |
| Filas "faltantes" detectadas | 9 posteriores al cutoff (`facturas_compra`), 5 sin tenant resoluble — exclusión correcta, no es un gap |
| `getValoracionesComprasData` — paginación | Ya tenía `.range()` + `count:'exact'` correctos, no requirió fix |
| `getFacturasCompraData` — filtros server-side (`search`, `estado`) | Ya funcionaban correctamente vía `searchParams` |

## UI — Checklist v1.2

| Página | Chequeo | Antes | Ahora |
|---|---|---|---|
| Valoraciones (`components/compras/valoraciones/valoraciones-columns.tsx`) | Columna Fecha sin botón de ordenar | ❌ `ArrowUpDown` + `column.toggleSorting()` (mismo bug que tenía Ventas) | ✅ Header de texto fijo |
| Valoraciones (`components/compras/valoraciones/valoraciones-table.tsx`) | Exportar a Excel | ❌ No existía | ✅ Botón "Descargar Excel" |
| Valoraciones — filtro Proveedor | Filtro real contra servidor | ❌ `Input` client-side sobre `table.getColumn("proveedor_nombre")` — mismo bug que tenía el filtro de Cliente en Ventas | ✅ `Select` poblado con `getTercerosForSelect()`, conectado a `proveedor_id` server-side (ya existía el parámetro en `getValoracionesComprasData`, sin UI) |
| Facturas de Compra (`components/compras/facturas/facturas-compra-table.tsx`) | Exportar a Excel | ❌ No existía | ✅ Botón "Descargar Excel" |
| Facturas de Compra — filtros `search`/`estado` | Ya server-side vía URL params, sin sort-buttons | ✅ Ya cumplía | ✅ Sin cambios |

## Revisión específica — menú de fila y menú de acciones masivas (Valoraciones)

A pedido explícito del usuario, se comparó 1:1 contra Ventas:

| Menú | Ventas | Compras (antes) | Compras (ahora) |
|---|---|---|---|
| Fila (`...` al final) | Copiar ID reporte · Ver PDF del reporte · Precio por Día (disabled, "próximamente") · Deshabilitar informe | Idéntico | Sin cambios — ya estaba a la par |
| Masivo (top-right, multi-select) | Valorizar Venta · **PDF Valorización** · Deshacer Valorización · Facturar Venta | Valorizar Compra · Deshacer Valorización · Registrar Factura del Proveedor — **faltaba "PDF Valorización"** | ✅ Agregado "PDF Valorización" |

El faltante de "PDF Valorización" no era solo un ítem de menú: la funcionalidad completa nunca existió para Compras. `/api/valorizaciones/[codigo]/pdf` solo tenía implementado el flujo de Venta (`renderValorizacionVentaHtml`, `config_valorizacion_venta`, `cliente_id`). Códigos de Venta y Compra conviven en la misma tabla `valorizaciones`, distinguidos por prefijo (`YYYY-NNNNN` vs `C-YYYY-NNNNN`).

**Decisión del usuario:** confirmado como gap real a construir (no una diferencia deliberada) — el documento sí es relevante para Compras, no solo la factura que sube el proveedor.

**Solución implementada:** el endpoint ramifica por prefijo de código; se creó `lib/valorizacion-compra-pdf-template.ts` como wrapper delgado sobre la plantilla de Venta (mismo layout, rótulo "PROVEEDOR" en vez de "CLIENTE", título "VALORIZACIÓN DE COMPRA", usa `config_valorizacion_compra`). Verificado que el flujo de Venta no tuvo regresión (mismo PDF de siempre).

## Gaps y tickets

| ID | Severidad | Descripción | Acción | Estado |
|---|---|---|---|---|
| TK-CP1 | Media | Sort-button en columna Fecha (Valoraciones Compra) | Reemplazado por header fijo | ✅ Cerrado |
| TK-CP2 | Media | Sin exportar a Excel en Valoraciones ni Facturas de Compra | Agregado `exportToExcel()` en ambas | ✅ Cerrado |
| TK-CP3 | Alta | Filtro de Proveedor client-side-only, engañoso bajo paginación server-side | Reemplazado por `Select` real conectado a `proveedor_id` | ✅ Cerrado |
| TK-CP4 | Alta | Compras no tenía generación de PDF de Valorización (feature completa ausente, no solo un ítem de menú) | Endpoint compartido ramificado por prefijo de código + plantilla wrapper nueva + wiring en menú masivo | ✅ Cerrado |

## DUDAs

Ninguna abierta.

## ⚠️ Hallazgo posterior al cierre (2026-09-10, mismo día)

El usuario pidió revisar qué tablas usa Compras porque sospechaba un gap de migración (mismo pedido que en Ventas, donde aparecieron varios reales), y luego pidió profundizar en las tablas de Valorizaciones. Hallazgos:

1. `facturas_compra_pagos` (la tabla que la app lee/escribe) sí tiene `bubble_id` — no hay tabla paralela huérfana como en Ventas — pero solo **20 de 1.473 facturas_compra (1,4%)** tienen algún pago registrado. `fase9-finanzas-delta.ts` asumía esta tabla "ya al 100%" sin verificarlo nunca contra una cifra real de Bubble.
2. **`bancos` está completamente vacía** (0 filas, ningún tenant) — compartida con Ventas, bloquea registrar pagos nuevos.
3. **Valorizaciones de Compra: 0 filas en todo el sistema, para cualquier tenant** — ninguna valorización con prefijo `C-` existe en PROD. La única que se generó fue con datos sintéticos en TEST para probar el PDF (PR #2), luego eliminada.

Queda pendiente confirmar en Bubble si estos números son correctos o gaps de migración. Detalle en `docs/auditoria-ui/residuales-pagos-facturacion.md`. **No bloquea el cierre de UI de este módulo.**

## Cierre

🟢 **Cerrado 2026-09-10** a nivel UI/UX v1.2 + feature PDF Valorización. 0 DUDAs sin resolución (Regla 7). PR [#2](https://github.com/edwinabb/reportaweb3/pull/2) mergeado a master (`e735eed`). ⚠️ Ver hallazgo de datos arriba — pendiente de confirmar en Bubble, no reabre este cierre de UI.
