# Residuales de Facturación — 685 PDFs sin fuente real en Bubble (Fase 9)

**Fecha de verificación:** 2026-09-09
**Proyecto Supabase:** PROD `fqwhagryqkkhbgznxtwf`
**Tenants:** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
**Alcance:** solo lectura (`SELECT`), ninguna escritura realizada durante esta verificación.

## Contexto

El cierre de Fase 9
(`docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md:67-89`) encontró el bug
sistémico de "proyecto Supabase equivocado" (URLs apuntando al proyecto viejo/muerto
`wioozisskjjgjjybsoqo.supabase.co` en vez del correcto `fqwhagryqkkhbgznxtwf`) en **4.539 filas**
de `facturas_venta`/`facturas_compra`. De esas, 3.854 (85%) se recuperaron re-descargando el PDF
real desde el campo crudo de Bubble y re-subiéndolo al proyecto correcto. Las **685 restantes
(15%)** no tienen ni siquiera una URL corrupta que recuperar: el campo correspondiente está
**genuinamente vacío en el origen** (mismo patrón documentado para `CT 233-2025` en Fase 6).

Esta tarea (Task 8) verifica el estado **actual** de esas 685 filas en PROD, documenta el desglose
por columna/tenant y dónde están (ids, `bubble_id`, rango de fechas), confirma que la cifra
"685" del plan sigue siendo exacta hoy, y deja la sección de decisión sin resolver para que el
controller/usuario la complete.

## Paso 1 — Conteo por columna y tenant

```sql
SELECT 'facturas_venta.pdf_valorizacion' AS columna, tenant_id, count(*)
FROM facturas_venta WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%' GROUP BY tenant_id
UNION ALL
SELECT 'facturas_compra.pdf_factura', tenant_id, count(*)
FROM facturas_compra WHERE pdf_factura LIKE '%wioozisskjjgjjybsoqo%' GROUP BY tenant_id
UNION ALL
SELECT 'facturas_compra.pdf_valorizacion', tenant_id, count(*)
FROM facturas_compra WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%' GROUP BY tenant_id;
```

Resultado (`facturas_venta.pdf_factura_url` no aparece: quedó en 0 residuales, 856/856
corregidas en Fase 9):

| Columna | Tenant | Count |
|---|---|---:|
| `facturas_venta.pdf_valorizacion` | GRUAS | 185 |
| `facturas_venta.pdf_valorizacion` | CISE | 1 |
| `facturas_compra.pdf_factura` | GRUAS | 235 |
| `facturas_compra.pdf_valorizacion` | GRUAS | 242 |
| `facturas_compra.pdf_valorizacion` | CISE | 22 |
| **Total (instancias de URL)** | | **685** |

La cifra coincide exactamente con la documentada en el cierre de Fase 9 (186 + 235 + 264 = 685,
donde el plan reportaba 264 para `facturas_compra.pdf_valorizacion` total y aquí se desglosa
242 GRUAS + 22 CISE = 264). **No hay discrepancia que explicar en esta tarea** — a diferencia de
otras tareas del recorrido, el número aproximado del brief resultó ser exacto.

Nota importante sobre unidad de medida: **685 es un conteo de instancias de URL rota**, no de
filas distintas de factura. Una misma fila de `facturas_compra` puede tener *ambas* columnas
(`pdf_factura` y `pdf_valorizacion`) afectadas a la vez, en cuyo caso se cuenta dos veces en la
tabla de arriba. El número de **filas distintas** afectadas es menor:

```sql
SELECT count(*) FROM facturas_venta WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%';
-- 186

SELECT count(*) FROM facturas_compra
WHERE pdf_factura LIKE '%wioozisskjjgjjybsoqo%' OR pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%';
-- 447 (499 instancias de columna − 52 filas con ambas columnas afectadas a la vez)
```

| Tabla | Filas distintas afectadas |
|---|---:|
| `facturas_venta` | 186 |
| `facturas_compra` | 447 |
| **Total filas distintas** | **633** |
| **Total instancias de URL rota** | **685** |

