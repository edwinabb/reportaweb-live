# Auditoría módulo — Compras

**Fecha:** 2026-04-19
**Cutover objetivo:** 2026-04-26 (7 días — insuficiente, ver conclusión consolidada)
**Referencia:** espejo funcional del audit [09-ventas.md](./09-ventas.md) según indicación del usuario: *"El módulo de compras es idéntico al de ventas, pero registra los informes con maquinaria de un tercero, las valoraciones de las horas trabajadas por esas máquinas de proveedores, las facturas de los proveedores y los pagos de facturas y de detracción de esos servicios."*

Severidad:
- 🔴 BLOQUEA-CUTOVER — sin esto no se puede hacer el cutover del 2026-04-26.
- 🟡 POST-CUTOVER — no crítico, puede ir a Fase 4.
- 🟢 MEJORA — opcional / nice-to-have.

**Estado actual:** backend **~80% listo** (tablas `facturas_compra`, `facturas_compra_item`, `facturas_compra_pagos`, vistas `view_valoraciones_compras`/`view_compras_pendiente_valorizar`/`view_compras_pendientes_facturar` con filtro `maquinaria.propietario = 'tercero'` correctamente implementado). Frontend **0%** — las 4 rutas son placeholders vacíos.

---

## 10.0 Diferencias estructurales vs Ventas (referencia)

| Aspecto | Ventas (09) | Compras (10) |
|---|---|---|
| Filtro de reportes | maquinaria propia (propietario='propio') | maquinaria de tercero (propietario='tercero') + proveedor_id is not null |
| PDF valorización | lo **generamos** para mostrar al cliente (G.PAC-04) | lo **generamos** para soporte interno (cuánto se le debe al proveedor) |
| Factura | la **emite la empresa** al cliente (nosotros creamos datos + PDF) | la **emite el proveedor** (subimos PDF recibido, no generamos) |
| Cobros | cliente nos paga | Pagos: nosotros pagamos al proveedor |
| Detracción | cliente retiene (nos cobran menos) | empresa retiene al proveedor (le pagamos menos, pagamos a SUNAT) |
| Precio unitario | viene de `cotizaciones_detalle` (precio venta al cliente) | viene de `cotizaciones_detalle` con `cotizacion_compra_item_id` en reportes_maquinaria (precio compra al proveedor, registrado desde Oferta de Proveedor — ver 6.2) |

**Crítico:** el backend ya tiene vista `view_valoraciones_compras` con `LATERAL JOIN cotizaciones_detalle` para resolver el precio de compra. El audit de Cotizaciones (6.2) señala que la pantalla de Ofertas de Proveedor independiente no existe; **para Compras no hace falta esa pantalla**, sólo que el precio quede registrado al aprobar la oferta dentro del paso 3 del wizard de cotización (ya funciona).

---

## 10.1 Panel Compras

**Archivos Next:** [app/(dashboard)/compras/panel/page.tsx](../../app/(dashboard)/compras/panel/page.tsx) — **placeholder**.
**Backend:** vistas `view_compras_pendiente_valorizar` + `view_compras_pendientes_facturar` ya creadas.

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Dashboard con KPIs: Total Comprado, Total Pagado, Pendiente Pago (por proveedor) | ❌ placeholder | Análogo a Panel Ventas | 🔴 | 3h |
| 2 | Dos listas side-by-side: Pendientes Valorizar Compras (proveedor + cant informes + informe más antiguo + horas pendientes) y Pendientes Facturar Compras (proveedor + cant valorizaciones + monto pendiente) | ❌ | Vistas BD ya existen; falta UI + server action `getPanelComprasData` | 🔴 | 2h |
| 3 | Click en proveedor → `/compras/valoraciones?proveedor_id=X&estado=...` | ❌ | Navegación | 🔴 | 30 min |

**Total Panel:** ~5.5h.

---

## 10.2 Valorización Compras (listado + workflow)

**Archivos Next:** [app/(dashboard)/compras/valoraciones/page.tsx](../../app/(dashboard)/compras/valoraciones/page.tsx) — **placeholder**.
**Backend:** `view_valoraciones_compras` ya filtra por `propietario='tercero' AND proveedor_id IS NOT NULL` y resuelve precio desde `cotizaciones_detalle`.

