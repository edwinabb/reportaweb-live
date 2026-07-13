# Auditoría módulo — Ventas

**Fecha:** 2026-04-19
**Cutover objetivo:** 2026-04-26 (7 días — insuficiente, ver conclusión)
**Screenshots referencia:** `9- Reporta Next - Ventas.pdf` (del usuario)

El módulo Ventas de Bubble tiene 3 sub-módulos: **Panel Ventas**, **Valorización Ventas**, **Facturación Ventas**. Es un workflow lineal `Reporte Maquinaria → Valorización → Factura → Cobro + Detracción`. Impacta directamente la caja de la empresa.

Severidad:
- 🔴 BLOQUEA-CUTOVER — sin esto no se puede hacer el cutover del 2026-04-26.
- 🟡 POST-CUTOVER — no crítico, puede ir a Fase 4.
- 🟢 MEJORA — opcional / nice-to-have.

**Estado general:** el módulo está ~25% implementado. Panel funciona, listado de valoraciones funciona; **todo el CRUD transaccional (Valorizar, Facturar, Cobrar, Detracción) está pendiente de construir**.

---

## 9.0 Panel Ventas

**Archivos Next:** [app/(dashboard)/ventas/panel/page.tsx](../../app/(dashboard)/ventas/panel/page.tsx) · [lib/actions/ventas.ts](../../lib/actions/ventas.ts) `getPanelVentasData`

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | 2 listas side-by-side: Pendientes Valorizar Ventas (cliente + cant informes + informe más antiguo + horas pendientes) y Pendientes Facturar Ventas (cliente + cant valorización + informe más antiguo + monto pendiente) | ✓ Implementado con vistas `view_ventas_pendiente_valorizar` + `view_ventas_pendientes_facturar` | ✅ OK | ✅ | — |
| 2 | Click en cliente → abre Valorizaciones filtrado por cliente + estado | ✓ `/ventas/valoraciones?cliente_id=X&estado=...` | ✅ OK | ✅ | — |
| 3 | KPI cards arriba (Total facturado/mes, pendiente cobro) | ✓ 4 KPIs (distinto set) | Equivalente — verificar que los KPIs coincidan con los de Bubble | 🟢 | 1h |
| 4 | Paginación 10 items/página en cada lista | ✓ | ✅ | ✅ | — |

**Total esfuerzo Panel:** ~1h (🟢).

---

## 9.1 Valorización Ventas (listado + workflow)

**Archivos Next:** [app/(dashboard)/ventas/valoraciones/page.tsx](../../app/(dashboard)/ventas/valoraciones/page.tsx) · vista `view_valoraciones_ventas` · [lib/actions/ventas.ts](../../lib/actions/ventas.ts) `getValoracionesData`

### 9.1.1 Tabla principal

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 5 | 18 columnas: Informe (link PDF), Fecha, Día, Cliente, Lugar, Descripción, Maquinaria, Cotización (link), Hrs Recorrido, Jornadas Trabajo, Hrs Trabajo, Hrs Mínimas, Cant Facturar, Moneda, Precio Venta, Total Venta, Valoración Venta (link), Factura Venta, **Proveedor** | ✓ 18 columnas implementadas | Verificar **link al PDF del informe**, **link a PDF cotización**, **link a PDF valoración** — indicador visual cuando no está generado | 🔴 | 2h |
| 6 | Headers: Pendientes Valorizar / Pendientes Facturar / Horas Facturadas con totales vivos | Filtros rápidos por estado | Parity funcional pero UX distinta. Headers con totales ayudan al comercial | 🟡 | 1.5h |
| 7 | Filtros: rango fechas + cliente + select estado (Pendientes/Valorados/Facturados/Todos) + búsqueda número informe + cotización + maquinaria + habilitados/deshabilitados | Búsqueda cliente + 4 botones estado | **Faltan**: rango fechas, búsqueda por nº informe/cotización/maquinaria, hab/deshab | 🔴 | 3h |
| 8 | Botón "Cargar factura" (arriba a la derecha) para upload masivo de PDF de facturas reales del cliente | ❌ | Permite asignar PDF a facturas ya creadas sin abrir cada una | 🟡 | 2h |
| 9 | Botón descargar Excel | ❌ | Seguimiento cobros | 🟡 | 1.5h |
| 10 | Selección múltiple con checkbox header + por fila | ✓ tanstack table | ✅ | ✅ | — |

