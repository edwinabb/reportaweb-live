# Auditoría UI ↔ Datos — 11 · Ventas (Valoraciones + Facturas)

**Fecha:** 2026-09-10 · **Módulo 10/15** (roadmap original, ver `00-sidebar.md` fila 3) · **Tenant:** GRUAS (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`)
**Fuente datos:** `mcp__claude_ai_Supabase__execute_sql` + re-ejecución de `scripts/fase9-finanzas-delta.ts` (script idempotente ya usado en el recorrido Fases 1-9)
**Fuente UI:** código en `app/(dashboard)/ventas/**`, `components/ventas/**`, `lib/actions/ventas.ts` (dev local)

> **Nota de alcance:** a diferencia de los módulos 01-08/10, este cierre **no incluyó una sesión en vivo contra Bubble** (screenshots 1:1). Se apoyó en: (a) el delta-sync de Ventas/Compras ya verificado y documentado en el recorrido Fases 1-9 (`docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md`), re-confirmado con una re-ejecución de `fase9-finanzas-delta.ts` en esta sesión (0 filas nuevas — las "faltantes" eran post-cutoff, exclusión correcta por política), y (b) una revisión de código contra el checklist v1.2 (`docs/UI-TEMPLATE-LISTADOS.md`). Si en una sesión futura aparecen capturas de Bubble para Ventas, comparar contra este documento y agregar DUDAs si se detecta algo no cubierto aquí.

## Resumen Ejecutivo

Datos: **100% reconciliados**, sin gap pendiente (confirmado por re-ejecución del delta-sync, no solo por inspección). UI: 3 violaciones del estándar v1.2 encontradas y corregidas en la misma sesión (PR [#1](https://github.com/edwinabb/reportaweb3/pull/1), commit `77ce939`, rama `fix-ventas-ux`). Módulo cerrado.

## Datos

| Chequeo | Resultado |
|---|---|
| Delta-sync Valoraciones/Facturas (GRUAS+CISE) | 0 filas nuevas al re-ejecutar `fase9-finanzas-delta.ts` en modo dry-run |
| Filas "faltantes" detectadas | Todas posteriores a la fecha de cutoff de migración — exclusión correcta, no es un gap |
| `getValoracionesData` — cap de paginación | Ya tenía `.range()` + `count:'exact'` correctos desde antes de esta sesión (no requirió fix) |
| `getFacturasVentaData` — filtros server-side (`search`, `estado`) | Ya funcionaban correctamente vía `searchParams` + URL params |

## UI — Checklist v1.2

| Página | Chequeo | Antes | Ahora |
|---|---|---|---|
| Valoraciones (`components/ventas/valoraciones/valoraciones-columns.tsx`) | Columna Fecha sin botón de ordenar | ❌ Usaba `ArrowUpDown` + `column.toggleSorting()` | ✅ Header de texto fijo |
| Valoraciones (`components/ventas/valoraciones/valoraciones-table.tsx`) | Exportar a Excel | ❌ No existía | ✅ Botón "Descargar Excel" vía `exportToExcel()` |
| Valoraciones — filtro Cliente | Filtro real contra servidor | ❌ `Input` client-side sobre `table.getColumn("cliente_nombre")` — solo filtraba la página ya cargada, resultado engañoso con paginación server-side | ✅ `Select` poblado con `getTercerosForSelect()`, dispara `router.push` con `?cliente_id=`, conectado al parámetro `cliente_id` que ya existía en `getValoracionesData` sin UI |
| Facturas de Venta (`components/ventas/facturas/facturas-venta-table.tsx`) | Exportar a Excel | ❌ No existía | ✅ Botón "Descargar Excel" |
| Facturas de Venta — filtros `search`/`estado` | Ya server-side vía URL params, sin sort-buttons | ✅ Ya cumplía | ✅ Sin cambios |
| Ambas páginas — filtros embudo por columna tipificada | N/A — estas tablas usan controles de toolbar (Select/botones de estado) en vez de `ColumnFilterHeader` por columna, patrón ya aceptado en Facturas antes de esta sesión | ✅ Consistente con Facturas (no se introdujo inconsistencia) |

## Gaps y tickets

| ID | Severidad | Descripción | Acción | Estado |
|---|---|---|---|---|
| TK-V1 | Media | Sort-button en columna Fecha (Valoraciones) viola estándar v1.2 | Reemplazado por header fijo | ✅ Cerrado |
| TK-V2 | Media | Sin exportar a Excel en Valoraciones ni Facturas | Agregado `exportToExcel()` en ambas | ✅ Cerrado |
| TK-V3 | Alta | Filtro de Cliente en Valoraciones era client-side-only, engañoso bajo paginación server-side | Reemplazado por `Select` real conectado a `cliente_id` server-side | ✅ Cerrado |

## DUDAs

Ninguna abierta.

## ⚠️ Hallazgo posterior al cierre (2026-09-10, mismo día)

El usuario pidió revisar qué tablas usa Ventas porque sospechaba un gap de migración. Se encontró uno real: **`cobros_venta`** (la tabla que la app lee para "Cobrado"/"Pendiente de cobro") tiene **0 filas** en PROD — los pagos históricos de Bubble quedaron en una tabla paralela nunca conectada (`factura_venta_pagos`, 521 filas). Resultado: las 3.130 facturas de venta migradas muestran 100% pendiente de cobro aunque en Bubble muchas sí tuvieran pagos. Detalle completo, impacto y pasos de confirmación en `docs/auditoria-ui/residuales-pagos-facturacion.md`. **No bloquea el cierre de UI de este módulo (ya hecho), pero el dato de "Cobrado" no es confiable hasta resolverlo.**

## Cierre

🟢 **Cerrado 2026-09-10** a nivel UI/UX v1.2. 0 DUDAs sin resolución (Regla 7). PR [#1](https://github.com/edwinabb/reportaweb3/pull/1) mergeado (`6200684`). ⚠️ Ver hallazgo de datos arriba — pendiente de resolución aparte, no reabre este cierre de UI.