### 10.2.1 Tabla principal

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 4 | 18 columnas: Informe (link PDF), Fecha, Día, **Proveedor**, Lugar, Descripción, Maquinaria, Cotización (link), Hrs Recorrido, Jornadas, Hrs Trabajo, Hrs Mínimas, Cant Facturar, Moneda, Precio Compra, Total Compra, Valoración Compra (link), Factura Compra (link) | ❌ | Análogo a tabla Ventas pero con **Proveedor** en lugar de Cliente | 🔴 | 4h |
| 5 | Headers: Pendientes Valorizar Compras / Pendientes Facturar Compras / Horas Facturadas | ❌ | — | 🔴 | 1.5h |
| 6 | Filtros: rango fechas + proveedor + select estado (Pendientes/Valorados/Facturados/Todos) + búsqueda nº informe + cotización + maquinaria + hab/deshab | ❌ | — | 🔴 | 3h |
| 7 | Botón descargar Excel | ❌ | — | 🟡 | 1.5h |
| 8 | Selección múltiple con checkboxes | ❌ | — | 🔴 | 30 min |

### 10.2.2 Menú masivo (cambia según estado seleccionado)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 9 | **Pendientes** → "Valorizar Compra" (agrupa informes del mismo proveedor) | ❌ | — | 🔴 | 1h (wire) |
| 10 | **Valorizar Compra** dialog: N° valorización auto, fecha, tabla informes, % detracción, % IGV, subtotal/total, "Guardar Valorización" → marca informes VALORADO + genera PDF soporte interno | ❌ | Core del módulo | 🔴 | 8h |
| 11 | **Valorados** → PDF Valoración / Deshacer / Editar / **Registrar Factura del Proveedor** | ❌ | — | 🔴 | 4h |
| 12 | **Registrar Factura del Proveedor** dialog: proveedor + cotización + moneda (ro), tabla de valorizaciones a agrupar, % detracción retenida, % IGV, totales, **N° Factura del Proveedor** (el que viene en su factura), **Fecha Factura del Proveedor**, Tasa de cambio (a fecha factura), Cantidad días pago, Fecha Vencimiento, **Upload PDF recibido del proveedor** (obligatorio) | ❌ | Nótese: **no generamos PDF, recibimos** | 🔴 | 6h |
| 13 | **Facturados** → Ver Factura Proveedor / Editar Factura / Deshacer Factura | ❌ | — | 🔴 | 3h |

### 10.2.3 Menú individual por informe (⋮)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 14 | PDF Reporte (generar si no existe) | ❌ | Reutiliza renderer de 7.8 | ✓ compartido | incluido |
| 15 | Cambiar a P/V/F (admin sistema) | ❌ | Herramienta de rescate | 🟡 | 2h |
| 16 | Precio por Día (override del precio) | ❌ | Algunos proveedores cobran por día completo | 🔴 | 2h |
| 17 | Informe de Combustible (si el proveedor lo incluye) | ❌ | Link | 🟡 | 1h |
| 18 | Informe de Movilización (virtual, si la oferta de proveedor lo incluye) | ❌ | Compartir componente con Ventas 9.1.3 #21 | 🔴 | (ya incluido en 9.1.3) |
| 19 | Deshabilitar Informe | ❌ | Soft-delete específico del lado compra | 🟡 | 1h |

### 10.2.4 PDF Valorización de Compra

A diferencia de Ventas, este PDF es **para soporte interno** (documenta lo que se le debe al proveedor) — opcional pero útil para auditoría.

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 20 | Renderer HTML→PDF con header formato (distinto al de ventas), proveedor + RUC, tabla detalle, SUBTOTAL/IGV/TOTAL | ❌ | Reutilizar template de Ventas adaptado. Config por tenant: `config_valorizacion_compra` (extiende pattern 7.8) | 🟡 | 4h |

**Total 10.2:** ~33h (~30h 🔴 + 3h 🟡).

---

## 10.3 Facturación Compras (listado + pagos + detracciones)

**Archivos Next:** [app/(dashboard)/compras/facturas/page.tsx](../../app/(dashboard)/compras/facturas/page.tsx) — **placeholder**.
**Backend:** tabla `facturas_compra` con columnas de detracción + `facturas_compra_pagos` normalizada ya existen.

