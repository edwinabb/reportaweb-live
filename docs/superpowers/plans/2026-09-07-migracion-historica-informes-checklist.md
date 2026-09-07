# Migración histórica de Informes/Checklist (con recorte por año) — Implementation Plan

> **Para workers agénticos:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` (script único,
> secuencial, con dry-run obligatorio antes de cada `--apply`). No aplica subagent-driven-development
> — es un solo script de migración de datos, no una feature de UI con múltiples archivos.

**Goal:** Migrar los checklists históricos de Bubble (`Informes`, TK-I1 de `docs/auditoria-ui/07-informes.md`)
a `formatos_informes` con un recorte deliberado de volumen: años ≤2025 solo cabecera + PDF, año 2026 cabecera
+ respuestas completas, y **nunca** los estados no terminados (`En Proceso`/`Suspendido`) ni `Cancelado`.

**Architecture:** Un solo script `scripts/migrate-informes-checklist-historico.ts`, mismo patrón que
`scripts/migrate-terceros-fields.ts` (dry-run por defecto, `--apply` explícito, upsert idempotente por
`bubble_id`, filtrado a CISE+GRUAS). Lee de Bubble Data API (tipo `Informes`), resuelve relaciones
(cliente/cotización/tarea/sitio/autor) contra Supabase por `bubble_id`, y escribe en dos modos según el año
de `fecha_reporte`: **modo cabecera** (solo `formatos_informes`) o **modo completo** (`formatos_informes` +
`formatos_informes_respuestas` + tablas satélite si aplica).

**Tech Stack:** `tsx` + `@supabase/supabase-js` + Bubble Data API (`fetch` nativo) — igual que el resto de
scripts de migración del proyecto. Sin dependencias nuevas.

**Spec:** este documento es su propia spec — nace directo del hallazgo TK-I1 de
`docs/auditoria-ui/07-informes.md` y de la decisión de alcance del usuario (mensaje 2026-09-07).

## Contexto adicional: esta migración ya se había hecho una vez

`docs/superpowers/plans/2026-05-25-migracion-formatos-checklist.md` documenta que la Fase 2 (informes
llenados) **ya se ejecutó exitosamente el 2026-05-25**: 6.507 informes + miles de respuestas migrados
(CISE V1: 58, CISE V2: 2.968, GRUAS V2: 3.481 informes; ~50/~4.100/~1.075 respuestas respectivamente).

**Causa raíz de por qué hoy está en 0 filas:** `mcp__claude_ai_Supabase__list_migrations` sobre PROD muestra
que **todas** las migraciones de schema (incluida `20260419210000_formatos_schema`, con nombre de archivo de
abril) tienen `version` (timestamp de aplicación) del **2026-05-26**, un solo día después de que ese plan se
diera por completado — evidencia de una reconstrucción completa de la base desde los archivos de migración
(equivalente a `supabase db reset` contra PROD). Un reset de este tipo recrea el *schema* desde las
migraciones pero **borra cualquier dato cargado por script** (los informes/respuestas no viven en ningún
archivo de migración, se insertaron con un script `migrate-formatos-informes.ts` que ya no existe en el
repo). Consistente con esto: `formatos_preguntas` (136), `formatos_opciones` (354) y `formatos_versiones`
(3) en PROD hoy **coinciden exacto** con los números finales del plan de mayo — alguien volvió a correr la
migración de *plantillas* después del reset (es rápida, ~230 filas) — pero **nadie volvió a correr la
migración de *informes*, mucho más grande (miles de filas, requiere descargar PDFs)**, y quedó perdida sin
que nadie lo notara hasta la auditoría del módulo 7 (2026-09-07).

**Esto no es un caso de "nunca se migró" — es un caso de "se migró y una reconstrucción de base de datos
posterior lo borró sin que hubiera un re-run".** El presente plan reemplaza al de mayo (que tenía el nombre
del tipo Bubble de respuestas sin confirmar) y ya incorpora esa pieza resuelta, más el recorte de alcance
por año que pidió el usuario esta vez (no todo el histórico completo, ver Global Constraints).

## Global Constraints

- **Scope de tenants: SOLO CISE (`1cb97ec7-326c-4376-93ee-ed317d3da51b`) y GRUAS
  (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`)** — mismo scope de todo el proyecto.
