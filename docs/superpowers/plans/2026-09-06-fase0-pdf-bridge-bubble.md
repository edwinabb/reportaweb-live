# Fase 0 — PDF Bridge para Bubble (reemplazo de docmaker.co) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exponer un endpoint propio que Bubble pueda llamar para generar PDFs (reemplazando el plugin `docmaker.co`, $40/mes), con reintentos automáticos diferenciados por tipo de documento y notificación a Bubble por webhook cuando el PDF esté listo.

**Architecture:** Un endpoint bridge (`/api/bubble/pdf/generate`) recibe de Bubble un `template_key` + datos de tags + `tenant_id` + `callback_url`. Intenta generar el PDF una vez de inmediato (docxtemplater rellena la plantilla `.docx`, Gotenberg vía LibreOffice la convierte a PDF — mismo mecanismo que ya usa `app/api/pdf/generate-docx/route.ts` para cotizaciones internas). Si falla, encola el job en la tabla `pdf_jobs` (ya existente, se extiende con columnas nuevas) con un cronograma de reintentos que depende de `doc_category` (`comercial` vs `operativo`). Un cron que corre cada 1 minuto (vía `pg_cron` + `pg_net` en Supabase — **no** Cloudflare Cron Triggers: se verificó que `@opennextjs/cloudflare` 1.20.1 no expone un hook `scheduled()` para Next.js API routes, así que se usa el mecanismo que el proyecto ya usa para `generate_epp_alerts` en `20260419180000_epp_alertas_function.sql`, adaptado para llamar un endpoint HTTP en vez de una función SQL) drena la cola respetando `next_retry_at`. Al lograr el PDF, se notifica a Bubble por un POST a `callback_url`.

**Tech Stack:** Next.js App Router (API routes), Supabase Postgres (tabla `pdf_jobs` extendida) + Storage (bucket `bubble-pdfs`) + `pg_cron`/`pg_net`, `docxtemplater` + `pizzip` (ya en `package.json`), Gotenberg (`/forms/libreoffice/convert`), TypeScript, `tsx` para scripts de verificación (no hay test runner unitario en el proyecto — solo Playwright E2E — así que la verificación de lógica pura usa el mismo patrón `npx tsx scripts/*.ts` que ya usa el repo).

**Spec:** `docs/superpowers/specs/2026-09-06-plan-migracion-cutover-fase2-design.md`, sección "Fase 0".

## Global Constraints

