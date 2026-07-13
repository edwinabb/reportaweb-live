import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { generateAndStorePdf } from '@/lib/reporte-personal-pdf'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const serviceKey = req.headers.get('X-Report-Service-Key')
    if (!serviceKey || serviceKey !== process.env.REPORT_SERVICE_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await ctx.params
    const adminClient = createAdminClient()
    const { data: rep } = await adminClient.from('reportes_personal').select('tenant_id').eq('id', id).maybeSingle()
    if (!rep?.tenant_id) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    try {
        await generateAndStorePdf(id, adminClient, rep.tenant_id)
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[POST /api/reportes-personal/:id/generate-pdf]', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