### 10.3.1 Listado

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 21 | Tabla con columnas: FACTURA (nº proveedor), FECHA, PROVEEDOR, RUC, BASE, IGV, TOTAL SOLES, DETRACCIÓN SOLES, TOTAL USD, DETRACCIÓN USD, NÚMERO CONSTANCIA, FECHA PAGO DETRACCIÓN, MONTO A PAGAR USD, MONTO PAGADO USD, FECHA PAGO, BANCO, PLAZO CRÉDITO, TIPO CAMBIO | ❌ | Análogo a Facturación Ventas pero con Proveedor en lugar de Cliente | 🔴 | 4h |
| 22 | Headers: TOTAL FACTURADO (compras) / MONTO PAGADO / PENDIENTE DE PAGO | ❌ | — | 🔴 | 1h |
| 23 | Filtros: rango fecha + proveedor + búsqueda factura + estado detracción | ❌ | — | 🔴 | 1.5h |
| 24 | Descargar Excel | ❌ | — | 🟡 | 1.5h |

### 10.3.2 Ver/Editar Factura del Proveedor

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 25 | Dialog Ver: proveedor + cotización + fecha aceptación, forma/plazo pago, tabla valorizaciones, subtotal/%IGV/%detracción/total, N° Factura Proveedor/Fecha/Tasa cambio/Cant días/Vencimiento, link Archivo PDF recibido | ❌ | — | 🔴 | 3h |
| 26 | Dialog Editar: mismo layout editable + re-upload PDF | ❌ | — | 🔴 | 2h |

### 10.3.3 Nuevo Pago

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 27 | Dialog **REGISTRO DE PAGO**: header con datos factura (proveedor, factura, fecha factura, forma/plazo pago, vencimiento), subtotal/IGV/total/%detracción/tasa cambio, lista pagos previos, **PENDIENTE DE PAGO: $X** | ❌ | Pagos parciales son la norma a 30-90 días | 🔴 | 2h |
| 28 | Form: Tipo (select: transferencia/cheque), Monto + moneda, Banco (select), Fecha Pago, Comentarios. Permite múltiples pagos parciales | ❌ | Usar tabla `facturas_compra_pagos` existente | 🔴 | 2h |
| 29 | Catálogo **Bancos** (compartido con Ventas 9.2.3 #38) | ❌ | — | ✓ compartido | incluido |

### 10.3.4 Detracción retenida al proveedor

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 30 | Dialog **REGISTRO DE PAGO DETRACCIÓN (retenida al proveedor)** con header factura + info general | ❌ | La empresa retiene detracción al proveedor y la paga al SUNAT | 🔴 | 2h |
| 31 | Form: Detracción a cargo de (normalmente EMPRESA en compras), Monto S/, Número Constancia SUNAT, Fecha Pago Detracción | ❌ | Usar columnas ya existentes en `facturas_compra`: `detraccion_porcentaje`, `detraccion_monto`, `detraccion_paga_por`, `detraccion_constancia`, `detraccion_fecha_pago` | 🔴 | 2h |

### 10.3.5 Deshacer Factura

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 32 | Elimina factura de compra, valorizaciones vuelven a VALORADO, pagos a papelera | ❌ | — | 🔴 | 2h |

**Total 10.3:** ~22h.

---

## 10.4 Integraciones cross-módulo

| # | Gap | Severidad | Esfuerzo |
|---|---|---|---|
| 33 | Al valorizar compra, marcar `reportes_maquinaria.valorizacion_compra = <codigo>` + `estado_compra = 'VALORADO'` | 🔴 | incluido |
| 34 | Al registrar factura de proveedor, marcar `reportes_maquinaria.factura_compra_item` + `estado_compra = 'FACTURADO'` | 🔴 | incluido |
| 35 | Al deshacer pago/detracción, recalcular pendiente de pago en `facturas_compra` | 🔴 | 1h |
| 36 | Consistencia con `tareas_recursos`: un recurso maquinaria externa debe existir en la tarea para que el reporte tenga `proveedor_id`. Verificar que el wizard Asignar Maquinaria externa (gap 7.4.3 #29) complete el `proveedor_id` | 🔴 | 1h (verificar + test) |

**Total cross:** ~2h.

---

## 10.5 Server actions pendientes

```
// lib/actions/compras.ts (NUEVO archivo)
getPanelComprasData()
getValoracionesComprasData(filters)
getFacturasComprasData(filters)
createValorizacionCompra(reportesIds, tenantId)
deleteValorizacionCompra(codigo)
updateValorizacionCompra(...)
createFacturaCompra(valoracionesIds, data, pdfFile)
updateFacturaCompra(...)
deleteFacturaCompra(id)
createPagoCompra(facturaId, data)
deletePagoCompra(id)
updateDetraccionCompra(facturaId, data)
```

**Esfuerzo:** incluido en items anteriores.

---

## 10.6 Schema: qué está listo y qué falta

### Ya existe (backend completo):
- `facturas_compra` con columnas de detracción (`detraccion_soles`, `detraccion_usd`, `detraccion_porcentaje`, `detraccion_constancia`, `detraccion_fecha_pago`, `detraccion_paga_por`, `detraccion_pago_monto_soles`)
- `facturas_compra_item` (FK a reportes)
- `facturas_compra_pagos` normalizada con RLS
- `reportes_maquinaria.proveedor_id` + `estado_compra` + `valorizacion_compra` + `factura_compra_item` + `cotizacion_compra_item_id`
- Vistas: `view_valoraciones_compras`, `view_compras_pendiente_valorizar`, `view_compras_pendientes_facturar` — todas con filtro `propietario='tercero'` correcto

### Falta agregar:
```sql
-- 1. Config valorización compra por tenant (opcional, análogo 9.4)
CREATE TABLE config_valorizacion_compra (
  tenant_id UUID PK, codigo_formato TEXT, version_formato TEXT,
  fecha_formato TEXT, igv_default NUMERIC, detraccion_default NUMERIC
);
```

**Compartidos con Ventas:** `bancos`, catálogos — no se duplican.

**Esfuerzo schema:** ~1h (sólo `config_valorizacion_compra` si se quiere PDF de compra).

---

## Resumen y recomendación pre-cutover

### 🔴 BLOQUEA-CUTOVER (~58h)

**A) Panel Compras — ~5.5h**
- KPIs + dos listas agrupadas por proveedor + navegación

**B) Valorización Compras — ~27h**
- Listado con 18 columnas + filtros + headers
- Menú masivo (Valorizar, PDF, Deshacer, Editar, Facturar)
- Dialog Valorizar con cálculo de lo que se debe al proveedor
- Acciones individuales (Precio por Día, Movilización, Deshabilitar)