## Paso 2 — Lista de facturas/valorizaciones afectadas

Nota técnica: el brief asumía una columna `numero` en ambas tablas; no existe (`42703: column
"numero" does not exist`). El identificador legible real es `codigo_valoracion` en
`facturas_venta` y `codigo_factura`/`codigo_valoracion` en `facturas_compra` (confirmado vía
`information_schema.columns`).

### `facturas_venta` (186 filas, columna `codigo_valoracion`)

```sql
SELECT id, tenant_id, codigo_factura, codigo_valoracion, bubble_id FROM facturas_venta
WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%' ORDER BY tenant_id, codigo_valoracion;
```

`codigo_factura` es `NULL` en las 186 filas (son valorizaciones sin factura de venta emitida
todavía); `codigo_valoracion` sigue el patrón `AAAA-NNNNN` (ej. `2025-01443`, `2026-02019`). Todas
las 186 filas tienen `bubble_id` no nulo (confirmado, ver abajo) — es decir, la fila **sí** existe
y se migró correctamente desde Bubble; solo el campo de PDF llegó vacío.

```sql
SELECT
  count(*) FILTER (WHERE bubble_id IS NULL) AS sin_bubble_id,
  count(*) FILTER (WHERE bubble_id IS NOT NULL) AS con_bubble_id,
  min(fecha_valorado) AS fecha_min, max(fecha_valorado) AS fecha_max
FROM facturas_venta WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%';
-- sin_bubble_id: 0, con_bubble_id: 186, fecha_min: 2025-08-12, fecha_max: 2026-03-27
```

Rango: valorizaciones de agosto 2025 a marzo 2026 (correlativos `2025-01443` a `2026-02019` en
GRUAS + 1 en CISE), es decir, distribuidas a lo largo de ~8 meses recientes, no un incidente
puntual de una sola fecha.

La lista completa de 186 `id`/`bubble_id` fue extraída y verificada; se omite el volcado línea por
línea en este documento por extensión (se puede re-generar en cualquier momento con la query de
arriba) — se documentan aquí los agregados relevantes para la decisión pendiente.

### `facturas_compra` (447 filas distintas, 499 instancias de columna)

```sql
SELECT id, tenant_id, codigo_factura, codigo_valoracion, bubble_id,
  (pdf_factura LIKE '%wioozisskjjgjjybsoqo%') AS pdf_factura_afectado,
  (pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%') AS pdf_valorizacion_afectado
FROM facturas_compra
WHERE pdf_factura LIKE '%wioozisskjjgjjybsoqo%' OR pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%'
ORDER BY tenant_id, codigo_factura;
```

`codigo_factura` en `facturas_compra` sigue series tipo `E001-...`, `F001-...`, `FE01-...`
(facturas electrónicas/físicas de proveedores), no un correlativo simple. Desglose por serie:

| Tenant | Serie (`codigo_factura`/`codigo_valoracion`, primeros 4 chars) | `pdf_factura` afectado | `pdf_valorizacion` afectado | Count |
|---|---|:---:|:---:|---:|
| CISE | ` FF0` | no | sí | 1 |
| CISE | `E001` | no | sí | 12 |
| CISE | `F001` | no | sí | 4 |
| CISE | `FFF1` | no | sí | 5 |
| GRUAS | `E001` | no | sí | 114 |
| GRUAS | `E001` | sí | no | 102 |
| GRUAS | `E001` | sí | sí | 23 |
| GRUAS | `F001` | no | sí | 72 |
| GRUAS | `F001` | sí | no | 65 |
| GRUAS | `F001` | sí | sí | 28 |
| GRUAS | `FE01` | no | sí | 4 |
| GRUAS | `FE01` | sí | no | 16 |
| GRUAS | `FE01` | sí | sí | 1 |