### 9.1.2 Menú masivo (cambia según estado seleccionado)

Crítico — es la forma principal de operar el workflow.

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 11 | **Pendientes** → opción **Valorizar Venta** | Botón "Acciones Masivas" existe pero no funciona (placeholder) | **Sin esto no se puede crear una valorización** | 🔴 | 1h (wire) + incluido en #12 |
| 12 | **Valorizar Venta** dialog: N° valorización (auto), fecha, tabla informes seleccionados con fecha/descripción/horas trabajo/mínimas/cantidad/precio/total, % detracción (10% default), % IGV (18% default), subtotal/total, "Guardar Valorización" → genera PDF + marca informes como VALORADO | ❌ | **Core del módulo. Sin esto Ventas está roto.** | 🔴 | 8h (dialog + server action + validación + markIds) |
| 13 | **Valorados** → menú con PDF Valoración / Deshacer Valoración / Editar Valoración / Facturar Venta | ❌ | Flujo de corrección imposible | 🔴 | 4h (4 acciones × ~1h) |
| 14 | **Facturar Venta** dialog: cliente + cotización + fecha aceptación (ro), forma/plazo pago (ro), moneda, **tabla de valorizaciones seleccionadas** (NO reportes — varias valorizaciones pueden entrar en 1 factura), % detracción, % IGV, totales, Factura No., Fecha Factura, **Tasa de cambio (a fecha factura)**, Cantidad días pago, Fecha Vencimiento, Upload archivo PDF (factura real del cliente) | ❌ | **Sin esto no se registra una factura real** | 🔴 | 6h |
| 15 | **Facturados** → menú Ver Factura / Editar Factura / Deshacer Factura | ❌ | Administración de facturas rota | 🔴 | 3h |

### 9.1.3 Menú individual por informe (⋮ en cada fila)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 16 | **PDF Reporte** — genera PDF del informe (sin cambios) si no fue generado | ❌ | Depende de renderer de Reporte Maquinaria (ver 7.8 audit 07) | 🔴 | incluido en 07 |
| 17 | **PDF Reporte 2** — segunda versión PDF (formato alternativo) | ❌ | ¿Aplica a todos los tenants? Revisar con usuario | 🟢 | 1.5h |
| 18 | **Cambiar a P / V / F** — admin sistema fuerza cambio de estado para resolver problemas | ❌ | Herramienta de rescate operativo | 🟡 | 2h |
| 19 | **Precio por Día** — override del precio del informe (usa Precio 2 de la cotización: "Precio por Servicio / HxD") | ❌ | Algunos clientes pagan por día completo no por hora. **Crítico para facturación correcta** | 🔴 | 2h |
| 20 | **Informe de Combustible** — link a reporte_combustible asociado | Parcial (existe tabla, falta link desde ventas) | Visibilidad desde ventas | 🟡 | 1h |
| 21 | **Informe de Movilización** — crea informe virtual de mov/desmov si la cotización lo incluye (sirve como ítem separado en valorización) | ❌ | Cuando la cotización factura movilización aparte del alquiler, se genera acá | 🔴 | 3h |
| 22 | **Deshabilitar Informe** — soft-delete desde ventas (no borra el reporte, lo excluye) | ❌ | Casos de reportes registrados por error que se quieren excluir | 🟡 | 1h |

### 9.1.4 PDF de Valorización (G.PAC-04 V.05 Sept-2025)

