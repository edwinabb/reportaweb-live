export interface ReporteCombustiblePdfData {
    registro_numero: string
    fecha_reporte: string | null
    equipo: { nombre: string | null; codigo_interno: string | null } | null
    tipo_combustible: string | null
    galones: number | null
    precio_unitario: number | null
    monto_subtotal: number | null
    monto_igv: number | null
    monto_total: number | null
    proveedor_grifo: string | null
    horometro_actual: number | null
    kilometraje_actual: number | null
    foto_tablero_url: string | null
    foto_surtidor_url: string | null
    foto_voucher_url: string | null
    tarea: { codigo: string | null; titulo: string | null } | null
    empresa: { razon_social: string | null; ruc: string | null; logo_url: string | null } | null
    registrado_por: string | null
}

function fmt(n: number | null | undefined, decimals = 2) {
    if (n == null) return '—'
    return `S/ ${Number(n).toFixed(decimals)}`
}

function fmtNum(n: number | null | undefined) {
    if (n == null || n === 0) return '—'
    return String(n)
}

function fotoBlock(url: string | null, label: string) {
    if (!url) return ''
    return `
    <div class="foto-block">
        <p class="foto-label">${label}</p>
        <img src="${url}" alt="${label}" class="foto-img" />
    </div>`
}

export function renderReporteCombustibleHtml(d: ReporteCombustiblePdfData): string {
    const logoHtml = d.empresa?.logo_url
        ? `<img src="${d.empresa.logo_url}" alt="${d.empresa.razon_social ?? ''}" class="logo" />`
        : `<span class="empresa-nombre">${d.empresa?.razon_social ?? 'Empresa'}</span>`

    const fotos = [
        fotoBlock(d.foto_tablero_url, 'Tablero / Horómetro'),
        fotoBlock(d.foto_surtidor_url, 'Surtidor'),
        fotoBlock(d.foto_voucher_url, 'Voucher / Factura'),
    ].filter(Boolean).join('')

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 24px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #ea580c; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { max-height: 52px; max-width: 160px; object-fit: contain; }
  .empresa-nombre { font-size: 16px; font-weight: 800; color: #ea580c; }
  .doc-info { text-align: right; }
  .doc-titulo { font-size: 14px; font-weight: 700; color: #0f172a; }
  .doc-num { font-size: 11px; color: #64748b; margin-top: 2px; }
  .section { margin-bottom: 12px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; background: #f1f5f9; padding: 4px 8px; margin-bottom: 6px; border-left: 3px solid #ea580c; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; }
  .field { display: flex; flex-direction: column; }
  .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; color: #94a3b8; margin-bottom: 1px; }
  .field-value { font-size: 11px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; min-height: 18px; }
  .totales-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .total-item { text-align: center; }
  .total-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; }
  .total-value { font-size: 13px; font-weight: 700; color: #1e293b; }
  .total-value.destacado { font-size: 15px; color: #ea580c; }
  .fotos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; }
  .foto-block { display: flex; flex-direction: column; gap: 4px; }
  .foto-label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.3px; }
  .foto-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; }
  .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
</style>
</head>
<body>
<div class="header">
  <div>${logoHtml}</div>
  <div class="doc-info">
    <div class="doc-titulo">REPORTE DE COMBUSTIBLE</div>
    <div class="doc-num">N° ${d.registro_numero}</div>
    <div class="doc-num">${d.fecha_reporte ?? '—'}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Tarea</div>
  <div class="grid2">
    <div class="field"><span class="field-label">Código</span><span class="field-value">${d.tarea?.codigo ?? '—'}</span></div>
    <div class="field"><span class="field-label">Descripción</span><span class="field-value">${d.tarea?.titulo ?? '—'}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Equipo y Combustible</div>
  <div class="grid3">
    <div class="field"><span class="field-label">Equipo</span><span class="field-value">${d.equipo?.nombre ?? '—'}</span></div>
    <div class="field"><span class="field-label">Código interno</span><span class="field-value">${d.equipo?.codigo_interno ?? '—'}</span></div>
    <div class="field"><span class="field-label">Tipo combustible</span><span class="field-value">${(d.tipo_combustible ?? '—').replace('_', ' ')}</span></div>
  </div>
  <div class="grid3" style="margin-top:6px;">
    <div class="field"><span class="field-label">Galones</span><span class="field-value">${d.galones ?? '—'}</span></div>
    <div class="field"><span class="field-label">Precio unitario</span><span class="field-value">${fmt(d.precio_unitario)}</span></div>
    <div class="field"><span class="field-label">Proveedor / Grifo</span><span class="field-value">${d.proveedor_grifo ?? '—'}</span></div>
  </div>
  <div class="grid2" style="margin-top:6px;">
    <div class="field"><span class="field-label">Horómetro actual</span><span class="field-value">${fmtNum(d.horometro_actual)} ${d.horometro_actual ? 'h' : ''}</span></div>
    <div class="field"><span class="field-label">Kilometraje actual</span><span class="field-value">${fmtNum(d.kilometraje_actual)} ${d.kilometraje_actual ? 'km' : ''}</span></div>
  </div>
</div>

<div class="totales-box">
  <div class="total-item"><div class="total-label">Subtotal</div><div class="total-value">${fmt(d.monto_subtotal)}</div></div>
  <div class="total-item"><div class="total-label">IGV (18%)</div><div class="total-value">${fmt(d.monto_igv)}</div></div>
  <div class="total-item"><div class="total-label">Total</div><div class="total-value destacado">${fmt(d.monto_total)}</div></div>
</div>

${fotos ? `<div class="section" style="margin-top:16px;"><div class="section-title">Fotos de evidencia</div><div class="fotos-grid">${fotos}</div></div>` : ''}

<div class="footer">
  <span>Registrado por: <strong>${d.registrado_por ?? '—'}</strong></span>
  <span>${d.empresa?.razon_social ?? ''} ${d.empresa?.ruc ? `· RUC ${d.empresa.ruc}` : ''}</span>
</div>
</body>
</html>`
}