- **Scope de formato: SOLO el `id_formato` ya catalogado en `formatos` para cada tenant** — CISE:
  `FORMATO DE INSPECCIÓN DE GRÚAS V2` (`bubble_id=1619551534519x827573097185935400`), GRUAS: `CHECKLIST DE
  GRÚAS V2` (`bubble_id=1734793744908x241014863998484500`). Bubble tiene otros `id_formato` bajo el mismo
  tipo `Informes` (ej. "PERMISO DE IZAJE DE CARGAS", "REGISTRO DE CAPACITACIÓN") que **no tienen catálogo
  en `formatos` todavía** — quedan fuera de este plan, ver DUDA-MIG-001.
- **Scope de estado: SOLO `estado = 'Finalizado'`** (valor exacto de Bubble). Los estados `En Proceso`,
  `Suspendido` y `Cancelado` **nunca se migran** — decisión explícita del usuario, no son recuperables ni
  relevantes (no se van a completar).
- **Corte de año sobre `fecha_reporte`:** `< 2026-01-01` → modo cabecera (sin respuestas). `>= 2026-01-01`
  → modo completo (con respuestas). El corte es sobre el año calendario del reporte, no sobre cuándo se
  migra.
- **Idempotencia:** upsert por `bubble_id`, re-ejecutable sin duplicar. Un informe ya migrado en modo
  cabecera y luego re-ejecutado no debe perder nada; un informe que cambia de tier (poco probable, pero si
  `fecha_reporte` cruzara el corte) se resuelve por la condición actual, no por su estado previo en Supabase.
- **Dry-run por defecto.** Nunca escribe sin `--apply`. Reporta conteos y una muestra antes de aplicar,
  igual que `migrate-terceros-fields.ts`.
- **No se borra nada.** Este script solo inserta (`upsert`), nunca hace `DELETE`.

---

## Decisión pendiente de confirmar con el usuario antes de correr `--apply`

**DUDA-MIG-001 (alcance):** ¿los otros formatos de Bubble bajo el mismo tipo `Informes` (Permiso de Izaje
de Cargas, Registro de Capacitación, etc. — no catalogados hoy en `formatos`) se migran en una fase
posterior, o quedan fuera del cutover porque ya no se usan? Esto NO bloquea este plan (que solo cubre los 2
formatos ya catalogados), pero conviene decidirlo antes de dar por cerrado el módulo 7 completo.

**DUDA-MIG-002 (mapeo de estado):** el modelo de `formatos_informes.estado` en reportaweb3 es un flujo de
**aprobación** (`BORRADOR → ENVIADO → APROBADO/RECHAZADO/CON_COMENTARIOS`), distinto del modelo de
**finalización** de Bubble (`Nueva → En Proceso → Suspendido/Cancelado/Finalizado`, sin paso de revisión).
Este plan mapea `Finalizado` → **`APROBADO`** (estado terminal, badge verde, coherente visualmente con
"cerrado y sin pendientes"). Si el usuario prefiere otro mapeo (ej. `ENVIADO`, dado que Bubble no tuvo un
paso de aprobación real), es un cambio de una línea en Task 3 — decirlo antes de `--apply`.

**DUDA-MIG-003 (hosting del PDF):** `archivo_web` de Bubble apunta a S3 de Bubble
(`//s3.amazonaws.com/appforest_uf/...`), **fuera del control de reportaweb3**. Si ese bucket se vincula a la
cuenta de Bubble y se cierra/expira al apagar Bubble, los `pdf_url` migrados quedarían rotos.
**Recomendación de este plan: descargar cada PDF y volver a subirlo a Supabase Storage** (bucket
`informes-pdf` o similar, path `{tenant_slug}/{codigo}.pdf`), guardando la URL de Supabase en `pdf_url` —
mismo patrón de "no depender de infraestructura externa que se va a apagar" ya aplicado en la Fase 0 del
cutover. Alternativa más rápida pero más riesgosa: guardar el URL de Bubble tal cual y migrar los PDFs
después, en un ticket aparte. Este plan implementa la opción recomendada (Task 4); si el usuario prefiere
la alternativa rápida, es un flag `--skip-pdf-reupload` de una línea.

---

## File Map

| File | Acción | Propósito |
|---|---|---|
| `scripts/migrate-informes-checklist-historico.ts` | Crear | Script único de migración, todos los steps |
| `docs/auditoria-ui/07-informes.md` | Modificar | Marcar TK-I1 con el link a este plan y su resultado una vez ejecutado |

