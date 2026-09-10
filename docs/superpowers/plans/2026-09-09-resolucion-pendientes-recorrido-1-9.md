# Resolución de pendientes reales — Recorrido Fases 1-9 — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar, uno por uno y sin tocar nada que ya funciona, los 9 puntos del checklist
"Plan de seguimiento — pendientes reales" (`docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md:268-297`):
pedido a GRUAS de `imagen_banco`/`imagen_firma`, 685 PDFs de facturación sin fuente, 149 filas
huérfanas de `reportes_maquinaria`, items/pagos huérfanos de facturación, los 2 casos de dato
corrupto en Bubble, TK-C1/TK-C4 de Cotizaciones, escalar auditoría UI v1.2, rotar la
`SUPABASE_SERVICE_ROLE_KEY` de PROD, regenerar `types/supabase.ts`, y verificar los deploys de
demo/live.

**Architecture:** Ninguno de estos puntos requiere migración de datos nueva de Bubble (esa parte
ya cerró en el recorrido). Se dividen en 3 clases, cada una con su propio patrón de "prueba":
(a) **tareas de código** (TK-C1 CSV, TK-C4 KPI cards, DROP COLUMN, regen types) → TDD/verificación
donde aplica + `tsc --noEmit` + Playwright dirigido, siguiendo componentes y patrones ya existentes
(`exportToExcel`, `DataTable`, `.range()` paginado) — no se introduce librería nueva; (b) **tareas
de reconciliación de datos** (149 filas, items/pagos huérfanos, 685 PDFs, 2 casos corruptos) →
son de solo lectura (`SELECT`, nunca `UPDATE`/`DELETE`), su "prueba" es una query de verificación
que confirma el conteo antes/después de documentar (debe ser idéntico, cero filas tocadas); (c)
**tareas operativas** (pedido a GRUAS, rotar key, confirmar deploys, escalar auditoría UI) → no
tocan código de la app, su "prueba" es el runbook/checklist ya existente en el repo.

**Tech Stack:** Next.js 16 / React 19 / TypeScript · Supabase (Postgres + PostgREST) ·
`@supabase/supabase-js` (admin client, service role) · Playwright (E2E) · `xlsx` (export existente,
no se agrega dependencia nueva) · Cloudflare Workers Builds (demo/live).

**Spec:** `docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md` (sección "📋 Plan de
seguimiento — pendientes reales", líneas 268-297) + `docs/auditoria-ui/06-cotizaciones.md` (TK-C1,
TK-C2, TK-C4) + `docs/TECHNICAL_DEBTS.md` (DUDA-SEC-001) + `docs/RUNBOOK-ROTAR-SERVICE-ROLE-PROD.md`.

## Global Constraints

- **No destructivo por defecto.** Cualquier paso que borre, sobrescriba o modifique una fila
  existente (no solo inserte/lea) requiere confirmación explícita del usuario antes de ejecutarse
  — igual que el patrón ya usado en todo el recorrido (dry-run → conteo → aplicar → conteo).
- **No inventar datos.** Los residuales sin fuente real en Bubble (685 PDFs, 149 filas huérfanas,
  items/pagos huérfanos, 2 casos de texto corrupto) se documentan, no se completan con placeholders
  ni se ocultan de la UI salvo que el usuario lo pida explícitamente.
- **Reusar patrones existentes, no crear nuevos.** Paginación → mismo patrón `{page, limit}` +
  `count:'exact'` + `.range()` de `getAllReportesMaquinaria`/`getAllReportesPersonal`. Export →
  mismo `lib/utils/export-excel.ts` ya usado en Maquinaria/Usuarios/Tipos de Documento. Migraciones
  DDL → mismo patrón `supabase/migrations/YYYYMMDDHHMMSS_*.sql` con `IF EXISTS`/`IF NOT EXISTS`.
- **`SUPABASE_SERVICE_ROLE_KEY` de PROD:** hoy retirada/comentada en `.env.local` (cierre de Fase 9).
  Ningún paso de este plan la reactiva salvo la Tarea 2 (rotación), que la usa solo el tiempo
  mínimo necesario y la vuelve a retirar al terminar — mismo protocolo que el resto del recorrido.
- **Regla del proyecto ("preguntar, no inferir"):** cualquier punto donde falte un dato de negocio
  (ej. si TK-C1 dashboard necesita mockup aprobado, o si GRUAS puede proveer los archivos) se
  resuelve preguntando al usuario, nunca asumiendo.

---

## Orden de ejecución

Los 13 tareas están ordenadas por (1) riesgo creciente y (2) dependencias reales. Las tareas 1-8
son independientes entre sí y pueden ejecutarse en cualquier orden o en paralelo; 9-13 (Cotizaciones)
comparten archivos y conviene hacerlas en secuencia dentro de esa sección.

| # | Tarea | Tipo | Bloqueante externo |
|---|---|---|---|
| 1 | Regenerar `types/supabase.ts` + build local | Código | Ninguno |
| 2 | Rotar `SUPABASE_SERVICE_ROLE_KEY` de PROD | Operativa | Acceso al dashboard de Supabase/Cloudflare (usuario) |
| 3 | Confirmar deploys demo/live v3.12.4 | Operativa | Acceso al dashboard de Cloudflare (usuario) |
| 4 | Aplicar `DROP COLUMN cotizaciones.periodo_cantidad` (TK-C2) | Código (DDL) | Autorización explícita del usuario (ya preparada, bloqueada por clasificador) |
| 5 | Documentar 149 filas huérfanas de `reportes_maquinaria` (Fase 7) | Datos (solo lectura) | Ninguno |
| 6 | Documentar items/pagos huérfanos de facturación (Fase 9) | Datos (solo lectura) | Ninguno |
| 7 | Documentar los 2 casos de dato corrupto en Bubble | Datos (solo lectura) | Ninguno |
| 8 | Reconciliar los 685 PDFs de facturación sin fuente | Datos (solo lectura) + comunicación | Confirmación del cliente si tiene copia propia |
| 9 | Pedido a GRUAS: `imagen_banco`/`imagen_firma` | Operativa (comunicación) | Respuesta del cliente |
| 10 | TK-C1 (parte 1): Descargar Excel en listado de Cotizaciones | Código | Ninguno |
| 11 | TK-C4: 4 tarjetas KPI clicables en listado de Cotizaciones | Código | Ninguno |
| 12 | TK-C1 (parte 2): Panel de Cotizaciones (dashboard) — gate de diseño | Código (condicional) | Mockup aprobado por el usuario |
| 13 | Escalar auditoría UI v1.2 a módulos 5-15 | Proceso | Ninguno (usa metodología ya validada) |

