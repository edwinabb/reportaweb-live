# PDF Cache Storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every PDF route saves its result to Supabase Storage and serves the cached version on subsequent requests, eliminating redundant Gotenberg calls.

**Architecture:** Each PDF route checks if `entity.pdf_url` already points to Supabase Storage — if so, it redirects there directly. On first generation (or when cache is stale), it generates via Gotenberg, saves to the correct bucket, updates `pdf_url`, then returns the bytes. A shared `lib/pdf-cache.ts` utility centralises the cache-check and save logic so every route uses the same pattern.

**Tech Stack:** Next.js App Router (API routes), Supabase Storage (JS client), existing `renderPdfFromHtml` (Gotenberg), TypeScript.

---

## Context for implementers

This project has two Supabase DBs:
- **US (test):** `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- **Brazil (prod):** `CLOUD_SUPABASE_URL` / `CLOUD_SUPABASE_ROLE_KEY`

All PDF routes use `getSupabaseContext()` or `getTenantContext()` which returns `adminClient` (service role) scoped to the correct DB. Never hardcode Supabase URLs.

Existing PDF routes that already save to storage (need cache-serve added only):
- `app/api/reportes-maquinaria/[id]/pdf/route.ts` → bucket `reporte-maquinaria`
- `app/api/reportes-personal/[id]/pdf/route.ts` → bucket `informes-personal`
- `app/api/inspecciones/[id]/pdf/route.ts` → bucket `informes-maquinaria`
- `app/api/informes/[id]/pdf/route.ts` → bucket `formatos-informes`

Existing PDF routes that do NOT save to storage (need both save and cache-serve):
- `app/api/valorizaciones/[codigo]/pdf/route.ts` — no `pdf_url` column yet
- `app/api/pdf/generate/route.ts` — used by cotizaciones browser component

EPP entregas already saves to `epp-entregas` bucket (server action `lib/actions/epp.ts:generateEppEntregaPdf`). Bucket was just created; no code changes needed there.

Bucket list (confirmed existing in both DBs):
`reporte-maquinaria`, `informes-personal`, `informes-maquinaria`, `formatos-informes`, `epp-entregas`, `cotizaciones`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/pdf-cache.ts` | **Create** | `isSuabaseStorageUrl()`, `tryServeFromCache()`, `saveToStorage()` |
| `supabase/migrations/20260528100000_add_pdf_url_valorizaciones.sql` | **Create** | Add `pdf_url TEXT` to `valorizaciones` table |
| `app/api/valorizaciones/[codigo]/pdf/route.ts` | **Modify** | Add storage save + cache serve |
| `app/api/pdf/generate/route.ts` | **Modify** | Accept optional `cotizacionId`, save to `cotizaciones` bucket |
| `components/cotizaciones/cotizacion-pdf-preview.tsx` | **Modify** | Pass `cotizacionId` in the fetch body |
| `app/api/reportes-maquinaria/[id]/pdf/route.ts` | **Modify** | Add cache-serve (redirect if Supabase URL already stored) |
| `app/api/reportes-personal/[id]/pdf/route.ts` | **Modify** | Add cache-serve |
| `app/api/inspecciones/[id]/pdf/route.ts` | **Modify** | Add cache-serve |
| `app/api/informes/[id]/pdf/route.ts` | **Modify** | Add cache-serve |

---

### Task 1: Migration — add `pdf_url` to `valorizaciones`

**Files:**
- Create: `supabase/migrations/20260528100000_add_pdf_url_valorizaciones.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260528100000_add_pdf_url_valorizaciones.sql
ALTER TABLE public.valorizaciones
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generado_at TIMESTAMPTZ;
```

- [ ] **Step 2: Apply to US (test) DB**

Run:
```bash
npx dotenvx run -- npx supabase db push --db-url "$NEXT_PUBLIC_SUPABASE_URL"
```
Or apply manually via Supabase MCP `apply_migration` on project `wioozisskjjgjjybsoqo`.

- [ ] **Step 3: Apply to Brazil (prod) DB**

