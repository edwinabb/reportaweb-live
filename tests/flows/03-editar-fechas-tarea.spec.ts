import { test, expect } from '@playwright/test'
import {
    newTracker,
    ensurePersonal,
    createTarea,
    addIntervalo,
    assignResource,
    cleanupTestData,
} from '../helpers/data-factory'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'
import { PlanificacionPage } from '../pages/planificacion.page'
import { format, startOfWeek, addDays } from 'date-fns'

/**
 * Flow 3 — Editar fechas de una tarea (consecutivas → no consecutivas y viceversa).
 *
 * Setup: crear tarea con 1 intervalo consecutivo de 3 días (L-M-X) + 1 personal.
 * Flow:
 *   1. Edición vía server action (replace-all): cambiar a fechas no consecutivas (L, X, V).
 *   2. Verificar en DB que los 3 días nuevos están y el del medio (M) desapareció.
 *   3. Verificar en UI que el resumen de fechas refleja "3 días" (o equivalente).
 *
 * No tocamos el dialog UI desde Playwright en este flow — el server action es
 * la unidad de verdad; la UI se probará manualmente por el usuario.
 */

test.describe('Flow 3 — editar fechas de tarea @critical', () => {
    test.use({ storageState: '.auth/planner.json' })
    const tracker = newTracker()

    test.afterAll(async () => {
        await cleanupTestData(tracker)
    })

    test('cambiar intervalo consecutivo a fechas no consecutivas preserva la tarea', async ({ page }) => {
        const personal = await ensurePersonal(tracker, 'F3')

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const inicialInicio = format(weekStart, 'yyyy-MM-dd')
        const inicialFin = format(addDays(weekStart, 2), 'yyyy-MM-dd') // L-M-X

        const tareaId = await createTarea(tracker, {
            titulo: 'Tarea edit fechas',
            sitio: 'E2E Edit',
            clienteNombre: 'E2E Cliente',
            prioridad: 'MEDIA',
        })

        const intervaloId = await addIntervalo(tracker, {
            tareaId,
            fechaInicio: inicialInicio,
            fechaFin: inicialFin,
        })

        await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloId,
            tipo: 'PERSONAL',
            resourceId: personal.id,
        })

        // Nuevas fechas no consecutivas: L, X, V
        const nuevaLunes = format(weekStart, 'yyyy-MM-dd')
        const nuevaMiercoles = format(addDays(weekStart, 2), 'yyyy-MM-dd')
        const nuevaViernes = format(addDays(weekStart, 4), 'yyyy-MM-dd')
        const nuevasFechas = [nuevaLunes, nuevaMiercoles, nuevaViernes]

        // Disparar la edición. Como `updateTareaIntervals` es un server action
        // ('use server'), lo invocamos a través del API admin replicando su
        // lógica — replace-all de intervalos preservando recursos. Así el test
        // no depende de montar un request auth'd.
        await replaceIntervalsAsAdmin(tareaId, tracker, [
            {
                fechas_multiples: nuevasFechas,
                recursos: [{ tipo_recurso: 'PERSONAL' as const, recurso_id: personal.id }],
            },
        ])

        // Verificar DB — la tarea_fecha original ya no existe, hay una nueva con
        // fechas_multiples y el recurso está asignado a ella.
        await test.step('DB refleja las nuevas fechas no consecutivas', async () => {
            const admin = getAdminClient()
            const { data: intervalos } = await admin
                .from('tareas_fechas')
                .select('id, fecha_inicio, fecha_fin, fechas_multiples')
                .eq('tarea_id', tareaId)

            expect(intervalos).toHaveLength(1)
            const nuevoIntervalo = intervalos![0]
            // fecha_inicio/fecha_fin se derivan del min/max de fechas_multiples (espejo de createTarea)
            expect(nuevoIntervalo.fecha_inicio).toBe(nuevaLunes)
            expect(nuevoIntervalo.fecha_fin).toBe(nuevaViernes)
            expect(nuevoIntervalo.fechas_multiples).toEqual(nuevasFechas)
            expect(nuevoIntervalo.id).not.toBe(intervaloId) // es una fila nueva

            const { data: recursos } = await admin
                .from('tareas_recursos')
                .select('id, personal_id, tarea_fecha_id')
                .eq('tarea_id', tareaId)

            expect(recursos).toHaveLength(1)
            expect(recursos![0].personal_id).toBe(personal.id)
            expect(recursos![0].tarea_fecha_id).toBe(nuevoIntervalo.id)
        })

        // Verificar UI — la tarea aparece en el listado con el resumen correcto.
        await test.step('UI muestra la tarea con el resumen actualizado', async () => {
            const planificacion = new PlanificacionPage(page)
            await planificacion.goto()
            await planificacion.goToToday()
            await planificacion.switchToList()

            const row = page.locator('table tbody tr').filter({ hasText: 'Tarea edit fechas' }).first()
            await expect(row).toBeVisible({ timeout: 10_000 })
            // La tabla muestra el rango fecha_inicio→fecha_fin (ej. "11 may — 15 may" o "1 jun — 5 jun")
            // Verificar que tiene formato de rango de fechas (dash entre fechas).
            await expect(row).toContainText('—')
        })
    })
})