---

### Task 1: Regenerar `types/supabase.ts` + build local

**Contexto:** desde el cierre de Fase 9, `types/supabase.ts` está hand-edited (varias columnas y
tablas nuevas del recorrido —`servicios_tipos`, columnas de Fase 7/8/9— no están en el archivo
autogenerado). Riesgo: un tipo desincronizado del schema real puede esconder un error de TypeScript
en runtime. Es la base de las tareas 10-12 (que tocan `cotizaciones`), así que va primero.

**Files:**
- Modify: `types/supabase.ts` (autogenerado, no se edita a mano)

- [ ] **Paso 1: Confirmar que el schema de TEST está al día con PROD**

Correr en Supabase Studio (o `mcp__claude_ai_Supabase__list_tables`) contra **TEST**
(`oyrokyyaeaeqzlsgxtto`, el proyecto que usa el script `types:supabase`) y confirmar que existen
`servicios_tipos`, las columnas `firma_cliente_url`/`foto_actividad_url` en `reportes_maquinaria`,
y `UNIQUE(bubble_id)` en `areas`/`plazos_pago`/`bancos`/`cotizaciones`. Si falta alguna, esas
migraciones DDL del recorrido no se replicaron a TEST — pausar y replicarlas primero (mismo SQL ya
aplicado a PROD, ver `supabase/migrations/20260908*.sql`).

- [ ] **Paso 2: Regenerar tipos**

```bash
npm run types:supabase
```

- [ ] **Paso 3: Ver el diff antes de aceptarlo**

```bash
git diff --stat types/supabase.ts
git diff types/supabase.ts | head -200
```

Esperado: solo agregados (tablas/columnas nuevas) y ningún tipo existente que un componente ya
usado dependa se vuelva incompatible de forma sorpresiva. Si aparece un tipo eliminado que algún
archivo todavía importa, el siguiente paso (build) lo va a mostrar como error de compilación.

- [ ] **Paso 4: Build local completo**

```bash
npm run build
```

Expected: `Compiled successfully`. Si falla, el error señala el archivo/línea que usaba un campo
que cambió de tipo o dejó de existir — corregir ese archivo puntual, no revertir el regen de tipos.

- [ ] **Paso 5: Commit**

```bash
git add types/supabase.ts
git commit -m "chore(types): regenerar types/supabase.ts tras recorrido Fases 1-9

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 2: Rotar `SUPABASE_SERVICE_ROLE_KEY` de PROD (`DUDA-SEC-001`)

(operativa — controller la reporta directamente, no se dispatchea a subagente. Ver plan original.)

---

### Task 3: Confirmar deploys demo/live de v3.12.4

(operativa — controller la reporta directamente, no se dispatchea a subagente. Ver plan original.)

---

### Task 4: Aplicar `DROP COLUMN cotizaciones.periodo_cantidad` (TK-C2)

**Contexto:** la migración ya está escrita y verificada como segura —
`supabase/migrations/20260908160000_drop_cotizaciones_periodo_cantidad.sql` (confirmado por grep
que la única referencia era el `types/supabase.ts` autogenerado, no código real). Quedó sin aplicar
porque el clasificador de permisos de Claude Code bloquea DDL destructivo por diseño. **Autorizado
explícitamente por el usuario el 2026-09-09 para TEST y PROD.**

**Files:**
- Read: `supabase/migrations/20260908160000_drop_cotizaciones_periodo_cantidad.sql` (ya existe, no
  se reescribe)

- [ ] **Paso 1: Re-confirmar 0 lectores antes de aplicar (columna pudo cambiar desde 2026-09-08)**

```bash
grep -rn "periodo_cantidad" --include="*.ts" --include="*.tsx" app/ components/ lib/ | grep -v "types/supabase.ts"
```

Expected: sin resultados (o solo referencias en `types/supabase.ts`, que de todos modos se
regenerará en la Tarea 1).

- [ ] **Paso 2: Aplicar primero en TEST**

Ya autorizado por el usuario. Aplicar contra TEST (`oyrokyyaeaeqzlsgxtto`) usando la herramienta
MCP `mcp__claude_ai_Supabase__apply_migration` o `execute_sql`:

```sql
ALTER TABLE cotizaciones DROP COLUMN IF EXISTS periodo_cantidad;
```

- [ ] **Paso 3: Verificar TEST**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'cotizaciones' AND column_name = 'periodo_cantidad';
```

Expected: 0 filas.

- [ ] **Paso 4: Build local contra TEST**

```bash
npx tsc --noEmit
```

(No hace falta levantar `npm run dev` interactivo dentro del subagente — confirmar con `tsc` que
nada referencia la columna, y con la query del Paso 3 que ya no existe.)

- [ ] **Paso 5: Aplicar en PROD**

Ya autorizado por el usuario. Mismo SQL, contra `fqwhagryqkkhbgznxtwf`.

- [ ] **Paso 6: Verificar PROD**

Misma query del Paso 3 contra PROD (`fqwhagryqkkhbgznxtwf`). Expected: 0 filas.

- [ ] **Paso 7: Actualizar la documentación**

En `docs/auditoria-ui/06-cotizaciones.md` (línea ~159, sección "Addendum 2026-09-08"), cambiar el
estado de TK-C2 de "preparada pero NO aplicada" a "🟢 aplicada en TEST+PROD" con fecha 2026-09-09.
En `docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md`, tildar la fila de TK-C2 en
la tabla de gaps/tickets (sección "Gaps y tickets") si corresponde. Commit:

```bash
git add supabase/migrations/20260908160000_drop_cotizaciones_periodo_cantidad.sql docs/auditoria-ui/06-cotizaciones.md
git commit -m "chore(cotizaciones): aplicar DROP COLUMN periodo_cantidad en TEST+PROD (TK-C2)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 5: Documentar 149 filas huérfanas de `reportes_maquinaria` (Fase 7)

**Contexto:** 34 (CISE) + 115 (GRUAS) filas cuyo `maquinaria_id` no resuelve contra ningún
`bubble_id` de `maquinarias` — el vínculo real no existe en Bubble (no es un bug de mapeo, es un
huérfano real del origen, per `2026-09-08-recorrido-completo-fases-1-9.md:39`). Esta tarea no
migra nada nuevo — es solo lectura, para dejar un artefacto consultable en vez de que el número
"149" solo viva en un párrafo de texto.

**Files:**
- Create: `docs/auditoria-ui/residuales-reportes-maquinaria-huerfanos.md`

**Herramientas:** usar `mcp__claude_ai_Supabase__execute_sql` contra el proyecto PROD
(`fqwhagryqkkhbgznxtwf`) para las queries de solo lectura — no se necesita reactivar
`SUPABASE_SERVICE_ROLE_KEY` en `.env.local` para esto.

- [ ] **Paso 1: Extraer la lista de las filas huérfanas (solo lectura)**

```sql
SELECT id, tenant_id, bubble_id, fecha, created_at
FROM reportes_maquinaria
WHERE bubble_id IS NOT NULL
  AND maquinaria_id IS NULL
ORDER BY tenant_id, fecha;
```

El número exacto de filas que devuelva es la fuente de verdad actual, puede diferir levemente de
"149" si se cargaron reportes nuevos desde el 2026-09-08 vía la app (altas nativas, no Bubble) —
documentar el número real encontrado, no forzar que coincida con 149.

- [ ] **Paso 2: Contar por tenant (CISE vs GRUAS)**

```sql
SELECT tenant_id, count(*) FROM reportes_maquinaria
WHERE bubble_id IS NOT NULL AND maquinaria_id IS NULL
GROUP BY tenant_id;
```

- [ ] **Paso 3: Escribir el documento de residuales**

Crear `docs/auditoria-ui/residuales-reportes-maquinaria-huerfanos.md` con: fecha de verificación
(2026-09-09), el conteo por tenant del Paso 2, la explicación (dato del origen sin vínculo en
Bubble, no recuperable, no bloqueante — el `maquinaria_id` no resuelve porque el registro de
maquinaria referenciado en Bubble no existe/no fue migrado), y la tabla completa de filas del Paso
1 (o un resumen si son muchas, con nota de dónde está el detalle completo).

- [ ] **Paso 4: Verificación de no-destructividad**

```sql
SELECT count(*) FROM reportes_maquinaria;
```

Correr antes y después de los Pasos 1-2 y confirmar que el conteo total de la tabla no cambió —
todo el trabajo de esta tarea es `SELECT`, ninguna fila se modifica.

- [ ] **Paso 5: Commit**

```bash
git add docs/auditoria-ui/residuales-reportes-maquinaria-huerfanos.md
git commit -m "docs(auditoria-ui): documentar filas huerfanas de reportes_maquinaria (Fase 7)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 6: Documentar items/pagos huérfanos de facturación (Fase 9)

**Contexto:** `facturas_venta_item` (1.215+2.112=3.327 aprox.), `facturas_compra_item`
(638+1.889=2.527 aprox.) y `factura_venta_pagos` (6) cuyo `bubble_id` no aparece en el array
`lista_items`/`lista_cobros` de NINGUNA factura padre en Bubble — mismo patrón que la Tarea 5,
huérfanos reales del origen (`2026-09-08-recorrido-completo-fases-1-9.md:41,251-252`).

**Files:**
- Create: `docs/auditoria-ui/residuales-facturacion-huerfanos.md`

**Herramientas:** `mcp__claude_ai_Supabase__execute_sql` contra PROD (`fqwhagryqkkhbgznxtwf`),
solo lectura.

- [ ] **Paso 1: Inspeccionar el nombre real de la FK antes de asumir**

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_name IN ('facturas_venta_item', 'facturas_compra_item', 'factura_venta_pagos')
ORDER BY table_name, ordinal_position;
```

Usar los nombres de columna reales que devuelva esta query para las queries de los Pasos 2-4 (el
plan asume `factura_venta_id`/`factura_compra_id`, pero confirmar antes de asumir).

- [ ] **Paso 2: Items de venta sin factura padre**

```sql
SELECT tenant_id, count(*) FROM facturas_venta_item
WHERE bubble_id IS NOT NULL AND factura_venta_id IS NULL
GROUP BY tenant_id;
```

(Ajustar `factura_venta_id` al nombre real confirmado en el Paso 1 si difiere.)

- [ ] **Paso 3: Items de compra sin factura padre**

```sql
SELECT tenant_id, count(*) FROM facturas_compra_item
WHERE bubble_id IS NOT NULL AND factura_compra_id IS NULL
GROUP BY tenant_id;
```

- [ ] **Paso 4: Pagos de venta sin factura padre**

```sql
SELECT tenant_id, count(*) FROM factura_venta_pagos
WHERE bubble_id IS NOT NULL AND factura_venta_id IS NULL
GROUP BY tenant_id;
```

- [ ] **Paso 5: Escribir el documento consolidado**

Crear `docs/auditoria-ui/residuales-facturacion-huerfanos.md` con los 3 conteos de los Pasos 2-4,
y la nota de que el vínculo real en Bubble es el array `lista_items`/`lista_cobros` del padre —
estos hijos no aparecen en ningún array de ninguna factura, no es un bug de parsing del sistema.

- [ ] **Paso 6: Verificación de no-destructividad**

```sql
SELECT count(*) FROM facturas_venta_item;
SELECT count(*) FROM facturas_compra_item;
SELECT count(*) FROM factura_venta_pagos;
```

Confirmar que los 3 conteos totales no cambiaron antes/después.

- [ ] **Paso 7: Commit**

```bash
git add docs/auditoria-ui/residuales-facturacion-huerfanos.md
git commit -m "docs(auditoria-ui): documentar items/pagos huerfanos de facturacion (Fase 9)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 7: Documentar los 2 casos de dato corrupto en Bubble

