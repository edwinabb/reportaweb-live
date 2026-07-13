import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndStorePdf as genPersonal } from '@/lib/reporte-personal-pdf'
import { generateAndStorePdf as genMaquinaria } from '@/lib/reporte-maquinaria-pdf'
import { generateAndStorePdf as genInspeccion } from '@/lib/inspeccion-pdf'
import { renderPdfFromHtml } from '@/lib/pdf-generator'
import { saveToStorage } from '@/lib/pdf-cache'

const BATCH_SIZE = 10

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createClient(url, key, { auth: { persistSession: false } })

    const { data: jobs, error: fetchErr } = await admin
        .from('pdf_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE)

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!jobs?.length) return NextResponse.json({ processed: 0, message: 'No pending jobs' })

    const results: Array<{ id: string; status: string; error?: string }> = []

    for (const job of jobs) {
        await admin.from('pdf_jobs').update({
            status: 'processing',
            attempts: job.attempts + 1,
            updated_at: new Date().toISOString(),
        }).eq('id', job.id)

        try {
            let pdfUrl: string | null = null

            if (job.entity_type === 'reporte_personal') {
                const result = await genPersonal(job.entity_id, admin as any, job.tenant_id)
                pdfUrl = result?.cachedUrl ?? (result ? 'generated' : null)
            } else if (job.entity_type === 'reporte_maquinaria') {
                const result = await genMaquinaria(job.entity_id, admin as any, job.tenant_id)
                pdfUrl = result?.cachedUrl ?? (result ? 'generated' : null)
            } else if (job.entity_type === 'inspeccion') {
                const result = await genInspeccion(job.entity_id, admin as any, job.tenant_id)
                pdfUrl = result?.cachedUrl ?? (result ? 'generated' : null)
            } else if (job.entity_type === 'cotizacion' && job.html_snapshot) {
                const pdf = await renderPdfFromHtml(job.html_snapshot)
                pdfUrl = await saveToStorage(admin, job.bucket, job.storage_path, Buffer.from(pdf))
                if (pdfUrl) {
                    await admin.from('cotizaciones').update({ pdf_url: pdfUrl, pdf_generado_at: new Date().toISOString() }).eq('id', job.entity_id)
                }
            }
            // For informe and valorizacion: trigger via internal route with cron secret
            else {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
                const path = job.entity_type === 'informe'
                    ? `/api/informes/${job.entity_id}/pdf`
                    : `/api/valorizaciones/${job.entity_id}/pdf`
                const res = await fetch(`${baseUrl}${path}`, {
                    headers: { 'x-cron-pdf-secret': process.env.CRON_SECRET! },
                })
                pdfUrl = res.ok ? 'triggered' : null
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
                await admin.from('pdf_jobs').update({ status: newStatus, last_error: 'No URL returned', updated_at: new Date().toISOString() }).eq('id', job.id)
                results.push({ id: job.id, status: newStatus, error: 'no URL returned' })
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'unknown error'
            const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending'
            await admin.from('pdf_jobs').update({ status: newStatus, last_error: msg, updated_at: new Date().toISOString() }).eq('id', job.id)
            results.push({ id: job.id, status: newStatus, error: msg })
        }
    }

    return NextResponse.json({ processed: jobs.length, results })
}

// Allow GET for schedulers that don't support POST
export async function GET(req: NextRequest) {
    return POST(req)
}
