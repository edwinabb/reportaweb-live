// lib/pdf-retry-schedule.ts

export type DocCategory = 'comercial' | 'operativo'

/**
 * Segundos de espera antes de cada reintento. 5 intentos por categoría
 * (definido por el usuario en docs/superpowers/specs/2026-09-06-plan-migracion-cutover-fase2-design.md § Fase 0).
 */
export const RETRY_SCHEDULES: Record<DocCategory, number[]> = {
    comercial: [10, 20, 30, 60, 120],
    operativo: [60, 120, 300, 600, 720],
}

/**
 * Devuelve el delay (segundos) antes del reintento número `attemptsSoFar + 1`,
 * o null si ya se agotaron los reintentos de esa categoría.
 */
export function getRetryDelaySeconds(category: DocCategory, attemptsSoFar: number): number | null {
    const schedule = RETRY_SCHEDULES[category]
    if (attemptsSoFar < 0 || attemptsSoFar >= schedule.length) return null
    return schedule[attemptsSoFar]
}

/**
 * Calcula el timestamp del próximo reintento, o null si se agotaron los intentos.
 */
export function computeNextRetryAt(category: DocCategory, attemptsSoFar: number, from: Date = new Date()): Date | null {
    const delaySeconds = getRetryDelaySeconds(category, attemptsSoFar)
    if (delaySeconds === null) return null
    return new Date(from.getTime() + delaySeconds * 1000)
}