**Contexto:** `CT 233-2025` (Fase 6, `cotizaciones.pdf_url`) y 1 fila de `reportes_maquinaria`
(Fase 7, `id=8f2005cc-c0ea-47c5-ae6a-4d47806ea412`) tienen en Bubble un literal de texto
(`"pdf.pdf"` y `"It wasn't possible to find the uploaded file URL"` respectivamente) en vez de una
URL real — ya quedaron registrados en `file_migration_log` con `status='error'`, pero no hay un
lugar único y legible que junte los 2 casos para seguimiento.

**Files:**
- Create: `docs/auditoria-ui/residuales-dato-corrupto-bubble.md`

**Herramientas:** `mcp__claude_ai_Supabase__execute_sql` contra PROD (`fqwhagryqkkhbgznxtwf`),
solo lectura.

- [ ] **Paso 1: Confirmar que ambos casos siguen en `file_migration_log`**

```sql
SELECT id, tabla, columna, bubble_id, status, error_detail, created_at
FROM file_migration_log
WHERE status = 'error'
  AND (bubble_id = '1751671142615x551586952478457860'
       OR bubble_id = '1761075518309x906513819682209800');
```

Si la tabla `file_migration_log` no tiene una columna llamada exactamente `error_detail` o
`columna`, ajustar la query a los nombres reales (`SELECT * FROM file_migration_log WHERE
bubble_id IN (...)` como fallback si hay duda).

- [ ] **Paso 2: Confirmar que las columnas afectadas siguen sin URL válida**

```sql
SELECT id, numero, pdf_url FROM cotizaciones WHERE bubble_id = '1751671142615x551586952478457860';
SELECT id, pdf_url FROM reportes_maquinaria WHERE id = '8f2005cc-c0ea-47c5-ae6a-4d47806ea412';
```

- [ ] **Paso 3: Escribir el documento con ambos casos**

Crear `docs/auditoria-ui/residuales-dato-corrupto-bubble.md`: para cada caso, tabla afectada, fila
(id/bubble_id), el literal de texto encontrado en el campo de Bubble, y la conclusión (no
recuperable sin que el cliente aporte el archivo original — el dato nunca fue una URL válida en el
origen).

- [ ] **Paso 4: Commit**

```bash
git add docs/auditoria-ui/residuales-dato-corrupto-bubble.md
git commit -m "docs(auditoria-ui): documentar los 2 casos de dato corrupto en Bubble

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 8: Reconciliar los 685 PDFs de facturación sin fuente real

**Contexto:** de las 4.539 URLs con el bug de "proyecto Supabase equivocado" en
`facturas_venta.pdf_valorizacion`/`pdf_factura_url` + `facturas_compra.pdf_factura`/
`pdf_valorizacion`, 3.854 (85%) se recuperaron desde Bubble; 685 (15%) no tienen el campo de
Bubble ni siquiera con una URL corrupta — está genuinamente vacío en el origen
(`2026-09-08-recorrido-completo-fases-1-9.md:74-89`).

**Files:**
- Create: `docs/auditoria-ui/residuales-685-pdfs-facturacion.md`

**Herramientas:** `mcp__claude_ai_Supabase__execute_sql` contra PROD (`fqwhagryqkkhbgznxtwf`),
solo lectura. **No preguntar al usuario sobre contactar al cliente — eso lo hace el controller
directamente al recibir tu reporte, no forma parte de tu tarea.**

- [ ] **Paso 1: Extraer el conteo por columna y tenant**

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

(`facturas_venta.pdf_factura_url` no aparece: quedó en 0 residuales según el cierre de Fase 9 —
856/856 corregidas.)

- [ ] **Paso 2: Extraer la lista de números de factura/valorización afectados**

```sql
SELECT id, tenant_id, numero, bubble_id FROM facturas_venta
WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%' ORDER BY tenant_id, numero;

SELECT id, tenant_id, numero, bubble_id FROM facturas_compra
WHERE pdf_factura LIKE '%wioozisskjjgjjybsoqo%' OR pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%'
ORDER BY tenant_id, numero;
```

- [ ] **Paso 3: Escribir el documento de reconciliación**

Crear `docs/auditoria-ui/residuales-685-pdfs-facturacion.md` con el desglose de los Pasos 1-2, la
explicación técnica (campo vacío en el origen, no un error de migración), y una sección
"Decisión pendiente" dejada en blanco para que el controller/usuario la complete después (no
completar tú esta sección — no tienes forma de preguntarle al cliente).

- [ ] **Paso 4: Verificación de no-destructividad**

```sql
SELECT count(*) FROM facturas_venta WHERE pdf_valorizacion LIKE '%wioozisskjjgjjybsoqo%';
```

Correr antes y después del Paso 2, confirmar mismo número (no se modifica nada).

- [ ] **Paso 5: Commit**

```bash
git add docs/auditoria-ui/residuales-685-pdfs-facturacion.md
git commit -m "docs(auditoria-ui): reconciliar 685 PDFs de facturacion sin fuente real (Fase 9)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 9: Pedido a GRUAS — `imagen_banco`/`imagen_firma`

(operativa/comunicación — controller la reporta directamente, no se dispatchea a subagente.)

---

### Task 10: TK-C1 (parte 1) — Descargar Excel en el listado de Cotizaciones

**Contexto:** Bubble tiene un botón "Descargar CSV" en el listado que no tiene equivalente en
reportaweb3 (`docs/auditoria-ui/06-cotizaciones.md:38`). El proyecto ya tiene un estándar de
export (`lib/utils/export-excel.ts`, usado en Maquinaria/Usuarios/Tipos de Documento vía
`exportToExcel(pageName, rows)` → genera `.xls`, no CSV, pero cumple la misma necesidad de negocio
y sigue `docs/UI-TEMPLATE-LISTADOS.md`) — se reusa tal cual, sin crear una ruta de export nueva.

**Files:**
- Modify: `components/cotizaciones/cotizaciones-table.tsx`
- Test: `tests/flows/12-cotizaciones.spec.ts`

**Interfaces:**
- Consumes: `exportToExcel(pageName: string, rows: Record<string, unknown>[]): boolean` de
  `lib/utils/export-excel.ts` (ya existe, sin cambios).
- Consumes: `CotizacionWithRelations[]` (prop `data` ya recibida por `CotizacionesTable`).

- [ ] **Paso 1: Escribir el test E2E (falla primero, no existe el botón)**

