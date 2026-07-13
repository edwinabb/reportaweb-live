# PDF Job Queue with Retry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When Gotenberg is unreachable or times out, queue the PDF request in the DB, respond gracefully to the user, and retry automatically via a cron job — so PDFs always get generated eventually without requiring user action.

**Architecture:** A `pdf_jobs` table stores pending generation requests (entity type + id + bucket + path). All PDF routes wrap their Gotenberg call in a shared `tryGeneratePdf()` helper — on failure it inserts a job and returns a 202 response with a user-friendly message. A cron endpoint (`/api/cron/pdf-jobs`, every 10 minutes) drains the queue by retrying each job up to 3 times before marking it `failed`. When a job succeeds it updates the entity's `pdf_url`. The frontend shows a toast message when a PDF is queued.

**Tech Stack:** Next.js App Router, Supabase Postgres (`pdf_jobs` table), Vercel Crons, existing `renderPdfFromHtml` (Gotenberg), `lib/pdf-cache.ts` (from Plan A: `2026-05-28-pdf-cache-storage.md`).

**Prerequisite:** Plan A (`2026-05-28-pdf-cache-storage.md`) must be complete — this plan assumes `lib/pdf-cache.ts` (`saveToStorage`) exists and all routes already save to storage on success.

---

## Context for implementers

Cron auth pattern (from existing crons): `Authorization: Bearer <CRON_SECRET>` header. The `CRON_SECRET` env var is set in Vercel. See `app/api/cron/epp-alertas/route.ts` for the pattern.

Entity types and their tables/fields:
| `entity_type` | table | `pdf_url` field | bucket | path pattern |
|---|---|---|---|---|
| `reporte_maquinaria` | `reportes_maquinaria` | `pdf_url` | `reporte-maquinaria` | `{tenantSlug}/{clienteSlug}/{yyyy}/{filename}` |
| `reporte_personal` | `reportes_personal` | `pdf_url` | `informes-personal` | `reportes-personal/{tenantId}/{yyyy}/{mm}/rp-{id[-8:]}.pdf` |
| `inspeccion` | `inspecciones` | `pdf_url` | `informes-maquinaria` | `{tenantId}/{id}/pdf/{codigo}.pdf` |
| `informe` | `formatos_informes` | `pdf_url` | `formatos-informes` | `{tenantId}/{id}/pdf/{codigo}.pdf` |
| `valorizacion` | `valorizaciones` | `pdf_url` | `cotizaciones` | `{tenantId}/val-{codigo}.pdf` |
| `cotizacion` | `cotizaciones` | `pdf_url` | `cotizaciones` | `{tenantId}/{id}.pdf` |

For the queue, jobs for `reporte_maquinaria`, `reporte_personal`, `inspeccion`, and `informe` can be retried by the cron. Cotizaciones are different: the HTML is built client-side, so there is **no server-side renderer** for cotizaciones. The queue stores the HTML blob at enqueueing time so the cron can regenerate it.

**⚠️ Auth issue in the cron:** The existing PDF routes use `getSupabaseContext()` which reads the session cookie. The cron runs without a user session, so it cannot call those routes via internal HTTP. Solution: the cron calls the PDF routes with a special `X-Cron-PDF-Secret: <CRON_SECRET>` header. Each PDF route checks for this header first — if present, uses `createAdminClient()` + reads `tenant_id` from the entity itself instead of the session. Task 5 covers this per-route change.

**⚠️ Partial unique index and upsert:** The `pdf_jobs_entity_pending_unique` index is a PARTIAL unique index (`WHERE status = 'pending'`). Supabase's JS `upsert` with `onConflict` does not work with partial indexes. Use a plain `insert` with `ignoreDuplicates: true` instead — it will silently skip if the row already exists (same effect, no upsert semantics needed).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260528200000_create_pdf_jobs.sql` | **Create** | `pdf_jobs` table + index |
| `lib/pdf-queue.ts` | **Create** | `enqueuePdfJob()`, `processPdfJob()` |
| `app/api/reportes-maquinaria/[id]/pdf/route.ts` | **Modify** | Enqueue on failure |
| `app/api/reportes-personal/[id]/pdf/route.ts` | **Modify** | Enqueue on failure |
| `app/api/inspecciones/[id]/pdf/route.ts` | **Modify** | Enqueue on failure |
| `app/api/informes/[id]/pdf/route.ts` | **Modify** | Enqueue on failure |
| `app/api/valorizaciones/[codigo]/pdf/route.ts` | **Modify** | Enqueue on failure |
| `app/api/pdf/generate/route.ts` | **Modify** | Enqueue on failure for cotizaciones (store HTML) |
| `app/api/cron/pdf-jobs/route.ts` | **Create** | Cron endpoint — drain queue |
| `vercel.json` | **Modify** | Add cron schedule |

