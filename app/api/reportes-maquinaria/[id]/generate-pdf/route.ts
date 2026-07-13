import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { generateAndStorePdf } from '@/lib/reporte-maquinaria-pdf'

/**
 * POST /api/reportes-maquinaria/:id/generate-pdf
 *
 * Endpoint para generación asíncrona de PDF desde la APP móvil.
 * Autenticado con header X-Report-Service-Key = env REPORT_SERVICE_KEY.
 */
export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const serviceKey = req.headers.get('X-Report-Service-Key')
    if (!serviceKey || serviceKey !== process.env.REPORT_SERVICE_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await ctx.params
    const adminClient = createAdminClient()

    // Obtener tenant_id directamente del reporte
    const { data: rep } = await adminClient
        .from('reportes_maquinaria')
        .select('tenant_id')
        .eq('id', id)
        .maybeSingle()

    if (!rep?.tenant_id) {
        return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    try {
        await generateAndStorePdf(id, adminClient, rep.tenant_id)
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al generar PDF'
        console.error('[POST /api/reportes-maquinaria/:id/generate-pdf]', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
