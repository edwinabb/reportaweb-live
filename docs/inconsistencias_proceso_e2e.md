# Inconsistencias — Proceso E2E Valorización Ventas
**Generado:** 2026-05-23 | **Origen:** Verificación E2E valorización ventas  
**Estado:** Pendiente revisión

---

## Cómo usar este documento

Cada inconsistencia tiene:
- **ID** único para referencias
- **Nivel**: 🔴 Crítico · 🟡 Alto · 🟠 Medio · 🟢 Bajo
- **Decisión**: columna para que el revisor anote ACEPTAR / CORREGIR / INVESTIGAR

---

## 🔴 CRÍTICO — Gaps verificación E2E valorización ventas

---

### INC-025 · `ventas.ts` — Falta server action `createFacturaVenta`
| Campo | Valor |
|-------|-------|
| **Archivo** | `lib/actions/ventas.ts` |
| **Problema** | No existe server action que inserte en `facturas_venta`. El flujo valorización VALORADO → emitir factura está cortado: la UI llama a `createFacturaVenta(codigoValorizacion, payload)` pero la función no existe, lo que provoca error en runtime al intentar facturar desde el módulo de valorización de ventas. |
| **Afectados** | 100% de ventas en estado VALORADO que intenten emitir factura |
| **Corrección sugerida** | Implementar `createFacturaVenta(codigoValorizacion, payload)` en `lib/actions/ventas.ts` con inserción en `facturas_venta` y actualización de estado en la valorización correspondiente. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-026 · `view_ventas_pendientes_facturar` — no expone `cliente_id`
| Campo | Valor |
|-------|-------|
| **Vista** | `view_ventas_pendientes_facturar` |
| **Columna faltante** | `cliente_id` |
| **Problema** | La vista no incluye `cliente_id`. El código en `ventas.ts` compensa buscando todos los terceros y mapeando por nombre. Este workaround produce colisiones cuando existen clientes con nombres duplicados, asignando la factura al cliente incorrecto. |
| **Afectados** | Cualquier tenant con nombres de clientes duplicados |
| **Corrección sugerida** | Agregar `cliente_id` a la vista `view_ventas_pendientes_facturar` para evitar la búsqueda por nombre y eliminar el riesgo de colisión. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-027 · `ventas.ts` — posible mismatch en valores de `estado_venta`
| Campo | Valor |
|-------|-------|
| **Archivo** | `lib/actions/ventas.ts` |
| **Columna** | `estado_venta` |
| **Problema** | El código escribe y compara los valores `'VALORADO'` y `'PENDIENTE'` (strings largos), pero el contexto del proyecto indica que la vista `view_ventas_pendiente_valorizar` puede filtrar por `'V'` (código corto). Si hay mismatch, ninguna venta aparecerá en la lista de pendientes y el flujo de valorización quedará invisible para el usuario. |
| **Afectados** | Potencialmente 100% del módulo de valorización de ventas |
| **Corrección sugerida** | Verificar el DDL de `view_ventas_pendiente_valorizar` y confirmar qué valor filtra. Alinear el código en `ventas.ts` con el valor real usado en la vista. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-028 · `deshacerFacturaVenta` — condición de filtro nunca matchea en `reportes_maquinaria`
| Campo | Valor |
|-------|-------|
| **Archivo** | `lib/actions/ventas.ts` |
| **Función** | `deshacerFacturaVenta` |
| **Tabla afectada** | `reportes_maquinaria` |
| **Problema** | La función filtra `reportes_maquinaria` con la condición `factura_venta_item = factura.codigo_factura`. Si `factura_venta_item` es una columna UUID (FK a `facturas_venta.id`) y `factura.codigo_factura` es un código alfanumérico, la condición nunca matchea. Resultado: al deshacer una factura de venta, los reportes de maquinaria asociados no regresan al estado VALORADO y quedan en un estado inconsistente. |
| **Afectados** | Todos los reportes de maquinaria vinculados a facturas de venta al ejecutar "deshacer factura" |
| **Corrección sugerida** | Verificar el tipo y semántica de `factura_venta_item` en `reportes_maquinaria`. Si es UUID FK a `facturas_venta.id`, corregir el filtro para usar el `id` de la factura en lugar de `codigo_factura`. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

## 🟡 ALTO — Gaps verificación E2E valorización compras (T4)

