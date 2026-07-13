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
import { getAdminClient, getTestTenantId, getTestUserId } from '../helpers/supabase-admin'
import { PlanificacionPage } from '../pages/planificacion.page'
import { format, startOfWeek, addDays } from 'date-fns'

/**
 * Flow 4 — Agregar y quitar recursos de un intervalo existente.
 *
 * Flujo:
 *   1. Crear tarea con 1 intervalo consecutivo y 1 personal asignado.
 *   2. Agregar un segundo personal y 1 maquinaria al mismo intervalo.
 *   3. Quitar el primer personal.
 *   4. Verificar DB: el intervalo tiene 2 recursos (personal nuevo + maquinaria).
 *   5. Verificar UI: la tarea aparece en listado y timelines Personal/Maquinaria
 *      con los recursos correctos.
 *
 * Mirror server-side de `addRecursoToIntervalo` / `removeRecurso` ejecutado con
 * service_role — misma lógica, sin depender de request auth'd.
 */

test.describe('Flow 4 — agregar y quitar recursos @critical', () => {
    test.use({ storageState: '.auth/planner.json' })
    const tracker = newTracker()

    test.afterAll(async () => {
        await cleanupTestData(tracker)
    })

    test('agregar recursos nuevos y quitar existentes al mismo intervalo', async ({ page }) => {
        const [personalInicial, personalNuevo, maquinariaNueva] = await Promise.all([
            ensurePersonal(tracker, 'F4_inicial'),
            ensurePersonal(tracker, 'F4_nuevo'),
            ensureMaquinaria(tracker, 'F4_MAQ'),
        ])

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const fechaInicio = format(weekStart, 'yyyy-MM-dd')
        const fechaFin = format(addDays(weekStart, 1), 'yyyy-MM-dd') // L-M (2 días)

        const tareaId = await createTarea(tracker, {
            titulo: 'Tarea add/remove recursos',
            sitio: 'E2E F4',
            prioridad: 'MEDIA',
        })

        const intervaloId = await addIntervalo(tracker, {
            tareaId,
            fechaInicio,
            fechaFin,
        })

        const inicialRecursoId = await assignResource(tracker, {
            tareaId,
            tareaFechaId: intervaloId,
            tipo: 'PERSONAL',
            resourceId: personalInicial.id,
        })

        // === Paso 1: agregar personal nuevo + maquinaria nueva ===
        const nuevoPersonalRecursoId = await addRecursoAsAdmin(
            tracker,
            intervaloId,
            tareaId,
            'PERSONAL',
            personalNuevo.id,
        )
        const maquinariaRecursoId = await addRecursoAsAdmin(
            tracker,
            intervaloId,
            tareaId,
            'MAQUINARIA',
            maquinariaNueva.id,
        )

        // === Paso 2: quitar el personal inicial ===
        await removeRecursoAsAdmin(tracker, inicialRecursoId)

        // === Verificar DB ===
        await test.step('DB tiene 2 recursos (nuevo personal + maquinaria), sin el inicial', async () => {
            const admin = getAdminClient()
            const { data: recursos } = await admin
                .from('tareas_recursos')
                .select('id, tipo_recurso, personal_id, maquinaria_id, tarea_fecha_id')
                .eq('tarea_id', tareaId)

            expect(recursos).toHaveLength(2)

            const personales = recursos!.filter((r) => r.tipo_recurso === 'PERSONAL')
            const maquinarias = recursos!.filter((r) => r.tipo_recurso === 'MAQUINARIA')

            expect(personales).toHaveLength(1)
            expect(personales[0].personal_id).toBe(personalNuevo.id)
            expect(personales[0].id).toBe(nuevoPersonalRecursoId)

            expect(maquinarias).toHaveLength(1)
            expect(maquinarias[0].maquinaria_id).toBe(maquinariaNueva.id)
            expect(maquinarias[0].id).toBe(maquinariaRecursoId)

            // Todos los recursos restantes pertenecen al mismo intervalo.
            expect(new Set(recursos!.map((r) => r.tarea_fecha_id))).toEqual(new Set([intervaloId]))
        })

        // === Verificar UI ===
        await test.step('UI muestra tarea en listado + recursos en ambos timelines', async () => {
            const planificacion = new PlanificacionPage(page)
            await planificacion.goto()
            await planificacion.goToToday()

            await planificacion.switchToList()
            await expect(
                page.locator('table tbody').getByText('Tarea add/remove recursos', { exact: false }).first(),
            ).toBeVisible({ timeout: 10_000 })

            await planificacion.switchToPersonal()
            await expect(page.getByText(personalNuevo.nombre, { exact: false })).toBeVisible({ timeout: 10_000 })
            // El personal inicial NO debería aparecer con esta tarea (fue removido).
            // (No asserto ausencia global — puede estar en otra tarea. Asserto que al
            //  menos el personal nuevo sí está.)

            await planificacion.switchToMaquinaria()
            await expect(page.getByText(maquinariaNueva.nombre, { exact: false })).toBeVisible({ timeout: 10_000 })
        })
    })
})

/**
 * Mirror de `addRecursoToIntervalo` en service_role. Trackea el ID en el
 * tracker para cleanup determinístico.
 */
async function addRecursoAsAdmin(
    tracker: ReturnType<typeof newTracker>,
    tareaFechaId: string,
    tareaId: string,
    tipo: 'PERSONAL' | 'MAQUINARIA',
    recursoId: string,
): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    const { data, error } = await admin
        .from('tareas_recursos')
        .insert({
            tenant_id: tenantId,
            tarea_id: tareaId,
            tarea_fecha_id: tareaFechaId,
            tipo_recurso: tipo,
            personal_id: tipo === 'PERSONAL' ? recursoId : null,
            maquinaria_id: tipo === 'MAQUINARIA' ? recursoId : null,
            created_by: userId,
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`addRecursoAsAdmin: ${error?.message}`)
    tracker.tareas_recursos.push(data.id)
    return data.id
}

/**
 * Mirror de `removeRecurso` en service_role. Remueve el ID del tracker para
 * no intentar borrarlo de nuevo en cleanup.
 */
async function removeRecursoAsAdmin(tracker: ReturnType<typeof newTracker>, recursoId: string): Promise<void> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()

    const { error } = await admin
        .from('tareas_recursos')
        .delete()
        .eq('id', recursoId)
        .eq('tenant_id', tenantId)

    if (error) throw new Error(`removeRecursoAsAdmin: ${error.message}`)
    tracker.tareas_recursos = tracker.tareas_recursos.filter((id) => id !== recursoId)
}