---

### Task 1: Tipo Bubble de "respuesta individual" — CONFIRMADO (sin trabajo pendiente)

**Contexto (resuelto 2026-09-07, corrección del usuario sobre el nombre):** el tipo es **`Informe_respuesta`**
(singular — `Informes_respuestas`/`Informe_Respuestas` devuelven 404; Bubble es inconsistente entre tipos:
`Informes` cabecera SÍ requiere plural, `Formato`/`Formato_seccion` funcionan en cualquier capitalización).
Confirmado en vivo contra la API — 387.743 registros totales (todos los tenants, todos los formatos).

Campos reales (unión de 200 registros de muestra + inspección de las respuestas de un informe real,
`INF-122`):

```
_id, id_informe, id_empresa, id_pregunta, respuesta_fecha, respuesta_texto, tipo,
obligatorio?, "lista_ATS - Borrar", lista_Texto_Para_CSV, lista_usuarios,
Created By, Created Date, Modified Date
```

- `id_informe` → FK a `Informes._id` (cabecera del checklist).
- `id_pregunta` → FK a `Formato_Pregunta._id` (mapear contra `formatos_preguntas.bubble_id`, ya migrado).
- `respuesta_texto` → el valor de la respuesta en texto (para preguntas "Múltiples opciones" trae la
  etiqueta elegida, ej. "SI"/"NO"/"NO APLICA"; para "Respuesta abierta" trae el texto libre).
- `respuesta_fecha` → usado cuando `tipo = "Fecha Hora"` (no todas las respuestas lo traen).
- `tipo` → mismo campo `tipo` que ya existe en `formato_pregunta` (Múltiples opciones / Respuesta abierta /
  Fecha Hora / Lista dinámica / etc.), útil para decidir a qué columna de
  `formatos_informes_respuestas` mapear el valor (`valor_texto` vs `valor_fecha` vs `valor_booleano`).
- Campos `lista_*` → listas de IDs para tipos de pregunta más complejos (ATS, listas dinámicas de
  trabajadores) — **no necesarios para el checklist estándar SI/NO/NO APLICA** que es el 100% de las
  preguntas de `CHECKLIST DE GRÚAS V2` y `FORMATO DE INSPECCIÓN DE GRÚAS V2` (confirmado en
  `2026-05-25-migracion-formatos-checklist.md` §4, grupo de opciones único "SI - NO (x) - NO APLICA" para
  ambos formatos) — soportarlos queda fuera de este plan; si aparece una respuesta con `lista_*` poblado y
  sin `respuesta_texto`, loggear como advertencia y seguir (no bloquear el resto del informe).

`RESPUESTA_BUBBLE_TYPE = 'Informe_respuesta'` — constante fija en el script, sin necesidad de sondeo.

---

### Task 2: Función de fetch y filtrado desde Bubble

**Files:**
- Create: `scripts/migrate-informes-checklist-historico.ts` (base del archivo)

**Interfaces:**
- Produce: `fetchInformesFiltrados(tenant: 'CISE'|'GRUAS'): Promise<BubbleInforme[]>` — ya filtrado por
  `id_empresa`, `id_formato` (el catalogado para ese tenant) y `estado='Finalizado'`.
- Produce: `splitByYear(informes: BubbleInforme[]): { cabecera: BubbleInforme[]; completo: BubbleInforme[] }`
  — separa por `fecha_reporte < / >= 2026-01-01`.

- [ ] **Step 1: Boilerplate del script (copiado del patrón existente)**

