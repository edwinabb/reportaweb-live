import { renderPdfFromHtml } from './pdf-generator'
import { renderInspeccionPdfHtml, type InspeccionPdfInput, type InspeccionDetalleRow } from './inspeccion-pdf-template'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSupabaseStorageUrl } from './pdf-cache'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Genera el PDF de una inspección y lo almacena en Supabase Storage.
 * Actualiza `pdf_url` en la tabla `inspecciones`.
 *
 * Bucket: `informes-maquinaria` — debe existir con política pública de lectura.
 * Path:   `{tenantId}/{id}/pdf/{filename}`
 *
 * @returns { pdf: ArrayBuffer; filename: string; cachedUrl?: string } o null si no se encuentra la inspección.
 */
export async function generateAndStorePdf(
    id: string,
    adminClient: AdminClient,
    tenantId: string,
): Promise<{ pdf: ArrayBuffer; filename: string; cachedUrl?: string } | null> {
    // 1. Cargar inspección con joins
    const { data: inspeccion, error } = await adminClient
        .from('inspecciones')
        .select(`
            id, codigo_interno, fecha_inspeccion, puntaje, tiene_fallas, observaciones,
            pdf_url, version_formato,
            maquinaria:maquinarias(nombre, codigo_interno, marca, modelo),
            supervisor:profiles!inspecciones_supervisor_id_fkey(first_name, last_name),
            detalles:inspecciones_detalles(id, categoria, orden, item, estado, comentario)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error || !inspeccion) return null

    // Return cached URL if PDF already in Supabase Storage
    if (isSupabaseStorageUrl(inspeccion.pdf_url)) {
        return { pdf: new ArrayBuffer(0), filename: '', cachedUrl: inspeccion.pdf_url as string }
    }

    // 2. Company + config en paralelo
    const [{ data: company }, { data: configMaq }] = await Promise.all([
        adminClient
            .from('companies')
            .select('razon_social, name, ruc, logo_url')
            .eq('id', tenantId)
            .maybeSingle(),
        adminClient
            .from('config_informe_maquinaria')
            .select('codigo_formato, version_formato_doc, fecha_formato')
            .eq('tenant_id', tenantId)
            .maybeSingle(),
    ])

    const maq = inspeccion.maquinaria as any
    const sup = inspeccion.supervisor as any
    const supervisorNombre = sup ? `${sup.first_name ?? ''} ${sup.last_name ?? ''}`.trim() || null : null

    const input: InspeccionPdfInput = {
        codigo_interno: inspeccion.codigo_interno,
        fecha_inspeccion: inspeccion.fecha_inspeccion,
        puntaje: inspeccion.puntaje,
        tiene_fallas: inspeccion.tiene_fallas,
        observaciones: inspeccion.observaciones,
        maquinaria: maq ? { nombre: maq.nombre, codigo_interno: maq.codigo_interno, marca: maq.marca, modelo: maq.modelo } : null,
        empresa: {
            razon_social: company?.razon_social ?? company?.name ?? null,
            ruc: company?.ruc ?? null,
            logo_url: company?.logo_url ?? null,
        },
        supervisor: supervisorNombre ? { full_name: supervisorNombre } : null,
        detalles: ((inspeccion.detalles ?? []) as any[]).map((d): InspeccionDetalleRow => ({
            id: d.id,
            categoria: d.categoria,
            orden: d.orden ?? 0,
            item: d.item ?? '',
            estado: d.estado ?? '',
            comentario: d.comentario ?? null,
        })),
        codigo_formato: configMaq?.codigo_formato ?? null,
        version_formato: configMaq?.version_formato_doc ?? null,
        fecha_formato: configMaq?.fecha_formato ?? null,
    }

    const html = renderInspeccionPdfHtml(input)
    const pdf = await renderPdfFromHtml(html)
    const pdfBytes = Buffer.from(pdf)

    const filename = `${inspeccion.codigo_interno ?? id}.pdf`
    const storagePath = `${tenantId}/${id}/pdf/${filename}`

    const { error: upErr } = await adminClient.storage
        .from('informes-maquinaria')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (!upErr) {
        const { data: pub } = adminClient.storage.from('informes-maquinaria').getPublicUrl(storagePath)
        await adminClient
            .from('inspecciones')
            .update({ pdf_url: pub.publicUrl })
            .eq('id', id)
    }

    return { pdf, filename }
}