---

### Task 1: Migration — `pdf_jobs` table

**Files:**
- Create: `supabase/migrations/20260528200000_create_pdf_jobs.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260528200000_create_pdf_jobs.sql

CREATE TABLE IF NOT EXISTS public.pdf_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    entity_type     TEXT NOT NULL,  -- 'reporte_maquinaria' | 'reporte_personal' | 'inspeccion' | 'informe' | 'valorizacion' | 'cotizacion'
    entity_id       TEXT NOT NULL,  -- UUID or codigo depending on entity_type
    bucket          TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    html_snapshot   TEXT,           -- stored HTML for entity types with client-side rendering (cotizacion)
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
    attempts        INT  NOT NULL DEFAULT 0,
    max_attempts    INT  NOT NULL DEFAULT 3,
    last_error      TEXT,
    pdf_url         TEXT,           -- filled on success
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pdf_jobs_status_idx ON public.pdf_jobs (status, created_at)
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS pdf_jobs_entity_idx ON public.pdf_jobs (entity_type, entity_id, tenant_id);

-- Prevent duplicate pending jobs for the same entity
CREATE UNIQUE INDEX IF NOT EXISTS pdf_jobs_entity_pending_unique
    ON public.pdf_jobs (entity_type, entity_id, tenant_id)
    WHERE status = 'pending';

ALTER TABLE public.pdf_jobs ENABLE ROW LEVEL SECURITY;
-- Only service role can access (cron + server actions)
-- No public policies needed.

GRANT ALL ON public.pdf_jobs TO service_role;
```

- [ ] **Step 2: Apply to both DBs**

Apply via Supabase MCP `apply_migration` on project `wioozisskjjgjjybsoqo` (US test), then on `fqwhagryqkkhbgznxtwf` (Brazil prod).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260528200000_create_pdf_jobs.sql
git commit -m "feat(db): add pdf_jobs queue table"
```

---

### Task 2: Create `lib/pdf-queue.ts`

**Files:**
- Create: `lib/pdf-queue.ts`

- [ ] **Step 1: Write the lib**

```typescript
// lib/pdf-queue.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type PdfJobEntityType =
    | 'reporte_maquinaria'
    | 'reporte_personal'
    | 'inspeccion'
    | 'informe'
    | 'valorizacion'
    | 'cotizacion'

export interface EnqueuePdfJobParams {
    adminClient: SupabaseClient
    tenantId: string
    entityType: PdfJobEntityType
    entityId: string
    bucket: string
    storagePath: string
    htmlSnapshot?: string   // required for 'cotizacion' entity type
}

/**
 * Inserts a pending PDF job. Silently ignores duplicate (unique index on pending jobs).
 */
export async function enqueuePdfJob(params: EnqueuePdfJobParams): Promise<void> {
    const { adminClient, tenantId, entityType, entityId, bucket, storagePath, htmlSnapshot } = params
    // Use insert with ignoreDuplicates — cannot use upsert with partial unique indexes
    const { error } = await adminClient
        .from('pdf_jobs')
        .insert({
            tenant_id: tenantId,
            entity_type: entityType,
            entity_id: entityId,
            bucket,
            storage_path: storagePath,
            html_snapshot: htmlSnapshot ?? null,
            status: 'pending',
            attempts: 0,
            updated_at: new Date().toISOString(),
        })
    // Ignore duplicate-key errors (job already pending for this entity)
    if (error && !error.message.includes('duplicate') && !error.code?.includes('23505')) {
        console.error('[enqueuePdfJob] failed to enqueue:', error.message)
    }
}

