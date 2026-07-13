/**
 * Plantilla HTML para Reporte de Maquinaria — formato G.PAC-04 V.04 (GRUAS) o equivalente.
 *
 * Lee `config_informe_maquinaria` del tenant para decidir qué secciones mostrar:
 *   - cantidad_turnos (1 | 2 | 3)
 *   - cantidad_riggers (0 | 1 | 2)
 *   - incluye_firma_cliente
 *   - incluye_foto_trabajo (actividad realizada)
 *   - incluye_foto_reporte_escrito (parte físico manuscrito → página 2)
 *   - incluye_tipo_recorrido (Tipo + horas recorrido)
 *   - incluye_salida_autorizada
 *   - incluye_tonelaje_placa
 *   - codigo_formato / version_formato / fecha_formato
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export type ReporteMaquinariaConfig = {
    cantidad_turnos: 1 | 2 | 3
    cantidad_riggers: 0 | 1 | 2
    incluye_firma_cliente: boolean
    incluye_foto_trabajo: boolean
    incluye_foto_reporte_escrito: boolean
    incluye_tipo_recorrido: boolean
    incluye_salida_autorizada: boolean
    incluye_tonelaje_placa: boolean
    codigo_formato: string
    version_formato: string
    fecha_formato: string
}

export type ReporteMaquinariaPdfData = {
    registro_numero: string
    fecha_reporte: string
    tarea: {
        codigo?: string | null
        titulo?: string | null
    }
    cotizacion_codigo?: string | null
    cliente: {
        razon_social?: string | null
        ruc?: string | null
        sucursal?: string | null
    }
    solicitado_por?: string | null
    sitio_nombre?: string | null
    maquinaria: {
        codigo_interno?: string | null
        nombre?: string | null
        modelo?: string | null
        placa?: string | null
    }
    tonelaje_solicitado?: number | null
    operador?: { nombre?: string | null } | null
    rigger1?: { nombre?: string | null } | null
    rigger2?: { nombre?: string | null } | null
    salida_autorizada_por?: string | null
    turnos: {
        turno1?: { inicio?: string | null; fin?: string | null } | null
        turno2?: { inicio?: string | null; fin?: string | null } | null
        turno3?: { inicio?: string | null; fin?: string | null } | null
    }
    tipo_recorrido?: string | null
    recorrido_horas?: number | null
    total_horas?: number | null
    trabajo_realizado?: string | null
    foto_trabajo_url?: string | null
    foto_reporte_escrito_url?: string | null
    firma_cliente?: {
        nombre?: string | null
        cargo?: string | null
        firma_url?: string | null
    } | null
    registrado_por?: string | null
    inicio_registro?: string | null
    fin_registro?: string | null
    company: {
        razon_social?: string | null
        name?: string | null
        ruc?: string | null
        direccion?: string | null
        logo_url?: string | null
    }
    config: ReporteMaquinariaConfig
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

function horas(n: number | null | undefined): string {
    if (n == null || n === 0) return '0'
    return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

function turnoCell(t: { inicio?: string | null; fin?: string | null } | null | undefined): { inicio: string; fin: string } {
    return { inicio: t?.inicio || '-', fin: t?.fin || '-' }
}

function formatFechaLarga(iso: string): string {
    try {
        return format(new Date(iso), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    } catch {
        return iso
    }
}

function capitalize(s: string): string {
    if (!s) return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function renderReporteMaquinariaHtml(data: ReporteMaquinariaPdfData): string {
    const { registro_numero, fecha_reporte, tarea, cotizacion_codigo, cliente, solicitado_por,
            sitio_nombre, maquinaria, tonelaje_solicitado, operador, rigger1, rigger2,
            salida_autorizada_por, turnos, tipo_recorrido, recorrido_horas, total_horas,
            trabajo_realizado, foto_trabajo_url, foto_reporte_escrito_url,
            firma_cliente, registrado_por, inicio_registro, fin_registro,
            company, config } = data

    const fechaFmt = capitalize(formatFechaLarga(fecha_reporte))

    const logoBlock = company.logo_url
        ? `<img src="${escapeHtml(company.logo_url)}" alt="Logo" style="height: 54px; object-fit: contain;" />`
        : `<div style="height: 54px; width: 54px; background: #f97316; color: #fff; display:flex; align-items:center; justify-content:center; font-weight: 900; border-radius: 4px;">${escapeHtml((company.name || '?').slice(0, 4))}</div>`

    const maquinariaNombre = [maquinaria.codigo_interno, maquinaria.nombre, maquinaria.modelo]
        .filter(Boolean).join(' ') || '-'

    // Tabla fecha/sitio/maquinaria — con placa+tonelaje condicional
    const fechaSitioCols = config.incluye_tonelaje_placa
        ? ['FECHA', 'SITIO', 'MAQUINARIA', 'PLACA', 'TONELAJE SOLICITADO']
        : ['FECHA', 'SITIO', 'MAQUINARIA']

    const fechaSitioVals = config.incluye_tonelaje_placa
        ? [
            fechaFmt,
            sitio_nombre || '-',
            maquinariaNombre,
            maquinaria.placa || '-',
            tonelaje_solicitado != null ? `${tonelaje_solicitado} TN` : '-',
        ]
        : [fechaFmt, sitio_nombre || '-', maquinariaNombre]

    // Tabla operador/riggers
    const riggerCols: string[] = ['OPERADOR / CHOFER']
    const riggerVals: string[] = [operador?.nombre || '-']
    if (config.cantidad_riggers >= 1) {
        riggerCols.push('RIGGER 1 / AUXILIAR 1')
        riggerVals.push(rigger1?.nombre || '-')
    }
    if (config.cantidad_riggers >= 2) {
        riggerCols.push('RIGGER 2 / AUXILIAR 2')
        riggerVals.push(rigger2?.nombre || '--')
    }

    const riggerBlock = config.cantidad_riggers > 0 ? `
        <table class="grid">
            <thead><tr>${riggerCols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody><tr>${riggerVals.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr></tbody>
        </table>
    ` : `
        <table class="grid">
            <thead><tr><th>OPERADOR / CHOFER</th></tr></thead>
            <tbody><tr><td>${escapeHtml(operador?.nombre || '-')}</td></tr></tbody>
        </table>
    `

    const salidaBlock = config.incluye_salida_autorizada && salida_autorizada_por ? `
        <div style="padding: 4px 0; font-weight: 600;">SALIDA AUTORIZADA POR: ${escapeHtml(salida_autorizada_por)}</div>
    ` : ''

    // Tabla de turnos — cols condicionales por cantidad_turnos + recorrido
    const turnoHeaders: string[] = []
    const turnoCells: string[] = []
    const t1 = turnoCell(turnos.turno1)
    turnoHeaders.push('TURNO 1 INICIO', 'TURNO 1 FIN')
    turnoCells.push(t1.inicio, t1.fin)
    if (config.cantidad_turnos >= 2) {
        const t2 = turnoCell(turnos.turno2)
        turnoHeaders.push('TURNO 2 INICIO', 'TURNO 2 FIN')
        turnoCells.push(t2.inicio, t2.fin)
    }
    if (config.cantidad_turnos >= 3) {
        const t3 = turnoCell(turnos.turno3)
        turnoHeaders.push('TURNO 3 INICIO', 'TURNO 3 FIN')
        turnoCells.push(t3.inicio, t3.fin)
    }
    if (config.incluye_tipo_recorrido) {
        turnoHeaders.push('TIPO RECORRIDO', 'RECORRIDO (HORAS)')
        turnoCells.push(tipo_recorrido || 'No Aplica', horas(recorrido_horas))
    }
    turnoHeaders.push('TOTAL (HORAS)')
    turnoCells.push(horas(total_horas))

    const trabajoBlock = trabajo_realizado ? `
        <div class="section-title">DESCRIPCIÓN DEL TRABAJO REALIZADO</div>
        <div class="box">${escapeHtml(trabajo_realizado)}</div>
    ` : ''

    const fotoTrabajoBlock = config.incluye_foto_trabajo && foto_trabajo_url ? `
        <div class="section-title">FOTOGRAFÍA DE LA ACTIVIDAD REALIZADA</div>
        <div style="text-align:center; padding: 4px 0;">
            <img src="${escapeHtml(foto_trabajo_url)}" alt="Actividad" style="max-width: 480px; max-height: 300px; border:1px solid #ccc;" />
        </div>
    ` : ''

    const firmaClienteBlock = config.incluye_firma_cliente && firma_cliente ? `
        <table class="grid">
            <thead>
                <tr>
                    <th>REPRESENTANTE DEL CLIENTE</th>
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

    // Página 2: foto del reporte escrito físico (page-break)
    const reporteEscritoBlock = config.incluye_foto_reporte_escrito && foto_reporte_escrito_url ? `
        <div style="page-break-before: always;">
            <div class="section-title">REPORTE ESCRITO (PARTE DIARIO)</div>
            <div style="text-align:center; padding: 8px 0;">
                <img src="${escapeHtml(foto_reporte_escrito_url)}" alt="Reporte escrito" style="max-width: 100%; max-height: 900px; border:1px solid #ccc;" />
            </div>
        </div>
    ` : ''

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Reporte de Alquiler de Maquinaria ${escapeHtml(registro_numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 0; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding: 8px 4px; }
  .header .title { font-size: 13px; font-weight: 700; text-align: center; flex: 1; }
  .header .format-info { text-align: right; font-size: 9px; line-height: 1.3; }
  .registro { font-weight: 700; margin: 8px 0 4px 0; }
  table.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
  table.grid th, table.grid td { border: 1px solid #888; padding: 4px 6px; text-align: left; vertical-align: middle; }
  table.grid th { background: #f3f3f3; font-weight: 700; text-align: center; font-size: 9px; }
  table.grid td.center { text-align: center; }
  .section-title { background: #f3f3f3; padding: 4px 6px; font-weight: 700; text-align: center; margin-top: 6px; border: 1px solid #888; }
  .box { border: 1px solid #888; padding: 6px; min-height: 32px; white-space: pre-wrap; }
  .footer-info { margin-top: 10px; font-size: 9px; line-height: 1.5; }
</style>
</head>
<body>

<div class="header">
  ${logoBlock}
  <div class="title">REPORTE DE ALQUILER DE MAQUINARIA Y EQUIPOS</div>
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
      <td>${escapeHtml([cliente.razon_social, cliente.sucursal].filter(Boolean).join(' — ') || '-')}</td>
      <td>${escapeHtml(cliente.ruc || '-')}</td>
      <td>${escapeHtml(solicitado_por || '')}</td>
    </tr>
  </tbody>
</table>

<table class="grid">
  <thead>
    <tr>${fechaSitioCols.map(c => `<th>${c}</th>`).join('')}</tr>
  </thead>
  <tbody>
    <tr>${fechaSitioVals.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>
  </tbody>
</table>

${riggerBlock}
${salidaBlock}

<div class="section-title">TIEMPO POR HORA O FRACCIÓN</div>
<table class="grid">
  <thead>
    <tr>${turnoHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
  </thead>
  <tbody>
    <tr>${turnoCells.map(c => `<td class="center">${escapeHtml(c)}</td>`).join('')}</tr>
  </tbody>
</table>

${trabajoBlock}
${fotoTrabajoBlock}
${firmaClienteBlock}

<div class="footer-info">
  ${registrado_por ? `Registrado por: <strong>${escapeHtml(registrado_por)}</strong><br />` : ''}
  ${inicio_registro ? `Inicio de registro: <strong>${escapeHtml(inicio_registro)}</strong><br />` : ''}
  ${fin_registro ? `Fin de registro: <strong>${escapeHtml(fin_registro)}</strong>` : ''}
</div>

${reporteEscritoBlock}

</body>
</html>`
}
