import { test, expect } from '@playwright/test'
import {
    newTracker,
    ensurePersonal,
    ensureMaquinaria,
    createTarea,
    addIntervalo,
    assignResource,
    cleanupTestData,
} from '../helpers/data-factory'
import { getAdminClient } from '../helpers/supabase-admin'
import { PlanificacionPage } from '../pages/planificacion.page'
import { format, startOfWeek, addDays } from 'date-fns'

/**
 * Flow 5 — Recursos distintos en fechas distintas de la misma tarea.
 *
 * Caso que motivó el rediseño 3-tablas: una tarea donde Persona A trabaja los
 * primeros días y Persona B trabaja los últimos. Cada grupo de fechas es un
 * intervalo distinto en tareas_fechas, con sus propios recursos anclados.
 *
 * Setup del test:
 *   - Tarea "Obra semana completa"
 *   - Intervalo A (L-M-X): Personal A + Maquinaria X
 *   - Intervalo B (J-V):   Personal B (sin maquinaria)
 *
 * Verificaciones:
 *   - DB: 2 intervalos distintos, los recursos están anclados correctamente.
 *   - UI listado: la tarea aparece con "2 intervalos" en la columna fechas
 *     (indicador de intervalo-múltiple).
 *   - UI timeline Personal: ambos (A y B) visibles.
 *   - UI timeline Maquinaria: X visible.
 */

test.describe('Flow 5 — recursos por fecha distinta @critical', () => {
    test.use({ storageState: '.auth/planner.json' })
    const tracker = newTracker()

    test.afterAll(async () => {
        await cleanupTestData(tracker)
    })

    test('dos intervalos con recursos distintos se persisten y muestran correctamente', async ({ page }) => {
        const [personalA, personalB, maquinariaX] = await Promise.all([
            ensurePersonal(tracker, 'F5_A'),
            ensurePersonal(tracker, 'F5_B'),
            ensureMaquinaria(tracker, 'F5_X'),
        ])

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        // Intervalo A: L-M-X
        const aInicio = format(weekStart, 'yyyy-MM-dd')
        const aFin = format(addDays(weekStart, 2), 'yyyy-MM-dd')
        // Intervalo B: J-V
        const bInicio = format(addDays(weekStart, 3), 'yyyy-MM-dd')
        const bFin = format(addDays(weekStart, 4), 'yyyy-MM-dd')

        const tareaId = await createTarea(tracker, {
            titulo: 'Obra semana completa',
            sitio: 'E2E F5',
            prioridad: 'ALTA',
        })

        // Intervalo A — Personal A + Maquinaria X
        const intervaloAId = await addIntervalo(tracker, {
            tareaId,
            fechaInicio: aInicio,
            fechaFin: aFin,
        })
        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloAId,
            tipo: 'PERSONAL',
            resourceId: personalA.id,
        })
        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloAId,
            tipo: 'MAQUINARIA',
            resourceId: maquinariaX.id,
        })

        // Intervalo B — Personal B (solo personal, sin maquinaria)
        const intervaloBId = await addIntervalo(tracker, {
            tareaId,
            fechaInicio: bInicio,
            fechaFin: bFin,
        })
        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloBId,
            tipo: 'PERSONAL',
            resourceId: personalB.id,
        })

        // === Verificar DB: 2 intervalos, recursos correctamente anclados ===
        await test.step('DB tiene 2 intervalos con los recursos correctamente asignados', async () => {
            const admin = getAdminClient()
            const { data: intervalos } = await admin
                .from('tareas_fechas')
                .select('id, fecha_inicio, fecha_fin')
                .eq('tarea_id', tareaId)
                .order('fecha_inicio', { ascending: true })

            expect(intervalos).toHaveLength(2)
            expect(intervalos![0].fecha_inicio).toBe(aInicio)
            expect(intervalos![0].fecha_fin).toBe(aFin)
            expect(intervalos![1].fecha_inicio).toBe(bInicio)
            expect(intervalos![1].fecha_fin).toBe(bFin)

            const { data: recursos } = await admin
                .from('tareas_recursos')
                .select('tarea_fecha_id, tipo_recurso, personal_id, maquinaria_id')
                .eq('tarea_id', tareaId)

            expect(recursos).toHaveLength(3)

            const recursosA = recursos!.filter((r) => r.tarea_fecha_id === intervaloAId)
            const recursosB = recursos!.filter((r) => r.tarea_fecha_id === intervaloBId)

            // Intervalo A: Personal A + Maquinaria X
            expect(recursosA).toHaveLength(2)
            const personalEnA = recursosA.find((r) => r.tipo_recurso === 'PERSONAL')
            const maquinariaEnA = recursosA.find((r) => r.tipo_recurso === 'MAQUINARIA')
            expect(personalEnA?.personal_id).toBe(personalA.id)
            expect(maquinariaEnA?.maquinaria_id).toBe(maquinariaX.id)

            // Intervalo B: solo Personal B
            expect(recursosB).toHaveLength(1)
            expect(recursosB[0].tipo_recurso).toBe('PERSONAL')
            expect(recursosB[0].personal_id).toBe(personalB.id)
            expect(recursosB[0].maquinaria_id).toBeNull()
        })

        // === Verificar UI ===
        await test.step('listado muestra "2 intervalos"', async () => {
            const planificacion = new PlanificacionPage(page)
            await planificacion.goto()
            await planificacion.goToToday()
            await planificacion.switchToList()

            const row = page.locator('table tbody tr').filter({ hasText: 'Obra semana completa' }).first()
            await expect(row).toBeVisible({ timeout: 10_000 })
            await expect(row).toContainText('2 intervalos')
        })

        await test.step('timeline Personal muestra ambos (A y B)', async () => {
            const planificacion = new PlanificacionPage(page)
            await planificacion.switchToPersonal()
            await expect(page.getByText(personalA.nombre, { exact: false })).toBeVisible({ timeout: 10_000 })
            await expect(page.getByText(personalB.nombre, { exact: false })).toBeVisible()
        })

        await test.step('timeline Maquinaria muestra la maquinaria de intervalo A', async () => {
            const planificacion = new PlanificacionPage(page)
            await planificacion.switchToMaquinaria()
            await expect(page.getByText(maquinariaX.nombre, { exact: false })).toBeVisible({ timeout: 10_000 })
        })
    })
})