**Ref:** ejemplo en el PDF del usuario (pág. 4 y 6). Formato variable por tenant — integrar con `config_informe_*` del audit 07.

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 23 | Header: logo + título "VALORIZACIÓN DE SERVICIOS" + código/versión/fecha formato | ❌ | Usar mismo pattern de config por tenant (sección 7.8) con tabla `config_valorizacion_venta` | 🔴 | 1h |
| 24 | Datos cliente: CONSECUTIVO (ej. 2026-01981 (24 TN)), FECHA, CLIENTE, RUC | ❌ | Consecutivo estilo YYYY-NNNNN(tipo) — lógica de numeración | 🔴 | 1.5h |
| 25 | Tabla detalle: FECHA, DÍA, NÚMERO REPORTE, DETALLE FACTURA, PLACA, HORA INICIO 1, HORA FIN 1, HORA INICIO 2, HORA FIN 2, RECORRIDO, HORAS, TOTAL FACTURAR, PRECIO UNITARIO (S/), SUBTOTAL (S/) | ❌ | Multi-página automática | 🔴 | 3h |
| 26 | Footer totales: SUBTOTAL, IGV 18%, TOTAL A FACTURAR | ❌ | — | 🔴 | 30 min |
| 27 | Pie: Preparado por + fecha, Última edición + fecha | ❌ | — | 🔴 | 15 min |

**Subtotal PDF Valorización:** ~6h (todo 🔴).

### 9.1.5 Dato faltante: `tonelaje_solicitado` en reportes_maquinaria

El PDF Valorización incluye el tonelaje solicitado junto a la placa (parte del "DETALLE FACTURA"). La tabla actual `reportes_maquinaria` no tiene ese campo — se deriva de la maquinaria asociada, pero puede diferir del tonelaje cotizado (cotización 24TN pero vino 30TN).

| # | Gap | Severidad | Esfuerzo |
|---|---|---|---|
| 28 | Agregar columna `tonelaje_solicitado` a `reportes_maquinaria` (puede auto-poblarse del servicio cotizado) | 🔴 | 1h |

**Total esfuerzo 9.1:** ~42h — casi todo 🔴.

---

## 9.2 Facturación Ventas (listado completo + cobros + detracciones)

**Archivos Next:** [app/(dashboard)/ventas/facturas/page.tsx](../../app/(dashboard)/ventas/facturas/page.tsx) — **placeholder vacío**.

### 9.2.1 Listado principal

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 29 | Tabla con columnas: FACTURA, FECHA, CLIENTE, RUC, BASE, IGV, TOTAL SOLES, DETRACCIÓN SOLES, TOTAL USD, DETRACCIÓN USD, NÚMERO CONSTANCIA, FECHA PAGO DETRACCIÓN, DETRACCIÓN A CARGO DE, MONTO A COBRAR USD, MONTO COBRADO USD, FECHA COBRO, BANCO, PLAZO CRÉDITO, TIPO CAMBIO | ❌ Placeholder vacío | **Core del seguimiento de cobranza** | 🔴 | 4h |
| 30 | Headers: TOTAL FACTURADO, MONTO COBRADO, PENDIENTE DE COBRO (vivos según filtros) | ❌ | Métrica financiera clave | 🔴 | 1h |
| 31 | Filtros: rango fecha + cliente + búsqueda factura + estado detracción | ❌ | — | 🔴 | 1.5h |
| 32 | Botón descargar Excel | ❌ | Contabilidad | 🟡 | 1.5h |

### 9.2.2 Ver Factura / Editar Factura

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 33 | Ver Factura dialog: cliente + cotización + fecha aceptación, forma/plazo pago, tabla valorizaciones (fecha/valorización link/moneda/subtotal/IGV/total), subtotal/%IGV/%detracción/total, Factura No./Fecha/Tasa cambio/Cant días/Vencimiento, link Archivo PDF | ❌ | Ver y descargar factura registrada | 🔴 | 3h |
| 34 | Editar Factura dialog: mismo layout pero editable + re-upload PDF | ❌ | — | 🔴 | 2h |

