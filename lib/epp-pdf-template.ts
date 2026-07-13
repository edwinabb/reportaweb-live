/**
 * Plantilla HTML para GP-SST-FR — formato de entrega de EPP.
 * Reconstruida desde el documento de propuesta (Marzo 2026). El usuario valida
 * visualmente tras la primera impresión y ajustamos.
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export type EppPdfData = {
    entrega: {
        id: string
        fecha_entrega: string
        observaciones?: string | null
    }
    colaborador: {
        first_name?: string | null
        last_name?: string | null
        doc_number?: string | null
    }
    cargo?: string | null
    responsable?: {
        first_name?: string | null
        last_name?: string | null
    } | null
    items: Array<{
        cantidad: number
        fecha_vencimiento: string
        catalogo: {
            epp_nombre?: string | null
            tipo?: string | null
        } | null
    }>
    company: {
        razon_social?: string | null
        name?: string | null
        ruc?: string | null
        direccion?: string | null
        telefono?: string | null
        logo_url?: string | null
    }
    logoPublicUrl?: string | null
}

function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined) {
    if (!p) return ''
    return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

export function renderEppEntregaHtml(data: EppPdfData): string {
    const { entrega, colaborador, cargo, responsable, items, company, logoPublicUrl } = data
    const fechaFmt = format(new Date(entrega.fecha_entrega), "d 'de' MMMM yyyy", { locale: es })
    const codigo = `GP-SST-FR · ${entrega.id.slice(0, 8).toUpperCase()}`

    const logoBlock = logoPublicUrl
        ? `<img src="${escapeHtml(logoPublicUrl)}" alt="Logo" style="height: 54px; object-fit: contain;" />`
        : `<div style="height: 54px; width: 54px; background: #f97316; color: #fff; display:flex; align-items:center; justify-content:center; font-weight: 900; border-radius: 4px;">${escapeHtml((company.name || '?').slice(0, 4))}</div>`

    const itemsRows = items.map((it, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${escapeHtml(it.catalogo?.epp_nombre || '—')}</td>
            <td style="text-align:center;">${escapeHtml(it.catalogo?.tipo === 'EE' ? 'Equipo Emergencia' : 'EPP')}</td>
            <td style="text-align:center;">${it.cantidad}</td>
            <td style="text-align:center;">${format(new Date(entrega.fecha_entrega), 'dd/MM/yyyy')}</td>
            <td style="text-align:center;">${format(new Date(it.fecha_vencimiento), 'dd/MM/yyyy')}</td>
        </tr>
    `).join('')

    return `<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <title>${codigo}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; margin: 0; padding: 0; font-size: 11px; }
        .header { border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px; }
        .header .logo { flex-shrink: 0; }
        .header .company { flex: 1; }
        .header .company .name { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
        .header .company .meta { font-size: 10px; color: #4b5563; margin-top: 2px; }
        .header .code { text-align: right; font-size: 10px; color: #4b5563; }
        .header .code .codigo { font-weight: 700; color: #111827; font-size: 12px; }
        h1.title { font-size: 14px; text-align: center; font-weight: 700; text-transform: uppercase; margin: 12px 0; letter-spacing: 0.5px; }
        .datos-colab { border: 1px solid #d1d5db; padding: 10px 12px; margin-bottom: 14px; border-radius: 4px; background: #f9fafb; }
        .datos-colab table { width: 100%; border-collapse: collapse; }
        .datos-colab td { padding: 2px 4px; font-size: 11px; }
        .datos-colab td.label { color: #6b7280; width: 130px; font-weight: 600; text-transform: uppercase; font-size: 10px; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th { background: #111827; color: #fff; padding: 8px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
        table.items td { padding: 7px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        table.items tr:nth-child(even) td { background: #f9fafb; }
        .observaciones { margin-top: 18px; padding: 10px 12px; border: 1px dashed #d1d5db; border-radius: 4px; font-size: 10px; color: #4b5563; min-height: 40px; }
        .observaciones .label { font-weight: 700; text-transform: uppercase; font-size: 9px; color: #6b7280; margin-bottom: 4px; }
        .firmas { margin-top: 50px; display: flex; justify-content: space-around; gap: 30px; }
        .firmas .firma { flex: 1; text-align: center; font-size: 10px; }
        .firmas .firma .line { border-top: 1px solid #111827; margin-top: 50px; padding-top: 4px; }
        .firmas .firma .role { color: #6b7280; text-transform: uppercase; font-size: 9px; }
        .firmas .firma .name { font-weight: 600; margin-top: 2px; }
        .pie { margin-top: 30px; text-align: center; font-size: 9px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${logoBlock}</div>
        <div class="company">
            <div class="name">${escapeHtml(company.razon_social || company.name || '')}</div>
            <div class="meta">
                ${company.ruc ? `RUC: ${escapeHtml(company.ruc)}` : ''}
                ${company.direccion ? ` · ${escapeHtml(company.direccion)}` : ''}
                ${company.telefono ? ` · Tel: ${escapeHtml(company.telefono)}` : ''}
            </div>
        </div>
        <div class="code">
            <div class="codigo">${escapeHtml(codigo)}</div>
            <div>Fecha: ${escapeHtml(fechaFmt)}</div>
        </div>
    </div>

    <h1 class="title">Formato de Entrega de Equipos de Protección Personal</h1>

    <div class="datos-colab">
        <table>
            <tr>
                <td class="label">Colaborador</td>
                <td>${escapeHtml(fullName(colaborador) || '—')}</td>
                <td class="label">DNI</td>
                <td>${escapeHtml(colaborador.doc_number || '—')}</td>
            </tr>
            <tr>
                <td class="label">Cargo</td>
                <td>${escapeHtml(cargo || '—')}</td>
                <td class="label">Fecha de entrega</td>
                <td>${escapeHtml(fechaFmt)}</td>
            </tr>
        </table>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 30px;">#</th>
                <th>EPP</th>
                <th style="width: 120px;">Tipo</th>
                <th style="width: 60px;">Cant.</th>
                <th style="width: 90px;">Entregado</th>
                <th style="width: 90px;">Vence</th>
            </tr>
        </thead>
        <tbody>
            ${itemsRows || `<tr><td colspan="6" style="text-align:center; color:#9ca3af; padding: 20px;">Sin items</td></tr>`}
        </tbody>
    </table>

    <div class="observaciones">
        <div class="label">Observaciones</div>
        ${escapeHtml(entrega.observaciones || '—')}
    </div>

    <div class="firmas">
        <div class="firma">
            <div class="line">
                <div class="name">${escapeHtml(fullName(colaborador) || '—')}</div>
                <div class="role">Firma del colaborador</div>
            </div>
        </div>
        <div class="firma">
            <div class="line">
                <div class="name">${escapeHtml(fullName(responsable) || '—')}</div>
                <div class="role">Responsable SST</div>
            </div>
        </div>
    </div>

    <div class="pie">Documento generado automáticamente por el sistema · Formato oficial ${escapeHtml(codigo)}</div>
</body>
</html>`
}

function escapeHtml(s?: string | null): string {
    if (!s) return ''
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
