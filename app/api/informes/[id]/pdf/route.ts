import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseContext } from '@/lib/action-context'
import { renderPdfFromHtml } from '@/lib/pdf-generator'
import { renderInformePdfHtml, type InformePdfInput } from '@/lib/informe-formato-pdf-template'
import { tryServeFromCache } from '@/lib/pdf-cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { enqueuePdfJob, queuedPdfResponse } from '@/lib/pdf-queue'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/informes/:id/pdf
 *
 * Renderiza el PDF del informe de formato llenado.
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
            .from('formatos_informes')
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

    // Cargar informe con toda la metadata + respuestas + preguntas
    const { data: informe, error } = await adminClient
        .from('formatos_informes')
        .select(`
            id, codigo_informe, pdf_url, observaciones, fecha_inicio, fecha_fin, enviado_at,
            firma_url, firmante_profile_id,
            tarea_codigo_override, tarea_descripcion_override, sitio_descripcion_override,
            version:formatos_versiones(
                etiqueta_version,
                muestra_bloque_empresa, muestra_bloque_cliente, muestra_bloque_cotizacion,
                muestra_bloque_tarea, muestra_bloque_observaciones, muestra_bloque_firma,
                formato:formatos(codigo, nombre),
                preguntas:formatos_preguntas(
                    id, seccion, orden, texto, tipo,
                    opciones:formatos_opciones(id, etiqueta, es_conforme)
                )
            ),
            tarea:tareas(codigo, descripcion),
            cliente:terceros!formatos_informes_cliente_id_fkey(razon_social, ruc),
            cotizacion:cotizaciones(numero, anio),
            sitio:terceros_sitios(nombre),
            contacto:terceros_contactos(nombre),
            firmante:profiles!formatos_informes_firmante_profile_id_fkey(first_name, last_name),
            respuestas:formatos_informes_respuestas(
                pregunta_id, opcion_id, opciones_ids, valor_texto, valor_numero,
                valor_fecha, valor_booleano, valor_foto_url, nota
            ),
            maquinarias:formatos_informes_maquinarias(
                maquinaria:maquinarias(nombre, codigo_interno, placa)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single()

    if (error || !informe) {
        console.error('[GET /api/informes/:id/pdf] error:', error, JSON.stringify(error, null, 2))
        return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }

    // Serve from cache if PDF already in Supabase Storage
    const cached = tryServeFromCache(informe.pdf_url ?? undefined)
    if (cached) return cached

    // Company (tenant)
    const { data: company } = await adminClient
        .from('companies')
        .select('razon_social, name, ruc, direccion, logo_url')
        .eq('id', tenantId)
        .maybeSingle()

    // Config del formato para fecha_formato (reutilizamos config_informe_* si existe)
    const { data: configMaquinaria } = await adminClient
        .from('config_informe_maquinaria')
        .select('fecha_formato')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    const ver: any = informe.version
    const fmt: any = ver?.formato

    // Armar input del template
    const maquinarias = (informe.maquinarias ?? []) as unknown as Array<{ maquinaria: { nombre: string | null; codigo_interno: string | null; placa: string | null } | null }>
    const maquinariaLabel = maquinarias
        .map(m => {
            const x = m.maquinaria
            if (!x) return null
            return [x.codigo_interno, x.nombre, x.placa].filter(Boolean).join(' ')
        })
        .filter(Boolean)
        .join(', ') || null

    const cli: any = informe.cliente
    const cot: any = informe.cotizacion
    const sit: any = informe.sitio
    const tar: any = informe.tarea
    const firmante: any = informe.firmante

    const cotizacionLabel = cot?.numero && cot?.anio ? `CT ${cot.numero}-${cot.anio}` : null
    const firmanteNombre = firmante
        ? [firmante.first_name, firmante.last_name].filter(Boolean).join(' ').trim() || null
        : null

    const input: InformePdfInput = {
        codigo_informe: informe.codigo_informe ?? null,
        codigo_formato: fmt?.codigo ?? '',
        nombre_formato: fmt?.nombre ?? '',
        etiqueta_version: ver?.etiqueta_version ?? null,
        fecha_formato: configMaquinaria?.fecha_formato ?? null,
        fecha_reporte: informe.enviado_at ?? informe.fecha_inicio ?? null,
        empresa: {
            razon_social: company?.razon_social ?? company?.name ?? null,
            ruc: company?.ruc ?? null,
            direccion: company?.direccion ?? null,
            logo_url: company?.logo_url ?? null,
        },
        cliente: cli
            ? {
                  razon_social: cli.razon_social ?? null,
                  numero_documento: cli.ruc ?? null,
              }
            : null,
        cotizacion_label: cotizacionLabel,
        solicitado_por: null,
        tarea_codigo: informe.tarea_codigo_override ?? tar?.codigo ?? null,
        tarea_descripcion: informe.tarea_descripcion_override ?? tar?.descripcion ?? null,
        sitio_descripcion: informe.sitio_descripcion_override ?? sit?.nombre ?? null,
        maquinaria_label: maquinariaLabel,
        preguntas: (ver?.preguntas ?? []).map((q: any) => ({
            id: q.id,
            seccion: q.seccion,
            orden: q.orden,
            texto: q.texto,
            tipo: q.tipo,
            opciones: (q.opciones ?? []).map((o: any) => ({
                id: o.id,
                etiqueta: o.etiqueta,
                es_conforme: o.es_conforme,
            })),
        })),
        respuestas: informe.respuestas ?? [],
        observaciones: informe.observaciones ?? null,
        firma_url: informe.firma_url ?? null,
        firmante_nombre: firmanteNombre,
        fecha_inicio: informe.fecha_inicio ?? null,
        fecha_fin: informe.fecha_fin ?? null,
        muestra: {
            empresa: !!ver?.muestra_bloque_empresa,
            cliente: !!ver?.muestra_bloque_cliente,
            cotizacion: !!ver?.muestra_bloque_cotizacion,
            tarea: !!ver?.muestra_bloque_tarea,
            observaciones: !!ver?.muestra_bloque_observaciones,
            firma: !!ver?.muestra_bloque_firma,
        },
    }

    const html = renderInformePdfHtml(input)

    try {
        const pdf = await renderPdfFromHtml(html)

        // Guardar pdf_url en el informe (upload al bucket)
        const pdfBytes = Buffer.from(pdf)
        const filename = `${informe.codigo_informe ?? informe.id}.pdf`
        const path = `${tenantId}/${informe.id}/pdf/${filename}`
        const { error: upErr } = await adminClient.storage
            .from('formatos-informes')
            .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
        if (!upErr) {
            const { data: pub } = adminClient.storage.from('formatos-informes').getPublicUrl(path)
            await adminClient
                .from('formatos_informes')
                .update({ pdf_url: pub.publicUrl, pdf_generado_at: new Date().toISOString() })
                .eq('id', informe.id)
        }

        return new NextResponse(pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        })
    } catch (e: unknown) {
        console.error('[GET /api/informes/:id/pdf]', e)
        await enqueuePdfJob({
            adminClient,
            tenantId,
            entityType: 'informe',
            entityId: id,
            bucket: 'formatos-informes',
            storagePath: `${tenantId}/${id}/pdf/${id.slice(-8)}.pdf`,
        })
        return queuedPdfResponse('informe') as NextResponse
    }
}