```typescript
/**
 * Migración histórica de checklists de Bubble (tipo `Informes`) → formatos_informes.
 *
 * Contexto: docs/auditoria-ui/07-informes.md TK-I1 — formatos_informes estaba en 0 filas pese a
 * miles de checklists reales en Bubble. Decisión de alcance del usuario (2026-09-07): no cargar
 * respuestas pregunta-por-pregunta de años que no se van a revisar ni editar (2022-2025 y anteriores);
 * para esos años migrar solo cabecera + PDF. Año 2026 en adelante: cabecera + respuestas completas.
 * Nunca migrar estados no terminados (En Proceso/Suspendido) ni Cancelado.
 *
 * SEGURIDAD: dry-run por defecto. Con --apply ejecuta los INSERT/upsert reales.
 *
 * Uso:
 *   npx tsx scripts/migrate-informes-checklist-historico.ts --probe-respuesta-tipo
 *   npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=CISE                # dry-run
 *   npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=GRUAS --apply
 *   npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=all --apply
 *
 * Env requeridas: BUBBLE_API_URL, BUBBLE_API_TOKEN, SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
 *   (o PROD_/DEMO_ prefijo) — mismo patrón que scripts/migrate-terceros-fields.ts.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const BUBBLE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_HEADERS = { Authorization: `Bearer ${process.env.BUBBLE_API_TOKEN}` }
const SB_URL = process.env.SUPABASE_URL || process.env.PROD_SUPABASE_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PROD_SUPABASE_SERVICE_ROLE_KEY
if (!BUBBLE_URL || !process.env.BUBBLE_API_TOKEN) throw new Error('Falta BUBBLE_API_URL / BUBBLE_API_TOKEN')
if (!SB_URL || !SB_KEY) throw new Error('Falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(SB_URL, SB_KEY)

const TENANTS = {
  CISE:  { bubbleId: '1596035803087x371442079041323000', sbId: '1cb97ec7-326c-4376-93ee-ed317d3da51b', formatoBubbleId: '1619551534519x827573097185935400' },
  GRUAS: { bubbleId: '1691779382086x534175713862630160', sbId: '6f4c923a-c3b7-47c2-9dea-2a187f274f73', formatoBubbleId: '1734793744908x241014863998484500' },
} as const

const CORTE_2026 = '2026-01-01T00:00:00.000Z'

const arg = (k: string) => process.argv.find(a => a.startsWith(`--${k}`))
const APPLY = !!arg('apply')
const TENANT_ARG = (arg('tenant')?.split('=')[1] || 'all') as 'CISE' | 'GRUAS' | 'all'
```

- [ ] **Step 2: `fetchAllBubble` genérico con constraints (copiado y extendido de `migrate-terceros-fields.ts`)**

```typescript
async function fetchAllBubble(type: string, constraints: any[] = [], max = 50000): Promise<any[]> {
  const out: any[] = []
  let cursor = 0
  while (out.length < max) {
    const url = `${BUBBLE_URL}/${encodeURIComponent(type)}?limit=100&cursor=${cursor}` +
      (constraints.length ? `&constraints=${encodeURIComponent(JSON.stringify(constraints))}` : '')
    const res = await fetch(url, { headers: BUBBLE_HEADERS })
    if (res.status !== 200) throw new Error(`Bubble ${type} HTTP ${res.status}`)
    const data = await res.json()
    const results = data.response?.results || []
    if (!results.length) break
    out.push(...results)
    cursor += results.length
    if (data.response?.remaining <= 0) break
  }
  return out
}
```

- [ ] **Step 3: `fetchInformesFiltrados`**

```typescript
type BubbleInforme = {
  _id: string
  id_empresa: string
  id_formato: string
  id_cliente?: string
  id_cotizacion?: string
  id_tarea?: string
  id_objetos?: string[]
  codigo: string
  estado: string
  fecha_reporte: string
  archivo_nombre?: string
  archivo_web?: string
  'Created By'?: string
  'Created Date': string
  'Modified Date': string
  'lista_respuestas - Para que?'?: string[]
}

async function fetchInformesFiltrados(tenant: 'CISE' | 'GRUAS'): Promise<BubbleInforme[]> {
  const t = TENANTS[tenant]
  return fetchAllBubble('Informes', [
    { key: 'id_empresa', constraint_type: 'equals', value: t.bubbleId },
    { key: 'id_formato', constraint_type: 'equals', value: t.formatoBubbleId },
    { key: 'estado', constraint_type: 'equals', value: 'Finalizado' },
  ])
}

function splitByYear(informes: BubbleInforme[]) {
  const cabecera = informes.filter(i => i.fecha_reporte < CORTE_2026)
  const completo = informes.filter(i => i.fecha_reporte >= CORTE_2026)
  return { cabecera, completo }
}
```

- [ ] **Step 4: Verificar conteos contra lo esperado (dry-run, sin escribir nada todavía)**

```bash
npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=GRUAS
```