Agregar a `tests/flows/12-cotizaciones.spec.ts` (dentro de `test.describe('Cotizaciones — Admin
@critical')`):

```typescript
test('botón Descargar Excel visible y descarga un archivo', async ({ page }) => {
    await page.goto('/cotizaciones')
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

    const downloadBtn = page.locator('button[title*="Descargar Excel" i], button', { hasText: /Descargar Excel/i })
    await expect(downloadBtn.first()).toBeVisible()

    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }),
        downloadBtn.first().click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^COTIZACIONES-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.xls$/)
})
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
npx playwright test tests/flows/12-cotizaciones.spec.ts -g "Descargar Excel" --project=chromium-admin
```

Expected: FAIL (`downloadBtn` no visible — el botón no existe todavía).

- [ ] **Paso 3: Implementar el botón**

Modificar `components/cotizaciones/cotizaciones-table.tsx`:

```typescript
"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./cotizaciones-columns"
import { CotizacionWithRelations } from "@/types/cotizaciones"
import { CotizacionHeaderActions } from "@/components/cotizaciones/cotizacion-header-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import { exportToExcel } from "@/lib/utils/export-excel"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface CotizacionesTableProps {
    data: CotizacionWithRelations[]
}

export function CotizacionesTable({ data }: CotizacionesTableProps) {
    return (
        <DataTable
            columns={columns}
            data={data}
            searchKey="numero"
            searchPlaceholder="Buscar Código"
            customAction={<CotizacionHeaderActions />}
            toolbarContent={(table) => {
                const handleDownloadExcel = () => {
                    const rows = table.getFilteredRowModel().rows.map((r) => {
                        const c = r.original as CotizacionWithRelations
                        return {
                            'Código': c.numero,
                            'Cliente': c.cliente?.razon_social ?? '-',
                            'Estado': c.estado,
                            'Fecha Solicitud': c.fecha_solicitud ?? '-',
                            'Moneda': c.moneda,
                        }
                    })
                    if (!exportToExcel('COTIZACIONES', rows)) toast.error('No hay registros para exportar')
                }

                return (
                    <>
                        <Input
                            placeholder="Buscar Cliente"
                            value={(table.getColumn("cliente")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn("cliente")?.setFilterValue(event.target.value)
                            }
                            className="h-8 w-[150px] lg:w-[250px]"
                        />
                        <Select
                            value={(table.getColumn("estado")?.getFilterValue() as string) ?? "ALL"}
                            onValueChange={(value) =>
                                table.getColumn("estado")?.setFilterValue(value === "ALL" ? "" : value)
                            }
                        >
                            <SelectTrigger className="h-8 w-[150px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los Estados</SelectItem>
                                <SelectItem value="BORRADOR">Borrador</SelectItem>
                                <SelectItem value="ENVIADA">Enviada</SelectItem>
                                <SelectItem value="APROBADA">Aprobada</SelectItem>
                                <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                                <SelectItem value="VENCIDA">Vencida</SelectItem>
                                <SelectItem value="APLAZADA">Aplazada</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadExcel}
                            title="Descargar Excel (lo filtrado)"
                        >
                            <FileText className="h-4 w-4 text-green-600 mr-1" />
                            Descargar Excel
                        </Button>
                    </>
                )
            }}
        />
    )
}
```

Nota: `table.getColumn("cliente")` filtra por texto, pero la columna real que renderiza cliente es
un objeto (`c.cliente?.razon_social`) — verificar en `cotizaciones-columns.tsx` que existe un
`accessorFn`/`filterFn` para `"cliente"` antes de asumir que `getFilteredRowModel()` ya refleja el
filtro de texto tal cual se ve en pantalla (si no, ajustar el `accessorKey` usado, no inventar uno
nuevo).

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
npx playwright test tests/flows/12-cotizaciones.spec.ts -g "Descargar Excel" --project=chromium-admin
```

Expected: PASS.

- [ ] **Paso 5: `tsc` y suite completa de Cotizaciones**

```bash
npx tsc --noEmit
npx playwright test tests/flows/12-cotizaciones.spec.ts --project=chromium-admin
```

Expected: 0 errores de tipos, todos los tests de `12-cotizaciones.spec.ts` en verde (no solo el
nuevo — confirma que no se rompió el filtro de estado ni el listado).

- [ ] **Paso 6: Commit**

```bash
git add components/cotizaciones/cotizaciones-table.tsx tests/flows/12-cotizaciones.spec.ts
git commit -m "feat(cotizaciones): agregar Descargar Excel al listado (TK-C1 parte 1)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 11: TK-C4 — 4 tarjetas KPI clicables en el listado de Cotizaciones

**Contexto:** Bubble tiene 4 tarjetas (Nuevas-Desarrollo / Enviada-Aplazada / Rechazadas /
Aprobadas) que funcionan como atajo de filtro rápido por estado
(`docs/auditoria-ui/06-cotizaciones.md:39,140`). El select de estado ya existente cubre la función,
así que esto es una mejora de UX, no un gap de datos — se implementa reusando el mismo
`setFilterValue` del select ya presente (Tarea 10), sin agregar lógica de filtrado nueva.

**Files:**
- Modify: `components/cotizaciones/cotizaciones-table.tsx` (continúa sobre el resultado de la Tarea 10)
- Test: `tests/flows/12-cotizaciones.spec.ts`

**Interfaces:**
- Consumes: `data: CotizacionWithRelations[]` (prop ya recibida), `table.getColumn("estado")` (ya
  usado por el `Select` de la Tarea 10).

- [ ] **Paso 1: Escribir el test E2E**

Agregar a `tests/flows/12-cotizaciones.spec.ts`:

```typescript
test('tarjeta KPI "Aprobadas" filtra el listado por estado', async ({ page }) => {
    await page.goto('/cotizaciones')
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

    const kpiAprobadas = page.locator('[data-kpi-estado="APROBADA"]')
    await expect(kpiAprobadas).toBeVisible()
    await kpiAprobadas.click()

    await expect(page.locator('[role="combobox"]', { hasText: /Aprobada/i })).toBeVisible()
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toContainText(/APROBADA/i)
    }
})
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
npx playwright test tests/flows/12-cotizaciones.spec.ts -g "tarjeta KPI" --project=chromium-admin
```

