/**
 * TK-OI7 — parseo del `numero` de una cotización.
 *
 * `cotizaciones.numero` es `text` sin formato fijo: mezcla el formato nuevo de
 * v3 (`CT-XXXX-YYYY`) con los formatos heredados de Bubble, que sigue siendo
 * el sistema en producción para CISE y delta-sincroniza cotizaciones nuevas.
 * Formatos reales confirmados en PROD (2026-09-13): `CT099-2026`,
 * `CT 100-2026`, `099-2021`, `057-2020`, `CT-001-2022`, `CT 001-23` (año de
 * 2 dígitos), `CT067-2026B` (sufijo de revisión de Bubble).
 *
 * Vive fuera de `lib/actions/cotizaciones.ts` (que tiene `'use server'`,
 * donde solo pueden exportarse funciones async) para poder testearse sola.
 */

export interface NumeroCotizacionParsed {
    consecutivo: number
    anio: number
}

// CT[espacio][-]099-2026, CT-001-2022, CT 001-23, CT067-2026B, CT-0280-2026...
const NUMERO_PATTERN = /^CT\s?-?\s?(\d+)-(\d{2,4})B?(?:\s*\(Copia\))?$/i
// Formatos migrados sin prefijo "CT": 099-2021, 057-2020
const NUMERO_PATTERN_SIN_PREFIJO = /^(\d+)-(\d{2,4})B?(?:\s*\(Copia\))?$/

export function parseNumeroCotizacion(numero: string | null | undefined): NumeroCotizacionParsed | null {
    if (!numero) return null

    const match = numero.match(NUMERO_PATTERN) ?? numero.match(NUMERO_PATTERN_SIN_PREFIJO)
    if (!match) return null

    const consecutivo = Number(match[1])
    const anioRaw = match[2]
    let anio = Number(anioRaw)
    if (anioRaw.length === 2) anio += 2000

    if (!Number.isFinite(consecutivo) || !Number.isFinite(anio)) return null

    return { consecutivo, anio }
}