```sql
SELECT
  count(*) FILTER (WHERE bubble_id IS NULL) AS sin_bubble_id,
  count(*) FILTER (WHERE bubble_id IS NOT NULL) AS con_bubble_id,
  min(fecha_factura) AS fecha_min, max(fecha_factura) AS fecha_max
FROM facturas_compra
WHERE pdf_factura LIKE '%wioozisskjjgjjybsoqo%' OR pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%';
-- sin_bubble_id: 0, con_bubble_id: 447, fecha_min: 2022-07-12, fecha_max: 2026-03-18
```

Las 447 filas tienen `bubble_id` no nulo (migraron correctamente); solo faltan sus PDFs. Rango
mucho más amplio que en `facturas_venta` (julio 2022 a marzo 2026, ~3.7 años) — consistente con
que `facturas_compra` es la tabla con más antigüedad e historial en Bubble.

Igual que en `facturas_venta`, se omite el volcado línea por línea de las 447 filas por extensión;
la query de arriba las reproduce exactamente en cualquier momento.

## Explicación técnica

Estas 685 URLs rotas **no son un error de la migración ni del script de recuperación de Fase 9**.
El script `scripts/fase9-finanzas-archivos.ts` recuperó los 3.854 casos donde el campo crudo de
Bubble (`pdf_valorización`/`pdf_factura`) contenía una URL válida, descargando el archivo real y
re-subiéndolo al proyecto Supabase correcto. Para estas 685 filas, el campo correspondiente en
Bubble está **vacío** (no es una URL corrupta ni una URL apuntando al proyecto viejo con el
archivo ausente): el usuario del sistema, en su momento, nunca adjuntó el PDF de esa
factura/valorización específica en Bubble. No hay ningún archivo que recuperar porque nunca
existió en el origen — mismo patrón que el caso `CT 233-2025` documentado en el cierre de Fase 6.

Todas las 685 URLs restantes en Supabase siguen apuntando al proyecto viejo/muerto
(`wioozisskjjgjjybsoqo.supabase.co`) porque nadie las tocó: quedaron con el valor original
migrado desde Bubble (que ya apuntaba mal desde antes del cutover de mayo), y como no hay archivo
fuente que recuperar, no se sobrescribieron con nada — corregirlas requeriría o bien (a) obtener
el PDF real de otra fuente (el cliente, un archivo físico, correo, etc.) y subirlo manualmente, o
bien (b) limpiar el campo a `NULL` para que la UI deje de mostrar un enlace roto.

## Decisión pendiente

🟢 **Resuelto 2026-09-09 — Opción B: residual aceptado como cerrado.** El usuario decidió no
contactar a CISE/GRUAS para pedir copias propias de estas 685 facturas/valorizaciones — se acepta
como no recuperable, no bloqueante. No se ejecuta ninguna acción adicional de datos sobre estas
685 filas.

**Nota dejada para el usuario, no accionada:** las 685 URLs siguen apuntando al proyecto Supabase
viejo/muerto (`wioozisskjjgjjybsoqo.supabase.co`) — igual que se hizo con
`imagen_banco`/`imagen_firma` de GRUAS (ver
`docs/auditoria-ui/residuales-gruas-imagen-banco-firma.md`), podrían limpiarse a `NULL` para que la
UI de facturación no muestre un enlace de descarga roto en vez de "sin PDF". No se hizo en esta
tarea porque no fue parte de la decisión — si se quiere, es un `UPDATE` de una sola sentencia sobre
las mismas 685 filas ya identificadas arriba, a pedido explícito.

## Verificación de no-destructividad

Conteo de control corrido antes y después de las queries del Paso 2 (idéntico, ninguna escritura
ejecutada — todas las queries de esta tarea fueron `SELECT`):

```sql
SELECT count(*) FROM facturas_venta WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%';
```

| Momento | Resultado |
|---|---:|
| Antes del Paso 2 | 186 |
| Después del Paso 2 | 186 |

Sin cambios. No se ejecutó ningún `INSERT`/`UPDATE`/`DELETE` durante esta verificación.
