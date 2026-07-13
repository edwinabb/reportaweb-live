/**
 * Template HTML para PDFs de informes (módulo Formatos).
 *
 * Replica el layout de los formatos originales: cabecera con logo + código,
 * tablas de metadata (empresa/cliente/cotización/tarea/grúa), tabla grande de
 * preguntas con ¿CUMPLE?, secciones adicionales (medidores, observaciones),
 * firma al pie.
 */

type Opcion = {
    id: string
    etiqueta: string
    es_conforme: boolean | null
}

type Pregunta = {
    id: string
    seccion: string | null
    orden: number
    texto: string
    tipo:
        | 'SELECCION_UNICA'
        | 'SELECCION_MULTIPLE'
        | 'TEXTO_CORTO'
        | 'TEXTO_LARGO'
        | 'NUMERO'
        | 'FECHA'
        | 'BOOLEANO'
        | 'FOTO'
    opciones: Opcion[]
}

type Respuesta = {
    pregunta_id: string
    opcion_id: string | null
    opciones_ids: string[] | null
    valor_texto: string | null
    valor_numero: number | null
    valor_fecha: string | null
    valor_booleano: boolean | null
    valor_foto_url: string | null
    nota: string | null
}

export type InformePdfInput = {
    codigo_informe: string | null
    codigo_formato: string
    nombre_formato: string
    etiqueta_version: string | null
    fecha_formato: string | null        // Ej "JUN-2025"
    fecha_reporte: string | null

    empresa: { razon_social: string | null; ruc: string | null; direccion: string | null; logo_url: string | null }
    cliente: { razon_social: string | null; numero_documento: string | null } | null
    cotizacion_label: string | null
    solicitado_por: string | null
    tarea_codigo: string | null
    tarea_descripcion: string | null
    sitio_descripcion: string | null
    maquinaria_label: string | null

    preguntas: Pregunta[]
    respuestas: Respuesta[]

    observaciones: string | null
    firma_url: string | null
    firmante_nombre: string | null
    fecha_inicio: string | null
    fecha_fin: string | null

    muestra: {
        empresa: boolean
        cliente: boolean
        cotizacion: boolean
        tarea: boolean
        observaciones: boolean
        firma: boolean
    }
}

function escapeHtml(s: string | null | undefined): string {
    if (s === null || s === undefined) return ''
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function formatoFecha(iso: string | null): string {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleDateString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    } catch {
        return iso
    }
}

function renderValorRespuesta(pregunta: Pregunta, respuesta: Respuesta | undefined): string {
    if (!respuesta) return '<span style="color:#9ca3af;font-style:italic;">—</span>'

    if (pregunta.tipo === 'SELECCION_UNICA' && respuesta.opcion_id) {
        const opt = pregunta.opciones.find(o => o.id === respuesta.opcion_id)
        if (!opt) return '—'
        return escapeHtml(opt.etiqueta)
    }
    if (pregunta.tipo === 'SELECCION_MULTIPLE' && respuesta.opciones_ids) {
        return respuesta.opciones_ids
            .map(id => {
                const opt = pregunta.opciones.find(o => o.id === id)
                return opt ? escapeHtml(opt.etiqueta) : ''
            })
            .filter(Boolean)
            .join(', ')
    }
    if (pregunta.tipo === 'TEXTO_CORTO' || pregunta.tipo === 'TEXTO_LARGO') {
        return escapeHtml(respuesta.valor_texto ?? '')
    }
    if (pregunta.tipo === 'NUMERO') return String(respuesta.valor_numero ?? '')
    if (pregunta.tipo === 'FECHA') return escapeHtml(respuesta.valor_fecha ?? '')
    if (pregunta.tipo === 'BOOLEANO')
        return respuesta.valor_booleano === null ? '—' : respuesta.valor_booleano ? 'Sí' : 'No'
    if (pregunta.tipo === 'FOTO' && respuesta.valor_foto_url) {
        return `<img src="${escapeHtml(respuesta.valor_foto_url)}" style="max-width:180px;max-height:140px;border-radius:4px;border:1px solid #e5e7eb;" />`
    }
    return ''
}

