# Residual — Pagos/Cobros de Facturación (Ventas + Compras) sin migrar / bajo confirmar

**Fecha:** 2026-09-10 · **Disparado por:** el usuario, al pedir revisar qué tablas usan Ventas y Compras porque sospechaba que faltaba migrar información. Confirmado en Supabase PROD (`fqwhagryqkkhbgznxtwf`) el mismo día.

## Hallazgo 1 — Ventas: `cobros_venta` está vacía; los pagos migrados de Bubble quedaron en una tabla paralela que la app nunca lee 🔴 CRÍTICO

- `lib/actions/ventas.ts` lee/escribe la tabla **`cobros_venta`** para calcular `monto_pagado_factura` / "Cobrado" / "Pendiente de cobro" en Facturas de Venta (ver comentario línea 843: "recalcula `monto_pagado_factura`... en la factura").
- **`cobros_venta` tiene 0 filas en PROD.**
- El recorrido Fases 1-9 (Fase 9, 2026-09-08) migró los pagos históricos de Bubble a una tabla DIFERENTE: **`factura_venta_pagos`** (521 filas, con `bubble_id`, `id_empresa`, `id_editor` — claramente una tabla de staging de la migración). El código de la app **nunca lee `factura_venta_pagos`** — ningún archivo de `lib/actions/` ni `components/` la referencia.
- Ambas tablas tienen columnas casi idénticas (`factura_venta_id`, `fecha_cobro`, `monto`/`monto_usd`, `moneda`, `comentarios`, `tenant_id`) — un puente/backfill de `factura_venta_pagos` → `cobros_venta` nunca se ejecutó.
- **Impacto confirmado:** de las 3.130 `facturas_venta` en PROD, **0 muestran algún pago registrado** (`monto_pagado_factura > 0` en ninguna fila). Toda factura migrada desde Bubble — incluidas las que sí fueron cobradas en su momento — se ve hoy como 100% pendiente de cobro en el sistema nuevo.

## Hallazgo 2 — Compras: `facturas_compra_pagos` con cobertura muy baja, nunca verificada contra Bubble 🟡 A CONFIRMAR

- A diferencia de Ventas, en Compras la tabla que la app lee/escribe (`facturas_compra_pagos`) SÍ tiene `bubble_id` — parece ser la tabla correcta, no hay tabla paralela detectada.
- Cobertura: **20 de 1.473 facturas_compra (1,4%)** tienen algún pago registrado, 22 filas totales en `facturas_compra_pagos`, suma $12.391,86.
- `scripts/fase9-finanzas-delta.ts` (línea 4) asume esta tabla "ya está al 100%, no se toca" — pero esa afirmación **nunca fue verificada esta sesión ni documentada con una cifra de Bubble de referencia**. Puede ser legítimo (pocos pagos a proveedor efectivamente registrados) o puede ser el mismo patrón de under-migración que Ventas, en menor escala.
- Nota de esquema: `facturas_compra_pagos.factura_compra_id` es `text`, no `uuid` (funciona por comparación de string, pero es una inconsistencia menor frente a `cobros_venta.factura_venta_id` que sí es `uuid`).

## Pendiente por confirmar en Bubble

1. **Ventas — urgente:** en Bubble (`reporta.la`, tenant GRUAS), contar cuántas facturas de venta tienen al menos un pago/cobro registrado (tipo de dato `factura_venta_pagos` o equivalente en el panel) y comparar contra las 521 filas ya migradas a `factura_venta_pagos` en Supabase — confirmar que el número cuadra, y luego decidir cómo backfillear `cobros_venta` (probablemente un script de transformación 1:1, ya que los campos son casi idénticos).
2. **Compras:** en Bubble, contar cuántos pagos a proveedor existen realmente para GRUAS+CISE y comparar contra las 22 filas migradas — confirmar si el 1,4% de cobertura es real (pocos proveedores cobrados formalmente) o un gap de migración.
3. Una vez confirmado en Bubble, decidir: (a) si se backfillea `cobros_venta` desde `factura_venta_pagos` con un script dedicado, y (b) si hace falta un delta-sync adicional para `facturas_compra_pagos` similar al de Fase 9 para las demás tablas de Compras.

## Estado

🔴 **Abierto — no bloquea el cierre ya hecho de Ventas/Compras a nivel UI**, pero es un gap de datos real y de alto impacto de negocio (reportes de cobranza) que debe resolverse antes de considerar Facturación 100% migrada. Ver `docs/auditoria-ui/11-ventas.md` y `docs/auditoria-ui/12-compras.md` — ambos módulos quedan con esta nota added.