### 9.2.3 Nuevo Cobro

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 35 | Dialog **REGISTRO DE COBRO**: header con datos factura (cliente, factura, fecha factura, forma/plazo pago, vencimiento), subtotal/IGV/total/%detracción/tasa cambio, lista cobros previos ("NO HAY COBROS REGISTRADOS HASTA LA FECHA"), **PENDIENTE DE COBRO: $X** | ❌ | — | 🔴 | 2h |
| 36 | Form: Tipo (select: efectivo/transferencia/cheque), **Monto** (con moneda), **Banco** (select del catálogo), Fecha Cobro, Comentarios. Permite **múltiples cobros parciales** por factura | ❌ | Cobros parciales son la norma con crédito a 90 días | 🔴 | 2h |
| 37 | Tabla `cobros` nueva | ❌ | Schema nuevo: `cobros_venta` con FK factura_venta_id, tipo, monto, banco_id, fecha, comentarios | 🔴 | 1h (migración) |
| 38 | Catálogo **Bancos** (no existe) | ❌ | Tabla `bancos` con nombre + cuenta + tenant_id | 🔴 | 1h (schema + seed) |

### 9.2.4 Detracción

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 39 | Dialog **REGISTRO DE PAGO DETRACCIÓN** con header factura + info general + % detracción + monto S/ | ❌ | La detracción peruana es obligatoria (10% típico) — si no se registra, no se cuadra SUNAT | 🔴 | 2h |
| 40 | Form: **Detracción a cargo de** (select: CLIENTE / EMPRESA), Monto S/, Número Constancia, Fecha Pago Detracción | ❌ | Campo definitorio: si cliente detrae, no se cobra esa parte — afecta pendiente_cobro | 🔴 | 2h |
| 41 | Schema: agregar a `facturas_venta` columnas `detraccion_porcentaje`, `detraccion_monto`, `detraccion_a_cargo_de`, `detraccion_numero_constancia`, `detraccion_fecha_pago` | Parcial — `detraccion_usd` existe pero faltan los campos de gestión | 🔴 | 1h (migración) |

### 9.2.5 Deshacer Factura

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 42 | Elimina la factura, valorizaciones asociadas vuelven a estado VALORADO, cobros quedan en papelera (soft-delete) | ❌ | Flujo de corrección | 🔴 | 2h |

**Total esfuerzo 9.2:** ~26h — todo 🔴.

---

## 9.3 Integraciones cross-módulo

| # | Gap | Severidad | Esfuerzo |
|---|---|---|---|
| 43 | Al crear valorización, marcar `reportes_maquinaria.valorizacion_venta = <codigo>` — al deshacer, limpiar | 🔴 | incluido en #12/#13 |
| 44 | Al crear factura, marcar `valorizaciones.factura_venta_id` + copiar a `reportes_maquinaria.factura_venta_item` | 🔴 | incluido en #14 |
| 45 | Al deshacer cobro/detracción, recalcular `monto_cobrado_usd` y `pendiente_cobro_usd` en factura | 🔴 | incluido |
| 46 | Vistas materializadas `view_ventas_pendiente_valorizar` y `view_ventas_pendientes_facturar` deben refresh-on-commit (o usar views simples) | Verificar | 🟡 | 1h |

---

## 9.4 Esquema de datos pendiente

### Nuevas tablas / columnas