export function renderInformePdfHtml(d: InformePdfInput): string {
    // Agrupar preguntas por sección para renderizar en bloques
    const secciones = new Map<string, Pregunta[]>()
    for (const q of d.preguntas) {
        const key = q.seccion ?? ''
        if (!secciones.has(key)) secciones.set(key, [])
        secciones.get(key)!.push(q)
    }

    // Header (código + versión + fecha formato)
    const headerRight = `
        <div style="text-align:right;">
            <div style="font-weight:700;font-size:10pt;">${escapeHtml(d.etiqueta_version ?? '')}</div>
            <div style="font-size:8pt;color:#6b7280;">${escapeHtml(d.fecha_formato ?? '')}</div>
        </div>
    `

    const logo = d.empresa.logo_url
        ? `<img src="${escapeHtml(d.empresa.logo_url)}" alt="Logo" style="max-height:42px;max-width:130px;object-fit:contain;" />`
        : `<div style="font-weight:800;font-size:11pt;color:#f97316;font-style:italic;">REPORTAR.APP</div><div style="font-size:7pt;color:#6b7280;margin-top:2px;">Planifica, reporta y valoriza en minutos</div>`

    const topTitle = `
        <tr>
            <td style="padding:10px 12px;border:1px solid #d1d5db;width:15%;vertical-align:middle;background:#fff;">${logo}</td>
            <td style="padding:10px 12px;border:1px solid #d1d5db;vertical-align:middle;background:#fff;font-weight:700;font-size:12pt;">
                ${escapeHtml(d.nombre_formato)} ${escapeHtml(d.codigo_formato)}
            </td>
            <td style="padding:10px 12px;border:1px solid #d1d5db;width:18%;vertical-align:middle;background:#fff;">${headerRight}</td>
        </tr>
    `

    // Metadata blocks
    const empresaBlock = d.muestra.empresa
        ? `
        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:9pt;">
            <tr>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:30%;">EMPRESA</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:20%;">RUC</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;">DOMICILIO</th>
            </tr>
            <tr>
                <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;">${escapeHtml(d.empresa.razon_social ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${escapeHtml(d.empresa.ruc ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${escapeHtml(d.empresa.direccion ?? '')}</td>
            </tr>
        </table>
        `
        : ''

    const clienteBlock = d.muestra.cliente
        ? `
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:9pt;">
            <tr>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:30%;">CLIENTE</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:20%;">RUC</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:25%;">COTIZACIÓN</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:25%;">SOLICITADO POR</th>
            </tr>
            <tr>
                <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;">${escapeHtml(d.cliente?.razon_social ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${escapeHtml(d.cliente?.numero_documento ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${escapeHtml(d.cotizacion_label ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${escapeHtml(d.solicitado_por ?? '')}</td>
            </tr>
        </table>
        `
        : ''

    const tareaBlock = d.muestra.tarea
        ? `
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:9pt;">
            <tr>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:20%;">TAREA</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:50%;">DESCRIPCIÓN</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;">SITIO</th>
            </tr>
            <tr>
                <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;">${escapeHtml(d.tarea_codigo ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${escapeHtml(d.tarea_descripcion ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${escapeHtml(d.sitio_descripcion ?? '')}</td>
            </tr>
        </table>
        `
        : ''

    const maquinariaBlock = `
        <table style="width:100%;border-collapse:collapse;margin-top:6px;margin-bottom:14px;font-size:9pt;">
            <tr>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:60%;">MAQUINARIA</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;">FECHA DEL REPORTE</th>
            </tr>
            <tr>
                <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;">${escapeHtml(d.maquinaria_label ?? '')}</td>
                <td style="padding:6px 8px;border:1px solid #d1d5db;">${formatoFecha(d.fecha_reporte)}</td>
            </tr>
        </table>
    `

    // Preguntas por sección
    const seccionesHtml = Array.from(secciones.entries())
        .map(([nombre, preguntas]) => {
            preguntas.sort((a, b) => a.orden - b.orden)

            // Si son todas SELECCION_UNICA (o similar sencillo), renderizar tabla ITEM | ¿CUMPLE?
            const allSimple = preguntas.every(q => q.tipo === 'SELECCION_UNICA' || q.tipo === 'BOOLEANO')
            const hasFotos = preguntas.some(q => q.tipo === 'FOTO')

            const titulo = nombre
                ? `<h2 style="margin:18px 0 8px 0;font-size:10pt;font-weight:700;border-bottom:2px solid #111827;padding-bottom:4px;">${escapeHtml(nombre)}</h2>`
                : ''

            if (allSimple) {
                const rows = preguntas
                    .map(q => {
                        const r = d.respuestas.find(x => x.pregunta_id === q.id)
                        return `
                            <tr>
                                <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:8.5pt;">${escapeHtml(q.texto)}</td>
                                <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:8.5pt;text-align:center;font-weight:600;width:120px;">${renderValorRespuesta(q, r)}</td>
                            </tr>
                            ${r?.nota ? `<tr><td colspan="2" style="padding:4px 8px;border:1px solid #d1d5db;background:#fffbeb;font-size:8pt;color:#78350f;"><em>Nota: ${escapeHtml(r.nota)}</em></td></tr>` : ''}
                        `
                    })
                    .join('')

                return `
                    ${titulo}
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;font-size:8.5pt;">ITEM INSPECCIONADO</th>
                            <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:center;font-size:8.5pt;width:120px;">¿CUMPLE?</th>
                        </tr>
                        ${rows}
                    </table>
                `
            }

            // Caso fotos: grid de 2 columnas
            if (hasFotos) {
                const cells = preguntas
                    .map(q => {
                        const r = d.respuestas.find(x => x.pregunta_id === q.id)
                        return `
                            <div style="border:1px solid #d1d5db;padding:8px;margin:4px;width:calc(50% - 16px);box-sizing:border-box;display:inline-block;vertical-align:top;">
                                <div style="font-size:8.5pt;font-weight:600;background:#f3f4f6;padding:4px 6px;border-bottom:1px solid #d1d5db;margin:-8px -8px 8px -8px;">${escapeHtml(q.texto)}</div>
                                <div style="text-align:center;font-size:9pt;font-weight:600;min-height:40px;">${renderValorRespuesta(q, r) || '&nbsp;'}</div>
                            </div>
                        `
                    })
                    .join('')

                return `${titulo}<div style="font-size:0;">${cells}</div>`
            }

            // Otros tipos
            const rows = preguntas
                .map(q => {
                    const r = d.respuestas.find(x => x.pregunta_id === q.id)
                    return `
                        <tr>
                            <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:8.5pt;width:60%;">${escapeHtml(q.texto)}</td>
                            <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:8.5pt;">${renderValorRespuesta(q, r)}</td>
                        </tr>
                    `
                })
                .join('')
            return `
                ${titulo}
                <table style="width:100%;border-collapse:collapse;">
                    ${rows}
                </table>
            `
        })
        .join('')

    // Observaciones + firma
    const observacionesBlock = d.muestra.observaciones && d.observaciones
        ? `
        <h2 style="margin:18px 0 6px 0;font-size:10pt;font-weight:700;border-bottom:2px solid #111827;padding-bottom:4px;">OBSERVACIONES</h2>
        <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <tr>
                <td style="padding:8px;border:1px solid #d1d5db;min-height:40px;white-space:pre-wrap;">${escapeHtml(d.observaciones)}</td>
            </tr>
        </table>
        `
        : ''

    const firmaBlock = d.muestra.firma
        ? `
        <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:9pt;">
            <tr>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:50%;">REGISTRADO POR</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:25%;">INICIO DE REPORTE</th>
                <th style="background:#f3f4f6;padding:6px 8px;border:1px solid #d1d5db;text-align:left;width:25%;">FIN DE REPORTE</th>
            </tr>
            <tr>
                <td style="padding:8px;border:1px solid #d1d5db;text-align:center;">
                    ${d.firma_url ? `<img src="${escapeHtml(d.firma_url)}" style="max-height:50px;max-width:200px;" /><br>` : ''}
                    <div style="font-weight:600;margin-top:4px;">${escapeHtml(d.firmante_nombre ?? '')}</div>
                </td>
                <td style="padding:8px;border:1px solid #d1d5db;">${formatoFecha(d.fecha_inicio)}</td>
                <td style="padding:8px;border:1px solid #d1d5db;">${formatoFecha(d.fecha_fin)}</td>
            </tr>
        </table>
        `
        : ''

    const footer = `
        <div style="margin-top:24px;font-size:7.5pt;color:#6b7280;text-align:left;border-top:1px solid #e5e7eb;padding-top:6px;">
            ${escapeHtml(d.nombre_formato)} ${escapeHtml(d.codigo_formato)}
            ${d.codigo_informe ? ` · ${escapeHtml(d.codigo_informe)}` : ''}
        </div>
    `

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(d.codigo_informe ?? d.codigo_formato)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 9pt;
    color: #111827;
    margin: 0;
    padding: 0;
  }
  table { page-break-inside: avoid; }
</style>
</head>
<body>
    <table style="width:100%;border-collapse:collapse;">${topTitle}</table>
    ${empresaBlock}
    ${clienteBlock}
    ${tareaBlock}
    ${maquinariaBlock}
    ${seccionesHtml}
    ${observacionesBlock}
    ${firmaBlock}
    ${footer}
</body>
</html>`
}