Expected (orden de magnitud, confirmado en el research de este plan — los números exactos pueden variar
unas decenas por actividad reciente en Bubble): GRUAS ≈ 4.103 informes Finalizado totales, de los cuales
≈2.478 en modo cabecera (pre-2026) y ≈1.399 en modo completo (2026+). CISE ≈ 3.460 totales, ≈2.745 cabecera
y ≈346 completo. **Nota:** estos conteos son menores a los que muestra el listado de Bubble en pantalla
(que suma varios tipos de formato bajo el mismo menú) — es esperado, ver Global Constraints §Scope de
formato.

---

### Task 3: Resolución de relaciones y construcción de la fila de cabecera

**Files:**
- Modify: `scripts/migrate-informes-checklist-historico.ts`

**Interfaces:**
- Consume: `BubbleInforme` (Task 2)
- Produce: `buildCabecera(informe: BubbleInforme, tenant: 'CISE'|'GRUAS'): Promise<Record<string, any>>` —
  objeto listo para `upsert` en `formatos_informes`.

- [ ] **Step 1: Cachear mapeos `bubble_id → uuid Supabase` por tabla relacionada**

Igual patrón que `loadOpciones()` en `migrate-terceros-fields.ts`: una función por tabla que arma un
`Map<bubble_id, uuid>` una sola vez.

```typescript
async function loadBubbleIdMap(table: string, tenantSbId: string): Promise<Map<string, string>> {
  const { data } = await supabase.from(table).select('id, bubble_id').eq('tenant_id', tenantSbId)
  const m = new Map<string, string>()
  for (const row of data ?? []) if (row.bubble_id) m.set(row.bubble_id, row.id)
  return m
}
```

Tablas a cachear por tenant: `terceros` (para `id_cliente`), `cotizaciones` (para `id_cotizacion`),
`tareas` (para `id_tarea`), `terceros_sitios` o la tabla de sitios que corresponda (para el sitio de la
tarea, si `formatos_informes.sitio_id` se resuelve vía la tarea y no directo desde Bubble — confirmar
mirando si `Informes` trae `id_sitio` propio; si no, dejar `sitio_id` NULL y que se herede de `tarea_id` en
lectura, como ya hace el resto del sistema), `profiles` (para `Created By` → `created_by`, comparando por
`bubble_id` en `profiles`).

- [ ] **Step 2: `buildCabecera` — campos comunes a AMBOS modos (cabecera y completo)**

```typescript
async function buildCabecera(
  informe: BubbleInforme,
  tenant: 'CISE' | 'GRUAS',
  maps: { clientes: Map<string,string>; cotizaciones: Map<string,string>; tareas: Map<string,string>; profiles: Map<string,string> },
  pdfUrl: string | null,
) {
  const t = TENANTS[tenant]
  return {
    tenant_id: t.sbId,
    bubble_id: informe._id,
    codigo_informe: informe.codigo,
    estado: 'APROBADO' as const,   // DUDA-MIG-002 — confirmar mapeo antes de --apply
    fecha_inicio: informe.fecha_reporte,
    fecha_fin: informe.fecha_reporte,
    cliente_id: informe.id_cliente ? maps.clientes.get(informe.id_cliente) ?? null : null,
    cotizacion_id: informe.id_cotizacion ? maps.cotizaciones.get(informe.id_cotizacion) ?? null : null,
    tarea_id: informe.id_tarea ? maps.tareas.get(informe.id_tarea) ?? null : null,
    created_by: informe['Created By'] ? maps.profiles.get(informe['Created By']) ?? null : null,
    created_at: informe['Created Date'],
    updated_at: informe['Modified Date'],
    pdf_url: pdfUrl,
    pdf_generado_at: pdfUrl ? informe['Modified Date'] : null,
    is_active: true,
  }
}
```

Nota: `version_id` (FK a la versión del formato) se deja NULL o se resuelve contra la versión activa del
`formato` cacheado si `formatos` versiona por fecha — revisar `lib/actions/formatos.ts` al implementar; no
bloquea el resto de la fila si queda NULL (columna nullable).

- [ ] **Step 3: Test manual — construir la cabecera de 3 informes de muestra (1 pre-2026, 1 de 2026, 1 sin
  cliente/cotización vinculados) y loggear el objeto resultante sin escribir nada**

Correr con un flag temporal `--sample=3` que solo imprime `JSON.stringify(await buildCabecera(...), null, 2)`
para 3 registros elegidos a mano por `_id`, verificar visualmente que las relaciones resolvieron a UUIDs
reales (no `null` cuando debería haber match).