Expected: FAIL (`[data-kpi-estado="APROBADA"]` no existe todavía).

- [ ] **Paso 3: Implementar las 4 tarjetas**

Modificar `components/cotizaciones/cotizaciones-table.tsx` — agregar un componente de tarjetas
antes del `<DataTable>`, calculando los conteos desde `data` (el universo completo recibido por la
tabla, no el filtrado — las tarjetas deben reflejar el total real, igual que en Bubble) y usando
el mismo mapeo de estados agrupados que Bubble (`Nuevas-Desarrollo` = `BORRADOR`, en este sistema
no existe un estado "Desarrollo" separado — mapear 1:1 a los estados reales del enum
`CotizacionEstado`):

```typescript
import { Card, CardContent } from "@/components/ui/card"

function KpiCards({ data, onSelect }: { data: CotizacionWithRelations[]; onSelect: (estado: string) => void }) {
    const counts = {
        BORRADOR: data.filter((c) => c.estado === 'BORRADOR').length,
        ENVIADA_APLAZADA: data.filter((c) => c.estado === 'ENVIADA' || c.estado === 'APLAZADA').length,
        RECHAZADA: data.filter((c) => c.estado === 'RECHAZADA').length,
        APROBADA: data.filter((c) => c.estado === 'APROBADA').length,
    }
    const cards = [
        { key: 'BORRADOR', label: 'En Desarrollo', value: counts.BORRADOR, estado: 'BORRADOR' },
        { key: 'ENVIADA_APLAZADA', label: 'Enviada / Aplazada', value: counts.ENVIADA_APLAZADA, estado: 'ENVIADA' },
        { key: 'RECHAZADA', label: 'Rechazadas', value: counts.RECHAZADA, estado: 'RECHAZADA' },
        { key: 'APROBADA', label: 'Aprobadas', value: counts.APROBADA, estado: 'APROBADA' },
    ]
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map((c) => (
                <Card
                    key={c.key}
                    data-kpi-estado={c.estado}
                    className="cursor-pointer hover:border-orange-400 transition-colors"
                    onClick={() => onSelect(c.estado)}
                >
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">{c.label}</p>
                        <p className="text-2xl font-semibold">{c.value}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
```

Y en el `return` de `CotizacionesTable`, dentro de `toolbarContent`, renderizar las tarjetas arriba
de los demás filtros (Input/Select/Button de la Tarea 10), usando el mismo callback
`table.getColumn("estado")?.setFilterValue(estado)`:

```typescript
toolbarContent={(table) => (
    <div className="flex flex-col gap-3 w-full">
        <KpiCards data={data} onSelect={(estado) => table.getColumn("estado")?.setFilterValue(estado)} />
        <div className="flex items-center gap-2">
            {/* Input Buscar Cliente, Select Estado, Button Descargar Excel — igual que Tarea 10 */}
        </div>
    </div>
)}
```

Verificar en `components/ui/data-table.tsx` cómo se renderiza el contenedor de `toolbarContent`
(flex row vs column) antes de decidir si el `<div className="flex flex-col gap-3 w-full">`
envolvente rompe el layout existente — si el contenedor padre ya es `flex items-center`, puede ser
necesario ajustar solo las clases de este `div`, no la estructura del `DataTable` (ese archivo
compartido por 10+ módulos no se toca por esta tarea puntual).

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
npx playwright test tests/flows/12-cotizaciones.spec.ts -g "tarjeta KPI" --project=chromium-admin
```

Expected: PASS.

- [ ] **Paso 5: Regresión visual del listado completo**

```bash
npx tsc --noEmit
npx playwright test tests/flows/12-cotizaciones.spec.ts --project=chromium-admin
```

Expected: 0 errores, toda la suite de Cotizaciones en verde — confirma que agregar las tarjetas no
rompió el buscador ni el select de estado ni el botón de export de la Tarea 10.

- [ ] **Paso 6: Commit**

```bash
git add components/cotizaciones/cotizaciones-table.tsx tests/flows/12-cotizaciones.spec.ts
git commit -m "feat(cotizaciones): tarjetas KPI clicables como filtro rápido (TK-C4)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

---

### Task 12: TK-C1 (parte 2) — Panel de Cotizaciones (dashboard)

**Contexto:** el usuario definió el alcance exacto (2026-09-09), reemplazando el gate de diseño
original: **Gráfico 1** — cantidad de cotizaciones por mes (Enviadas/Rechazadas/Aprobadas), año
actual completo. **Gráfico 2** — igual pero por día, de un mes seleccionable (default: mes actual).
Debajo, dos listas: **Pendientes por enviar** (estado `BORRADOR`) y **Enviadas** (estado
`ENVIADA`), cada fila linkeando a `/cotizaciones/{id}`.

El proyecto no tiene ninguna librería de gráficos instalada — se agrega `recharts@3.10.1` (soporta
React 19 vía peerDependencies `^19.0.0`, confirmado). Es la única dependencia nueva de todo este
plan; todo lo demás reusa patrones existentes.

**Files:**
- Modify: `package.json` (agregar `recharts@3.10.1`)
- Modify: `lib/actions/cotizaciones.ts` (nueva función `getCotizacionesDashboardStats`)
- Create: `app/(dashboard)/cotizaciones/panel/page.tsx`
- Create: `components/cotizaciones/cotizaciones-panel.tsx`
- Modify: `lib/config/menu.ts` (agregar link "Panel" bajo Cotizaciones)
- Test: `tests/flows/26-cotizaciones-panel.spec.ts` (nuevo)

**Interfaces:**
- Produces: `getCotizacionesDashboardStats({ month }: { month?: number } = {})` → `Promise<{
  year: number; selectedMonth: number; monthly: {mes: string; enviadas: number; rechazadas:
  number; aprobadas: number}[]; daily: {dia: number; enviadas: number; rechazadas: number;
  aprobadas: number}[]; pendientesPorEnviar: CotizacionRow[]; enviadas: CotizacionRow[] } | null>`
  donde `CotizacionRow = { id: string; numero: string; cliente: string; fecha_solicitud: string |
  null }`.
