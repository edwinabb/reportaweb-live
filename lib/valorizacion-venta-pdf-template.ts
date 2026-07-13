/**
 * Plantilla HTML para Valorización de Servicios — formato G.PAC-04 V.05 (GRUAS) o equivalente.
 *
 * Lee `config_valorizacion_venta` del tenant para el header del PDF y los defaults de IGV/detracción.
 * El consecutivo tiene formato YYYY-NNNNN(tipo_servicio) — se genera del lado server.
 *
 * Multi-página automática (CSS `table-layout:auto` + page-break).
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export type ConfigValorizacionVenta = {
    codigo_formato: string
    version_formato: string
    fecha_formato: string
    igv_default: number       // 18.00
    detraccion_default: number // 10.00
}

export type ValorizacionVentaItem = {
    fecha_reporte: string
    numero_reporte: string          // registro interno ej. 27442
    detalle_factura: string         // ej. "ALQUILER CAMION GRUA 24 TN - ESTACIONES AMPHOS"
    placa?: string | null
    hora_inicio_1?: string | null
    hora_fin_1?: string | null
    hora_inicio_2?: string | null
    hora_fin_2?: string | null
    recorrido?: number | null       // horas
    horas_trabajadas?: number | null
    total_facturar?: number | null  // horas a facturar
    precio_unitario?: number | null
    subtotal?: number | null
    moneda?: 'PEN' | 'USD'
}

export type ValorizacionVentaPdfData = {
    consecutivo: string             // ej. "2026-01981(24 TN)"
    fecha_valorizacion: string      // ISO date
    cliente: {
        razon_social?: string | null
        ruc?: string | null
    }
    items: ValorizacionVentaItem[]
    moneda: 'PEN' | 'USD'
    igv_porcentaje?: number | null  // override del default (18)
    detraccion_porcentaje?: number | null
    subtotal: number
    igv_monto: number
    detraccion_monto?: number | null
    total_facturar: number
    horas_totales?: number | null
    total_facturar_horas?: number | null
    preparado_por?: string | null
    preparado_fecha?: string | null
    ultima_edicion_por?: string | null
    ultima_edicion_fecha?: string | null
    company: {
        razon_social?: string | null
        name?: string | null
        ruc?: string | null
        direccion?: string | null
        logo_url?: string | null
    }
    config: ConfigValorizacionVenta
}

function escapeHtml(s: string | null | undefined): string {
    if (s == null) return ''
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function money(n: number | null | undefined, moneda: 'PEN' | 'USD' = 'USD'): string {
    if (n == null) return ''
    const sign = moneda === 'USD' ? '$' : 'S/ '
    return sign + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function plain(n: number | null | undefined, frac: number = 2): string {
    if (n == null) return ''
    return Number(n).toLocaleString('es-PE', { minimumFractionDigits: frac, maximumFractionDigits: frac })
}

function horas(n: number | null | undefined): string {
    if (n == null || n === 0) return '0'
    return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

function formatFechaCorta(iso: string): string {
    try {
        return format(new Date(iso), "d-MMM-yyyy", { locale: es }).toLowerCase()
    } catch {
        return iso
    }
}

function formatFechaLarga(iso: string): string {
    try {
        return format(new Date(iso), "EEE, d 'de' MMMM 'de' yyyy", { locale: es })
    } catch {
        return iso
    }
}

function diaSemana(iso: string): string {
    try {
        return format(new Date(iso), 'EEE', { locale: es }).toUpperCase()
    } catch {
        return ''
    }
}

export function renderValorizacionVentaHtml(data: ValorizacionVentaPdfData): string {
    const { consecutivo, fecha_valorizacion, cliente, items, moneda,
            igv_porcentaje, detraccion_porcentaje,
            subtotal, igv_monto, detraccion_monto, total_facturar,
            horas_totales, total_facturar_horas,
            preparado_por, preparado_fecha, ultima_edicion_por, ultima_edicion_fecha,
            company, config } = data

    const igvPct = igv_porcentaje ?? config.igv_default
    const detrPct = detraccion_porcentaje ?? config.detraccion_default

    const logoBlock = company.logo_url
        ? `<img src="${escapeHtml(company.logo_url)}" alt="Logo" style="height: 54px; object-fit: contain;" />`
        : `<div style="height: 54px; width: 54px; background: #f97316; color: #fff; display:flex; align-items:center; justify-content:center; font-weight: 900; border-radius: 4px;">${escapeHtml((company.name || '?').slice(0, 4))}</div>`

    // Cálculo de totales de columnas horas / total facturar (sumatoria)
    const sumHorasTrabajadas = items.reduce((s, it) => s + (it.horas_trabajadas || 0), 0)
    const sumTotalFacturar = items.reduce((s, it) => s + (it.total_facturar || 0), 0)

    const itemsRows = items.map((it) => `
        <tr>
            <td class="center">${escapeHtml(formatFechaCorta(it.fecha_reporte))}</td>
            <td class="center">${escapeHtml(diaSemana(it.fecha_reporte))}</td>
            <td class="center">${escapeHtml(it.numero_reporte)}</td>
            <td>${escapeHtml(it.detalle_factura)}</td>
            <td class="center">${escapeHtml(it.placa || '-')}</td>
            <td class="center">${escapeHtml(it.hora_inicio_1 || '-')}</td>
            <td class="center">${escapeHtml(it.hora_fin_1 || '-')}</td>
            <td class="center">${escapeHtml(it.hora_inicio_2 || '-')}</td>
            <td class="center">${escapeHtml(it.hora_fin_2 || '-')}</td>
            <td class="center">${horas(it.recorrido)}</td>
            <td class="center">${horas(it.horas_trabajadas)}</td>
            <td class="center">${horas(it.total_facturar)}</td>
            <td class="right">${plain(it.precio_unitario)}</td>
            <td class="right">${plain(it.subtotal)}</td>
        </tr>
    `).join('')

    const totalRow = `
        <tr class="totals-row">
            <td colspan="9" class="right"><strong>TOTALES</strong></td>
            <td class="center"><strong>${horas(horas_totales ?? 0)}</strong></td>
            <td class="center"><strong>${horas(sumHorasTrabajadas)}</strong></td>
            <td class="center"><strong>${horas(total_facturar_horas ?? sumTotalFacturar)}</strong></td>
            <td></td>
            <td class="right"><strong>${plain(subtotal)}</strong></td>
        </tr>
    `

    const resumenTotales = `
        <table class="resumen">
            <tr><td class="label">SUBTOTAL</td><td class="value">${money(subtotal, moneda)}</td></tr>
            ${detraccion_monto != null ? `
                <tr><td class="label">${plain(detrPct, 1)}% DETRACCIÓN:</td><td class="value">${money(detraccion_monto, moneda)}</td></tr>
            ` : ''}
            <tr><td class="label">IGV (${plain(igvPct, 0)}%)</td><td class="value">${money(igv_monto, moneda)}</td></tr>
            <tr class="total-final"><td class="label">TOTAL A FACTURAR</td><td class="value">${money(total_facturar, moneda)}</td></tr>
        </table>
    `

    const preparadoFechaFmt = preparado_fecha ? formatFechaLarga(preparado_fecha) : ''
    const ultimaEdicionFechaFmt = ultima_edicion_fecha ? formatFechaLarga(ultima_edicion_fecha) : ''

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Valorización de Servicios ${escapeHtml(consecutivo)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4 landscape; margin: 0.4in 0.3in; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8px; color: #111; margin: 0; padding: 0; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding: 6px 4px; }
  .header .title { font-size: 14px; font-weight: 700; text-align: center; flex: 1; }
  .header .format-info { text-align: right; font-size: 9px; line-height: 1.3; }
  table.meta { width: 100%; border-collapse: collapse; margin: 6px 0; }
  table.meta th, table.meta td { border: 1px solid #888; padding: 4px 6px; font-size: 9px; }
  table.meta th { background: #f3f3f3; font-weight: 700; text-align: center; }
  table.items { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 7.5px; }
  table.items th, table.items td { border: 1px solid #888; padding: 3px 4px; }
  table.items th { background: #f3f3f3; font-weight: 700; text-align: center; font-size: 7.5px; }
  table.items td.center { text-align: center; }
  table.items td.right { text-align: right; }
  table.items tr.totals-row td { background: #f3f3f3; font-weight: 700; }
  table.resumen { margin-left: auto; margin-top: 10px; border-collapse: collapse; min-width: 280px; }
  table.resumen td { padding: 4px 8px; border: 1px solid #888; font-size: 10px; }
  table.resumen td.label { background: #f3f3f3; font-weight: 700; text-align: right; }
  table.resumen td.value { text-align: right; min-width: 120px; }
  table.resumen tr.total-final td { background: #fed7aa; font-weight: 900; font-size: 11px; }
  .footer-info { margin-top: 14px; display: flex; justify-content: space-between; font-size: 9px; }
  .footer-info .col strong { display:block; margin-bottom: 2px; }
</style>
</head>
<body>

<div class="header">
  ${logoBlock}
  <div class="title">VALORIZACIÓN DE SERVICIOS</div>
  <div class="format-info">
    ${escapeHtml(config.codigo_formato)}<br />
    ${escapeHtml(config.version_formato)}<br />
    ${escapeHtml(config.fecha_formato)}
  </div>
</div>

<table class="meta">
  <thead>
    <tr>
      <th>CONSECUTIVO</th>
      <th>FECHA</th>
      <th>CLIENTE</th>
      <th>RUC</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="center"><strong>${escapeHtml(consecutivo)}</strong></td>
      <td class="center">${escapeHtml(formatFechaCorta(fecha_valorizacion))}</td>
      <td>${escapeHtml(cliente.razon_social || '-')}</td>
      <td class="center">${escapeHtml(cliente.ruc || '-')}</td>
    </tr>
  </tbody>
</table>

<table class="items">
  <thead>
    <tr>
      <th>FECHA</th>
      <th>DÍA</th>
      <th>NÚMERO REPORTE</th>
      <th>DETALLE FACTURA</th>
      <th>PLACA</th>
      <th>HORA INICIO 1</th>
      <th>HORA FIN 1</th>
      <th>HORA INICIO 2</th>
      <th>HORA FIN 2</th>
      <th>RECORRIDO</th>
      <th>HORAS</th>
      <th>TOTAL FACTURAR</th>
      <th>PRECIO UNITARIO</th>
      <th>SUBTOTAL</th>
    </tr>
  </thead>
  <tbody>
    ${itemsRows}
    ${totalRow}
  </tbody>
</table>

${resumenTotales}

<div class="footer-info">
  ${preparado_por ? `
    <div class="col">
        <strong>Preparado por:</strong> ${escapeHtml(preparado_por)}<br />
        ${escapeHtml(preparadoFechaFmt)}
    </div>
  ` : '<div></div>'}
  ${ultima_edicion_por ? `
    <div class="col">
        <strong>Última edición:</strong> ${escapeHtml(ultima_edicion_por)}<br />
        ${escapeHtml(ultimaEdicionFechaFmt)}
    </div>
  ` : ''}
</div>

</body>
</html>`
}
