/**
 * Cálculo de horas según ley laboral peruana.
 * Misma lógica en web y app móvil (copiado 1:1 al proyecto Expo).
 *
 * Jornada ordinaria: 8h fijas.
 * Extras: primeras 2h sobre 8h → recargo 25%; el resto → recargo 35%.
 * Dominicales: aplica si el día es domingo o feriado Y no tiene descanso compensatorio.
 */

export interface Jornada {
    inicio: string // "HH:MM" — 24h
    fin: string    // "HH:MM" — puede ser mayor a 24h si cruza medianoche (ej "25:30")
}

export interface ResultadoHoras {
    total_raw: number           // horas decimales brutas trabajadas
    horas_normales: number      // min(total, 8.0)
    horas_extras: number        // primeras 2h sobre 8 → recargo 25%
    horas_extras_extraordinarias: number // resto sobre 10h → recargo 35%
    horas_dominicales: number   // total si es domingo/feriado sin compensatorio, 0 si no
}

/** Convierte "HH:MM" a horas decimales. Acepta horas > 24 para turnos que cruzan medianoche. */
function hmAHoras(hm: string): number {
    const [h, m] = hm.split(':').map(Number)
    return h + (m ?? 0) / 60
}

/** Calcula duración en horas de una jornada. Si fin ≤ inicio asume que cruza medianoche (+24h). */
export function duracionJornada(jornada: Jornada): number {
    const ini = hmAHoras(jornada.inicio)
    let fin = hmAHoras(jornada.fin)
    if (fin <= ini) fin += 24
    return Math.max(0, fin - ini)
}

/**
 * Función principal de cálculo.
 *
 * @param jornadas  Array de jornadas del día (1–3)
 * @param esDominicalOFestivo  true si la fecha es domingo o está en app_calendario_festivos
 * @param tieneDescansoCompensatorio  true si el admin registró un descanso comp. para este día
 */
export function calcularHoras(
    jornadas: Jornada[],
    esDominicalOFestivo: boolean,
    tieneDescansoCompensatorio: boolean
): ResultadoHoras {
    const total_raw = jornadas.reduce((sum, j) => sum + duracionJornada(j), 0)

    const horas_normales = Math.min(total_raw, 8)
    const exceso = Math.max(0, total_raw - 8)
    const horas_extras = Math.min(exceso, 2)
    const horas_extras_extraordinarias = Math.max(0, exceso - 2)

    const horas_dominicales =
        esDominicalOFestivo && !tieneDescansoCompensatorio ? total_raw : 0

    return {
        total_raw: round2(total_raw),
        horas_normales: round2(horas_normales),
        horas_extras: round2(horas_extras),
        horas_extras_extraordinarias: round2(horas_extras_extraordinarias),
        horas_dominicales: round2(horas_dominicales),
    }
}

function round2(n: number): number {
    return Math.round(n * 100) / 100
}

/** Retorna true si dos jornadas se solapan (comparten algún minuto). */
export function jornadasSolapan(j1: Jornada, j2: Jornada): boolean {
    const ini1 = hmAHoras(j1.inicio)
    let fin1 = hmAHoras(j1.fin)
    if (fin1 <= ini1) fin1 += 24

    const ini2 = hmAHoras(j2.inicio)
    let fin2 = hmAHoras(j2.fin)
    if (fin2 <= ini2) fin2 += 24

    return ini1 < fin2 && ini2 < fin1
}

/** Verifica si algún par de jornadas del array se solapa. */
export function detectarSolapamientos(jornadas: Jornada[]): boolean {
    for (let i = 0; i < jornadas.length; i++) {
        for (let j = i + 1; j < jornadas.length; j++) {
            if (jornadasSolapan(jornadas[i], jornadas[j])) return true
        }
    }
    return false
}
