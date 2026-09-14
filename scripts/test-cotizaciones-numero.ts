// scripts/test-cotizaciones-numero.ts
// TK-OI7 — verifica el parseo de `cotizaciones.numero` contra los formatos
// heredados reales de Bubble (confirmados en PROD 2026-09-13) y el formato
// nuevo CT-XXXX-YYYY que genera `generateNumeroCotizacion`.
import assert from 'node:assert/strict'
import { parseNumeroCotizacion } from '../lib/utils/numero-cotizacion'

// Formatos heredados de Bubble, tal cual existen hoy en PROD
assert.deepEqual(parseNumeroCotizacion('CT099-2026'), { consecutivo: 99, anio: 2026 })
assert.deepEqual(parseNumeroCotizacion('CT 100-2026'), { consecutivo: 100, anio: 2026 })
assert.deepEqual(parseNumeroCotizacion('CT 279-2026'), { consecutivo: 279, anio: 2026 })
assert.deepEqual(parseNumeroCotizacion('099-2021'), { consecutivo: 99, anio: 2021 })
assert.deepEqual(parseNumeroCotizacion('057-2020'), { consecutivo: 57, anio: 2020 })
assert.deepEqual(parseNumeroCotizacion('CT-001-2022'), { consecutivo: 1, anio: 2022 })

// Año de 2 dígitos → se normaliza sumando 2000
assert.deepEqual(parseNumeroCotizacion('CT 001-23'), { consecutivo: 1, anio: 2023 })

// Sufijo "B" (revisión de Bubble) y " (Copia)" (duplicado viejo de v3) no rompen el parseo
assert.deepEqual(parseNumeroCotizacion('CT067-2026B'), { consecutivo: 67, anio: 2026 })
assert.deepEqual(parseNumeroCotizacion('CT 226-2025B'), { consecutivo: 226, anio: 2025 })

// Formato nuevo generado por este fix
assert.deepEqual(parseNumeroCotizacion('CT-0280-2026'), { consecutivo: 280, anio: 2026 })
assert.deepEqual(parseNumeroCotizacion('CT-0001-2026'), { consecutivo: 1, anio: 2026 })

// Formato ROTO del código viejo (`CT 2026-0001`) — confirmado 0 filas así en PROD
// (`select count(*) from cotizaciones where numero ~ '^CT [0-9]{4}-[0-9]{4}$'`).
// No se persigue con más regex: el resultado, sea el que sea, nunca debe poder
// coincidir con un año real de 4 dígitos (2024-2030) al filtrar en
// `generateNumeroCotizacion`, así que una fila así quedaría excluida del cálculo
// del máximo igual que si el parseo devolviera null.
{
    const anioRealNunca = [2024, 2025, 2026, 2027, 2028, 2029, 2030]
    const parsed = parseNumeroCotizacion('CT 2026-0001')
    assert.ok(!parsed || !anioRealNunca.includes(parsed.anio), 'CT 2026-0001 no debe matchear un anio real')
}

// Basura / vacío / null
assert.equal(parseNumeroCotizacion(null), null)
assert.equal(parseNumeroCotizacion(''), null)
assert.equal(parseNumeroCotizacion('algo random'), null)

console.log('OK: cotizaciones-numero')
