import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/utils/tenant-context'
import { renderPdfFromHtml } from '@/lib/pdf-generator'
import {
    renderValorizacionVentaHtml,
    type ValorizacionVentaItem,
    type ConfigValorizacionVenta,
} from '@/lib/valorizacion-venta-pdf-template'
import { tryServeFromCache, saveToStorage } from '@/lib/pdf-cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { enqueuePdfJob, queuedPdfResponse } from '@/lib/pdf-queue'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/valorizaciones/:codigo/pdf
 *
 * Arma los datos de una valorización (todas las filas con ese código) + datos
 * del cliente + config del tenant, los pasa al template HTML y devuelve el PDF
 * vía Gotenberg.
 */
export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ codigo: string }> },
) {
    const { codigo } = await ctx.params

    const cronSecret = _req.headers.get('x-cron-pdf-secret')
    const isCronCall = !!cronSecret && cronSecret === process.env.CRON_SECRET

    let adminClient: SupabaseClient
    let tenantId: string

    if (isCronCall) {
        adminClient = createAdminClient()
        const { data: entity } = await adminClient
            .from('valorizaciones')
            .select('tenant_id')
            .eq('codigo', codigo)
            .limit(1)
            .maybeSingle()
        if (!entity?.tenant_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        tenantId = entity.tenant_id
    } else {
        const ctx2 = await getTenantContext()
        if (!ctx2.adminClient || !ctx2.tenantId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
        adminClient = ctx2.adminClient
        tenantId = ctx2.tenantId
    }

    // 1. Filas de la valorización
    const { data: valoraciones, error: vErr } = await adminClient
        .from('valorizaciones')
        .select('pdf_url, *, reporte:reportes_maquinaria!valorizaciones_reporte_maquinaria_id_fkey(id, id_documento_interno, fecha_reporte, jornada1_inicio, jornada1_fin, jornada2_inicio, jornada2_fin, horas_recorrido, horas_trabajadas, trabajo_realizado, tonelaje_solicitado, cliente_id, maquinaria:maquinarias!reportes_maquinaria_maquinaria_id_fkey(nombre, placa, codigo_interno))')
        .eq('tenant_id', tenantId)
        .eq('codigo', codigo)
        .order('fecha', { ascending: true })

    if (vErr || !valoraciones || valoraciones.length === 0) {
        return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    type ValRow = {
        fecha: string | null
        cantidad_a_facturar: number | null
        precio_unitario: number | null
        subtotal: number | null
        moneda: string | null
        servicio: string | null
        reporte: {
            id_documento_interno: string | null
            fecha_reporte: string | null
            jornada1_inicio: string | null
            jornada1_fin: string | null
            jornada2_inicio: string | null
            jornada2_fin: string | null
            horas_recorrido: number | null
            horas_trabajadas: number | null
            tonelaje_solicitado: number | null
            cliente_id: string | null
            maquinaria: { nombre: string | null; placa: string | null; codigo_interno: string | null } | null
        } | null
    }
    const rows = valoraciones as unknown as ValRow[]

    const clienteId = rows[0]?.reporte?.cliente_id
    const moneda = (rows[0]?.moneda as 'PEN' | 'USD') || 'USD'
    const fechaValorizacion = rows[0]?.fecha || new Date().toISOString().slice(0, 10)

    // 2. Cliente
    const { data: cliente } = clienteId
        ? await adminClient
              .from('terceros')
              .select('razon_social, ruc')
              .eq('id', clienteId)
              .maybeSingle()
        : { data: null }

    // 3. Config tenant
    const { data: cfg } = await adminClient
        .from('config_valorizacion_venta')
        .select('codigo_formato, version_formato, fecha_formato, igv_default, detraccion_default')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    const config: ConfigValorizacionVenta = {
        codigo_formato: cfg?.codigo_formato || 'G.PAC-04',
        version_formato: cfg?.version_formato || 'V.05',
        fecha_formato: cfg?.fecha_formato || 'Sept-2025',
        igv_default: Number(cfg?.igv_default ?? 18),
        detraccion_default: Number(cfg?.detraccion_default ?? 10),
    }

    // 4. Company (tenant)
    const { data: company } = await adminClient
        .from('companies')
        .select('razon_social, name, ruc, direccion, logo_url')
        .eq('id', tenantId)
        .maybeSingle()

    // 5. Items para el template
    const items: ValorizacionVentaItem[] = rows.map((r) => {
        const rep = r.reporte
        const tonelaje = rep?.tonelaje_solicitado
        const maqNombre = rep?.maquinaria?.nombre ?? ''
        const detalle = [r.servicio || maqNombre, tonelaje ? `${tonelaje} TN` : null]
            .filter(Boolean)
            .join(' - ')
        return {
            fecha_reporte: rep?.fecha_reporte || r.fecha || '',
            numero_reporte: rep?.id_documento_interno || '',
            detalle_factura: detalle,
            placa: rep?.maquinaria?.placa ?? null,
            hora_inicio_1: rep?.jornada1_inicio ?? null,
            hora_fin_1: rep?.jornada1_fin ?? null,
            hora_inicio_2: rep?.jornada2_inicio ?? null,
            hora_fin_2: rep?.jornada2_fin ?? null,
            recorrido: rep?.horas_recorrido ?? null,
            horas_trabajadas: rep?.horas_trabajadas ?? null,
            total_facturar: r.cantidad_a_facturar ?? null,
            precio_unitario: r.precio_unitario ?? null,
            subtotal: r.subtotal ?? null,
            moneda,
        }
    })

    const subtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0)
    const igvMonto = subtotal * (config.igv_default / 100)
    const detrMonto = subtotal * (config.detraccion_default / 100)
    const total = subtotal + igvMonto

    // Consecutivo con tipo de servicio entre paréntesis si hay tonelaje único
    const tonelajes = Array.from(new Set(rows.map((r) => r.reporte?.tonelaje_solicitado).filter(Boolean)))
    const consecutivoLabel = tonelajes.length === 1 ? `${codigo} (${tonelajes[0]} TN)` : codigo

    // Serve from cache if already stored
    const firstRow = valoraciones[0] as any
    const cached = tryServeFromCache(firstRow?.pdf_url)
    if (cached) return cached

    const html = renderValorizacionVentaHtml({
        consecutivo: consecutivoLabel,
        fecha_valorizacion: fechaValorizacion,
        cliente: {
            razon_social: cliente?.razon_social ?? null,
            ruc: cliente?.ruc ?? null,
        },
        items,
        moneda,
        igv_porcentaje: config.igv_default,
        detraccion_porcentaje: config.detraccion_default,
        subtotal,
        igv_monto: igvMonto,
        detraccion_monto: detrMonto,
        total_facturar: total,
        horas_totales: items.reduce((s, it) => s + (it.horas_trabajadas || 0), 0),
        total_facturar_horas: items.reduce((s, it) => s + (it.total_facturar || 0), 0),
        company: {
            razon_social: company?.razon_social ?? null,
            name: company?.name ?? null,
            ruc: company?.ruc ?? null,
            direccion: company?.direccion ?? null,
            logo_url: company?.logo_url ?? null,
        },
        config,
    })

    try {
        const pdf = await renderPdfFromHtml(html)

        // Save to storage
        const storagePath = `${tenantId}/val-${codigo}.pdf`
        const publicUrl = await saveToStorage(adminClient, 'cotizaciones', storagePath, Buffer.from(pdf))
        if (publicUrl) {
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
        console.error('[GET /api/valorizaciones/:codigo/pdf]', e)
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'valorizacion',
            entityId: codigo,
            bucket: 'cotizaciones',
            storagePath: `${tenantId}/val-${codigo}.pdf`,
        })
        return queuedPdfResponse('valorización') as NextResponse
    }
}