**C) Facturación Compras — ~22h**
- Listado con 18 columnas + headers
- Ver/Editar Factura del Proveedor (upload PDF recibido)
- Nuevo Pago + tabla existente `facturas_compra_pagos`
- Detracción retenida
- Deshacer Factura

**D) Cross-module — ~2h**
- Marcado correcto reporte → valorización compra → factura compra
- Verificar proveedor_id en asignación de maquinaria externa

**E) Schema opcional — ~1h**
- `config_valorizacion_compra` si se quiere PDF soporte

### 🟡 POST-CUTOVER (~11h — diferidos)

- Export Excel valoraciones y facturas
- Cambiar estado manual (admin)
- Link a informe combustible desde compras
- Deshabilitar informe individual
- PDF valorización compra (soporte interno)

### Plan sugerido (específico de Compras)

El orden crítico es:
1. **Panel + navegación** (5.5h) — visibilidad
2. **Valorización: listado + workflow** (20h) — registrar lo que se le debe al proveedor
3. **Facturación: listado + registro factura proveedor** (15h) — recibir factura PDF
4. **Pagos + detracciones** (8h) — flujo de pago
5. **Acciones individuales** (6h)
6. **Cross-module consistency** (2h)

Compartir agresivamente componentes/server actions con Ventas (9.x) — dialogs, tablas, PDF renderers, bancos, catálogos. Estimación incluye reuso (~15% savings).

---

## Consolidado post-Compras

| Módulo | 🔴 |
|---|---|
| Cotizaciones | 5h |
| Planificación | 57h |
| Ventas | 68h |
| **Compras** | **58h** |
| **Subtotal auditado** | **188h** |

Falta **Informes** (audit 08 pendiente — pero el módulo de Formatos/Checklist va a rediseño con APP móvil, fuera del scope del cutover).

**Proyección cutover:**
- Con 1 dev full-time: **188h / 40h/sem = 4.7 semanas** (21 días hábiles) → **fecha realista ~2026-05-20 a 2026-05-25**.
- Con 2 devs full-time paralelos y sin overhead: **~2.5 semanas** → **~2026-05-10**.
- Con 1 dev + priorización brutal (congelar Plan Personal view, Plan Maq view, Planes de Acción, PDFs no críticos, exports Excel): ~120h → **3 semanas** → **~2026-05-10 a 2026-05-17**.

**Recomendación inmediata al cliente:** renegociar cutover a **lunes 2026-05-25** dando margen razonable, o a **lunes 2026-05-18** si se recortan features del módulo Informes por completo (coherente con el rediseño de Formatos + APP que va aparte).
