# Residuales de Facturación — huérfanos de items/pagos (Fase 9)

**Fecha de verificación:** 2026-09-09
**Proyecto Supabase:** PROD `fqwhagryqkkhbgznxtwf`
**Tenants:** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
**Alcance:** solo lectura (`SELECT`), ninguna escritura realizada durante esta verificación.

## Contexto

El plan del recorrido Fases 1-9
(`docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md:41`) documentó, al cerrar la
Fase 9 (Facturación), un "gap restante" de ítems/pagos cuyo `bubble_id` **no aparece en el array
`lista_items`/`lista_cobros` de ninguna factura padre en Bubble** — es decir, filas que Bubble
nunca vinculó a ninguna factura y que por lo tanto **nunca se insertaron** en Supabase durante el
delta-sync (no es un gap de FK en la fila ya migrada, es un gap de filas que no llegaron a existir
en destino):

- `facturas_venta_item`: gap restante documentado = 1.215 (CISE) + 2.112 (GRUAS) = 3.327
- `facturas_compra_item`: gap restante documentado = 638 (CISE) + 1.889 (GRUAS) = 2.527
- `factura_venta_pagos`: gap restante documentado = 3 (CISE) + 3 (GRUAS) = 6

Esta tarea (Task 6) verifica el estado **actual** de las 3 tablas en PROD y documenta lo
encontrado — sin forzar que coincida con las cifras aproximadas de arriba.

## Paso 1 — Nombres reales de columna (FK)

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_name IN ('facturas_venta_item', 'facturas_compra_item', 'factura_venta_pagos')
ORDER BY table_name, ordinal_position;
```

Resultado:

| Tabla | Columna FK real |
|---|---|
| `facturas_venta_item` | `factura_venta_id` (coincide con el supuesto del brief) |
| `facturas_compra_item` | **`factura_id`** (el brief asumía `factura_compra_id` — nombre real distinto) |
| `factura_venta_pagos` | `factura_venta_id` (coincide con el supuesto del brief) |

Además se confirmó (`pg_constraint`) que **ninguna de las 3 columnas tiene una FK constraint
formal** hacia `facturas_venta`/`facturas_compra` — son columnas planas sin `REFERENCES`, igual que
el resto del histórico de esta migración (bubble_id sin `UNIQUE` hasta que se agregó a mano en
fases anteriores del recorrido).

## Pasos 2-4 — Conteos encontrados hoy

```sql
SELECT tenant_id, count(*) FROM facturas_venta_item
WHERE bubble_id IS NOT NULL AND factura_venta_id IS NULL GROUP BY tenant_id;
-- 0 filas (ningún tenant)

SELECT tenant_id, count(*) FROM facturas_compra_item
WHERE bubble_id IS NOT NULL AND factura_id IS NULL GROUP BY tenant_id;
-- GRUAS: 8.911 · CISE: 4.863  (total 13.774)