- Consumes: `getSupabaseContext()` de `lib/action-context` (mismo patrón que el resto de
  `cotizaciones.ts`), tabla `cotizaciones` (columnas `id`, `numero`, `estado`, `fecha_solicitud`,
  `tenant_id`, `is_active`, FK `cliente:terceros!cotizaciones_cliente_id_fkey(razon_social)`).

- [ ] **Paso 1: Instalar `recharts`**

```bash
npm install recharts@3.10.1
```

Verificar en `package.json` que quedó agregado como dependencia directa (no dev).

- [ ] **Paso 2: Agregar `getCotizacionesDashboardStats` a `lib/actions/cotizaciones.ts`**

Agregar junto a las demás funciones de la sección `COTIZACIONES ACTIONS` (cerca de
`getCotizaciones`):

```typescript
export async function getCotizacionesDashboardStats({ month }: { month?: number } = {}) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const now = new Date()
    const year = now.getFullYear()
    const selectedMonth = month && month >= 1 && month <= 12 ? month : now.getMonth() + 1

    const { data, error } = await adminClient
        .from('cotizaciones')
        .select(`
            id,
            numero,
            estado,
            fecha_solicitud,
            cliente:terceros!cotizaciones_cliente_id_fkey(razon_social)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .gte('fecha_solicitud', `${year}-01-01`)
        .lte('fecha_solicitud', `${year}-12-31`)
        .order('fecha_solicitud', { ascending: false })

    if (error || !data) {
        console.error('Error fetching cotizaciones dashboard stats:', error)
        return null
    }

    const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const monthly = MESES.map((mes, idx) => {
        const rows = data.filter((c) => c.fecha_solicitud && new Date(c.fecha_solicitud).getMonth() === idx)
        return {
            mes,
            enviadas: rows.filter((c) => c.estado === 'ENVIADA').length,
            rechazadas: rows.filter((c) => c.estado === 'RECHAZADA').length,
            aprobadas: rows.filter((c) => c.estado === 'APROBADA').length,
        }
    })

    const daysInMonth = new Date(year, selectedMonth, 0).getDate()
    const daily = Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dia) => {
        const rows = data.filter((c) => {
            if (!c.fecha_solicitud) return false
            const d = new Date(c.fecha_solicitud)
            return d.getMonth() === selectedMonth - 1 && d.getDate() === dia
        })
        return {
            dia,
            enviadas: rows.filter((c) => c.estado === 'ENVIADA').length,
            rechazadas: rows.filter((c) => c.estado === 'RECHAZADA').length,
            aprobadas: rows.filter((c) => c.estado === 'APROBADA').length,
        }
    })

    const toRow = (c: typeof data[number]) => ({
        id: c.id,
        numero: c.numero,
        cliente: c.cliente?.razon_social ?? 'Sin cliente',
        fecha_solicitud: c.fecha_solicitud,
    })

    return {
        year,
        selectedMonth,
        monthly,
        daily,
        pendientesPorEnviar: data.filter((c) => c.estado === 'BORRADOR').slice(0, 50).map(toRow),
        enviadas: data.filter((c) => c.estado === 'ENVIADA').slice(0, 50).map(toRow),
    }
}
```

Nota: si `data.filter((c) => c.fecha_solicitud ...)` da error de tipo por la forma exacta que
Supabase infiere para el join embebido `cliente:terceros!...(razon_social)` (puede tipar `cliente`
como array en vez de objeto único, dependiendo de la relación FK), ajustar `c.cliente?.razon_social`
a `c.cliente?.[0]?.razon_social` según lo que `npx tsc --noEmit` señale — no asumir, dejar que el
compilador lo confirme.

- [ ] **Paso 3: Crear la página del panel**

`app/(dashboard)/cotizaciones/panel/page.tsx`:

```typescript
import { Suspense } from 'react'
import { getCotizacionesDashboardStats } from '@/lib/actions/cotizaciones'
import { Skeleton } from '@/components/ui/skeleton'
import { CotizacionesPanel } from '@/components/cotizaciones/cotizaciones-panel'

async function PanelContent({ month }: { month?: number }) {
    const stats = await getCotizacionesDashboardStats({ month })
    if (!stats) {
        return <p className="text-sm text-muted-foreground">No se pudo cargar el panel.</p>
    }
    return <CotizacionesPanel stats={stats} />
}

export default async function PanelCotizacionesPage({
    searchParams,
}: {
    searchParams: Promise<{ mes?: string }>
}) {
    const params = await searchParams
    const month = params.mes ? parseInt(params.mes, 10) : undefined

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Panel de Cotizaciones</h1>
            <Suspense fallback={<Skeleton className="h-[700px] w-full" />}>
                <PanelContent month={month} />
            </Suspense>
        </div>
    )
}
```

- [ ] **Paso 4: Crear el componente cliente con los 2 gráficos + 2 listas**

`components/cotizaciones/cotizaciones-panel.tsx`:

```typescript
"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const MESES_LARGO = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Mismos colores que los badges de estado en cotizaciones-columns.tsx
const COLORS = { enviadas: '#3b82f6', rechazadas: '#ef4444', aprobadas: '#22c55e' }

interface CotizacionRow {
    id: string
    numero: string
    cliente: string
    fecha_solicitud: string | null
}

interface DashboardStats {
    year: number
    selectedMonth: number
    monthly: { mes: string; enviadas: number; rechazadas: number; aprobadas: number }[]
    daily: { dia: number; enviadas: number; rechazadas: number; aprobadas: number }[]
    pendientesPorEnviar: CotizacionRow[]
    enviadas: CotizacionRow[]
}