- Scope de tenants: solo CISE (`1cb97ec7-326c-4376-93ee-ed317d3da51b`) y GRUAS (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`) — el endpoint valida `tenant_id` contra esta allowlist, rechaza cualquier otro valor.
- Cronogramas de reintento (fijos, del spec): comercial `[10, 20, 30, 60, 120]` segundos; operativo `[60, 120, 300, 600, 720]` segundos. 5 intentos cada uno.
- Nunca usar `puppeteer`, `pdf-lib` ni `pdfmake` — todo PDF pasa por Gotenberg (regla existente del proyecto, `docs/julio12/feedback_gotenberg_pdf.md`).
- El endpoint bridge tiene su propia autenticación (`BUBBLE_PDF_BRIDGE_API_KEY`), nunca reutiliza las keys internas de Supabase de la v3.
- Nunca commitear secretos (`BUBBLE_PDF_BRIDGE_API_KEY`, `CRON_SECRET`) en migraciones ni en el código — solo en `.env.local` / Cloudflare Secrets / vía `execute_sql` manual no versionado.
- Aplicar toda migración de schema a **ambas** bases: TEST (`oyrokyyaeaeqzlsgxtto`) y PROD (`fqwhagryqkkhbgznxtwf`), vía Supabase MCP `apply_migration`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260906130000_extend_pdf_jobs_bubble_bridge.sql` | **Create** | Columnas nuevas en `pdf_jobs` + bucket `bubble-pdfs` |
| `lib/pdf-retry-schedule.ts` | **Create** | Cronogramas de reintento + `computeNextRetryAt()` |
| `scripts/test-pdf-retry-schedule.ts` | **Create** | Verificación de la lógica de reintentos (TDD) |
| `lib/pdf-queue.ts` | **Modify** | Extender `PdfJobEntityType`/`EnqueuePdfJobParams` para `bubble_docx` |
| `lib/bubble-docx-pdf.ts` | **Create** | Rellenar plantilla `.docx` + convertir a PDF vía Gotenberg |
| `lib/bubble-webhook.ts` | **Create** | Notificar a Bubble por webhook (éxito/fallo) |
| `public/templates/bubble/README.md` | **Create** | Instrucciones para subir las plantillas `.docx` reales |
| `app/api/bubble/pdf/generate/route.ts` | **Create** | Endpoint bridge que llama Bubble |
| `app/api/cron/pdf-jobs/route.ts` | **Modify** | Filtrar por `next_retry_at`, rama `bubble_docx`, notificar webhook |
| `.env.example` | **Modify** | Documentar `BUBBLE_PDF_BRIDGE_API_KEY` |

---

### Task 1: Migración — extender `pdf_jobs` + crear bucket `bubble-pdfs`

**Files:**
- Create: `supabase/migrations/20260906130000_extend_pdf_jobs_bubble_bridge.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/20260906130000_extend_pdf_jobs_bubble_bridge.sql

ALTER TABLE public.pdf_jobs
    ADD COLUMN IF NOT EXISTS doc_category  TEXT,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS callback_url  TEXT,
    ADD COLUMN IF NOT EXISTS template_key  TEXT,
    ADD COLUMN IF NOT EXISTS payload       JSONB;

ALTER TABLE public.pdf_jobs
    ADD CONSTRAINT pdf_jobs_doc_category_check
    CHECK (doc_category IS NULL OR doc_category IN ('comercial', 'operativo'));

CREATE INDEX IF NOT EXISTS pdf_jobs_next_retry_idx
    ON public.pdf_jobs (next_retry_at)
    WHERE status = 'pending';

INSERT INTO storage.buckets (id, name, public)
VALUES ('bubble-pdfs', 'bubble-pdfs', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Aplicar a TEST**

Vía Supabase MCP `apply_migration` sobre el proyecto `oyrokyyaeaeqzlsgxtto`.

- [ ] **Step 3: Aplicar a PROD**

Vía Supabase MCP `apply_migration` sobre el proyecto `fqwhagryqkkhbgznxtwf`.

- [ ] **Step 4: Verificar**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pdf_jobs' AND column_name IN ('doc_category','next_retry_at','callback_url','template_key','payload');
```
Esperado: las 5 columnas listadas.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906130000_extend_pdf_jobs_bubble_bridge.sql
git commit -m "feat(db): extender pdf_jobs para bridge de PDF de Bubble + bucket bubble-pdfs"
```

---

### Task 2: `lib/pdf-retry-schedule.ts` — cronograma de reintentos (TDD)

**Files:**
- Create: `lib/pdf-retry-schedule.ts`
- Test: `scripts/test-pdf-retry-schedule.ts`

**Interfaces:**
- Produces: `type DocCategory = 'comercial' | 'operativo'`, `RETRY_SCHEDULES: Record<DocCategory, number[]>`, `getRetryDelaySeconds(category: DocCategory, attemptsSoFar: number): number | null`, `computeNextRetryAt(category: DocCategory, attemptsSoFar: number, from?: Date): Date | null`.

- [ ] **Step 1: Escribir el test (falla porque el archivo no existe)**

```typescript
// scripts/test-pdf-retry-schedule.ts
import assert from 'node:assert/strict'
import { getRetryDelaySeconds, computeNextRetryAt, RETRY_SCHEDULES } from '../lib/pdf-retry-schedule'

// Cronogramas exactos del spec
assert.deepEqual(RETRY_SCHEDULES.comercial, [10, 20, 30, 60, 120])
assert.deepEqual(RETRY_SCHEDULES.operativo, [60, 120, 300, 600, 720])

// attemptsSoFar=0 → primer reintento (el que se agenda al encolar, tras el intento síncrono inicial)
assert.equal(getRetryDelaySeconds('comercial', 0), 10)
assert.equal(getRetryDelaySeconds('operativo', 0), 60)

// attemptsSoFar=4 → quinto y último reintento
assert.equal(getRetryDelaySeconds('comercial', 4), 120)
assert.equal(getRetryDelaySeconds('operativo', 4), 720)

// attemptsSoFar=5 → reintentos agotados (5 intentos ya hechos)
assert.equal(getRetryDelaySeconds('comercial', 5), null)
assert.equal(getRetryDelaySeconds('operativo', 5), null)

// computeNextRetryAt suma segundos a una fecha base fija
const base = new Date('2026-09-06T12:00:00.000Z')
const next = computeNextRetryAt('comercial', 0, base)
assert.equal(next?.toISOString(), '2026-09-06T12:00:10.000Z')

const exhausted = computeNextRetryAt('operativo', 5, base)
assert.equal(exhausted, null)

console.log('OK: pdf-retry-schedule')
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx tsx scripts/test-pdf-retry-schedule.ts`
Expected: error de módulo no encontrado (`Cannot find module '../lib/pdf-retry-schedule'`).

- [ ] **Step 3: Implementar `lib/pdf-retry-schedule.ts`**

```typescript
// lib/pdf-retry-schedule.ts

export type DocCategory = 'comercial' | 'operativo'

/**
 * Segundos de espera antes de cada reintento. 5 intentos por categoría
 * (definido por el usuario en docs/superpowers/specs/2026-09-06-plan-migracion-cutover-fase2-design.md § Fase 0).
 */
export const RETRY_SCHEDULES: Record<DocCategory, number[]> = {
    comercial: [10, 20, 30, 60, 120],
    operativo: [60, 120, 300, 600, 720],
}

/**
 * Devuelve el delay (segundos) antes del reintento número `attemptsSoFar + 1`,
 * o null si ya se agotaron los reintentos de esa categoría.
 */
export function getRetryDelaySeconds(category: DocCategory, attemptsSoFar: number): number | null {
    const schedule = RETRY_SCHEDULES[category]
    if (attemptsSoFar < 0 || attemptsSoFar >= schedule.length) return null
    return schedule[attemptsSoFar]
}

/**
 * Calcula el timestamp del próximo reintento, o null si se agotaron los intentos.
 */
export function computeNextRetryAt(category: DocCategory, attemptsSoFar: number, from: Date = new Date()): Date | null {
    const delaySeconds = getRetryDelaySeconds(category, attemptsSoFar)
    if (delaySeconds === null) return null
    return new Date(from.getTime() + delaySeconds * 1000)
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx tsx scripts/test-pdf-retry-schedule.ts`
Expected: imprime `OK: pdf-retry-schedule` sin errores.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf-retry-schedule.ts scripts/test-pdf-retry-schedule.ts
git commit -m "feat(pdf): cronograma de reintentos comercial/operativo con verificacion"
```

---

### Task 3: Extender `lib/pdf-queue.ts` para jobs de Bubble

**Files:**
- Modify: `lib/pdf-queue.ts`

**Interfaces:**
- Consumes: `DocCategory`, `computeNextRetryAt` de `lib/pdf-retry-schedule.ts` (Task 2).
- Produces: `PdfJobEntityType` ahora incluye `'bubble_docx'`; `EnqueuePdfJobParams` acepta `docCategory?`, `templateKey?`, `payload?`, `callbackUrl?`.

- [ ] **Step 1: Modificar el archivo**

```typescript
// lib/pdf-queue.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeNextRetryAt, type DocCategory } from './pdf-retry-schedule'

export type PdfJobEntityType =
    | 'reporte_maquinaria'
    | 'reporte_personal'
    | 'inspeccion'
    | 'informe'
    | 'valorizacion'
    | 'cotizacion'
    | 'bubble_docx'

export interface EnqueuePdfJobParams {
    adminClient: SupabaseClient
    tenantId: string
    entityType: PdfJobEntityType
    entityId: string
    bucket: string
    storagePath: string
    htmlSnapshot?: string
    // Campos exclusivos de bubble_docx:
    docCategory?: DocCategory
    templateKey?: string
    payload?: Record<string, unknown>
    callbackUrl?: string
}

/**
 * Inserta un job pendiente. Ignora duplicados (índice único parcial en 'pending').
 * No se puede usar upsert con índices únicos parciales — se usa insert con ignoreDuplicates.
 */
export async function enqueuePdfJob(params: EnqueuePdfJobParams): Promise<void> {
    const {
        adminClient, tenantId, entityType, entityId, bucket, storagePath, htmlSnapshot,
        docCategory, templateKey, payload, callbackUrl,
    } = params

    const row: Record<string, unknown> = {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        bucket,
        storage_path: storagePath,
        html_snapshot: htmlSnapshot ?? null,
        status: 'pending',
        attempts: 0,
        updated_at: new Date().toISOString(),
    }

    if (docCategory) {
        row.doc_category = docCategory
        row.max_attempts = 5
        row.template_key = templateKey ?? null
        row.payload = payload ?? null
        row.callback_url = callbackUrl ?? null
        const nextRetry = computeNextRetryAt(docCategory, 0)
        row.next_retry_at = (nextRetry ?? new Date()).toISOString()
    }

    const { error } = await adminClient
        .from('pdf_jobs')
        .insert(row, { ignoreDuplicates: true } as any)
    if (error && !error.message?.includes('duplicate') && error.code !== '23505') {
        console.error('[enqueuePdfJob] failed:', error.message)
    }
}

export function queuedPdfResponse(entityLabel: string): Response {
    return new Response(
        JSON.stringify({
            queued: true,
            message: `El PDF de ${entityLabel} está en cola. Se generará en los próximos minutos.`,
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
    )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `lib/pdf-queue.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/pdf-queue.ts
git commit -m "feat(pdf): extender pdf-queue con entity_type bubble_docx y cronograma"
```

---

### Task 4: `lib/bubble-docx-pdf.ts` — render de plantilla Bubble

**Files:**
- Create: `lib/bubble-docx-pdf.ts`
- Create: `public/templates/bubble/README.md`

**Interfaces:**
- Produces: `renderBubbleDocxPdf(templateKey: string, data: Record<string, unknown>): Promise<ArrayBuffer>`, `class BubbleTemplateNotFoundError extends Error`.

- [ ] **Step 1: Crear el directorio de plantillas con instrucciones**

```markdown
<!-- public/templates/bubble/README.md -->
# Plantillas .docx para el bridge de PDF de Bubble

Cada archivo `<template_key>.docx` en esta carpeta corresponde a un `template_key`
que Bubble envía en el body de `POST /api/bubble/pdf/generate`.

**Paso manual pendiente (no lo puede hacer un agente):** exportar desde
docmaker.co (o desde donde estén hoy) las plantillas `.docx` actuales de
Bubble y copiarlas aquí, una por tipo de documento:

- `cotizacion-bubble.docx`
- `valorizacion-venta.docx`
- `valorizacion-compra.docx`
- `reporte-maquinaria.docx`
- `reporte-horas-maquinaria.docx`
- `reporte-personal.docx`

Los tags dentro del `.docx` deben usar la sintaxis de docxtemplater: `{nombre_tag}`
para texto simple, `{#lista}...{/lista}` para tablas/repeticiones. Ver
https://docxtemplater.com/docs/tag-types/ para la sintaxis completa.

Sin estos archivos, `renderBubbleDocxPdf()` lanza `BubbleTemplateNotFoundError`.
```

- [ ] **Step 2: Implementar el helper de render**

```typescript
// lib/bubble-docx-pdf.ts
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host'

export class BubbleTemplateNotFoundError extends Error {}

/**
 * Rellena la plantilla public/templates/bubble/<templateKey>.docx con `data`
 * y la convierte a PDF vía Gotenberg (LibreOffice). Mismo mecanismo que
 * app/api/pdf/generate-docx/route.ts, parametrizado por templateKey.
 */
export async function renderBubbleDocxPdf(templateKey: string, data: Record<string, unknown>): Promise<ArrayBuffer> {
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'bubble', `${templateKey}.docx`)
    if (!fs.existsSync(templatePath)) {
        throw new BubbleTemplateNotFoundError(`Plantilla no encontrada: ${templateKey}.docx`)
    }

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    doc.render(data)
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    const form = new FormData()
    form.append(
        'files',
        new Blob([new Uint8Array(docxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        'merged.docx',
    )

    const response = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gotenberg conversion failed (${response.status}): ${errText}`)
    }

    return response.arrayBuffer()
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `lib/bubble-docx-pdf.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/bubble-docx-pdf.ts public/templates/bubble/README.md
git commit -m "feat(pdf): helper de render docx->pdf para plantillas de Bubble"
```

---

### Task 5: `lib/bubble-webhook.ts` — notificar a Bubble

**Files:**
- Create: `lib/bubble-webhook.ts`

**Interfaces:**
- Produces: `notifyBubbleCallback(callbackUrl: string, payload: { entity_id: string; status: 'done' | 'failed'; pdf_url?: string }): Promise<boolean>`.

- [ ] **Step 1: Implementar**

```typescript
// lib/bubble-webhook.ts

interface BubbleCallbackPayload {
    entity_id: string
    status: 'done' | 'failed'
    pdf_url?: string
}

/**
 * Notifica a un API Workflow público de Bubble que un PDF terminó (o falló).
 * Best-effort: un solo intento, no reintenta (Bubble es responsable de su
 * propia resiliencia si necesita confirmar la recepción).
 */
export async function notifyBubbleCallback(callbackUrl: string, payload: BubbleCallbackPayload): Promise<boolean> {
    try {
        const res = await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) {
            console.error(`[notifyBubbleCallback] ${callbackUrl} respondió ${res.status}`)
            return false
        }
        return true
    } catch (e: unknown) {
        console.error('[notifyBubbleCallback] fetch failed:', e)
        return false
    }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add lib/bubble-webhook.ts
git commit -m "feat(pdf): helper para notificar a Bubble por webhook"
```

---

### Task 6: Endpoint bridge `app/api/bubble/pdf/generate/route.ts`

**Files:**
- Create: `app/api/bubble/pdf/generate/route.ts`

**Interfaces:**
- Consumes: `renderBubbleDocxPdf`, `BubbleTemplateNotFoundError` (Task 4); `saveToStorage` (`lib/pdf-cache.ts`, ya existente); `enqueuePdfJob` (Task 3); `createAdminClient` (`utils/supabase/admin.ts`, ya existente).

- [ ] **Step 1: Implementar el endpoint**

```typescript
// app/api/bubble/pdf/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { renderBubbleDocxPdf, BubbleTemplateNotFoundError } from '@/lib/bubble-docx-pdf'
import { saveToStorage } from '@/lib/pdf-cache'
import { enqueuePdfJob } from '@/lib/pdf-queue'
import type { DocCategory } from '@/lib/pdf-retry-schedule'

const BUCKET = 'bubble-pdfs'

// Scope de tenants confirmado (docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md § Global Constraints)
const ALLOWED_TENANT_IDS = new Set([
    '1cb97ec7-326c-4376-93ee-ed317d3da51b', // CISE
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73', // GRUAS
])

interface BubblePdfRequestBody {
    tenant_id: string
    template_key: string
    doc_category: DocCategory
    data: Record<string, unknown>
    entity_id: string
    callback_url: string
    filename?: string
}

export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization')
    if (!auth || auth !== `Bearer ${process.env.BUBBLE_PDF_BRIDGE_API_KEY}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let body: BubblePdfRequestBody
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const { tenant_id, template_key, doc_category, data, entity_id, callback_url, filename } = body

    if (!tenant_id || !template_key || !doc_category || !data || !entity_id || !callback_url) {
        return NextResponse.json(
            { error: 'Faltan campos requeridos: tenant_id, template_key, doc_category, data, entity_id, callback_url' },
            { status: 400 },
        )
    }
    if (!ALLOWED_TENANT_IDS.has(tenant_id)) {
        return NextResponse.json({ error: 'tenant_id no reconocido' }, { status: 400 })
    }
    if (doc_category !== 'comercial' && doc_category !== 'operativo') {
        return NextResponse.json({ error: 'doc_category debe ser "comercial" u "operativo"' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const storagePath = `bubble/${doc_category}/${entity_id}-${Date.now()}.pdf`

    try {
        const pdf = await renderBubbleDocxPdf(template_key, data)
        const publicUrl = await saveToStorage(adminClient, BUCKET, storagePath, Buffer.from(pdf))
        if (!publicUrl) throw new Error('No se pudo subir el PDF a Storage')
        return NextResponse.json({ status: 'done', pdf_url: publicUrl })
    } catch (e: unknown) {
        if (e instanceof BubbleTemplateNotFoundError) {
            return NextResponse.json({ error: e.message }, { status: 404 })
        }
        console.error('[POST /api/bubble/pdf/generate] intento inmediato falló, encolando:', e)
        await enqueuePdfJob({
            adminClient,
            tenantId: tenant_id,
            entityType: 'bubble_docx',
            entityId: entity_id,
            bucket: BUCKET,
            storagePath,
            docCategory: doc_category,
            templateKey: template_key,
            payload: data,
            callbackUrl: callback_url,
        })
        return NextResponse.json(
            { status: 'queued', message: `El PDF de ${filename ?? entity_id} está en cola y se notificará por webhook al completarse.` },
            { status: 202 },
        )
    }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Smoke test manual (requiere `BUBBLE_PDF_BRIDGE_API_KEY` en `.env.local` y al menos una plantilla en `public/templates/bubble/`)**

```bash
curl -X POST http://localhost:3000/api/bubble/pdf/generate \
  -H "Authorization: Bearer $BUBBLE_PDF_BRIDGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "1cb97ec7-326c-4376-93ee-ed317d3da51b",
    "template_key": "cotizacion-bubble",
    "doc_category": "comercial",
    "data": {"cliente": "Test", "monto": "100.00"},
    "entity_id": "test-123",
    "callback_url": "https://reporta.la/version-test/api/1.1/wf/pdf-listo"
  }'
```
Expected (con plantilla presente y Gotenberg arriba): `{"status":"done","pdf_url":"https://...supabase.co/storage/..."}`.
Expected (sin plantilla): `404` con el mensaje de `BubbleTemplateNotFoundError`.

- [ ] **Step 4: Commit**

```bash
git add app/api/bubble/pdf/generate/route.ts
git commit -m "feat(pdf): endpoint bridge para que Bubble genere PDFs (reemplaza docmaker)"
```

---

### Task 7: Cron `app/api/cron/pdf-jobs/route.ts` — rama `bubble_docx` + `next_retry_at`

**Files:**
- Modify: `app/api/cron/pdf-jobs/route.ts`

**Interfaces:**
- Consumes: `renderBubbleDocxPdf` (Task 4), `notifyBubbleCallback` (Task 5), `computeNextRetryAt` (Task 2).

- [ ] **Step 1: Modificar la query de selección para respetar `next_retry_at`**

Reemplazar el bloque de selección (líneas 21-26 actuales):

```typescript
    const { data: jobs, error: fetchErr } = await admin
        .from('pdf_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('next_retry_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE)
```

Nota: para los `entity_type` que ya existían antes de esta fase (`reporte_maquinaria`, etc.), la columna `next_retry_at` quedó con el default `NOW()` al migrar (Task 1) — siguen siendo elegibles en cada corrida del cron exactamente igual que antes de este cambio, no hay regresión.

- [ ] **Step 2: Agregar imports**

```typescript
import { renderBubbleDocxPdf } from '@/lib/bubble-docx-pdf'
import { notifyBubbleCallback } from '@/lib/bubble-webhook'
import { computeNextRetryAt, type DocCategory } from '@/lib/pdf-retry-schedule'
```

- [ ] **Step 3: Agregar la rama `bubble_docx` en el `if/else` de tipos de entidad**

Insertar como primera rama del `if/else` existente (antes de `if (job.entity_type === 'reporte_personal')`), y manejar su resultado por separado del resto porque usa un cronograma de reintentos distinto:

```typescript
        try {
            let pdfUrl: string | null = null

            if (job.entity_type === 'bubble_docx') {
                try {
                    const pdf = await renderBubbleDocxPdf(job.template_key, job.payload ?? {})
                    pdfUrl = await saveToStorage(admin, job.bucket, job.storage_path, Buffer.from(pdf))
                } catch (bubbleErr) {
                    console.error('[cron/pdf-jobs] bubble_docx intento falló:', bubbleErr)
                    pdfUrl = null
                }

                const category = (job.doc_category ?? 'operativo') as DocCategory
                if (pdfUrl) {
                    await admin.from('pdf_jobs').update({
                        status: 'done', pdf_url: pdfUrl, last_error: null, updated_at: new Date().toISOString(),
                    }).eq('id', job.id)
                    if (job.callback_url) {
                        await notifyBubbleCallback(job.callback_url, { entity_id: job.entity_id, status: 'done', pdf_url: pdfUrl })
                    }
                    results.push({ id: job.id, status: 'done' })
                } else {
                    const newAttempts = job.attempts + 1 // ya escrito arriba en el update de "processing"
                    const nextRetry = computeNextRetryAt(category, newAttempts)
                    if (nextRetry) {
                        await admin.from('pdf_jobs').update({
                            status: 'pending', next_retry_at: nextRetry.toISOString(),
                            last_error: 'Gotenberg failed', updated_at: new Date().toISOString(),
                        }).eq('id', job.id)
                        results.push({ id: job.id, status: 'pending', error: 'requeued' })
                    } else {
                        await admin.from('pdf_jobs').update({
                            status: 'failed', last_error: 'Reintentos agotados', updated_at: new Date().toISOString(),
                        }).eq('id', job.id)
                        if (job.callback_url) {
                            await notifyBubbleCallback(job.callback_url, { entity_id: job.entity_id, status: 'failed' })
                        }
                        results.push({ id: job.id, status: 'failed' })
                    }
                }
                continue // ya manejamos el update de estado para este job, saltar el bloque genérico de abajo
            }

            if (job.entity_type === 'reporte_personal') {
```

(El resto del `if/else` para los demás `entity_type` queda igual que hoy; el bloque genérico de éxito/fallo al final del `try` sigue aplicando solo a esos tipos, gracias al `continue` agregado para `bubble_docx`.)

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/pdf-jobs/route.ts
git commit -m "feat(pdf): rama bubble_docx en el cron con cronograma de reintentos y webhook"
```

---

### Task 8: Variables de entorno + secrets de Cloudflare

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Documentar la variable nueva**

Agregar a `.env.example`:
```bash
# API key propia del bridge de PDF para Bubble (NO reutilizar otras keys)
BUBBLE_PDF_BRIDGE_API_KEY=
```

- [ ] **Step 2: Generar el valor real y ponerlo en `.env.local`**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copiar el resultado a `.env.local` como `BUBBLE_PDF_BRIDGE_API_KEY=<valor>`. **No commitear `.env.local`.**

- [ ] **Step 3: Cargar el secret en Cloudflare (dashboard, manual — no vía CLI para no dejarlo en shell history)**

Worker `reportaweb-live` → Settings → Variables and Secrets → agregar `BUBBLE_PDF_BRIDGE_API_KEY` (tipo Secret) con el mismo valor que en `.env.local`. Repetir en el worker `reportaweb3-demo` para pruebas en `version-test` de Bubble.

- [ ] **Step 4: Commit (solo el `.env.example`)**

```bash
git add .env.example
git commit -m "docs(env): documentar BUBBLE_PDF_BRIDGE_API_KEY"
```

---

### Task 9: Cron real — `pg_cron` + `pg_net` (no Cloudflare)

**Files:** ninguno versionado (se ejecuta vía Supabase MCP `execute_sql`, el secret no se commitea).

- [ ] **Step 1: Habilitar extensiones en TEST**

Vía Supabase MCP `execute_sql` sobre `oyrokyyaeaeqzlsgxtto`:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

- [ ] **Step 2: Agendar el cron en TEST (cada 1 minuto)**

```sql
SELECT cron.schedule(
    'pdf-jobs-drain',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://demo.reportar.app/api/cron/pdf-jobs',
        headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET_DE_TEST>'),
        body := '{}'::jsonb
    );
    $$
);
```
Reemplazar `<CRON_SECRET_DE_TEST>` por el valor real de `CRON_SECRET` del entorno demo/test (`.env.local`) y la URL por el dominio real del worker de test. **No pegar este SQL con el secret real en ningún archivo versionado** — ejecutarlo directo vía MCP o el SQL Editor del dashboard.

- [ ] **Step 3: Verificar que corre**

```sql
SELECT * FROM cron.job_run_details WHERE jobname = 'pdf-jobs-drain' ORDER BY start_time DESC LIMIT 5;
```
Esperado: filas nuevas cada minuto con `status = 'succeeded'`.

- [ ] **Step 4: Repetir Steps 1-3 en PROD** (`fqwhagryqkkhbgznxtwf`), apuntando a `https://live.reportar.app/api/cron/pdf-jobs` (o el dominio que corresponda tras la Fase 0b) con el `CRON_SECRET` de producción.

- [ ] **Step 5: Documentar en `docs/DEUDA_TECNICA.md`**

Agregar una fila: la deuda "Migrar cron jobs de Vercel a Cloudflare" queda resuelta para `pdf-jobs` mediante `pg_cron`+`pg_net` en vez de Cloudflare Cron Triggers (el adaptador de Cloudflare usado no soporta `scheduled()` para Next.js). Si en el futuro se migran los otros crons (`epp-alertas`, etc.), usar el mismo patrón.

---

### Task 10: Verificación end-to-end + cancelar docmaker

- [ ] **Step 1: Subir al menos una plantilla real de prueba**

Copiar un `.docx` de ejemplo (puede ser el mismo `cotizacion_template.docx` que ya existe en `public/templates/`, renombrado) a `public/templates/bubble/cotizacion-bubble.docx` para poder probar el flujo completo antes de tener las plantillas reales de Bubble.

- [ ] **Step 2: Probar el camino feliz (Gotenberg arriba)**

Repetir el `curl` de Task 6 Step 3 con `doc_category: "operativo"`. Confirmar `status: "done"` y que el `pdf_url` abre un PDF válido.

- [ ] **Step 3: Simular una falla de Gotenberg**

Temporalmente setear `GOTENBERG_URL=https://url-invalida.example.com` en `.env.local`, reiniciar `npm run dev`, repetir el `curl`. Confirmar:
- Respuesta `202` con `status: "queued"`.
- En Supabase (TEST), `SELECT * FROM pdf_jobs WHERE entity_type = 'bubble_docx' ORDER BY created_at DESC LIMIT 1;` muestra una fila `pending` con `next_retry_at` ≈ 10s (comercial) o 60s (operativo) en el futuro.
- Restaurar `GOTENBERG_URL` real, esperar a que el cron de Task 9 corra, y verificar que la fila pasa a `done` y que `callback_url` recibió el POST (usar un endpoint de prueba tipo webhook.site como `callback_url` para confirmar la llamada).

- [ ] **Step 4: Probar agotamiento de reintentos**

Con `GOTENBERG_URL` inválida sostenida, esperar a que pasen los 5 reintentos (~4 min para comercial, ~30 min para operativo). Confirmar que la fila termina en `status = 'failed'` y que `callback_url` recibió `{status: "failed"}`.

- [ ] **Step 5: Validación con Bubble real (`version-test`)**

Reconfigurar un workflow de prueba en Bubble `version-test` (API Connector) para llamar a `/api/bubble/pdf/generate` en vez de docmaker, con una plantilla real ya subida (Task 1 del README de plantillas). Confirmar que el documento generado es equivalente al de docmaker, campo a campo, en al menos 3 plantillas.

- [ ] **Step 6: Cancelar docmaker.co**

Solo después de que el punto anterior funcione en producción real (Bubble LIVE, no solo version-test) durante al menos una semana — esto es una decisión del usuario, no un paso automatizable.

---

## Self-review

- **Cobertura del spec:** endpoint bridge ✅ (Task 6), cola con `doc_category`/reintentos ✅ (Tasks 1-3, 7), webhook a Bubble ✅ (Task 5, 7), cron Cloudflare→corregido a `pg_cron`+`pg_net` con justificación técnica explícita ✅ (Task 9), comparación campo a campo antes de cancelar docmaker ✅ (Task 10).
- **Placeholders:** ninguno — cada paso tiene código completo o un comando ejecutable concreto. La única dependencia externa real (las plantillas `.docx` de Bubble) está explícitamente marcada como paso manual del usuario, no como placeholder de código.
- **Consistencia de tipos:** `DocCategory` se define una sola vez (`lib/pdf-retry-schedule.ts`) y se importa en `lib/pdf-queue.ts`, `app/api/bubble/pdf/generate/route.ts` y `app/api/cron/pdf-jobs/route.ts` — no hay una segunda definición del tipo. `renderBubbleDocxPdf(templateKey, data)` tiene la misma firma en Task 4 (definición) y Tasks 6-7 (uso). `enqueuePdfJob` en Task 3 acepta exactamente los campos (`docCategory`, `templateKey`, `payload`, `callbackUrl`) que Task 6 le pasa.
- **Desviación del spec, documentada:** el spec de Fase 0 decía "Cloudflare Cron Trigger"; la investigación de este plan (Task 9) encontró que `@opennextjs/cloudflare@1.20.1` no expone un hook `scheduled()` utilizable, así que se usa `pg_cron`+`pg_net` (patrón ya presente en el repo para `generate_epp_alerts`). Esto no cambia el comportamiento funcional (sigue corriendo cada 1 minuto), solo el mecanismo de disparo.