Apply via Supabase MCP `apply_migration` on project `fqwhagryqkkhbgznxtwf`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260528100000_add_pdf_url_valorizaciones.sql
git commit -m "feat(db): add pdf_url to valorizaciones table"
```

---

### Task 2: Create `lib/pdf-cache.ts` utility

**Files:**
- Create: `lib/pdf-cache.ts`

- [ ] **Step 1: Write the utility**

```typescript
// lib/pdf-cache.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SUPABASE_STORAGE_HOST_PATTERN = /\.supabase\.co\/storage\/v1\/object\/(public|sign)\//

/**
 * Returns true if the URL is already stored in Supabase Storage (not Bubble CDN or S3).
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
    if (!url) return false
    return SUPABASE_STORAGE_HOST_PATTERN.test(url)
}

/**
 * If the entity already has a valid Supabase Storage URL, returns a redirect response.
 * Otherwise returns null (caller should generate the PDF).
 */
export function tryServeFromCache(pdfUrl: string | null | undefined): NextResponse | null {
    if (!isSupabaseStorageUrl(pdfUrl)) return null
    return NextResponse.redirect(pdfUrl!, 302)
}

/**
 * Uploads PDF bytes to Supabase Storage and returns the public URL.
 * Returns null on failure (caller should still return the PDF bytes to the user).
 */
export async function saveToStorage(
    adminClient: SupabaseClient,
    bucket: string,
    storagePath: string,
    pdfBytes: ArrayBuffer | Buffer,
): Promise<string | null> {
    const bytes = pdfBytes instanceof Buffer ? pdfBytes : Buffer.from(pdfBytes)
    const { error } = await adminClient.storage
        .from(bucket)
        .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true })
    if (error) {
        console.error(`[saveToStorage] upload failed bucket=${bucket} path=${storagePath}:`, error.message)
        return null
    }
    const { data } = adminClient.storage.from(bucket).getPublicUrl(storagePath)
    return data.publicUrl
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to `lib/pdf-cache.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/pdf-cache.ts
git commit -m "feat(pdf): add pdf-cache utility for storage cache-serve"
```

---

### Task 3: Add storage save to valorizaciones route

**Files:**
- Modify: `app/api/valorizaciones/[codigo]/pdf/route.ts`

The current route (lines 159–172) generates the PDF and returns it with no storage save. Add save + cache-serve using the new utility.

- [ ] **Step 1: Modify the route**

Replace the `try` block at the end of the route (starting around line 159) with:

```typescript
    // Check cache first
    const firstRow = valoraciones[0] as any
    const cachedUrl = firstRow?.pdf_url ?? null
    const cached = tryServeFromCache(cachedUrl)
    if (cached) return cached

    const html = renderValorizacionVentaHtml({ /* existing args unchanged */ })

    try {
        const pdf = await renderPdfFromHtml(html)

        // Save to storage
        const filename = `val-${codigo}.pdf`
        const storagePath = `${tenantId}/${filename}`
        const publicUrl = await saveToStorage(adminClient, 'cotizaciones', storagePath, Buffer.from(pdf))
        if (publicUrl) {
            // Update pdf_url on all rows with this codigo
            await adminClient
                .from('valorizaciones')
                .update({ pdf_url: publicUrl, pdf_generado_at: new Date().toISOString() })
                .eq('tenant_id', tenantId)
                .eq('codigo', codigo)
        }

        return new NextResponse(pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="valorizacion-${codigo}.pdf"`,
            },
        })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[GET /api/valorizaciones/:codigo/pdf]', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
