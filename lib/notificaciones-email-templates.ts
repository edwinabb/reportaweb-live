// lib/notificaciones-email-templates.ts

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function diasRestantes(fechaVenc: string): number {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const venc = new Date(fechaVenc)
    venc.setHours(0, 0, 0, 0)
    return Math.ceil((venc.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(fecha: string): string {
    const [y, m, d] = fecha.split('T')[0].split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export interface DocMaquinariaRow {
    maquinaria: string
    tipo_doc: string
    numero_doc?: string
    fecha_vencimiento: string
}

export interface DocPersonalRow {
    persona: string
    tipo_doc: string
    numero_doc?: string
    fecha_vencimiento: string
}

export function renderMaquinariaVencidosEmailHtml(data: {
    nombre: string
    tenantNombre: string
    vencidos: DocMaquinariaRow[]
    porVencer: DocMaquinariaRow[]
    siteUrl: string
}): string {
    const { nombre, tenantNombre, vencidos, porVencer, siteUrl } = data

    const rowsMaq = (rows: DocMaquinariaRow[], esVencido: boolean) =>
        rows.map(r => {
            const dias = diasRestantes(r.fecha_vencimiento)
            const badge = esVencido
                ? `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">VENCIDO</span>`
                : `<span style="background:#f97316;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${dias}d</span>`
            return `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.maquinaria)}</td>
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.tipo_doc)}</td>
                <td style="padding:8px 10px;font-size:13px;">${r.numero_doc ? escapeHtml(r.numero_doc) : '-'}</td>
                <td style="padding:8px 10px;font-size:13px;">${formatFecha(r.fecha_vencimiento)}</td>
                <td style="padding:8px 10px;text-align:center;">${badge}</td>
            </tr>`
        }).join('')

    const tableHeaders = `
        <tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Equipo</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Documento</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Número</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280;">Estado</th>
        </tr>`

    const seccionVencidos = vencidos.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#dc2626;">⚠️ Documentos Vencidos (${vencidos.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsMaq(vencidos, true)}</tbody>
        </table>`

    const seccionPorVencer = porVencer.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#ea580c;">⏰ Próximos a Vencer — 15 días (${porVencer.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsMaq(porVencer, false)}</tbody>
        </table>`

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Documentos Maquinaria</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#0f172a;padding:20px 28px;">
            <span style="color:#f97316;font-size:22px;font-weight:700;">REPORTA</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:12px;">Alerta de Documentos — Maquinaria</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 8px;font-size:15px;color:#111827;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">
              A continuación el resumen de documentos de maquinaria para <strong>${escapeHtml(tenantNombre)}</strong>
              que requieren atención.
            </p>
            ${seccionVencidos}
            ${seccionPorVencer}
            ${vencidos.length === 0 && porVencer.length === 0
                ? '<p style="color:#6b7280;font-size:14px;">No hay documentos vencidos ni próximos a vencer.</p>'
                : ''}
            <div style="margin-top:32px;text-align:center;">
              <a href="${escapeHtml(siteUrl)}/maquinaria"
                 style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
                Ver Panel de Maquinaria
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Este correo fue generado automáticamente por REPORTA · <a href="${escapeHtml(siteUrl)}" style="color:#f97316;">reportar.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function renderPersonalVencidosEmailHtml(data: {
    nombre: string
    tenantNombre: string
    vencidos: DocPersonalRow[]
    porVencer: DocPersonalRow[]
    siteUrl: string
}): string {
    const { nombre, tenantNombre, vencidos, porVencer, siteUrl } = data

    const rowsPersonal = (rows: DocPersonalRow[], esVencido: boolean) =>
        rows.map(r => {
            const dias = diasRestantes(r.fecha_vencimiento)
            const badge = esVencido
                ? `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">VENCIDO</span>`
                : `<span style="background:#f97316;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${dias}d</span>`
            return `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.persona)}</td>
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.tipo_doc)}</td>
                <td style="padding:8px 10px;font-size:13px;">${r.numero_doc ? escapeHtml(r.numero_doc) : '-'}</td>
                <td style="padding:8px 10px;font-size:13px;">${formatFecha(r.fecha_vencimiento)}</td>
                <td style="padding:8px 10px;text-align:center;">${badge}</td>
            </tr>`
        }).join('')

    const tableHeaders = `
        <tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Colaborador</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Documento</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Número</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280;">Estado</th>
        </tr>`

    const seccionVencidos = vencidos.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#dc2626;">⚠️ Documentos Vencidos (${vencidos.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsPersonal(vencidos, true)}</tbody>
        </table>`

    const seccionPorVencer = porVencer.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#ea580c;">⏰ Próximos a Vencer — 15 días (${porVencer.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsPersonal(porVencer, false)}</tbody>
        </table>`

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Documentos Personal</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#0f172a;padding:20px 28px;">
            <span style="color:#f97316;font-size:22px;font-weight:700;">REPORTA</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:12px;">Alerta de Documentos — Personal</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 8px;font-size:15px;color:#111827;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">
              A continuación el resumen de documentos de personal para <strong>${escapeHtml(tenantNombre)}</strong>
              que requieren atención.
            </p>
            ${seccionVencidos}
            ${seccionPorVencer}
            ${vencidos.length === 0 && porVencer.length === 0
                ? '<p style="color:#6b7280;font-size:14px;">No hay documentos vencidos ni próximos a vencer.</p>'
                : ''}
            <div style="margin-top:32px;text-align:center;">
              <a href="${escapeHtml(siteUrl)}/personal"
                 style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
                Ver Panel de Personal
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Este correo fue generado automáticamente por REPORTA · <a href="${escapeHtml(siteUrl)}" style="color:#f97316;">reportar.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