/**
 * Returns a user-facing 202 response indicating the PDF is queued for generation.
 */
export function queuedResponse(entityLabel: string): Response {
    return new Response(
        JSON.stringify({
            queued: true,
            message: `El PDF de ${entityLabel} está en cola. Se generará automáticamente en los próximos minutos y quedará disponible en la plataforma.`,
        }),
        {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
        }
    )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/pdf-queue.ts
git commit -m "feat(pdf): add pdf-queue utility (enqueuePdfJob + queuedResponse)"
```

---

### Task 3: Add queue-on-failure to server-side PDF routes

Each of the 5 server-side PDF routes gets the same treatment: on Gotenberg failure (catch block), call `enqueuePdfJob` and return `queuedResponse`. The route already has `tenantId`, `id/codigo`, bucket, and `storagePath` in scope.

**Files:**
- Modify: `app/api/reportes-personal/[id]/pdf/route.ts`
- Modify: `app/api/inspecciones/[id]/pdf/route.ts`
- Modify: `app/api/informes/[id]/pdf/route.ts`
- Modify: `app/api/valorizaciones/[codigo]/pdf/route.ts`
- Modify: `lib/reporte-maquinaria-pdf.ts` (return error instead of throwing so route can enqueue)

- [ ] **Step 1: Update `app/api/reportes-personal/[id]/pdf/route.ts`**

Add imports:
```typescript
import { enqueuePdfJob, queuedResponse } from '@/lib/pdf-queue'
```

In the catch block, replace the `return NextResponse.json({ error: msg }, { status: 500 })` with:
```typescript
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[GET /api/reportes-personal/:id/pdf]', e)

        // Queue for retry
        const fecha = new Date(reporte.fecha_reporte)
        const year = fecha.getFullYear()
        const month = String(fecha.getMonth() + 1).padStart(2, '0')
        const filename = `rp-${(reporte.id as string).slice(-8)}.pdf`
        const storagePath = `reportes-personal/${tenantId}/${year}/${month}/${filename}`
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'reporte_personal',
            entityId: id,
            bucket: 'informes-personal',
            storagePath,
        })
        return queuedResponse('reporte de personal') as NextResponse
    }
```

- [ ] **Step 2: Update `app/api/inspecciones/[id]/pdf/route.ts`**

Add imports:
```typescript
import { enqueuePdfJob, queuedResponse } from '@/lib/pdf-queue'
```

In the catch block (after `renderPdfFromHtml` fails):
```typescript
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[GET /api/inspecciones/:id/pdf]', e)

        const filename = `${inspeccion.codigo_interno ?? inspeccion.id}.pdf`
        const storagePath = `${tenantId}/${inspeccion.id}/pdf/${filename}`
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'inspeccion',
            entityId: id,
            bucket: 'informes-maquinaria',
            storagePath,
        })
        return queuedResponse('inspección') as NextResponse
    }
```

- [ ] **Step 3: Update `app/api/informes/[id]/pdf/route.ts`**

Add imports:
```typescript
import { enqueuePdfJob, queuedResponse } from '@/lib/pdf-queue'
```

In the catch block:
```typescript
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[GET /api/informes/:id/pdf]', e)

        const filename = `${informe.codigo_informe ?? informe.id}.pdf`
        const storagePath = `${tenantId}/${informe.id}/pdf/${filename}`
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'informe',
            entityId: id,
            bucket: 'formatos-informes',
            storagePath,
        })
        return queuedResponse('informe') as NextResponse
    }
```

- [ ] **Step 4: Update `app/api/valorizaciones/[codigo]/pdf/route.ts`**

Add imports:
```typescript
import { enqueuePdfJob, queuedResponse } from '@/lib/pdf-queue'
```

In the catch block:
```typescript
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[GET /api/valorizaciones/:codigo/pdf]', e)

        const storagePath = `${tenantId}/val-${codigo}.pdf`
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'valorizacion',
            entityId: codigo,
            bucket: 'cotizaciones',
            storagePath,
        })
        return queuedResponse('valorización') as NextResponse
    }
