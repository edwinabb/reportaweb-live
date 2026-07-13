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
import { PlanificacionPage } from '../pages/planificacion.page'
import { format, startOfWeek, addDays } from 'date-fns'

/**
 * Flow 2 — Crear tarea con recursos asignados.
 *
 * Modelo (migration 20260418170000):
 *   tareas (header) → tareas_fechas (intervalos) → tareas_recursos (asignaciones)
 *
 * Este test crea 1 tarea con 1 intervalo de 3 días consecutivos y asigna a ese
 * intervalo: 2 personal + 1 maquinaria. Después verifica que aparezcan en:
 *   - Listado `/planificacion`
 *   - Timeline "Personal"
 *   - Timeline "Maquinaria"
 *
 * Setup base para flows 3 (editar fechas), 4 (add/remove recursos) y
 * 5 (recursos por fecha distinta — usará múltiples intervalos).
 */

test.describe('Flow 2 — tarea con recursos @critical', () => {
    test.use({ storageState: '.auth/planner.json' })
    const tracker = newTracker()

    test.afterAll(async () => {
        await cleanupTestData(tracker)
    })

    test('crear tarea con 2 personal + 1 maquinaria aparece en listado y timelines', async ({ page }) => {
        // Setup: personal + maquinaria disponibles — paralelo para evitar ~20s secuencial
        const [personalA, personalB, maquinaria] = await Promise.all([
            ensurePersonal(tracker, 'A'),
            ensurePersonal(tracker, 'B'),
            ensureMaquinaria(tracker, '001'),
        ])

        // Tarea programada para esta semana (lunes de esta semana, 3 días consecutivos)
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const fechaInicio = format(weekStart, 'yyyy-MM-dd')
        const fechaFin = format(addDays(weekStart, 2), 'yyyy-MM-dd')

        const tareaId = await createTarea(tracker, {
            titulo: 'Tarea con recursos',
            sitio: 'E2E Sitio Test',
            clienteNombre: 'E2E Cliente',
            prioridad: 'ALTA',
            tipoTarea: 'OPERACIONES',
        })

        // 1 intervalo consecutivo con todos los recursos (L-M-X)
        const intervaloId = await addIntervalo(tracker, {
            tareaId,
            fechaInicio,
            fechaFin,
        })

        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloId,
            tipo: 'PERSONAL',
            resourceId: personalA.id,
        })
        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloId,
            tipo: 'PERSONAL',
            resourceId: personalB.id,
        })
        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloId,
            tipo: 'MAQUINARIA',
            resourceId: maquinaria.id,
        })

        // Verificar UI
        const planificacion = new PlanificacionPage(page)
        await planificacion.goto()
        await planificacion.goToToday()

        await test.step('listado muestra la tarea', async () => {
            await planificacion.switchToList()
            await expect(
                page.locator('table tbody').getByText('Tarea con recursos', { exact: false }).first(),
            ).toBeVisible({ timeout: 10_000 })
        })

        await test.step('timeline Personal muestra los 2 asignados', async () => {
            await planificacion.switchToPersonal()
            await expect(page.getByText(personalA.nombre, { exact: false })).toBeVisible({ timeout: 10_000 })
            await expect(page.getByText(personalB.nombre, { exact: false })).toBeVisible()
        })

        await test.step('timeline Maquinaria muestra la maquinaria', async () => {
            await planificacion.switchToMaquinaria()
            await expect(page.getByText(maquinaria.nombre, { exact: false })).toBeVisible({ timeout: 10_000 })
        })
    })
})