---

### Task 4: Descarga y re-subida del PDF a Supabase Storage

**Files:**
- Modify: `scripts/migrate-informes-checklist-historico.ts`
- (Si no existe) Crear bucket `informes-pdf` (privado o público según el resto de buckets de PDFs del
  proyecto — revisar convención existente, ej. cómo se guardan los PDF de `reportes_maquinaria`)

**Interfaces:**
- Produce: `reuploadPdf(archivoWeb: string, tenant: 'CISE'|'GRUAS', codigo: string): Promise<string | null>`
  — descarga el PDF de la URL de Bubble/S3 y lo sube a Supabase Storage, devuelve la URL pública/firmada
  nueva. Devuelve `null` si `archivoWeb` viene vacío (no debería pasar en `Finalizado`, pero cubrir el caso).

- [ ] **Step 1: Confirmar el bucket y el patrón de ruta ya usado para PDFs similares**

Buscar en el código cómo `reportes_maquinaria.pdf_url` o `cotizaciones.pdf_url` guardan sus archivos (¿bucket
público con URL directa, o signed URL generada al vuelo?). Replicar exactamente ese patrón para
consistencia — no inventar uno nuevo. Si no hay un bucket de PDFs de informes todavía, usar
`docs/{tenant_slug}/informes/{codigo}.pdf` dentro de un bucket ya existente si el patrón del proyecto
reutiliza buckets, o crear `informes-pdf` si el patrón es "un bucket por tipo de documento".

- [ ] **Step 2: Implementar `reuploadPdf`**

```typescript
async function reuploadPdf(archivoWeb: string, tenant: 'CISE' | 'GRUAS', codigo: string): Promise<string | null> {
  if (!archivoWeb) return null
  const url = archivoWeb.startsWith('//') ? `https:${archivoWeb}` : archivoWeb
  const res = await fetch(url)
  if (!res.ok) { console.log(`   ⚠️  PDF no descargable (${res.status}): ${url}`); return null }
  const buffer = Buffer.from(await res.arrayBuffer())
  const tenantSlug = tenant === 'CISE' ? 'cise' : 'gruas'
  const path = `${tenantSlug}/${codigo}.pdf`
  if (!APPLY) return `[dry-run] subiría a informes-pdf/${path} (${buffer.length} bytes)`
  const { error } = await supabase.storage.from('informes-pdf').upload(path, buffer, { contentType: 'application/pdf', upsert: true })
  if (error) { console.log(`   ❌ Error subiendo ${path}: ${error.message}`); return null }
  const { data } = supabase.storage.from('informes-pdf').getPublicUrl(path)
  return data.publicUrl
}
```

- [ ] **Step 3: Rate-limiting — no descargar 6.000+ PDFs en paralelo**

Procesar en lotes secuenciales pequeños (ej. 10 a la vez con `Promise.all` por lote, con una pausa breve
entre lotes) para no saturar el S3 de Bubble ni la conexión — mismo espíritu de cuidado que el resto de
scripts de este proyecto, que son todos secuenciales por defecto.

- [ ] **Step 4: Test — re-subir 3 PDFs de muestra en modo `--apply` limitado (`--sample=3`) y verificar
  manualmente que abren correctamente desde la URL nueva de Supabase**

---

### Task 5: Modo completo (2026+) — respuestas y tablas satélite

**Files:**
- Modify: `scripts/migrate-informes-checklist-historico.ts`

**Interfaces:**
- Consume: `RESPUESTA_BUBBLE_TYPE` (Task 1), `formatos_preguntas` cacheado por `bubble_id`
- Produce: `buildRespuestas(informe: BubbleInforme, informeSbId: string, preguntasMap: Map<string,string>): Promise<Record<string,any>[]>`

- [ ] **Step 1: Cachear `formatos_preguntas` por `bubble_id` (por tenant, ya que las preguntas son por
  formato/tenant)**

```typescript
async function loadPreguntasMap(formatoId: string): Promise<Map<string, string>> {
  const { data } = await supabase.from('formatos_preguntas').select('id, bubble_id').eq('formato_id', formatoId)
  const m = new Map<string, string>()
  for (const row of data ?? []) if (row.bubble_id) m.set(row.bubble_id, row.id)
  return m
}
```

- [ ] **Step 2: Fetch de las respuestas de un informe y mapeo a filas de `formatos_informes_respuestas`**

