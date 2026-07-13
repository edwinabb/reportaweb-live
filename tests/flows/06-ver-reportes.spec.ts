import { test, expect } from '@playwright/test'
import {
    newTracker,
    ensurePersonal,
    ensureMaquinaria,
    createTarea,
    addIntervalo,
    assignResource,
    createReportePersonal,
    createReporteMaquinaria,
    createReporteCombustible,
    createInspeccion,
    cleanupTestData,
} from '../helpers/data-factory'
import { PlanificacionPage } from '../pages/planificacion.page'
import { format, startOfWeek } from 'date-fns'

/**
 * Flow 6 — Ver reportes (personal, maquinaria, combustible) en el detalle de
 * una tarea.
 *
 * La UI actual solo expone CREATE (no edit/delete). El Flow 6 se enfoca en la
 * parte de listado: verificar que los reportes creados para una tarea aparecen
 * correctamente en el tab "Reportes y Partes" del TareaDetailDialog.
 *
 * Creación se hace via service_role mirror de `createReporte*` — testea la
 * misma columna de DB que escriben los forms.
 *
 */

test.describe('Flow 6 — ver reportes en detalle de tarea @critical', () => {
    test.use({ storageState: '.auth/planner.json' })
    const tracker = newTracker()

    test.afterAll(async () => {
        await cleanupTestData(tracker)
    })

    test('los 3 tipos de reporte aparecen en el tab "Reportes y Partes"', async ({ page }) => {
        const [personal, maquinaria] = await Promise.all([
            ensurePersonal(tracker, 'F6_operador'),
            ensureMaquinaria(tracker, 'F6_MAQ'),
        ])

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const fecha = format(weekStart, 'yyyy-MM-dd')

        // Tarea + intervalo + 1 personal + 1 maquinaria
        const tareaId = await createTarea(tracker, {
            titulo: 'Tarea con reportes',
            sitio: 'E2E F6',
            prioridad: 'MEDIA',
        })

        const intervaloId = await addIntervalo(tracker, {
            tareaId,
            fechaInicio: fecha,
            fechaFin: fecha,
        })
        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloId,
            tipo: 'PERSONAL',
            resourceId: personal.id,
        })
        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloId,
            tipo: 'MAQUINARIA',
            resourceId: maquinaria.id,
        })

        // Crear los 3 reportes
        await createReportePersonal(tracker, {
            tareaId,
            personalId: personal.id,
            maquinariaId: maquinaria.id,
            fecha,
            totalHoras: 8,
            trabajoRealizado: 'Jornada completa operador',
        })

        await createReporteMaquinaria(tracker, {
            tareaId,
            maquinariaId: maquinaria.id,
            operadorId: personal.id,
            fecha,
            totalHoras: 7,
            trabajoRealizado: 'Operación maquinaria',
        })

        await createReporteCombustible(tracker, {
            tareaId,
            maquinariaId: maquinaria.id,
            fecha,
            galones: 10,
            tipoCombustible: 'DIESEL',
        })

        // Crear una inspección para habilitar el tab "Paso 3. Reportes"
        // (el tab está deshabilitado si inspecciones.length === 0 && informes.length === 0)
        await createInspeccion(tracker, {
            tareaId,
            maquinariaId: maquinaria.id,
            fecha,
        })

        // Abrir la tarea en UI → detail dialog → tab Reportes
        const planificacion = new PlanificacionPage(page)
        await planificacion.goto()
        await planificacion.goToToday()
        await planificacion.switchToList()

        // Click en la fila abre TareaDetailDialog (onRowClick en page.tsx).
        const row = page.locator('table tbody tr').filter({ hasText: 'Tarea con reportes' })
        await expect(row).toBeVisible({ timeout: 10_000 })
        await row.click()

        // El dialog es un Radix Dialog; su contenido se renderiza en un portal.
        // Post-D.4: el header muestra `tarea.titulo` real (no "Detalle de Tarea"
        // hardcoded). Filtramos por el tab "Información General" que siempre
        // está visible apenas abre el dialog, antes de que termine de hidratar
        // los datos de la tarea.
        const dialog = page.getByRole('dialog').filter({ hasText: 'Información General' })
        await expect(dialog).toBeVisible({ timeout: 5_000 })

        // Cambiar al tab Reportes (renombrado en v3.7.x a "Paso 3. Reportes")
        await dialog.getByRole('tab', { name: /Paso 3|Reportes/i }).click()

        await test.step('reporte personal visible con nombre completo y horas', async () => {
            // El nombre de personal solo aparece en esta sección (único en el dialog).
            await expect(
                dialog.getByText('E2E_Personal F6_operador', { exact: false }),
            ).toBeVisible({ timeout: 10_000 })
            await expect(dialog.getByText('8 horas', { exact: false })).toBeVisible()
        })

        await test.step('reporte maquinaria visible con nombre y horas', async () => {
            // La maquinaria aparece en reporte maquinaria + card de combustible → 2 matches.
            await expect(dialog.getByText(maquinaria.nombre, { exact: false }).first()).toBeVisible()
            await expect(dialog.getByText('7 horas', { exact: false })).toBeVisible()
        })

        await test.step('reporte combustible visible con galones y tipo', async () => {
            await expect(dialog.getByText('No hay registros de combustible')).not.toBeVisible()
            // "10 gal · DIESEL" es único de la card de combustible.
            await expect(dialog.getByText('10 gal', { exact: false })).toBeVisible()
            await expect(dialog.getByText('DIESEL', { exact: false })).toBeVisible()
        })
    })
})