```

Add imports at the top of the file:
```typescript
import { tryServeFromCache, saveToStorage } from '@/lib/pdf-cache'
```

Note: the cache check needs `pdf_url` from the first valorizacion row. Add `pdf_url` to the select query:
```typescript
.select('pdf_url, *, reporte:reportes_maquinaria!...')
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/valorizaciones/[codigo]/pdf/route.ts
git commit -m "feat(pdf): save valorizaciones PDF to storage + serve from cache"
```

---

### Task 4: Save cotizaciones PDFs to storage via `/api/pdf/generate`

**Files:**
- Modify: `app/api/pdf/generate/route.ts`
- Modify: `components/cotizaciones/cotizacion-pdf-preview.tsx`

The cotizacion PDF is generated from the browser: the component builds HTML client-side and POSTs it to `/api/pdf/generate`. We add an optional `cotizacionId` field. When present, the route saves the PDF to the `cotizaciones` bucket and updates `cotizaciones.pdf_url`.

- [ ] **Step 1: Modify `/api/pdf/generate/route.ts`**

The route receives `{ html, footerHtml }`. Change it to also accept `cotizacionId`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { saveToStorage } from '@/lib/pdf-cache'

export async function POST(req: NextRequest) {
    try {
        const { html, footerHtml, cotizacionId } = await req.json()

        if (!html) {
            return NextResponse.json({ error: 'HTML content is required' }, { status: 400 })
        }

        const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host'

        const form = new FormData()
        form.append('files', new Blob([html], { type: 'text/html' }), 'index.html')
        if (footerHtml) {
            form.append('files', new Blob([footerHtml], { type: 'text/html' }), 'footer.html')
        }
        form.append('marginTop', '0.39in')
        form.append('marginBottom', '0.59in')
        form.append('marginLeft', '0.39in')
        form.append('marginRight', '0.39in')
        form.append('emulatedMediaType', 'screen')
        form.append('scale', '1.0')

        let response: Response
        try {
            response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
                method: 'POST',
                body: form,
                signal: AbortSignal.timeout(30000),
            })
        } catch (fetchError: unknown) {
            const isTimeout = fetchError instanceof Error &&
                (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError')
            return NextResponse.json({
                error: isTimeout
                    ? 'El servicio de PDF no respondió a tiempo. Por favor intenta nuevamente.'
                    : 'No se pudo conectar al servicio de PDF. Contacta al administrador.',
            }, { status: 503 })
        }

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json({ error: `Gotenberg failed: ${errorText}` }, { status: response.status })
        }

        const pdfArrayBuffer = await response.arrayBuffer()

        // Save to storage if cotizacionId provided
        if (cotizacionId) {
            try {
                const adminClient = createAdminClient()
                const { data: cot } = await adminClient
                    .from('cotizaciones')
                    .select('tenant_id')
                    .eq('id', cotizacionId)
                    .maybeSingle()
                if (cot?.tenant_id) {
                    const storagePath = `${cot.tenant_id}/${cotizacionId}.pdf`
                    const publicUrl = await saveToStorage(adminClient, 'cotizaciones', storagePath, Buffer.from(pdfArrayBuffer))
                    if (publicUrl) {
                        await adminClient
                            .from('cotizaciones')
                            .update({ pdf_url: publicUrl, pdf_generado_at: new Date().toISOString() })
                            .eq('id', cotizacionId)
                    }
                }
            } catch (saveErr) {
                console.error('[pdf/generate] storage save failed:', saveErr)
                // Non-fatal: still return PDF to user
            }
        }

        return new NextResponse(pdfArrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="cotizacion.pdf"',
            },
        })
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Internal Server Error'
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
}
```

- [ ] **Step 2: Modify `cotizacion-pdf-preview.tsx` to pass `cotizacionId`**

In the `fetch('/api/pdf/generate', ...)` call (around line 212), add `cotizacionId` to the body:

```typescript
body: JSON.stringify({ html: htmlContent, footerHtml, cotizacionId: cotizacion.id }),
```