export function CotizacionesPanel({ stats }: { stats: DashboardStats }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleMonthChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('mes', value)
        router.push(`/cotizaciones/panel?${params.toString()}`)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cotizaciones por mes — {stats.year}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px]" data-testid="panel-chart-mensual">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthly}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="mes" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="enviadas" name="Enviadas" fill={COLORS.enviadas} />
                                <Bar dataKey="rechazadas" name="Rechazadas" fill={COLORS.rechazadas} />
                                <Bar dataKey="aprobadas" name="Aprobadas" fill={COLORS.aprobadas} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>Cotizaciones por día</CardTitle>
                    <Select value={String(stats.selectedMonth)} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-[160px]" data-testid="panel-mes-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MESES_LARGO.map((mes, idx) => (
                                <SelectItem key={mes} value={String(idx + 1)}>{mes}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px]" data-testid="panel-chart-diario">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.daily}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="dia" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="enviadas" name="Enviadas" fill={COLORS.enviadas} />
                                <Bar dataKey="rechazadas" name="Rechazadas" fill={COLORS.rechazadas} />
                                <Bar dataKey="aprobadas" name="Aprobadas" fill={COLORS.aprobadas} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Pendientes por enviar ({stats.pendientesPorEnviar.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ListaCotizaciones
                            rows={stats.pendientesPorEnviar}
                            testId="panel-lista-pendientes"
                            emptyText="No hay cotizaciones pendientes de enviar."
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Enviadas ({stats.enviadas.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ListaCotizaciones
                            rows={stats.enviadas}
                            testId="panel-lista-enviadas"
                            emptyText="No hay cotizaciones enviadas."
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ListaCotizaciones({
    rows, testId, emptyText,
}: { rows: CotizacionRow[]; testId: string; emptyText: string }) {
    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground" data-testid={`${testId}-empty`}>
                {emptyText}
            </p>
        )
    }
    return (
        <ul className="space-y-1 max-h-[300px] overflow-y-auto" data-testid={testId}>
            {rows.map((c) => (
                <li key={c.id}>
                    <Link
                        href={`/cotizaciones/${c.id}`}
                        className="flex items-center justify-between text-sm hover:underline py-1 border-b last:border-0"
                    >
                        <span className="font-medium">{c.numero}</span>
                        <span className="text-muted-foreground">{c.cliente}</span>
                        <span className="text-xs text-muted-foreground">{c.fecha_solicitud ?? '-'}</span>
                    </Link>
                </li>
            ))}
        </ul>
    )
}
```

- [ ] **Paso 5: Agregar el link "Panel" al menú**

En `lib/config/menu.ts`, dentro del bloque de Cotizaciones (`children`), agregar como primer ítem
(mismo orden que Bubble, que tiene "Panel Cotizaciones" primero):

```typescript
children: [
    { name: "Panel", href: "/cotizaciones/panel" },
    { name: "Gestión", href: "/cotizaciones" },
    { name: "Servicios", href: "/cotizaciones/servicios" },
    { name: "Tasas", href: "/cotizaciones/tasas" },
]
```

- [ ] **Paso 6: Escribir el test E2E**

Crear `tests/flows/26-cotizaciones-panel.spec.ts`. **Importante (ver Tareas 10/11 de este mismo
plan):** los tests `@critical` de este repo corren bajo `--project=chromium`, no
`chromium-admin` — usar `test.use({ storageState: '.auth/admin.json' })` dentro del describe, igual
que `tests/flows/12-cotizaciones.spec.ts`. TEST puede tener 0 cotizaciones para este tenant — el
test no debe asumir datos, solo que la estructura carga:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Panel de Cotizaciones @critical', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('panel carga con los 2 gráficos y las 2 listas', async ({ page }) => {
        await page.goto('/cotizaciones/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        await expect(page.locator('h1').first()).toContainText(/Panel de Cotizaciones/i)
        await expect(page.locator('[data-testid="panel-chart-mensual"]')).toBeVisible()
        await expect(page.locator('[data-testid="panel-chart-diario"]')).toBeVisible()
        await expect(page.locator('text=Pendientes por enviar')).toBeVisible()
        await expect(page.locator('text=Enviadas').first()).toBeVisible()
    })

    test('cambiar el mes del gráfico diario actualiza la URL', async ({ page }) => {
        await page.goto('/cotizaciones/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        await page.locator('[data-testid="panel-mes-select"]').click()
        await page.getByRole('option', { name: 'Enero' }).click()
        await page.waitForURL(/mes=1/, { timeout: 10_000 })
        await expect(page.locator('[data-testid="panel-chart-diario"]')).toBeVisible()
    })

    test('link "Panel" del menú navega correctamente', async ({ page }) => {
        await page.goto('/cotizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await page.locator('a[href="/cotizaciones/panel"]').first().click()
        await expect(page).toHaveURL(/\/cotizaciones\/panel/)
    })
})
```

- [ ] **Paso 7: Correr el test para real**

```bash
npx playwright test tests/flows/26-cotizaciones-panel.spec.ts --project=chromium
```

Expected: todos en verde. Si el link del menú no es fácil de localizar con ese selector (revisar
cómo `lib/config/menu.ts` renderiza los `href` reales en el DOM — puede que el componente del
sidebar no ponga el `href` directo en un `<a>` sino que use routing programático), ajustar el
selector del test al patrón real usado por los otros links del menú de Cotizaciones (Gestión/
Servicios/Tasas) en vez de asumir.

- [ ] **Paso 8: `tsc` + regresión de Cotizaciones completa**

```bash
npx tsc --noEmit
npx playwright test tests/flows/12-cotizaciones.spec.ts tests/flows/26-cotizaciones-panel.spec.ts --project=chromium
```

Expected: 0 errores de tipos, toda la suite en verde (11 tests de `12-cotizaciones.spec.ts` de las
Tareas 10-11 + los nuevos de esta tarea).

- [ ] **Paso 9: Commit**

```bash
git add package.json package-lock.json app/\(dashboard\)/cotizaciones/panel lib/actions/cotizaciones.ts components/cotizaciones/cotizaciones-panel.tsx lib/config/menu.ts tests/flows/26-cotizaciones-panel.spec.ts
git commit -m "feat(cotizaciones): Panel de Cotizaciones - graficos mensual/diario + listas (TK-C1)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UU4oo55qHQwe9rorCcnPA6"
```

- [ ] **Paso 10: Actualizar `docs/auditoria-ui/06-cotizaciones.md`**

Cambiar el estado de TK-C1 de "backlog, pendiente de mockup" a "🟢 implementado 2026-09-09 —
Panel con gráfico mensual (año actual) + gráfico diario (mes seleccionable) + listas Pendientes
por enviar/Enviadas, `recharts@3.10.1`".

---

### Task 13: Escalar auditoría de template UI v1.2 a módulos 5-15

(proceso multi-sesión, fuera de alcance de esta ejecución. Ver plan original.)