---

### INC-029 · `compras.ts` — `setPrecioPorDiaReporteCompra` descarta precio unitario
| Campo | Valor |
|-------|-------|
| **Archivo** | `lib/actions/compras.ts` |
| **Función** | `setPrecioPorDiaReporteCompra` |
| **Problema** | El parámetro `precioUnitario` se declara como `void` y es descartado; solo persiste `horas_facturar`. No existe columna `precio_compra_override` en `reportes_maquinaria`, por lo que un override real del precio de compra es imposible con la estructura actual. |
| **Afectados** | Cualquier flujo que intente ajustar el precio unitario por día en un reporte de compra |
| **Corrección sugerida** | Agregar columna `precio_compra_override` en `reportes_maquinaria` y persistirla desde `setPrecioPorDiaReporteCompra`. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-030 · `compras.ts` — Race condition en `peekNextCodigoValorizacionCompra`
| Campo | Valor |
|-------|-------|
| **Archivo** | `lib/actions/compras.ts` |
| **Función** | `peekNextCodigoValorizacionCompra` |
| **Problema** | La generación del siguiente código de valorización no es atómica. Dos valorizaciones simultáneas pueden obtener el mismo código, provocando duplicados o errores de constraint. |
| **Afectados** | Entornos con concurrencia alta o múltiples usuarios valorizando al mismo tiempo |
| **Corrección sugerida** | Reemplazar la lógica por una secuencia PostgreSQL (`CREATE SEQUENCE`) o agregar un unique constraint con lógica de retry en el servidor. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-031 · `compras.ts` — `proveedor_id` no se persiste en `valorizaciones`
| Campo | Valor |
|-------|-------|
| **Archivo** | `lib/actions/compras.ts` |
| **Función** | `valorizarReportesCompra` |
| **Tabla afectada** | `valorizaciones` |
| **Problema** | El INSERT en `valorizaciones` no incluye el campo `proveedor_id`. Las valorizaciones de compra quedan sin proveedor asociado, rompiendo trazabilidad y cualquier consulta que filtre o agrupe por proveedor. |
| **Afectados** | 100% de valorizaciones de compra generadas con el flujo actual |
| **Corrección sugerida** | Incluir `proveedor_id` en el INSERT de `valorizarReportesCompra`, tomándolo del contexto de la valorización. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-032 · `registrar-factura-compra-dialog.tsx` — `tasa_cambio_id` siempre `null`
| Campo | Valor |
|-------|-------|
| **Archivo** | `components/compras/valoraciones/registrar-factura-compra-dialog.tsx` |
| **Acción relacionada** | `createFacturaCompra` en `lib/actions/compras.ts` |
| **Problema** | El dialog `RegistrarFacturaCompraDialog` no expone selector de tasa de cambio, por lo que `tasa_cambio_id` llega siempre como `null` al servidor. Dato crítico para contabilidad de facturas en moneda extranjera. |
| **Afectados** | Facturas de compra emitidas en moneda extranjera |
| **Corrección sugerida** | Agregar selector de tasa de cambio en el dialog y pasar el valor seleccionado a `createFacturaCompra`. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-033 · `compras.ts` — `deshacerFacturaCompra` sin advertencia de detracción
| Campo | Valor |
|-------|-------|
| **Archivos** | `lib/actions/compras.ts` + componente dialog de deshacer factura compra |
| **Función** | `deshacerFacturaCompra` |
| **Problema** | Si la factura tiene una detracción registrada, la acción de deshacer elimina la factura sin advertir al usuario sobre la detracción asociada. Puede generar inconsistencias contables y fiscales difíciles de auditar. |
| **Afectados** | Facturas de compra con detracción registrada al ejecutar "deshacer factura" |
| **Corrección sugerida** | Antes de eliminar, verificar si existen detracciones asociadas y mostrar advertencia explícita al usuario (o bloquear la acción hasta que se gestione la detracción). |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

## Registro de decisiones

| ID | Fecha | Decisión | Responsable | Notas |
|----|-------|----------|-------------|-------|
| INC-025 | | | | |
| INC-026 | | | | |
| INC-027 | | | | |
| INC-028 | | | | |
| INC-029 | | | | |
| INC-030 | | | | |
| INC-031 | | | | |
| INC-032 | | | | |
| INC-033 | | | | |
