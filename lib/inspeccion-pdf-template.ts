/**
 * Template HTML para PDFs de inspecciones (checklist SI/NO/NO_APLICA).
 * Replica el formato original CISE: tabla de ítems por categoría con columnas SI/NO/NA.
 */

function escapeHtml(s: string | null | undefined): string {
    if (s === null || s === undefined) return ''
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function formatFecha(iso: string | null): string {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleDateString('es-PE', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
    } catch { return iso }
}

export type InspeccionDetalleRow = {
    id: string
    categoria: string | null
    orden: number
    item: string
    estado: 'SI' | 'NO' | 'NO_APLICA' | 'OK' | 'FALLA' | string
    comentario: string | null
}

export type InspeccionPdfInput = {
    codigo_interno: string | null
    fecha_inspeccion: string | null
    puntaje: number | null
    tiene_fallas: boolean | null
    observaciones: string | null
    maquinaria: { nombre: string | null; codigo_interno: string | null; marca: string | null; modelo: string | null } | null
    empresa: { razon_social: string | null; ruc: string | null; logo_url: string | null }
    supervisor: { full_name: string | null } | null
    detalles: InspeccionDetalleRow[]
    // config por tenant
    codigo_formato: string | null
    version_formato: string | null
    fecha_formato: string | null
}

function check(estado: string, expected: string): string {
    // mapeo v1 (OK/FALLA) → v2 (SI/NO)
    const normalized = estado === 'OK' ? 'SI' : estado === 'FALLA' ? 'NO' : estado
    return normalized === expected
        ? `<span style="font-weight:700;color:${expected === 'NO' ? '#dc2626' : expected === 'SI' ? '#16a34a' : '#6b7280'}">✓</span>`
        : ''
}

export function renderInspeccionPdfHtml(d: InspeccionPdfInput): string {
    // Agrupar detalles por categoría
    const cats = new Map<string, InspeccionDetalleRow[]>()
    for (const det of d.detalles) {
        const key = det.categoria ?? 'General'
        if (!cats.has(key)) cats.set(key, [])
        cats.get(key)!.push(det)
    }

    const logo = d.empresa.logo_url
        ? `<img src="${escapeHtml(d.empresa.logo_url)}" alt="Logo" style="max-height:40px;max-width:120px;object-fit:contain;" />`
        : `<div style="font-weight:800;font-size:11pt;color:#f97316;font-style:italic;">REPORTAR.APP</div><div style="font-size:7pt;color:#6b7280;margin-top:2px;">Planifica, reporta y valoriza en minutos</div>`

    const puntajeColor = d.puntaje === null ? '#6b7280' : d.puntaje >= 80 ? '#16a34a' : d.puntaje >= 60 ? '#d97706' : '#dc2626'

    const header = `
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
            <tr>
                <td style="padding:8px 10px;border:1px solid #d1d5db;width:15%;vertical-align:middle;">${logo}</td>
                <td style="padding:8px 10px;border:1px solid #d1d5db;vertical-align:middle;font-weight:700;font-size:11pt;">
                    INSPECCIÓN DIARIA DE GRÚA
                    ${d.codigo_formato ? `<span style="font-weight:400;font-size:9pt;color:#6b7280;display:block;">${escapeHtml(d.codigo_formato)}</span>` : ''}
                </td>
                <td style="padding:8px 10px;border:1px solid #d1d5db;width:22%;vertical-align:middle;text-align:right;font-size:9pt;">
                    ${d.version_formato ? `<div style="font-weight:700;">${escapeHtml(d.version_formato)}</div>` : ''}
                    ${d.fecha_formato ? `<div style="color:#6b7280;">${escapeHtml(d.fecha_formato)}</div>` : ''}
                </td>
            </tr>
        </table>
    `

    const metaBlock = `
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:9pt;">
            <tr>
                <th style="background:#f3f4f6;padding:5px 8px;border:1px solid #d1d5db;text-align:left;width:20%;">EMPRESA</th>
                <td style="padding:5px 8px;border:1px solid #d1d5db;font-weight:600;" colspan="3">${escapeHtml(d.empresa.razon_social ?? '')} ${d.empresa.ruc ? `· RUC ${escapeHtml(d.empresa.ruc)}` : ''}</td>
            </tr>
            <tr>
                <th style="background:#f3f4f6;padding:5px 8px;border:1px solid #d1d5db;text-align:left;">EQUIPO</th>
                <td style="padding:5px 8px;border:1px solid #d1d5db;">
                    ${d.maquinaria ? `${escapeHtml(d.maquinaria.nombre ?? '')} ${d.maquinaria.marca ? `(${escapeHtml(d.maquinaria.marca)} ${escapeHtml(d.maquinaria.modelo ?? '')})` : ''}` : '—'}
                    ${d.maquinaria?.codigo_interno ? `<span style="color:#6b7280;font-size:8pt;"> · ${escapeHtml(d.maquinaria.codigo_interno)}</span>` : ''}
                </td>
                <th style="background:#f3f4f6;padding:5px 8px;border:1px solid #d1d5db;text-align:left;width:15%;">FECHA</th>
                <td style="padding:5px 8px;border:1px solid #d1d5db;width:22%;">${formatFecha(d.fecha_inspeccion)}</td>
            </tr>
            <tr>
                <th style="background:#f3f4f6;padding:5px 8px;border:1px solid #d1d5db;text-align:left;">CÓDIGO</th>
                <td style="padding:5px 8px;border:1px solid #d1d5db;font-family:monospace;">${escapeHtml(d.codigo_interno ?? '—')}</td>
                <th style="background:#f3f4f6;padding:5px 8px;border:1px solid #d1d5db;text-align:left;">SUPERVISOR</th>
                <td style="padding:5px 8px;border:1px solid #d1d5db;">${escapeHtml(d.supervisor?.full_name ?? '—')}</td>
            </tr>
        </table>
    `

    const catRows = Array.from(cats.entries()).map(([catName, items]) => {
        const sorted = [...items].sort((a, b) => a.orden - b.orden)
        const catHeader = `
            <tr>
                <td colspan="5" style="background:#1e3a5f;color:#fff;padding:5px 8px;font-size:9pt;font-weight:700;border:1px solid #d1d5db;">
                    ${escapeHtml(catName)}
                </td>
            </tr>
        `
        const rows = sorted.map((d, idx) => {
            const comentario = d.comentario ? `<div style="font-size:7.5pt;color:#78350f;background:#fffbeb;padding:2px 4px;margin-top:2px;border-radius:2px;">Obs: ${escapeHtml(d.comentario)}</div>` : ''
            return `
                <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9fafb'};">
                    <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:8.5pt;">${escapeHtml(d.item)}</td>
                    <td style="padding:4px 6px;border:1px solid #e5e7eb;text-align:center;width:40px;">${check(d.estado, 'SI')}</td>
                    <td style="padding:4px 6px;border:1px solid #e5e7eb;text-align:center;width:40px;">${check(d.estado, 'NO')}</td>
                    <td style="padding:4px 6px;border:1px solid #e5e7eb;text-align:center;width:60px;">${check(d.estado, 'NO_APLICA')}</td>
                </tr>
                ${comentario ? `<tr><td colspan="4" style="padding:0 8px 4px 8px;border:1px solid #e5e7eb;border-top:none;">${comentario}</td></tr>` : ''}
            `
        }).join('')

        return catHeader + rows
    }).join('')

    const tablaItems = `
        <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:8.5pt;">
            <thead>
                <tr style="background:#f3f4f6;">
                    <th style="padding:5px 8px;border:1px solid #d1d5db;text-align:left;">ÍTEM INSPECCIONADO</th>
                    <th style="padding:5px 8px;border:1px solid #d1d5db;width:40px;text-align:center;">SI</th>
                    <th style="padding:5px 8px;border:1px solid #d1d5db;width:40px;text-align:center;">NO</th>
                    <th style="padding:5px 8px;border:1px solid #d1d5db;width:60px;text-align:center;">NO APLICA</th>
                </tr>
            </thead>
            <tbody>
                ${catRows}
            </tbody>
        </table>
    `

    const puntajeBlock = d.puntaje !== null ? `
        <div style="margin-top:10px;text-align:right;font-size:9pt;">
            Puntaje: <span style="font-weight:700;color:${puntajeColor};">${d.puntaje}%</span>
            ${d.tiene_fallas ? '<span style="margin-left:8px;color:#dc2626;font-size:8pt;">⚠ Con fallas detectadas</span>' : ''}
        </div>
    ` : ''

    const obsBlock = d.observaciones ? `
        <div style="margin-top:10px;border:1px solid #d1d5db;padding:8px;border-radius:4px;font-size:9pt;">
            <div style="font-weight:700;margin-bottom:4px;">OBSERVACIONES</div>
            <div style="white-space:pre-wrap;">${escapeHtml(d.observaciones)}</div>
        </div>
    ` : ''

    const firmaBlock = `
        <div style="margin-top:24px;display:flex;gap:40px;">
            <div style="flex:1;border-top:1px solid #374151;padding-top:4px;font-size:8pt;text-align:center;">
                <div>Realizado por</div>
                <div style="font-weight:600;margin-top:2px;">${escapeHtml(d.supervisor?.full_name ?? '—')}</div>
            </div>
        </div>
    `

    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8" />
            <style>
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 9pt; color: #111827; margin: 0; padding: 0; }
            </style>
        </head>
        <body>
            ${header}
            ${metaBlock}
            ${tablaItems}
            ${puntajeBlock}
            ${obsBlock}
            ${firmaBlock}
        </body>
        </html>
    `
}