`Informe_respuesta` se filtra directo por `id_informe` (no hace falta resolver la lista de IDs del campo
`lista_respuestas - Para que?` de `Informes` — más simple: consultar `Informe_respuesta` con constraint
`id_informe = <bubble _id del informe>`):

```typescript
async function fetchRespuestasDeInforme(informeBubbleId: string) {
  return fetchAllBubble('Informe_respuesta', [
    { key: 'id_informe', constraint_type: 'equals', value: informeBubbleId },
  ])
}

function buildRespuestas(
  respuestasBubble: any[],
  informeSbId: string,
  tenantSbId: string,
  preguntasMap: Map<string, string>,
) {
  const rows: Record<string, any>[] = []
  for (const r of respuestasBubble) {
    const pregunta_id = r.id_pregunta ? preguntasMap.get(r.id_pregunta) ?? null : null
    if (!pregunta_id) {
      console.log(`   ⚠️  respuesta ${r._id} sin pregunta_id resuelto (id_pregunta=${r.id_pregunta ?? '(vacío)'})`)
      continue   // no bloquea el resto del informe — la cabecera y el PDF siguen siendo válidos
    }
    rows.push({
      tenant_id: tenantSbId,
      informe_id: informeSbId,
      pregunta_id,
      valor_texto: r.respuesta_texto ?? null,
      valor_fecha: r.tipo === 'Fecha Hora' ? (r.respuesta_fecha ?? null) : null,
      created_at: r['Created Date'],
    })
  }
  return rows
}
```

Nota: `valor_booleano`/`opcion_id` de `formatos_informes_respuestas` quedan sin usar en esta migración — el
checklist SI/NO/NO APLICA guarda su respuesta como texto libre en Bubble (`respuesta_texto = "SI"`, no un ID
de opción), así que se migra tal cual a `valor_texto`; no hace falta resolver contra `formatos_opciones`
para que el dato sea correcto y legible (`informe-read-view.tsx` debe poder mostrar `valor_texto`
directamente — confirmar al implementar que no asume `opcion_id` obligatorio).

- [ ] **Step 3: Test — para 1 informe de 2026 conocido (usar el `INF-3693` visto en la auditoría de Bubble,
  o el primero que aparezca en `completo`), construir sus respuestas y comparar manualmente contra el PDF
  real de ese informe (mismo informe, mismas ~33 preguntas con SI/NO/NO APLICA) para confirmar que el
  mapeo pregunta↔respuesta es correcto antes de escalar a todos los registros.**

---

### Task 6: Orquestación, upsert final y reporte

**Files:**
- Modify: `scripts/migrate-informes-checklist-historico.ts`

**Interfaces:**
- Produce: función `main()` que corre todo el flujo y termina con un resumen.

- [ ] **Step 1: Orquestar por tenant**

```typescript
async function migrarTenant(tenant: 'CISE' | 'GRUAS') {
  console.log(`\n=== ${tenant} ===`)
  const informes = await fetchInformesFiltrados(tenant)
  const { cabecera, completo } = splitByYear(informes)
  console.log(`  Total Finalizado (formato catalogado): ${informes.length}`)
  console.log(`  Modo cabecera (pre-2026): ${cabecera.length}`)
  console.log(`  Modo completo (2026+): ${completo.length}`)

  const maps = await loadAllMaps(tenant)   // clientes, cotizaciones, tareas, profiles

  let okCabecera = 0, okCompleto = 0, errores = 0

  for (const informe of [...cabecera, ...completo]) {
    const esCompleto = informe.fecha_reporte >= CORTE_2026
    try {
      const pdfUrl = await reuploadPdf(informe.archivo_web ?? '', tenant, informe.codigo)
      const row = await buildCabecera(informe, tenant, maps, pdfUrl)
      if (!APPLY) { esCompleto ? okCompleto++ : okCabecera++; continue }

      const { data: inserted, error } = await supabase.from('formatos_informes').upsert(row, { onConflict: 'bubble_id' }).select('id').single()
      if (error) { errores++; console.log(`  ❌ ${informe.codigo}: ${error.message}`); continue }

      if (esCompleto) {
        const respuestas = await buildRespuestas(informe, inserted.id, /* preguntasMap del formato de este tenant */)
        if (respuestas.length) {
          const { error: errR } = await supabase.from('formatos_informes_respuestas').upsert(respuestas)
          if (errR) console.log(`  ⚠️  ${informe.codigo}: respuestas con error: ${errR.message}`)
        }
        okCompleto++
      } else {
        okCabecera++
      }
    } catch (e: any) {
      errores++
      console.log(`  ❌ ${informe.codigo}: ${e.message}`)
    }
  }

  console.log(`  ${APPLY ? '✅ Migrados' : '[dry-run] Migraría'}: ${okCabecera} cabecera + ${okCompleto} completo · ❌ ${errores} errores`)
}
```

