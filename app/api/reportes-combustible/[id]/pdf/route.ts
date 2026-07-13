import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseContext } from '@/lib/action-context'
import { generateAndStoreCombustiblePdf } from '@/lib/reporte-combustible-pdf'
import { tryServeFromCache } from '@/lib/pdf-cache'
import { createAdminClient } from '@/utils/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params

    let adminClient: SupabaseClient
    let tenantId: string

    const ctx2 = await getSupabaseContext()
    if (!ctx2.adminClient || !ctx2.tenantId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    adminClient = ctx2.adminClient
    tenantId = ctx2.tenantId

    const { data: rep } = await adminClient
        .from('reportes_combustible')
        .select('pdf_url')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (!rep) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

    const cached = tryServeFromCache(rep.pdf_url ?? undefined)
    if (cached) return cached

    try {
        const result = await generateAndStoreCombustiblePdf(id, adminClient, tenantId)
        if (!result) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
        if (result.cachedUrl) return NextResponse.redirect(result.cachedUrl, 302)
        const { pdf, filename } = result
        return new NextResponse(pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        })
    } catch (e: unknown) {
        console.error('[GET /api/reportes-combustible/:id/pdf]', e)
        return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
    }
}