```sql
-- 1. Bancos (catálogo por tenant)
CREATE TABLE bancos (
  id UUID PK, tenant_id UUID, nombre TEXT, numero_cuenta TEXT,
  moneda TEXT, is_active BOOL DEFAULT TRUE, created_at, updated_at
);

-- 2. Cobros de facturas
CREATE TABLE cobros_venta (
  id UUID PK, factura_venta_id UUID FK, tipo TEXT,
  monto NUMERIC, moneda TEXT, banco_id UUID FK, fecha_cobro DATE,
  comentarios TEXT, tenant_id UUID, is_active BOOL, created_at/by, updated_at
);

-- 3. Detracciones (embed en facturas_venta)
ALTER TABLE facturas_venta
  ADD COLUMN detraccion_porcentaje NUMERIC,
  ADD COLUMN detraccion_monto_sol NUMERIC,
  ADD COLUMN detraccion_a_cargo_de TEXT, -- CLIENTE | EMPRESA
  ADD COLUMN detraccion_numero_constancia TEXT,
  ADD COLUMN detraccion_fecha_pago DATE;

-- 4. Tonelaje solicitado en reportes
ALTER TABLE reportes_maquinaria
  ADD COLUMN tonelaje_solicitado NUMERIC;

-- 5. Config valorización por tenant (extiende pattern 7.8)
CREATE TABLE config_valorizacion_venta (
  tenant_id UUID PK, codigo_formato TEXT, version_formato TEXT,
  fecha_formato TEXT, igv_default NUMERIC, detraccion_default NUMERIC
);
```

**Esfuerzo:** ~3h (migraciones + seed).

---

## Resumen y recomendación pre-cutover

### 🔴 BLOQUEA-CUTOVER (~68h, **crítico**)

**A) Workflow Valorización completo — ~20h**
- Dialog "Valorizar Venta" con PDF generator
- Menu masivo (Valorizados → PDF/Deshacer/Editar/Facturar)
- Campo tonelaje_solicitado
- Filtros completos + links PDF

**B) Menu individual por informe — ~8h**
- PDF Reporte (ya cubierto en 07)
- Precio por Día
- Informe de Movilización
- Deshabilitar informe

**C) Facturación completa — ~26h**
- Listado con 19 columnas + headers de totales + filtros
- Ver/Editar Factura
- Nuevo Cobro + Banco + tabla cobros_venta
- Detracción + columnas en facturas_venta
- Deshacer Factura

**D) Schema + config — ~3h**
- bancos, cobros_venta, config_valorizacion_venta, campos detracción, tonelaje

**E) Cross-module — ~3h**
- Marcado/desmarcado correcto entre reportes → valorizaciones → facturas → cobros

**F) PDF valorización renderer — ~6h** (ya incluido en 9.1.4)

### 🟡 POST-CUTOVER (~8h — diferidos)

- Botón "Cargar factura" (upload masivo)
- Export Excel (valoraciones + facturas)
- Cambiar estado manual (admin)
- Link a informe combustible desde ventas
- Deshabilitar informe
- Headers con totales en valoraciones

### 🟢 MEJORAS (~2.5h — opcionales)

- Verificar KPIs del Panel coinciden con Bubble
- PDF Reporte 2 (formato alternativo)

### Plan sugerido

**Realidad:** Ventas agrega ~68h de 🔴. Es un módulo al que le falta **todo el CRUD transaccional** — sólo hay lectura.

**Totales acumulados a este punto del audit:**

| Módulo | 🔴 |
|---|---|
| Cotizaciones | 5h |
| Planificación | 57h |
| Ventas | 68h |
| **Subtotal** | **130h** |

Faltan **Informes** y **Compras**. Con 130h confirmadas + Compras que es workflow análogo a Ventas (~40-60h esperadas) + Informes (~15h si es sólo listado), **el total pre-cutover supera las 180h**. Con 1 dev full-time = **~4-5 semanas**, no 1.

**Recomendación:** notificar al cliente renegociación del cutover a **2026-05-25** (5 semanas) o priorizar brutalmente: congelar Planes de Acción, Planificación Personal view, reportes avanzados y concentrar en workflow Cotización → Tarea → Informe → Valorización → Factura → Cobro.

Priorizar en este orden dentro de Ventas:
1. **Schema (bancos, cobros, detracciones, tonelaje)** (3h) — prerequisito.
2. **Workflow valorización** (20h) — sin esto no hay plata entrando.
3. **Workflow facturación** (16h).
4. **Cobros + Detracciones** (10h).
5. **Acciones individuales por informe** (8h).
6. **Cross-module consistency** (3h).