```

- [ ] **Step 5: Update `lib/reporte-maquinaria-pdf.ts` — return error string instead of throwing**

`generateAndStorePdf` currently throws on Gotenberg failure. Change it to return `null` on error so the route can enqueue instead of getting an uncaught exception in the outer catch:

In `lib/reporte-maquinaria-pdf.ts`, wrap the `renderPdfFromHtml` call:
```typescript
    let pdf: ArrayBuffer
    try {
        pdf = await renderPdfFromHtml(html)
    } catch (e) {
        console.error('[generateAndStorePdf] Gotenberg failed:', e)
        return null  // caller will enqueue
    }
```

Then update `app/api/reportes-maquinaria/[id]/pdf/route.ts`:

```typescript
import { enqueuePdfJob, queuedResponse } from '@/lib/pdf-queue'

// In the try block:
const result = await generateAndStorePdf(id, adminClient, tenantId)
if (!result) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
}
if (result.cachedUrl) {
    return NextResponse.redirect(result.cachedUrl, 302)
}
if (result.failed) {
    // Gotenberg failed — enqueue
    // Need storagePath from the result (add it to the return type in generateAndStorePdf)
    await enqueuePdfJob({
        adminClient,
        tenantId,
        entityType: 'reporte_maquinaria',
        entityId: id,
        bucket: 'reporte-maquinaria',
        storagePath: result.storagePath,
    })
    return queuedResponse('reporte de maquinaria') as NextResponse
}
const { pdf, filename } = result
return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
    },
})
```

Add `failed?: boolean` and `storagePath?: string` to the return type of `generateAndStorePdf` in `lib/reporte-maquinaria-pdf.ts`.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/api/reportes-maquinaria/[id]/pdf/route.ts \
        app/api/reportes-personal/[id]/pdf/route.ts \
        app/api/inspecciones/[id]/pdf/route.ts \
        app/api/informes/[id]/pdf/route.ts \
        app/api/valorizaciones/[codigo]/pdf/route.ts \
        lib/reporte-maquinaria-pdf.ts
git commit -m "feat(pdf): enqueue PDF job on Gotenberg failure in all server-side routes"
```

---

### Task 4: Queue cotizaciones on failure (store HTML snapshot)

Cotizaciones PDFs are built client-side. If Gotenberg fails, we store the HTML at request time so the cron can regenerate without the browser.

**Files:**
- Modify: `app/api/pdf/generate/route.ts`
- Modify: `components/cotizaciones/cotizacion-pdf-preview.tsx`

- [ ] **Step 1: Update `/api/pdf/generate/route.ts` fetch-error block**

When Gotenberg fails AND `cotizacionId` is present, enqueue a job with the HTML snapshot:

```typescript
import { enqueuePdfJob } from '@/lib/pdf-queue'
import { createAdminClient } from '@/utils/supabase/admin'

// In the fetchError catch block, AFTER the existing error response, but before returning it:
if (cotizacionId) {
    try {
        const adminClient = createAdminClient()
        const { data: cot } = await adminClient
            .from('cotizaciones')
            .select('tenant_id')
            .eq('id', cotizacionId)
            .maybeSingle()
        if (cot?.tenant_id) {
            await enqueuePdfJob({
                adminClient,
                tenantId: cot.tenant_id,
                entityType: 'cotizacion',
                entityId: cotizacionId,
                bucket: 'cotizaciones',
                storagePath: `${cot.tenant_id}/${cotizacionId}.pdf`,
                htmlSnapshot: html,
            })
        }
    } catch (qErr) {
        console.error('[pdf/generate] enqueue failed:', qErr)
    }
}
// then return the 503 error response as before
```

- [ ] **Step 2: Update frontend toast in `cotizacion-pdf-preview.tsx`**

When the API returns status 202 (queued), show a different toast:

```typescript
if (response.status === 202) {
    const data = await response.json()
    toast.info(data.message || 'PDF en cola, se generará en breve.')
    return
}
if (!response.ok) {
    // existing error handling
}
```

