import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseContext } from '@/lib/action-context'
import { generateAndStorePdf } from '@/lib/reporte-maquinaria-pdf'
import { createAdminClient } from '@/utils/supabase/admin'
import { enqueuePdfJob, queuedPdfResponse } from '@/lib/pdf-queue'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/reportes-maquinaria/:id/pdf
 *
 * Genera el PDF del reporte de maquinaria y lo retorna inline.
 * También guarda el PDF en storage y actualiza pdf_url en la tabla.
 */
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
            .from('reportes_maquinaria')
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

    try {
        const result = await generateAndStorePdf(id, adminClient, tenantId)
        if (!result) {
            return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
        }

        if (result.cachedUrl) {
            return NextResponse.redirect(result.cachedUrl, 302)
        }

        const { pdf, filename } = result
        return new NextResponse(pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        })
    } catch (e: unknown) {
        console.error('[GET /api/reportes-maquinaria/:id/pdf]', e)
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'reporte_maquinaria',
            entityId: id,
            bucket: 'reporte-maquinaria',
            storagePath: `${tenantId}/rp-maq-${id.slice(-8)}.pdf`,
        })
        return queuedPdfResponse('reporte de maquinaria') as NextResponse
    }
}
