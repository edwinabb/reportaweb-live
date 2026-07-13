import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseContext } from '@/lib/action-context'
import { tryServeFromCache } from '@/lib/pdf-cache'
import { generateAndStorePdf } from '@/lib/inspeccion-pdf'
import { createAdminClient } from '@/utils/supabase/admin'
import { enqueuePdfJob, queuedPdfResponse } from '@/lib/pdf-queue'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const { id } = await ctx.params

    const cronSecret = _req.headers.get('x-cron-pdf-secret')
    const isCronCall = !!cronSecret && cronSecret === process.env.CRON_SECRET

    let adminClient: SupabaseClient
    let tenantId: string

    if (isCronCall) {
        adminClient = createAdminClient()
        const { data: entity } = await adminClient
            .from('inspecciones')
            .select('tenant_id')
            .eq('id', id)
            .maybeSingle()
        if (!entity?.tenant_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        tenantId = entity.tenant_id
    } else {
        const ctx2 = await getSupabaseContext()
        if (!ctx2.adminClient || !ctx2.tenantId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
        adminClient = ctx2.adminClient
        tenantId = ctx2.tenantId
    }

    // Quick pre-check: serve from cache if PDF already in Supabase Storage
    const { data: existing } = await adminClient
        .from('inspecciones')
        .select('pdf_url')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (!existing) {
        return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 })
    }

    const cached = tryServeFromCache(existing.pdf_url ?? undefined)
    if (cached) return cached

    try {
        const result = await generateAndStorePdf(id, adminClient, tenantId)
        if (!result) {
            return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 })
        }
        if (result.cachedUrl) {
            return tryServeFromCache(result.cachedUrl) ?? NextResponse.redirect(result.cachedUrl)
        }
        const filename = result.filename || `${id}.pdf`
        return new NextResponse(result.pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        })
    } catch (e: unknown) {
        console.error('[GET /api/inspecciones/:id/pdf]', e)
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'inspeccion',
            entityId: id,
            bucket: 'informes-maquinaria',
            storagePath: `${tenantId}/${id}/pdf/${id.slice(-8)}.pdf`,
        })
        return queuedPdfResponse('inspección') as NextResponse
    }
}