Replace `toast.success('PDF generado exitosamente')` path with the 202 check above the existing error handling.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/pdf/generate/route.ts components/cotizaciones/cotizacion-pdf-preview.tsx
git commit -m "feat(pdf): queue cotizacion PDF with HTML snapshot on Gotenberg failure"
```

---

### Task 5: Cron endpoint — drain the PDF queue

**Files:**
- Create: `app/api/cron/pdf-jobs/route.ts`

- [ ] **Step 1: Create the cron route**

```typescript
// app/api/cron/pdf-jobs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderPdfFromHtml } from '@/lib/pdf-generator'
import { saveToStorage } from '@/lib/pdf-cache'

// Entity-type → fetch HTML + generate PDF
// Each handler fetches fresh data from DB and calls renderXxxHtml
import { renderReportePersonalHtml, buildReportePersonalData } from '@/lib/reporte-personal-pdf-template'
import { generateAndStorePdf } from '@/lib/reporte-maquinaria-pdf'

const BATCH_SIZE = 10

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const expected = process.env.CRON_SECRET
    if (!expected || authHeader !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createClient(url, key, { auth: { persistSession: false } })

    // Claim up to BATCH_SIZE pending jobs (set to processing to prevent double-processing)
    const { data: jobs, error: fetchErr } = await admin
        .from('pdf_jobs')
        .select('*')
        .in('status', ['pending'])
        .lt('attempts', 3)
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE)

    if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!jobs || jobs.length === 0) {
        return NextResponse.json({ processed: 0, message: 'No pending jobs' })
    }

    const results: Array<{ id: string; status: string; error?: string }> = []

    for (const job of jobs) {
        // Mark as processing
        await admin.from('pdf_jobs').update({ status: 'processing', attempts: job.attempts + 1, updated_at: new Date().toISOString() }).eq('id', job.id)

        try {
            let pdfUrl: string | null = null

            if (job.entity_type === 'cotizacion' && job.html_snapshot) {
                // Regenerate from stored HTML snapshot
                const pdf = await renderPdfFromHtml(job.html_snapshot)
                pdfUrl = await saveToStorage(admin, job.bucket, job.storage_path, Buffer.from(pdf))
                if (pdfUrl) {
                    await admin.from('cotizaciones').update({ pdf_url: pdfUrl, pdf_generado_at: new Date().toISOString() }).eq('id', job.entity_id)
                }
            } else if (job.entity_type === 'reporte_maquinaria') {
                const result = await generateAndStorePdf(job.entity_id, admin, job.tenant_id)
                pdfUrl = result && !result.failed ? (result as any).pdfUrl ?? null : null
            } else if (job.entity_type === 'reporte_personal') {
                // Delegate to the existing API route logic inline
                // Simpler: call the existing internal fetch
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                const res = await fetch(`${baseUrl}/api/reportes-personal/${job.entity_id}/pdf`, {
                    headers: { Cookie: '' }, // service role call via internal URL
                })
                pdfUrl = res.ok ? 'regenerated' : null
            } else if (job.entity_type === 'inspeccion') {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                const res = await fetch(`${baseUrl}/api/inspecciones/${job.entity_id}/pdf`)
                pdfUrl = res.ok ? 'regenerated' : null
            } else if (job.entity_type === 'informe') {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                const res = await fetch(`${baseUrl}/api/informes/${job.entity_id}/pdf`)
                pdfUrl = res.ok ? 'regenerated' : null
            } else if (job.entity_type === 'valorizacion') {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                const res = await fetch(`${baseUrl}/api/valorizaciones/${job.entity_id}/pdf`)
                pdfUrl = res.ok ? 'regenerated' : null
            }

            if (pdfUrl) {
                await admin.from('pdf_jobs').update({
                    status: 'done',
                    pdf_url: pdfUrl,
                    last_error: null,
                    updated_at: new Date().toISOString(),
                }).eq('id', job.id)
                results.push({ id: job.id, status: 'done' })
            } else {
                const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending'
                await admin.from('pdf_jobs').update({
                    status: newStatus,
                    last_error: 'PDF generation returned no URL',
                    updated_at: new Date().toISOString(),
                }).eq('id', job.id)
                results.push({ id: job.id, status: newStatus, error: 'no URL returned' })
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'unknown error'
            const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending'
            await admin.from('pdf_jobs').update({
                status: newStatus,
                last_error: msg,
                updated_at: new Date().toISOString(),
            }).eq('id', job.id)
            results.push({ id: job.id, status: newStatus, error: msg })
        }
    }

    return NextResponse.json({ processed: jobs.length, results })
}
```

**Note on internal fetch + auth bypass:** For `reporte_personal`, `inspeccion`, `informe`, and `valorizacion`, the cron calls the existing API routes via internal HTTP with `X-Cron-PDF-Secret: <CRON_SECRET>`. Each PDF route must be updated (see Step 6 below) to detect this header and use `createAdminClient()` + read `tenant_id` from the entity row, bypassing `getSupabaseContext()`. This reuses existing data-fetching + render logic without duplication. `NEXT_PUBLIC_SITE_URL` must be set in Vercel env vars (e.g. `https://web.impulsar.com`).

