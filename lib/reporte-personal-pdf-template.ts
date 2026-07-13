/**
 * Plantilla HTML para Reporte de Personal — formato G.PAC-02 (GRUAS) o equivalente por tenant.
 *
 * Lee `config_informe_personal` del tenant para decidir qué columnas/secciones mostrar:
 *   - cantidad_turnos (1 | 2 | 3) → columnas de jornada
 *   - incluye_horas_extras / extraord / dominicales → columnas adicionales de horas
 *   - incluye_gastos → bloque de gastos (si false, van en otro reporte)
 *   - incluye_firma_cliente_horas → bloque firma cliente
 *   - incluye_firma_trabajador → bloque firma trabajador (con signature_url)
 *   - incluye_foto_trabajo → bloque foto
 *   - codigo_formato / version_formato / fecha_formato → header del PDF
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export type ReportePersonalConfig = {
    cantidad_turnos: 1 | 2 | 3
    incluye_horas_extras: boolean
    incluye_horas_extras_extraord: boolean
    incluye_horas_dominicales: boolean
    incluye_gastos: boolean
    incluye_firma_cliente_horas: boolean
    incluye_firma_trabajador: boolean
    incluye_foto_trabajo: boolean
    codigo_formato: string
    version_formato: string
    fecha_formato: string
}

export type ReportePersonalPdfData = {
    registro_numero: string
    fecha_reporte: string
    trabajador: {
        first_name?: string | null
        last_name?: string | null
        doc_number?: string | null
        cargo?: string | null
        signature_url?: string | null
    }
    cliente: {
        razon_social?: string | null
        ruc?: string | null
    }
    solicitado_por?: string | null
    tarea: {
        codigo?: string | null
        titulo?: string | null
    }
    cotizacion_codigo?: string | null
    sitio_nombre?: string | null
    maquinaria?: {
        codigo_interno?: string | null
        modelo?: string | null
        placa?: string | null
    } | null
    jornadas: {
        primera?: { inicio?: string | null; fin?: string | null } | null
        segunda?: { inicio?: string | null; fin?: string | null } | null
        tercera?: { inicio?: string | null; fin?: string | null } | null
    }
    horas: {
        total?: number | null
        extras?: number | null
        extras_extraord?: number | null
        dominicales?: number | null
    }
    gastos?: {
        desayuno?: number | null
        almuerzo?: number | null
        cena?: number | null
        movilidad?: number | null
    } | null
    trabajo_realizado?: string | null
    foto_trabajo_url?: string | null
    firma_cliente?: {
        nombre?: string | null
        cargo?: string | null
        firma_url?: string | null
    } | null
    registrado_por?: string | null
    fin_registro?: string | null
    company: {
        razon_social?: string | null
        name?: string | null
        ruc?: string | null
        direccion?: string | null
        logo_url?: string | null
    }
    config: ReportePersonalConfig
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

function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
    if (!p) return ''
    return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

function money(n: number | null | undefined): string {
    if (n == null) return '0'
    return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function horas(n: number | null | undefined): string {
    if (n == null || n === 0) return '0'
    return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

function jornadaCell(j: { inicio?: string | null; fin?: string | null } | null | undefined): string {
    if (!j || (!j.inicio && !j.fin)) return '-'
    const parts = [j.inicio, j.fin].filter(Boolean)
    return parts.length === 2 ? `${parts[0]} - ${parts[1]}` : (parts[0] || '-')
}

function formatFechaLarga(iso: string): string {
    try {
        return format(new Date(iso), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    } catch {
        return iso
    }
}

export function renderReportePersonalHtml(data: ReportePersonalPdfData): string {
    const { registro_numero, fecha_reporte, trabajador, cliente, tarea, cotizacion_codigo,
            sitio_nombre, maquinaria, jornadas, horas: h, gastos, trabajo_realizado,
            foto_trabajo_url, firma_cliente, registrado_por, fin_registro,
            company, config, solicitado_por } = data

    const fechaFmt = capitalize(formatFechaLarga(fecha_reporte))

    const logoBlock = company.logo_url
        ? `<img src="${escapeHtml(company.logo_url)}" alt="Logo" style="height: 54px; object-fit: contain;" />`
        : `<div style="height: 54px; width: 54px; background: #f97316; color: #fff; display:flex; align-items:center; justify-content:center; font-weight: 900; border-radius: 4px;">${escapeHtml((company.name || '?').slice(0, 4))}</div>`

    // Jornadas (condicional por config.cantidad_turnos)
    const jornadaHeaders: string[] = ['PRIMERA JORNADA']
    const jornadaCells: string[] = [jornadaCell(jornadas.primera)]
    if (config.cantidad_turnos >= 2) {
        jornadaHeaders.push('SEGUNDA JORNADA')
        jornadaCells.push(jornadaCell(jornadas.segunda))
    }
    if (config.cantidad_turnos >= 3) {
        jornadaHeaders.push('TERCERA JORNADA')
        jornadaCells.push(jornadaCell(jornadas.tercera))
    }

    // Columnas de horas (siempre TOTAL; el resto condicional)
    const horasHeaders: string[] = ['TOTAL HORAS']
    const horasCells: string[] = [horas(h.total)]
    if (config.incluye_horas_extras) {
        horasHeaders.push('HORAS EXTRAS')
        horasCells.push(horas(h.extras))
    }
    if (config.incluye_horas_extras_extraord) {
        horasHeaders.push('HORAS EXTRA EXTRAORDINARIAS')
        horasCells.push(horas(h.extras_extraord))
    }
    if (config.incluye_horas_dominicales) {
        horasHeaders.push('HORAS DOMINICALES')
        horasCells.push(horas(h.dominicales))
    }

    // Bloque gastos (condicional)
    const totalGastos = gastos
        ? (gastos.desayuno || 0) + (gastos.almuerzo || 0) + (gastos.cena || 0) + (gastos.movilidad || 0)
        : 0

    const gastosBlock = config.incluye_gastos ? `
        <div class="section-title">REPORTE DE GASTOS PERSONALES</div>
        <table class="grid">
            <thead>
                <tr>
                    <th>DESAYUNO (S/)</th>
                    <th>ALMUERZO (S/)</th>
                    <th>CENA (S/)</th>
                    <th>MOVILIDAD (S/)</th>
                    <th>TOTAL (S/)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${money(gastos?.desayuno)}</td>
                    <td>${money(gastos?.almuerzo)}</td>
                    <td>${money(gastos?.cena)}</td>
                    <td>${money(gastos?.movilidad)}</td>
                    <td><strong>${money(totalGastos)}</strong></td>
                </tr>
            </tbody>
        </table>
    ` : ''

    const trabajoBlock = trabajo_realizado ? `
        <div class="section-title">DESCRIPCIÓN DEL TRABAJO REALIZADO</div>
        <div class="box">${escapeHtml(trabajo_realizado)}</div>
    ` : ''

    const fotoBlock = config.incluye_foto_trabajo && foto_trabajo_url ? `
        <div class="section-title">FOTOGRAFÍA DE LA ACTIVIDAD</div>
        <div style="text-align:center; padding: 4px 0;">
            <img src="${escapeHtml(foto_trabajo_url)}" alt="Actividad" style="max-width: 480px; max-height: 300px; border:1px solid #ccc;" />
        </div>
    ` : ''

    // Firma del trabajador (siempre si config dice true)
    const firmaTrabajadorRow = config.incluye_firma_trabajador ? `
        <tr>
            <td>${escapeHtml(fullName(trabajador))}</td>
            <td>${escapeHtml(trabajador.cargo || '-')}</td>
            <td>${escapeHtml(trabajador.doc_number || '-')}</td>
            <td style="height: 56px;">
                ${trabajador.signature_url
                    ? `<img src="${escapeHtml(trabajador.signature_url)}" alt="Firma" style="height: 48px; max-width: 160px; object-fit: contain;" />`
                    : ''}
            </td>
        </tr>
    ` : ''

    // Firma del cliente (condicional)
    const firmaClienteBlock = config.incluye_firma_cliente_horas && firma_cliente ? `
        <div class="section-title">FIRMA DEL REPRESENTANTE DEL CLIENTE</div>
        <table class="grid">
            <thead>
                <tr>
                    <th>NOMBRE</th>
                    <th>CARGO</th>
                    <th>FIRMA</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${escapeHtml(firma_cliente.nombre || '-')}</td>
                    <td>${escapeHtml(firma_cliente.cargo || '-')}</td>
                    <td style="height: 56px;">
                        ${firma_cliente.firma_url
                            ? `<img src="${escapeHtml(firma_cliente.firma_url)}" alt="Firma" style="height: 48px; max-width: 160px; object-fit: contain;" />`
                            : ''}
                    </td>
                </tr>
            </tbody>
        </table>
    ` : ''

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Reporte de Personal ${escapeHtml(registro_numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 0; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding: 8px 4px; }
  .header .title { font-size: 14px; font-weight: 700; text-align: center; flex: 1; }
  .header .format-info { text-align: right; font-size: 9px; line-height: 1.3; }
  .registro { font-weight: 700; margin: 8px 0 4px 0; }
  table.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
  table.grid th, table.grid td { border: 1px solid #888; padding: 4px 6px; text-align: left; vertical-align: middle; }
  table.grid th { background: #f3f3f3; font-weight: 700; text-align: center; }
  table.grid td.center { text-align: center; }
  .section-title { background: #f3f3f3; padding: 4px 6px; font-weight: 700; text-align: center; margin-top: 6px; border: 1px solid #888; }
  .box { border: 1px solid #888; padding: 6px; min-height: 32px; white-space: pre-wrap; }
  .footer-info { margin-top: 10px; font-size: 9px; line-height: 1.5; }
</style>
</head>
<body>

<div class="header">
  ${logoBlock}
  <div class="title">REPORTE DE PERSONAL</div>
  <div class="format-info">
    ${escapeHtml(config.codigo_formato)}<br />
    ${escapeHtml(config.version_formato)}<br />
    ${escapeHtml(config.fecha_formato)}
  </div>
</div>

<div class="registro">REGISTRO: ${escapeHtml(registro_numero)}</div>

<table class="grid">
  <thead>
    <tr>
      <th>EMPRESA</th>
      <th>RUC</th>
      <th>DOMICILIO</th>
      <th>COTIZACIÓN</th>
      <th>TAREA</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${escapeHtml(company.razon_social || company.name || '-')}</td>
      <td>${escapeHtml(company.ruc || '-')}</td>
      <td>${escapeHtml(company.direccion || '-')}</td>
      <td>${escapeHtml(cotizacion_codigo || '-')}</td>
      <td>${escapeHtml(tarea.codigo || '-')}</td>
    </tr>
  </tbody>
</table>

<table class="grid">
  <thead>
    <tr>
      <th>CLIENTE</th>
      <th>RUC</th>
      <th>SOLICITADO POR</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${escapeHtml(cliente.razon_social || '-')}</td>
      <td>${escapeHtml(cliente.ruc || '-')}</td>
      <td>${escapeHtml(solicitado_por || '')}</td>
    </tr>
  </tbody>
</table>

<table class="grid">
  <thead>
    <tr>
      <th>FECHA</th>
      <th>SITIO</th>
      <th>MAQUINARIA</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${escapeHtml(fechaFmt)}</td>
      <td>${escapeHtml(sitio_nombre || '-')}</td>
      <td>${escapeHtml([maquinaria?.codigo_interno, maquinaria?.modelo].filter(Boolean).join(' ') || '-')}</td>
    </tr>
  </tbody>
</table>

<div class="section-title">REPORTE DE HORAS TRABAJADAS</div>
<table class="grid">
  <thead>
    <tr>
      ${jornadaHeaders.map(h => `<th>${h}</th>`).join('')}
      ${horasHeaders.map(h => `<th>${h}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    <tr>
      ${jornadaCells.map(c => `<td class="center">${escapeHtml(c)}</td>`).join('')}
      ${horasCells.map(c => `<td class="center">${c}</td>`).join('')}
    </tr>
  </tbody>
</table>

${gastosBlock}
${trabajoBlock}
${fotoBlock}

<table class="grid">
  <thead>
    <tr>
      <th>TRABAJADOR</th>
      <th>CARGO</th>
      <th>DOCUMENTO</th>
      <th>FIRMA</th>
    </tr>
  </thead>
  <tbody>
    ${firmaTrabajadorRow}
  </tbody>
</table>

${firmaClienteBlock}

<div class="footer-info">
  ${registrado_por ? `Registrado por: <strong>${escapeHtml(registrado_por)}</strong><br />` : ''}
  ${fin_registro ? `Fin de registro: <strong>${escapeHtml(fin_registro)}</strong>` : ''}
</div>

</body>
</html>`
}

function capitalize(s: string): string {
    if (!s) return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}
