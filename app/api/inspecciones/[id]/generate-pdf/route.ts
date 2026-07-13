import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { generateAndStorePdf } from '@/lib/inspeccion-pdf'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const serviceKey = req.headers.get('X-Report-Service-Key')
    if (!serviceKey || serviceKey !== process.env.REPORT_SERVICE_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id } = await ctx.params
    const adminClient = createAdminClient()
    const { data: ins } = await adminClient.from('inspecciones').select('tenant_id').eq('id', id).maybeSingle()
    if (!ins?.tenant_id) return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 })
    try {
        await generateAndStorePdf(id, adminClient, ins.tenant_id)
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[POST /api/inspecciones/:id/generate-pdf]', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
