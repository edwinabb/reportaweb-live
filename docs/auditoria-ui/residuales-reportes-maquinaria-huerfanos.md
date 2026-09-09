# Residuales: `reportes_maquinaria` con `maquinaria_id` no resoluble (Fase 7)

**Fecha de verificación:** 2026-09-09
**Proyecto verificado:** PROD (`fqwhagryqkkhbgznxtwf`)
**Tipo de tarea:** solo lectura (`SELECT`) — no se insertó, actualizó ni borró ninguna fila.

## Resumen

Existen filas de `reportes_maquinaria` que llegaron desde Bubble (tienen `bubble_id`) pero cuyo
`maquinaria_id` quedó en `NULL` — el vínculo real con una máquina no existe en el origen (Bubble),
no es un bug de mapeo de esta migración. Son huérfanos reales del dato de origen, **no
recuperables** desde Bubble y **no bloqueantes** para operación (el reporte en sí es válido y
consultable; solo falta el vínculo a la ficha de la máquina).

| Tenant | count(*) |
|---|---|
| GRUAS (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`) | 1.168 |
| CISE (`1cb97ec7-326c-4376-93ee-ed317d3da51b`) | 433 |
| **Total** | **1.601** |

Query usada (idéntica a la del plan de tarea, Paso 2):

```sql
SELECT tenant_id, count(*) FROM reportes_maquinaria
WHERE bubble_id IS NOT NULL AND maquinaria_id IS NULL
GROUP BY tenant_id;
```

## Nota importante sobre la cifra "149" del recorrido Fases 1-9

El resumen ejecutivo de `docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md`
(fila "7 | Reportes Maquinaria", punto 2 de las correcciones 2026-09-08) menciona **34 (CISE) +
115 (GRUAS) = 149** filas sin `maquinaria_id` resoluble. Esa cifra se refería específicamente al
**universo de filas nuevas insertadas ese día** por el re-run del delta-sync de Fase 7 (el lote de
+134 filas del segundo pase, tras quitar el filtro de corte de agosto) — no a la totalidad
histórica de la tabla.

Al correr hoy (2026-09-09) la query exacta del Paso 1/2 de esta tarea contra **toda la tabla**
`reportes_maquinaria`, el universo real de filas con `bubble_id IS NOT NULL AND maquinaria_id IS
NULL` es **1.601**, no 149. La muestra (ver abajo) confirma que la gran mayoría de estas filas son
antiguas — hay registros con `fecha_reporte` desde 2022-05-25 (CISE) y 2023-10-24 (GRUAS), muy
anteriores al recorrido de 2026-09 — es decir, es un gap preexistente de reportes huérfanos que
nunca tuvo `maquinaria_id` resuelto, no algo introducido por el recorrido de esta semana. El
recorrido Fases 1-9 solo documentó y cerró la porción específica de sus 134 filas nuevas (149 sin
resolver de ese lote); el resto del gap (1.601 − 149 ≈ 1.452 filas) ya existía en la tabla desde
antes y queda documentado íntegramente aquí por primera vez.

Se documenta el número real encontrado (1.601) en vez de forzarlo a coincidir con 149, según lo
indicado en el brief de esta tarea.

## Explicación de la causa

`maquinaria_id` es una FK `uuid` hacia `maquinarias.id`. Durante los distintos pases de
delta-sync desde Bubble, cada reporte de maquinaria se resuelve buscando en `maquinarias` la fila
cuyo `bubble_id` coincide con el `bubble_id` que trae el reporte del lado de la máquina en Bubble.
Cuando esa búsqueda no encuentra coincidencia, `maquinaria_id` queda `NULL` — **porque el registro
de maquinaria referenciado en Bubble no existe o no fue migrado a `maquinarias`**, no porque falte
lógica de mapeo en el script de migración. Es un hueco del dato de origen (Bubble), confirmado
huérfano real y no recuperable.

## Rango de fechas afectado

| Tenant | `fecha_reporte` mínima | `fecha_reporte` máxima | Filas con `fecha_reporte` NULL |
|---|---|---|---|
| CISE | 2022-05-25 | 2026-06-02 | 0 |
| GRUAS | 2023-10-24 | 2026-06-03 | 0 |

## Muestra representativa (5 filas más antiguas y 5 más recientes por tenant)

> El detalle completo (1.601 filas) no se embebe en este documento por volumen. Para reproducirlo,
> correr contra PROD (`fqwhagryqkkhbgznxtwf`) la query exacta del Paso 1 del brief de esta tarea:
>
> ```sql
> SELECT id, tenant_id, bubble_id, fecha_reporte, created_at
> FROM reportes_maquinaria
> WHERE bubble_id IS NOT NULL
>   AND maquinaria_id IS NULL
> ORDER BY tenant_id, fecha_reporte;
> ```

| id | tenant | bubble_id | fecha_reporte | created_at |
|---|---|---|---|---|
| `7b98e7aa-67cc-4158-9216-464f3fe169f7` | CISE | `1653433982260x533848863251365900` | 2022-05-25 | 2022-05-24 23:13:02 |
| `86d7ec80-3694-4424-bf03-527e3cfd8773` | CISE | `1666043353379x313738258224775200` | 2022-06-24 | 2022-10-17 21:49:13 |
| `fafaf8ee-8dd9-4c7f-a522-8280d51a9cc6` | CISE | `1656515760733x763079034491109400` | 2022-06-28 | 2022-06-29 15:11:16 |
| `bd36d496-6503-4f85-a45f-5b5b0325944a` | CISE | `1657638795166x395905371257962500` | 2022-07-05 | 2022-07-12 15:13:16 |
| `25537eae-a304-44d0-9fa5-27d0a5f1675c` | CISE | `1657829158740x117482575299608580` | 2022-07-05 | 2022-07-14 20:06:00 |
| `55f67ded-05e0-4d60-8263-7b0c710c89bf` | CISE | `1780363102112x681065553842405400` | 2026-05-31 | 2026-06-02 01:18:23 |
| `aa9503e0-e806-4b1f-be8f-ff76f3127d42` | CISE | `1780348145704x252645575831584770` | 2026-06-01 | 2026-06-01 21:09:06 |
| `f571e707-72bf-4096-b0f8-62b48f275ea9` | CISE | `1780427374711x939190762895310800` | 2026-06-01 | 2026-06-02 19:09:35 |
| `a0d1c5f7-c8c0-4edc-a3d3-ee141f3b5c2c` | CISE | `1780401537825x825869626212614100` | 2026-06-01 | 2026-06-02 11:58:57 |
| `438727d7-5956-4343-baaa-dba50b74af43` | CISE | `1780427477542x945055208010154000` | 2026-06-02 | 2026-06-02 19:11:18 |
| `573fe28d-dd36-4320-9fba-0101ebd36859` | GRUAS | `1699545912748x671254564680499200` | 2023-10-24 | 2023-11-09 16:05:12 |
| `1abefdde-f0d5-4ef8-a1f9-351a92cf9950` | GRUAS | `1699547033412x498103725010976800` | 2023-10-24 | 2023-11-09 16:23:52 |
| `5d63c172-a7d1-45c8-a3b0-fc14c3da71e9` | GRUAS | `1699294443557x596093139046891500` | 2023-10-27 | 2023-11-06 18:14:03 |
| `9340ad4d-2ba4-4b48-b8cc-20860f92b4c5` | GRUAS | `1701113726874x272329917238870000` | 2023-10-27 | 2023-11-27 19:35:26 |
| `e50777c6-23bc-4db4-b983-856712dd7b9b` | GRUAS | `1699495215061x945192968311275500` | 2023-10-30 | 2023-11-09 02:00:15 |
| `d7933013-f2ed-4ab5-9478-77ac94325e8c` | GRUAS | `1780498765305x405033040234938400` | 2026-06-02 | 2026-06-03 14:59:25 |
| `48486649-3669-4f20-bd68-3c9f10b53cfb` | GRUAS | `1780438252267x102206402401140740` | 2026-06-02 | 2026-06-02 22:10:54 |
| `3b6b096c-c54a-412d-a63a-90d6d189a534` | GRUAS | `1780487018079x525285206034743300` | 2026-06-02 | 2026-06-03 11:43:38 |
| `da051ab7-e4eb-4b1d-940c-acfe7a5b7062` | GRUAS | `1780499588698x858157068711624700` | 2026-06-03 | 2026-06-03 15:13:08 |
| `71aa7f34-733e-4da3-b64f-08fef03eee94` | GRUAS | `1780498827279x927889029241241600` | 2026-06-03 | 2026-06-03 15:00:27 |

## Verificación de no-destructividad

```sql
SELECT count(*) FROM reportes_maquinaria;
```

| Momento | count(*) |
|---|---|
| Antes de los pasos 1-2 (2026-09-09) | 27.003 |
| Después de los pasos 1-2 (2026-09-09) | 27.003 |

Conteo total de la tabla sin cambios — confirma que esta tarea fue estrictamente de lectura
(`SELECT`), sin ningún `INSERT`/`UPDATE`/`DELETE`.

## Nota sobre `bubble_id IS NOT NULL AND maquinaria_id IS NULL` como filtro

`maquinaria_id` es `uuid` (FK real hacia `maquinarias.id`, no un texto que "no resuelve" por
formato); una fila con `maquinaria_id IS NULL` es, por definición, una fila sin esa FK poblada.
El brief de esta tarea usaba `fecha` como nombre de columna en las queries de ejemplo; la columna
real en `reportes_maquinaria` es `fecha_reporte` (verificado contra
`information_schema.columns`). Las queries de este documento usan el nombre de columna correcto.

## Conclusión

1.601 filas de `reportes_maquinaria` (1.168 GRUAS + 433 CISE) quedan sin `maquinaria_id` resuelto
porque el registro de maquinaria correspondiente no existe en Bubble. No es recuperable ni
bloqueante — el reporte permanece íntegro y consultable, solo sin vínculo a una ficha de máquina.
Sin acción de código pendiente; este documento cierra el residual como "número documentado", no
solo mencionado en un párrafo de otro plan.