- [ ] **Step 2: `main()` con selección de tenant vía `--tenant`**

```typescript
async function main() {
  const tenants: ('CISE' | 'GRUAS')[] = TENANT_ARG === 'all' ? ['CISE', 'GRUAS'] : [TENANT_ARG]
  for (const t of tenants) await migrarTenant(t)
}
main()
```

- [ ] **Step 3: Correr dry-run completo y revisar el resumen con el usuario antes de `--apply`**

```bash
npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=all
```

- [ ] **Step 4: Aplicar primero a UN tenant (GRUAS, el más chico en volumen de `completo`) y verificar en
  la UI real de reportaweb3 (`/informes`) antes de aplicar a CISE**

```bash
npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=GRUAS --apply
```

Abrir `/informes` logueado como un usuario de GRUAS, confirmar: (a) aparecen los informes migrados con su
PDF real, (b) los de 2026 muestran "Puntos" (respuestas) correctamente, (c) los pre-2026 muestran la
cabecera sin romper la UI aunque no tengan respuestas (confirmar que `informe-read-view.tsx` no asume que
siempre hay al menos 1 respuesta).

- [ ] **Step 5: Aplicar a CISE**

```bash
npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=CISE --apply
```

- [ ] **Step 6: Verificación final de conteos (Supabase MCP o SQL directo)**

```sql
select tenant_id, count(*) filter (where estado='APROBADO') aprobados,
       count(*) filter (where id in (select informe_id from formatos_informes_respuestas)) con_respuestas
from formatos_informes
where tenant_id in ('1cb97ec7-326c-4376-93ee-ed317d3da51b','6f4c923a-c3b7-47c2-9dea-2a187f274f73')
group by tenant_id;
```

Esperado: `aprobados` ≈ total Finalizado migrado por tenant; `con_respuestas` ≈ solo los de 2026 (~346 CISE
+ ~1.399 GRUAS, sujeto a los conteos reales del dry-run).

- [ ] **Step 7: Actualizar `docs/auditoria-ui/07-informes.md`**

Marcar TK-I1 como resuelto, con el conteo final migrado y un link a este plan. Actualizar el veredicto de
cierre del módulo de 🔴 a 🟡 o 🟢 según el resultado (queda 🟡 si DUDA-MIG-001 sobre los otros formatos de
Bubble sigue abierta).

---

## Self-review

- **Cobertura del spec:** recorte por año ✅ (Task 2 `splitByYear`), exclusión de estados no terminados y
  Cancelado ✅ (Task 2 `fetchInformesFiltrados` filtra `estado='Finalizado'` en el fetch mismo, nunca trae
  los demás), migración de cabecera+PDF para años viejos ✅ (Task 3+4), migración completa para 2026 ✅
  (Task 5), idempotencia ✅ (upsert por `bubble_id` en todas las escrituras).
- **Placeholders:** ninguno pendiente — el tipo Bubble de "respuesta individual" (Task 1) quedó confirmado
  (`Informe_respuesta`, corrección del usuario sobre el nombre exacto + verificación en vivo contra la API)
  con su mapeo de campos completo. Tasks 2-4 (modo cabecera, ~65% del volumen) tampoco dependían de esto y
  pueden ejecutarse de forma independiente si se quiere avanzar por partes.
- **Consistencia de tipos:** `estado: 'APROBADO'` como valor fijo coincide con el enum ya definido en
  `InformeCompleto['estado']` (`lib/actions/formatos-informes.ts`); `bubble_id` como clave de upsert
  coincide con la columna ya presente en `formatos_informes`.
- **Decisión de diseño explícita:** re-subir los PDFs a Supabase Storage en vez de linkear el S3 de Bubble
  directamente (DUDA-MIG-003) — mismo criterio de independencia de infraestructura ya aplicado en Fase 0.
