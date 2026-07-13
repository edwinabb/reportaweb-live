import { renderPdfFromHtml } from './pdf-generator'
import { renderReportePersonalHtml, type ReportePersonalPdfData, type ReportePersonalConfig } from './reporte-personal-pdf-template'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSupabaseStorageUrl } from './pdf-cache'

function extractTime(ts: string | null | undefined): string | null {
    if (!ts) return null
    const match = ts.match(/T(\d{2}:\d{2})/)
    return match ? match[1] : null
}

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Genera el PDF de un reporte de personal y lo almacena en Supabase Storage.
 * Actualiza `pdf_url` en la tabla `reportes_personal`.
 *
 * Bucket: `informes-personal` — debe existir con política pública de lectura.
 * Path:   `reportes-personal/{tenantId}/{year}/{month}/rp-{id[-8:]}.pdf`
 *
 * @returns { pdf: ArrayBuffer; filename: string; cachedUrl?: string } o null si no se encuentra el reporte.
 */
export async function generateAndStorePdf(
    id: string,
    adminClient: AdminClient,
    tenantId: string,
): Promise<{ pdf: ArrayBuffer; filename: string; cachedUrl?: string } | null> {
    // 1. Cargar reporte con joins de personal
    const { data: reporte, error: repErr } = await adminClient
        .from('reportes_personal')
        .select(`
            *,
            personal:profiles!reportes_personal_personal_id_fkey(first_name, last_name),
            tercero_personal:terceros_personal!reportes_personal_tercero_personal_id_fkey(nombres, apellidos, cargo)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (repErr || !reporte) return null

    // Return cached URL if PDF already in Supabase Storage
    if (isSupabaseStorageUrl(reporte.pdf_url)) {
        return { pdf: new ArrayBuffer(0), filename: '', cachedUrl: reporte.pdf_url as string }
    }

    // Cargar creado_por por separado (created_by no tiene FK constraint)
    let creadoPorProfile: { first_name: string | null; last_name: string | null } | null = null
    if (reporte.created_by) {
        const { data: cp } = await adminClient
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', reporte.created_by)
            .maybeSingle()
        creadoPorProfile = cp
    }

    // 2. Cargar la tarea con cliente y cotización
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
            .from('config_informe_personal')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle(),
    ])

    const tar = tarea as any
    const cli = tar?.cliente as any
    const cot = tar?.cotizacion as any
    const per = reporte.personal as any
    const terPer = reporte.tercero_personal as any
    const creadoPor = creadoPorProfile

    const trabajadorNombre = per
        ? `${per.first_name ?? ''} ${per.last_name ?? ''}`.trim()
        : terPer
            ? `${terPer.nombres ?? ''} ${terPer.apellidos ?? ''}`.trim()
            : ''

    const cotizacionCodigo = cot?.numero && cot?.anio ? `CT ${cot.numero}-${cot.anio}` : null

    const config: ReportePersonalConfig = {
        cantidad_turnos: Math.max(1, Math.min(3, configDB?.cantidad_turnos ?? 2)) as 1 | 2 | 3,
        incluye_horas_extras: configDB?.incluye_horas_extras ?? false,
        incluye_horas_extras_extraord: configDB?.incluye_horas_extras_extraord ?? false,
        incluye_horas_dominicales: configDB?.incluye_horas_dominicales ?? false,
        incluye_gastos: configDB?.incluye_gastos ?? true,
        incluye_firma_cliente_horas: configDB?.incluye_firma_cliente_horas ?? false,
        incluye_firma_trabajador: configDB?.incluye_firma_trabajador ?? true,
        incluye_foto_trabajo: configDB?.incluye_foto_trabajo ?? false,
        codigo_formato: configDB?.codigo_formato ?? '',
        version_formato: configDB?.version_formato ?? '',
        fecha_formato: configDB?.fecha_formato ?? '',
    }

    const registradoPorNombre = creadoPor
        ? `${creadoPor.first_name ?? ''} ${creadoPor.last_name ?? ''}`.trim()
        : undefined

    const pdfData: ReportePersonalPdfData = {
        registro_numero: (reporte.id as string).slice(-8).toUpperCase(),
        fecha_reporte: reporte.fecha_reporte,
        trabajador: {
            first_name: per?.first_name ?? terPer?.nombres,
            last_name: per?.last_name ?? terPer?.apellidos,
            cargo: per ? undefined : terPer?.cargo,
            signature_url: reporte.firma_trabajador_url ?? undefined,
        },
        cliente: {
            razon_social: cli?.razon_social ?? tar?.cliente_nombre,
            ruc: cli?.ruc,
        },
        solicitado_por: (tar?.contacto as any)?.nombre_completo ?? undefined,
        tarea: {
            codigo: tar?.codigo,
            titulo: tar?.titulo,
        },
        cotizacion_codigo: cotizacionCodigo,
        sitio_nombre: tar?.sitio,
        jornadas: {
            primera: {
                inicio: extractTime(reporte.jornada1_inicio),
                fin: extractTime(reporte.jornada1_fin),
            },
            segunda: config.cantidad_turnos >= 2
                ? { inicio: extractTime(reporte.jornada2_inicio), fin: extractTime(reporte.jornada2_fin) }
                : undefined,
            tercera: config.cantidad_turnos >= 3
                ? { inicio: extractTime(reporte.jornada3_inicio), fin: extractTime(reporte.jornada3_fin) }
                : undefined,
        },
        horas: {
            total: reporte.total_horas,
            extras: reporte.horas_extras,
            extras_extraord: reporte.horas_extras_extraordinarias,
            dominicales: reporte.horas_dominicales,
        },
        gastos: config.incluye_gastos ? {
            desayuno: reporte.gasto_desayuno,
            almuerzo: reporte.gasto_almuerzo,
            cena: reporte.gasto_cena,
            movilidad: reporte.gasto_movilidad,
        } : null,
        trabajo_realizado: reporte.trabajo_realizado,
        firma_cliente: config.incluye_firma_cliente_horas && reporte.nombre_cliente_firmante
            ? {
                nombre: reporte.nombre_cliente_firmante,
                cargo: reporte.cargo_cliente_firmante,
                firma_url: reporte.firma_cliente_url,
            }
            : null,
        registrado_por: registradoPorNombre || trabajadorNombre,
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

    const html = renderReportePersonalHtml(pdfData)
    const pdf = await renderPdfFromHtml(html)
    const pdfBytes = Buffer.from(pdf)

    const fecha = new Date(reporte.fecha_reporte)
    const year = fecha.getFullYear()
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const filename = `rp-${(reporte.id as string).slice(-8)}.pdf`
    const storagePath = `reportes-personal/${tenantId}/${year}/${month}/${filename}`

    const { error: upErr } = await adminClient.storage
        .from('informes-personal')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (!upErr) {
        const { data: pub } = adminClient.storage.from('informes-personal').getPublicUrl(storagePath)
        await adminClient
            .from('reportes_personal')
            .update({ pdf_url: pub.publicUrl })
            .eq('id', id)
    }

    return { pdf, filename }
}