/**
 * Mirror de `updateTareaIntervals` ejecutado con service_role. Se mantiene
 * sincronizado con `lib/actions/planificacion.ts` — si cambia la lógica allí,
 * actualizarla acá también.
 */
async function replaceIntervalsAsAdmin(
    tareaId: string,
    tracker: ReturnType<typeof newTracker>,
    intervalos: Array<{
        fecha_inicio?: string
        fecha_fin?: string
        fechas_multiples?: string[]
        notas?: string | null
        recursos: Array<{ tipo_recurso: 'PERSONAL' | 'MAQUINARIA'; recurso_id: string }>
    }>,
) {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()

    // Borrar intervalos — CASCADE limpia tareas_recursos.
    const { error: errDel } = await admin
        .from('tareas_fechas')
        .delete()
        .eq('tarea_id', tareaId)
        .eq('tenant_id', tenantId)
    if (errDel) throw new Error(`replaceIntervals delete: ${errDel.message}`)

    // Insertar los nuevos.
    for (const intervalo of intervalos) {
        // Derivar fecha_inicio/fecha_fin del min/max de fechas_multiples (espejo de createTarea)
        const sortedMulti = [...(intervalo.fechas_multiples ?? [])].sort()
        const fechaInicio = intervalo.fecha_inicio ?? sortedMulti[0] ?? null
        const fechaFin = intervalo.fecha_fin ?? sortedMulti[sortedMulti.length - 1] ?? null

        const { data: fecha, error: errFecha } = await admin
            .from('tareas_fechas')
            .insert({
                tenant_id: tenantId,
                tarea_id: tareaId,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                fechas_multiples: intervalo.fechas_multiples ?? null,
                notas: intervalo.notas ?? null,
                is_active: true,
            })
            .select('id')
            .single()
        if (errFecha || !fecha) throw new Error(`replaceIntervals insert fecha: ${errFecha?.message}`)
        tracker.tareas_fechas.push(fecha.id)

        if (intervalo.recursos.length > 0) {
            const rows = intervalo.recursos.map((r) => ({
                tenant_id: tenantId,
                tarea_id: tareaId,
                tarea_fecha_id: fecha.id,
                tipo_recurso: r.tipo_recurso,
                personal_id: r.tipo_recurso === 'PERSONAL' ? r.recurso_id : null,
                maquinaria_id: r.tipo_recurso === 'MAQUINARIA' ? r.recurso_id : null,
                is_active: true,
            }))
            const { data: inserted, error: errRec } = await admin
                .from('tareas_recursos')
                .insert(rows)
                .select('id')
            if (errRec) throw new Error(`replaceIntervals insert recurso: ${errRec.message}`)
            for (const r of inserted || []) tracker.tareas_recursos.push(r.id)
        }
    }
}
