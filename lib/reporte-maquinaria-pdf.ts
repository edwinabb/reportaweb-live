import { renderPdfFromHtml } from './pdf-generator'
import { renderReporteMaquinariaHtml, type ReporteMaquinariaPdfData, type ReporteMaquinariaConfig } from './reporte-maquinaria-pdf-template'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSupabaseStorageUrl } from './pdf-cache'

function extractTime(ts: string | null | undefined): string | null {
    if (!ts) return null
    const match = ts.match(/T(\d{2}:\d{2})/)
    return match ? match[1] : null
}

function toSlug(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Genera el PDF de un reporte de maquinaria y lo almacena en Supabase Storage.
 * Actualiza `pdf_url` en la tabla `reportes_maquinaria`.
 *
 * Bucket: `reporte-maquinaria` — debe existir con política pública de lectura.
 * Path:   `{tenant_slug}/{cliente_slug}/{year}/{filename}`
 *
 * @returns { pdf: ArrayBuffer; filename: string } o null si no se encuentra el reporte.
 */
export async function generateAndStorePdf(
    id: string,
    adminClient: AdminClient,
    tenantId: string,
): Promise<{ pdf: ArrayBuffer; filename: string; cachedUrl?: string } | null> {
    // 1. Cargar reporte con joins
    const { data: reporte, error: repErr } = await adminClient
        .from('reportes_maquinaria')
        .select(`
            *,
            maquinaria:maquinarias!reportes_maquinaria_maquinaria_id_fkey(nombre, codigo_interno, placa, modelo),
            operador:profiles!reportes_maquinaria_operador_id_fkey(first_name, last_name),
            rigger1:profiles!reportes_maquinaria_rigger1_id_fkey(first_name, last_name),
            rigger2:profiles!reportes_maquinaria_rigger2_id_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (repErr || !reporte) return null

    // Return cached URL if PDF already in Supabase Storage
    if (isSupabaseStorageUrl(reporte.pdf_url)) {
        return { pdf: new ArrayBuffer(0), filename: '', cachedUrl: reporte.pdf_url as string }
    }

    // 2. Cargar tarea con cliente y cotización
    const { data: tarea } = await adminClient
        .from('tareas')
        .select(`
            codigo, titulo, sitio, cliente_nombre,
            cliente:terceros!tareas_cliente_id_fkey(razon_social, ruc),
            cotizacion:cotizaciones!tareas_cotizacion_id_fkey(numero, anio),
            contacto:terceros_contactos!tareas_contacto_id_fkey(nombre_completo)
        `)
        .eq('id', reporte.tarea_id)
        .maybeSingle()

    // 3. Company + config en paralelo
    const [{ data: company }, { data: configDB }] = await Promise.all([
        adminClient
            .from('companies')
            .select('razon_social, name, ruc, direccion, logo_url')
            .eq('id', tenantId)
            .maybeSingle(),
        adminClient
            .from('config_informe_maquinaria')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle(),
    ])

    const tar = tarea as any
    const cli = tar?.cliente as any
    const cot = tar?.cotizacion as any
    const maq = reporte.maquinaria as any
    const oper = reporte.operador as any
    const r1 = reporte.rigger1 as any
    const r2 = reporte.rigger2 as any
    const creadoPor = null // created_by is TEXT (Bubble ID), FK dropped in migration 20260121

    const cotizacionCodigo = cot?.numero && cot?.anio ? `CT ${cot.numero}-${cot.anio}` : null
    const personalNombre = (p: any) =>
        p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : null

    const config: ReporteMaquinariaConfig = {
        cantidad_turnos: Math.max(1, Math.min(3, configDB?.cantidad_turnos ?? 1)) as 1 | 2 | 3,
        cantidad_riggers: Math.max(0, Math.min(2, configDB?.cantidad_riggers ?? 0)) as 0 | 1 | 2,
        incluye_firma_cliente: configDB?.incluye_firma_cliente ?? false,
        incluye_foto_trabajo: configDB?.incluye_foto_trabajo ?? false,
        incluye_foto_reporte_escrito: configDB?.incluye_foto_reporte_escrito ?? false,
        incluye_tipo_recorrido: configDB?.incluye_tipo_recorrido ?? false,
        incluye_salida_autorizada: configDB?.incluye_salida_autorizada ?? false,
        incluye_tonelaje_placa: configDB?.incluye_tonelaje_placa ?? false,
        codigo_formato: configDB?.codigo_formato ?? '',
        version_formato: configDB?.version_formato ?? '',
        fecha_formato: configDB?.fecha_formato ?? '',
    }

    const pdfData: ReporteMaquinariaPdfData = {
        registro_numero: (reporte.id as string).slice(-8).toUpperCase(),
        fecha_reporte: reporte.fecha_reporte,
        tarea: { codigo: tar?.codigo, titulo: tar?.titulo },
        cotizacion_codigo: cotizacionCodigo,
        cliente: {
            razon_social: cli?.razon_social ?? tar?.cliente_nombre,
            ruc: cli?.ruc,
        },
        solicitado_por: (tar?.contacto as any)?.nombre_completo ?? undefined,
        sitio_nombre: tar?.sitio,
        maquinaria: {
            codigo_interno: maq?.codigo_interno,
            nombre: maq?.nombre,
            modelo: maq?.modelo,
            placa: maq?.placa,
        },
        tonelaje_solicitado: reporte.tonelaje_solicitado,
        operador: { nombre: personalNombre(oper) },
        rigger1: config.cantidad_riggers >= 1 ? { nombre: personalNombre(r1) } : undefined,
        rigger2: config.cantidad_riggers >= 2 ? { nombre: personalNombre(r2) } : undefined,
        salida_autorizada_por: reporte.salida_autorizada_por,
        turnos: {
            turno1: {
                inicio: extractTime(reporte.jornada1_inicio),
                fin: extractTime(reporte.jornada1_fin),
            },
            turno2: config.cantidad_turnos >= 2
                ? { inicio: extractTime(reporte.jornada2_inicio), fin: extractTime(reporte.jornada2_fin) }
                : undefined,
            turno3: config.cantidad_turnos >= 3
                ? { inicio: extractTime(reporte.jornada3_inicio), fin: extractTime(reporte.jornada3_fin) }
                : undefined,
        },
        tipo_recorrido: reporte.tipo_recorrido,
        recorrido_horas: reporte.horas_recorrido,
        total_horas: reporte.total_horas,
        trabajo_realizado: reporte.trabajo_realizado,
        foto_trabajo_url: reporte.foto_actividad_url ?? undefined,
        foto_reporte_escrito_url: reporte.foto_reporte_escrito_url ?? undefined,
        firma_cliente: config.incluye_firma_cliente && reporte.nombre_cliente_firmante
            ? {
                nombre: reporte.nombre_cliente_firmante,
                cargo: reporte.cargo_cliente_firmante,
                firma_url: reporte.firma_cliente_url,
            }
            : null,
        registrado_por: personalNombre(creadoPor) ?? personalNombre(oper) ?? undefined,
        fin_registro: reporte.updated_at
            ? new Date(reporte.updated_at).toLocaleString('es-PE')
            : undefined,
        company: {
            razon_social: company?.razon_social,
            name: company?.name,
            ruc: company?.ruc,
            direccion: company?.direccion,
            logo_url: company?.logo_url,
        },
        config,
    }

    const html = renderReporteMaquinariaHtml(pdfData)
    const pdf = await renderPdfFromHtml(html)
    const pdfBytes = Buffer.from(pdf)

    // Construir ruta de storage
    const tenantSlug = toSlug(company?.name ?? tenantId)
    const clienteSlug = toSlug(reporte.cliente_nombre ?? 'sin-cliente')
    const fecha = new Date(reporte.fecha_reporte)
    const year = fecha.getFullYear()
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const docPrefix = reporte.id_documento_interno
        ? String(reporte.id_documento_interno).padStart(6, '0')
        : (reporte.id as string).slice(-8)
    const filename = `${docPrefix}-${clienteSlug}-${year}-${month}.pdf`
    const storagePath = `${tenantSlug}/${clienteSlug}/${year}/${filename}`

    // Subir a bucket 'reporte-maquinaria' (debe existir en Supabase Storage)
    const { error: upErr } = await adminClient.storage
        .from('reporte-maquinaria')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (!upErr) {
        const { data: pub } = adminClient.storage
            .from('reporte-maquinaria')
            .getPublicUrl(storagePath)
        await adminClient
            .from('reportes_maquinaria')
            .update({ pdf_url: pub.publicUrl })
            .eq('id', id)
    }

    return { pdf, filename }
}