SELECT tenant_id, count(*) FROM factura_venta_pagos
WHERE bubble_id IS NOT NULL AND factura_venta_id IS NULL GROUP BY tenant_id;
-- 0 filas (ningún tenant)
```

Estas cifras **no coinciden** con las aproximadas del plan (3.327 / 2.527 / 6), y por una razón
distinta en cada tabla — investigado a continuación.

### `facturas_venta_item` y `factura_venta_pagos`: 0 huérfanos por FK nula

Los "huérfanos reales" que documentó la Fase 9 (3.327 en venta_item, 6 en pagos) son filas que
**nunca llegaron a insertarse** — no existen en la base hoy, así que no pueden aparecer en una
query `WHERE ... IS NULL` sobre filas existentes. El conteo correcto de "presencia de huérfanos
como filas con FK nula" es **0** en ambas tablas: toda fila que sí se migró tiene su
`factura_venta_id` resuelto. Se confirmó adicionalmente (ver Nota técnica) que tampoco hay FKs
"colgantes" (no nulas mas sin fila padre existente): 0 en las 3 tablas.

### `facturas_compra_item`: 13.774 filas con `factura_id IS NULL` — no son huérfanos de origen

A diferencia de venta, esta tabla sí tiene un número grande de filas con `factura_id IS NULL`
(13.774 de 22.941 totales = ~60%). Se investigó la causa cruzando con la columna `estado`:

```sql
SELECT estado, factura_id IS NULL AS fk_null, count(*)
FROM facturas_compra_item GROUP BY estado, fk_null ORDER BY estado, fk_null;
```

| `estado` | FK nula | count |
|---|---|---:|
| `F` (facturado) | no | 9.140 |
| `F` (facturado) | **sí** | 3 |
| `NA` (no aplica / no facturado aún) | sí | 10.893 |
| `P` (pendiente) | sí | 2.873 |
| `V` (vencido) | no | 27 |
| `V` (vencido) | **sí** | 1 |
| `null` | sí | 4 |

**Hallazgo:** la inmensa mayoría de las filas con `factura_id IS NULL` (10.893 + 2.873 = 13.766)
están en estado `NA` o `P` — es decir, son ítems de compra que **todavía no fueron facturados**,
un estado de negocio legítimo y esperado (un ítem de compra puede existir en el sistema
—asociado a un reporte de maquinaria vía `maquinaria_reporte_id`— antes de que se genere la
factura de compra que lo incluya). No es un gap de datos ni un bug de migración.

Filtrando solo las filas en estado terminal (`F`/`V`) o sin estado, que **sí deberían** tener
`factura_id` resuelto y no lo tienen, quedan **8 filas** — comparable en orden de magnitud al
patrón de huérfanos reales de las otras dos tablas:

```sql
SELECT tenant_id, estado, count(*) FROM facturas_compra_item
WHERE factura_id IS NULL AND (estado IS NULL OR estado NOT IN ('NA','P'))
GROUP BY tenant_id, estado;
```

| Tenant | `estado` | count |
|---|---|---:|
| CISE | `F` | 3 |
| CISE | `null` | 3 |
| CISE | `V` | 1 |
| GRUAS | `null` | 1 |

Total: **7 (CISE) + 1 (GRUAS) = 8 filas** anómalas (facturadas/vencidas sin FK a su factura, o sin
estado). Volumen trivial, mismo patrón de residual real documentado en el resto del recorrido —
no se investiga más a fondo por no ser bloqueante ni tener impacto visible en UI (los listados de
compras usan `facturas_compra`/`facturas_compra_pagos`, no dependen de esta columna para renderizar
el total).

## Conclusión

| Tabla | FK real | Huérfanos "nunca insertados" (documentado en Fase 9) | Filas con FK nula hoy en PROD | Explicación |
|---|---|---:|---:|---|
| `facturas_venta_item` | `factura_venta_id` | 1.215+2.112=3.327 (nunca insertados, no existen) | **0** | Todo lo migrado quedó bien vinculado |
| `facturas_compra_item` | `factura_id` | 638+1.889=2.527 (nunca insertados, no existen) | **13.774** (13.766 de ellas = ítems legítimamente no facturados aún, `estado` NA/P; 8 = anómalas) | Mayoría es estado de negocio normal, no un gap |
| `factura_venta_pagos` | `factura_venta_id` | 3+3=6 (nunca insertados, no existen) | **0** | Todo lo migrado quedó bien vinculado |

El vínculo real en Bubble entre un ítem/pago y su factura padre es el array
`lista_items`/`lista_cobros` de la factura — no existe (ni existió nunca) un campo FK directo en el
lado del hijo dentro de Bubble. Los ~3.327 + ~2.527 + 6 registros que el array de la factura padre
nunca referenció en ninguna factura de Bubble **no se migraron** (no se inventó ningún vínculo) y
por lo tanto no son visibles como filas con `bubble_id IS NOT NULL AND <fk> IS NULL` en Supabase
hoy: simplemente no están. Es un residual real del origen (Bubble), documentado y no accionable sin
intervención manual del cliente/origen.

El único hallazgo nuevo de esta verificación es el volumen de `facturas_compra_item.factura_id
IS NULL` (13.774), que en su gran mayoría (13.766) corresponde a ítems en estado `NA`/`P`
(pendientes de facturar, aún no vinculados por diseño de negocio) y no a un problema de datos. Las
8 filas restantes (estado terminal sin FK) son un residual menor, mismo patrón que el resto del
recorrido, documentado aquí y no bloqueante.

## Verificación de no-destructividad

Conteos totales antes y después de las queries de investigación (idénticos, ninguna escritura
ejecutada — todas las queries de esta tarea fueron `SELECT`):

| Tabla | Total |
|---|---:|
| `facturas_venta_item` | 22.510 |
| `facturas_compra_item` | 22.941 |
| `factura_venta_pagos` | 521 |

## Nota técnica

Se verificó adicionalmente, para las 3 tablas, que no existen FKs "colgantes" (columna no nula que
apunte a un `id` de factura que no existe en `facturas_venta`/`facturas_compra`): 0 filas en los 3
casos. Es decir, toda fila que tiene FK resuelta apunta a una factura real existente.