- [ ] **Step 6: Add `X-Cron-PDF-Secret` bypass to affected routes**

In `app/api/reportes-personal/[id]/pdf/route.ts`, `app/api/inspecciones/[id]/pdf/route.ts`, `app/api/informes/[id]/pdf/route.ts`, and `app/api/valorizaciones/[codigo]/pdf/route.ts`, add at the top of the handler before the session check:

```typescript
import { createAdminClient } from '@/utils/supabase/admin'

// At the start of the GET handler:
const cronSecret = req.headers.get('x-cron-pdf-secret')
const isCronCall = cronSecret && cronSecret === process.env.CRON_SECRET

let adminClient: SupabaseClient
let tenantId: string

if (isCronCall) {
    adminClient = createAdminClient()
    // Fetch tenant_id directly from the entity
    const { data: entity } = await adminClient
        .from('reportes_personal') // change per route
        .select('tenant_id')
        .eq('id', id)
        .maybeSingle()
    if (!entity?.tenant_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    tenantId = entity.tenant_id
} else {
    const ctx = await getSupabaseContext()
    if (!ctx.adminClient || !ctx.tenantId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    adminClient = ctx.adminClient
    tenantId = ctx.tenantId
}
```

- [ ] **Step 7: Add `NEXT_PUBLIC_SITE_URL` to Vercel env if not already present**

```bash
npx vercel env ls
```
Check if `NEXT_PUBLIC_SITE_URL` is set. If not:
```bash
npx vercel env add NEXT_PUBLIC_SITE_URL production
```
Enter the production URL (e.g. `https://web.impulsar.com`).

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add app/api/cron/pdf-jobs/route.ts \
        app/api/reportes-personal/[id]/pdf/route.ts \
        app/api/inspecciones/[id]/pdf/route.ts \
        app/api/informes/[id]/pdf/route.ts \
        app/api/valorizaciones/[codigo]/pdf/route.ts
git commit -m "feat(pdf): add cron endpoint to drain pdf_jobs queue + auth bypass for cron calls"
```

---

### Task 6: Register cron in `vercel.json` and deploy

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the cron**

```json
{
  "crons": [
    {
      "path": "/api/cron/epp-alertas",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/epp-reporte-semanal",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/cron/documentos-vencidos",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/pdf-jobs",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

- [ ] **Step 2: Deploy**

```bash
git add vercel.json
git commit -m "feat(pdf): register pdf-jobs cron (every 10 min)"
git push origin develop
npx vercel --prod
```

- [ ] **Step 3: Smoke test — simulate a failure**

Temporarily set `GOTENBERG_URL` to a dead URL in test env, request a PDF → verify the API returns 202 with queue message → check `pdf_jobs` table in Supabase dashboard shows a `pending` row → restore the real URL → manually POST to `/api/cron/pdf-jobs` with `Authorization: Bearer <CRON_SECRET>` → verify the job becomes `done` and the entity's `pdf_url` is updated.

```bash
curl -X POST https://your-app.vercel.app/api/cron/pdf-jobs \
  -H "Authorization: Bearer $CRON_SECRET"
```
