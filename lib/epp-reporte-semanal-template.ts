/**
 * Template HTML para el reporte semanal EPP.
 * Fase K — contiene resumen de entregas, alertas y estado del parque EPP
 * de los últimos 7 días.
 */

export type ReporteSemanalData = {
    tenant_nombre: string
    destinatario_nombre: string
    periodo_inicio: string           // ISO date
    periodo_fin: string              // ISO date
    entregas_periodo: number
    total_alertas_pendientes: number
    vencidos: number
    d15: number
    d30: number
    top_epp_proximos: Array<{
        epp_nombre: string
        colaborador: string
        fecha_vencimiento: string
        dias: number
    }>
    url_panel: string
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

function formatoFechaCorta(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    } catch {
        return iso
    }
}

export function renderEppReporteSemanalHtml(d: ReporteSemanalData): string {
    const periodo = `${formatoFechaCorta(d.periodo_inicio)} — ${formatoFechaCorta(d.periodo_fin)}`

    const kpi = (label: string, value: number | string, color: string) => `
        <td width="25%" align="center" style="padding:12px 8px;">
            <div style="font-size:28px;font-weight:800;color:${color};">${value}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${label}</div>
        </td>
    `

    const proxRows = d.top_epp_proximos
        .map(
            p => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;">${escapeHtml(p.epp_nombre)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${escapeHtml(p.colaborador)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${escapeHtml(p.fecha_vencimiento)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;${p.dias <= 0 ? 'color:#dc2626;font-weight:700;' : ''}">${p.dias} d</td>
        </tr>
    `
        )
        .join('')

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Reporte EPP semanal — ${escapeHtml(d.tenant_nombre)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <table width="100%" style="background:#f3f4f6;padding:24px 0;">
        <tr>
            <td align="center">
                <table width="640" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:20px 24px;color:#fff;">
                            <div style="font-size:20px;font-weight:800;font-style:italic;">REPORTA</div>
                            <div style="font-size:14px;opacity:0.9;margin-top:4px;">Reporte Semanal de EPP · ${escapeHtml(d.tenant_nombre)}</div>
                            <div style="font-size:12px;opacity:0.75;margin-top:2px;">${periodo}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px;">
                            <p style="margin:0 0 16px 0;font-size:14px;">Hola ${escapeHtml(d.destinatario_nombre)},</p>
                            <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">
                                Resumen del estado del parque de EPP del tenant.
                            </p>

                            <table width="100%" style="border:1px solid #e5e7eb;border-radius:6px;margin-top:8px;">
                                <tr>
                                    ${kpi('Entregas semana', d.entregas_periodo, '#0369a1')}
                                    ${kpi('Vencidos', d.vencidos, '#dc2626')}
                                    ${kpi('≤ 15 días', d.d15, '#ea580c')}
                                    ${kpi('≤ 30 días', d.d30, '#ca8a04')}
                                </tr>
                            </table>

                            ${d.top_epp_proximos.length > 0
                                ? `
                            <h3 style="margin:24px 0 10px 0;font-size:14px;color:#111827;">Próximos a vencer (top 10)</h3>
                            <table width="100%" style="border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#f9fafb;">
                                        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">EPP</th>
                                        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Colaborador</th>
                                        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Vence</th>
                                        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Días</th>
                                    </tr>
                                </thead>
                                <tbody>${proxRows}</tbody>
                            </table>
                            `
                                : ''}

                            <div style="text-align:center;margin-top:28px;">
                                <a href="${escapeHtml(d.url_panel)}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
                                    Ver panel EPP
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
                            Reporta.la · Este reporte se envía cada lunes por la mañana.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}