The `cotizacion` prop is already available in the component (it has `cotizacion.id`).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/pdf/generate/route.ts components/cotizaciones/cotizacion-pdf-preview.tsx
git commit -m "feat(pdf): save cotizaciones PDF to storage after generation"
```

---

### Task 5: Add cache-serve to existing routes (maquinaria, personal, inspecciones, informes)

These routes already save to storage but never check the cache before regenerating. This task adds the cache check at the start of each route.

**Files:**
- Modify: `app/api/reportes-maquinaria/[id]/pdf/route.ts`
- Modify: `app/api/reportes-personal/[id]/pdf/route.ts`
- Modify: `app/api/inspecciones/[id]/pdf/route.ts`
- Modify: `app/api/informes/[id]/pdf/route.ts`
- Modify: `lib/reporte-maquinaria-pdf.ts`

**Pattern for all routes:** After loading the entity from DB, check `entity.pdf_url` before generating.

- [ ] **Step 1: Update `lib/reporte-maquinaria-pdf.ts` to accept `existingPdfUrl`**

The function `generateAndStorePdf(id, adminClient, tenantId)` is called from the route. Add a cache-check return type so the route can redirect:

```typescript
// Add to the return type in generateAndStorePdf:
export async function generateAndStorePdf(
    id: string,
    adminClient: SupabaseClient,
    tenantId: string,
): Promise<{ pdf: ArrayBuffer; filename: string; cachedUrl?: string } | null> {
```

At the start of `generateAndStorePdf`, after loading `reporte`, add:
```typescript
import { isSupabaseStorageUrl } from './pdf-cache'

// Inside generateAndStorePdf, after loading reporte:
if (isSupabaseStorageUrl(reporte.pdf_url)) {
    return { pdf: new ArrayBuffer(0), filename: '', cachedUrl: reporte.pdf_url }
}
```

- [ ] **Step 2: Update `app/api/reportes-maquinaria/[id]/pdf/route.ts`**

```typescript
import { tryServeFromCache } from '@/lib/pdf-cache'

// In the try block, after getting result:
const result = await generateAndStorePdf(id, adminClient, tenantId)
if (!result) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
}
if (result.cachedUrl) {
    return NextResponse.redirect(result.cachedUrl, 302)
}
const { pdf, filename } = result
return new NextResponse(pdf as unknown as BodyInit, { ... })
```

- [ ] **Step 3: Update `app/api/reportes-personal/[id]/pdf/route.ts`**

Add after loading `reporte` (line ~40, after the 404 check):
```typescript
import { tryServeFromCache } from '@/lib/pdf-cache'

// After: if (repErr || !reporte) { return 404 }
const cached = tryServeFromCache(reporte.pdf_url)
if (cached) return cached
```

- [ ] **Step 4: Update `app/api/inspecciones/[id]/pdf/route.ts`**

Add after loading `inspeccion` (after the 404 check):
```typescript
import { tryServeFromCache } from '@/lib/pdf-cache'

const cached = tryServeFromCache(inspeccion.pdf_url)
if (cached) return cached
```

- [ ] **Step 5: Update `app/api/informes/[id]/pdf/route.ts`**

Add after loading `informe` (after the 404 check):
```typescript
import { tryServeFromCache } from '@/lib/pdf-cache'

const cached = tryServeFromCache(informe.pdf_url)
if (cached) return cached
```

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
        lib/reporte-maquinaria-pdf.ts
git commit -m "feat(pdf): serve from Supabase cache before regenerating in all PDF routes"
```

---

### Task 6: Update memory and deploy

- [ ] **Step 1: Update storage bucket memory**

In `C:\Users\Usuario\.claude\projects\C--Proyectos-impulsarweb\memory\reference_storage_buckets.md`, add:

```markdown
## Valorizaciones
| Campo | Bucket | Path pattern |
|---|---|---|
| `valorizaciones.pdf_url` | `cotizaciones` | `{tenantId}/val-{codigo}.pdf` |

## Cotizaciones
| Campo | Bucket | Path pattern |
|---|---|---|
| `cotizaciones.pdf_url` | `cotizaciones` | `{tenantId}/{cotizacionId}.pdf` |
> PDF generado desde browser (cotizacion-pdf-preview.tsx) vía /api/pdf/generate con cotizacionId.

## EPP Entregas
| Campo | Bucket | Path pattern |
|---|---|---|
| `sst_epp_entrega.pdf_url` | `epp-entregas` | `{tenantId}/{entregaId}.pdf` |
> Bucket privado — usa signedUrl de 30 días. Bucket creado 2026-05-28.
```

- [ ] **Step 2: Push and deploy**

```bash
git push origin develop
npx vercel --prod
```

- [ ] **Step 3: Smoke test**

Open a cotización in the app → click "Generar PDF" → download succeeds → check `cotizaciones.pdf_url` in Supabase dashboard is now a `supabase.co/storage` URL. Repeat for a valorizacion.

Open a reporte de maquinaria PDF → check browser network tab shows redirect to storage URL (no Gotenberg call).
