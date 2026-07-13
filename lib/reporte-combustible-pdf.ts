import { renderPdfFromHtml } from './pdf-generator'
import { renderReporteCombustibleHtml } from './reporte-combustible-pdf-template'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSupabaseStorageUrl } from './pdf-cache'

type AdminClient = ReturnType<typeof createAdminClient>

export async function generateAndStoreCombustiblePdf(
    id: string,
    adminClient: AdminClient,
    tenantId: string,
): Promise<{ pdf: ArrayBuffer; filename: string; cachedUrl?: string } | null> {
    const { data: reporte, error } = await adminClient
        .from('reportes_combustible')
        .select(`
            *,
            maquinaria:maquinarias(nombre, codigo_interno),
            tarea:tareas(codigo, titulo)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error || !reporte) return null

    if (isSupabaseStorageUrl(reporte.pdf_url)) {
        return { pdf: new ArrayBuffer(0), filename: '', cachedUrl: reporte.pdf_url as string }
    }

    // Cargar empresa
    let creadoPorNombre: string | null = null
    if (reporte.created_by) {
        const { data: cp } = await adminClient
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', reporte.created_by)
            .maybeSingle()
        if (cp) creadoPorNombre = `${cp.first_name ?? ''} ${cp.last_name ?? ''}`.trim()
    }

    const { data: company } = await adminClient
        .from('companies')
        .select('razon_social, ruc, logo_url')
        .eq('id', tenantId)
        .maybeSingle()

    const maq = reporte.maquinaria as any
    const tar = reporte.tarea as any

    const html = renderReporteCombustibleHtml({
        registro_numero: (reporte.id as string).slice(-8).toUpperCase(),
        fecha_reporte: reporte.fecha_reporte,
        equipo: maq ? { nombre: maq.nombre ?? null, codigo_interno: maq.codigo_interno ?? null } : null,
        tipo_combustible: reporte.tipo_combustible,
        galones: reporte.galones,
        precio_unitario: reporte.precio_unitario,
        monto_subtotal: reporte.monto_subtotal,
        monto_igv: reporte.monto_igv,
        monto_total: reporte.monto_total,
        proveedor_grifo: reporte.proveedor_grifo,
        horometro_actual: reporte.horometro_actual,
        kilometraje_actual: reporte.kilometraje_actual,
        foto_tablero_url: reporte.foto_tablero_url,
        foto_surtidor_url: reporte.foto_surtidor_url,
        foto_voucher_url: reporte.foto_voucher_url,
        tarea: tar ? { codigo: tar.codigo ?? null, titulo: tar.titulo ?? null } : null,
        empresa: company ? { razon_social: company.razon_social, ruc: company.ruc, logo_url: company.logo_url } : null,
        registrado_por: creadoPorNombre,
    })

    const pdf = await renderPdfFromHtml(html)
    const pdfBytes = Buffer.from(pdf)

    const fechaStr = reporte.fecha_reporte ?? new Date().toISOString().slice(0, 10)
    const year = fechaStr.slice(0, 4)
    const month = fechaStr.slice(5, 7)
    const filename = `rc-${(reporte.id as string).slice(-8)}.pdf`
    const storagePath = `pdfs/${tenantId}/${year}/${month}/${filename}`

    const { error: upErr } = await adminClient.storage
        .from('reportes-combustible')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (!upErr) {
        const { data: pub } = adminClient.storage.from('reportes-combustible').getPublicUrl(storagePath)
        await adminClient
            .from('reportes_combustible')
            .update({ pdf_url: pub.publicUrl })
            .eq('id', id)
    }

    return { pdf: pdfBytes.buffer, filename }
}
