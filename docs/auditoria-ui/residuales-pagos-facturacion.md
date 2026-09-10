# Residual — Tablas de Ventas/Compras sin migrar o bajo confirmar (pagos, bancos, valorizaciones)

**Fecha:** 2026-09-10 · **Disparado por:** el usuario, al pedir revisar dos veces qué tablas usan Ventas y Compras porque sospechaba que faltaba migrar información — primero sobre pagos/cobros, luego pidiendo explícitamente revisar también las tablas adicionales de Valorizaciones. Confirmado en Supabase PROD (`fqwhagryqkkhbgznxtwf`) el mismo día.

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

## Hallazgo 3 — `bancos` está completamente vacía (0 filas, 0 tenants) — nunca migrada 🔴 CRÍTICO

- La tabla `bancos` (cuentas bancarias del tenant, usada como `banco_id` en `cobros_venta` y mostrada en el dropdown de "Registrar cobro") tiene **0 filas en PROD**, para CISE y para GRUAS.
- `bancos.bubble_id` existe como columna (y el recorrido Fases 1-9 agregó `UNIQUE(bubble_id)` sobre esta tabla el 2026-09-08 — ver `CLAUDE.md` § Estado Actual), pero **ningún script en `scripts/` referencia `bancos`** — nunca se escribió ni ejecutó una migración real para esta tabla, solo se le agregó el constraint.
- **Impacto:** aunque se resuelva el Hallazgo 1 (`cobros_venta` vacía), el formulario de "Registrar cobro" depende de poder elegir un banco — con la tabla vacía, nadie puede registrar un cobro nuevo hoy en ningún tenant. Esto bloquea la funcionalidad, no solo el dato histórico.

## Hallazgo 4 — `valorizaciones`: GRUAS tiene 0 filas, CISE tiene 752 — asimetría sin explicación documentada 🟡 A CONFIRMAR

- La tabla `valorizaciones` (752 filas totales, 100% con `bubble_id`) pertenece **exclusivamente a CISE** — `tenant_id` GRUAS (`6f4c923a-...`) tiene **0 filas**, a pesar de que GRUAS es el tenant con más actividad de facturación real (1.720 `facturas_venta` + 1.399 `facturas_compra`, vs 1.410 + 74 de CISE).
- De esas 752, **0 son de Compra** (ninguna tiene prefijo `C-` en `codigo`) — toda valorización de Compra que exista hoy en el sistema (para cualquier tenant) fue creada por el fix de hoy (PR #2) usando datos sintéticos en TEST, nunca en PROD.
- No se encontró ningún script dedicado a migrar `valorizaciones` desde Bubble en `scripts/` — las 752 filas de CISE probablemente vienen de un script más antiguo (era del cutover de mayo 2026, antes de la convención de nombres de esta sesión), que aparentemente nunca se corrió (o no se corrió completo) para GRUAS.
- Nota: esto es compatible con la resolución ya cerrada de `P-003` en `docs/pendientes_por_resolver.md` (los `reportes_maquinaria.valorizacion_venta/compra` de GRUAS apuntan a Bubble IDs de FACTURA directamente, sin pasar por una fila de `valorizaciones` — "congelados como VALORADO", sin fix necesario) — pero no confirma si GRUAS alguna vez tuvo un concepto de "valorización" en Bubble equivalente al de CISE, o si el paradigma para GRUAS siempre fue directo factura-sin-valorización.

## Pendiente por confirmar en Bubble

1. **Ventas — urgente:** en Bubble (`reporta.la`, tenant GRUAS), contar cuántas facturas de venta tienen al menos un pago/cobro registrado (tipo de dato `factura_venta_pagos` o equivalente en el panel) y comparar contra las 521 filas ya migradas a `factura_venta_pagos` en Supabase — confirmar que el número cuadra, y luego decidir cómo backfillear `cobros_venta` (probablemente un script de transformación 1:1, ya que los campos son casi idénticos).
2. **Compras:** en Bubble, contar cuántos pagos a proveedor existen realmente para GRUAS+CISE y comparar contra las 22 filas migradas — confirmar si el 1,4% de cobertura es real (pocos proveedores cobrados formalmente) o un gap de migración.
3. **Bancos — urgente:** confirmar en Bubble qué tipo de dato representa las cuentas bancarias del tenant (usado en formularios de cobro/pago) y migrarlo — hoy bloquea registrar cobros nuevos en cualquier tenant, no solo el histórico.
4. **Valorizaciones GRUAS:** confirmar en Bubble si GRUAS tuvo alguna vez un concepto de "Valorización" separado de la factura (como sí lo tuvo CISE, con 752 filas) — si existe, migrar; si el paradigma de GRUAS siempre fue directo, documentar como diferencia esperada entre tenants, no como gap.
5. **Valorizaciones de Compra:** confirmar en Bubble si existe algún registro equivalente a "valorización de compra" para GRUAS o CISE — hoy la tabla tiene 0 filas de ese tipo en todo el sistema.
6. Una vez confirmado en Bubble, decidir: (a) backfill de `cobros_venta` desde `factura_venta_pagos`, (b) migración real de `bancos`, (c) delta-sync adicional para `facturas_compra_pagos`, (d) qué hacer con la asimetría de `valorizaciones` por tenant.

## Estado

🔴 **Abierto — no bloquea el cierre ya hecho de Ventas/Compras a nivel UI**, pero son gaps de datos reales y de alto impacto de negocio (cobranza y pagos no confiables; no se puede registrar un cobro nuevo por falta de bancos) que deben resolverse antes de considerar Facturación 100% migrada. Ver `docs/auditoria-ui/11-ventas.md` y `docs/auditoria-ui/12-compras.md` — ambos módulos quedan con esta nota, y `docs/pendientes_por_resolver.md` § P-005.
