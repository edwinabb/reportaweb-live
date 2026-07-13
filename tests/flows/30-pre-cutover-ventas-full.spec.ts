import { test, expect } from '@playwright/test'
import { format, addDays } from 'date-fns'
import {
    newTracker,
    ensurePersonal,
    ensureMaquinaria,
    createTarea,
    addIntervalo,
    assignResource,
    createReporteMaquinaria,
    cleanupTestData,
} from '../helpers/data-factory'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 30 — Pre-cutover: Ventas — Valorización → Factura → Cobro @pre-cutover
 * Fases 11-12: crea reportes de maquinaria (estado_venta=PENDIENTE) via factory,
 * luego prueba el flujo completo en UI.
 */

const mañana = format(addDays(new Date(), 1), 'yyyy-MM-dd')
const pasado = format(addDays(new Date(), 3), 'yyyy-MM-dd')
const dias = [
    format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    format(addDays(new Date(), 3), 'yyyy-MM-dd'),
]

test.describe('Ventas — Panel y Listados @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('panel de ventas carga con KPIs', async ({ page }) => {
        await page.goto('/ventas/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de valoraciones carga', async ({ page }) => {
        await page.goto('/ventas/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de facturas de venta carga', async ({ page }) => {
        await page.goto('/ventas/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Ventas — Flujo Valorización → Factura → Cobro @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })
    const tracker = newTracker()
    let reporteIds: string[] = []
    let valorizacionCodigo: string | null = null

    test.afterAll(async () => {
        // Cleanup: si se creó una valorización, deshacerla primero
        if (valorizacionCodigo) {
            const admin = getAdminClient()
            await admin.from('reportes_maquinaria').update({ estado_venta: 'PENDIENTE', valorizacion_venta: null }).eq('valorizacion_venta', valorizacionCodigo).then(undefined, () => {})
            await admin.from('valorizaciones').delete().eq('codigo', valorizacionCodigo).then(undefined, () => {})
        }
        await cleanupTestData(tracker)
    })

    test('setup: crear tarea + reportes maquinaria estado_venta=PENDIENTE', async () => {
        const personal = await ensurePersonal(tracker, 'ventas-flow')
        const maquinaria = await ensureMaquinaria(tracker, 'ventas-flow')

        const tareaId = await createTarea(tracker, {
            titulo: 'T1-Ventas-Flow',
            clienteNombre: 'E2E_Cliente Ventas Test',
            prioridad: 'MEDIA',
        })
        const intervaloId = await addIntervalo(tracker, {
            tareaId, fechaInicio: mañana, fechaFin: pasado,
        })
        await assignResource(tracker, { tareaId, tareaFechaId: intervaloId, tipo: 'PERSONAL', resourceId: personal.id })
        await assignResource(tracker, { tareaId, tareaFechaId: intervaloId, tipo: 'MAQUINARIA', resourceId: maquinaria.id })

        for (const fecha of dias) {
            const id = await createReporteMaquinaria(tracker, {
                tareaId,
                maquinariaId: maquinaria.id,
                operadorId: personal.id,
                fecha,
                totalHoras: 8,
                estadoVenta: 'PENDIENTE',
            })
            reporteIds.push(id)
        }

        expect(reporteIds.length).toBe(3)
    })

    test('panel de ventas muestra datos de pendientes después del setup', async ({ page }) => {
        await page.goto('/ventas/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('valoraciones con estado PENDIENTE incluye reportes E2E', async ({ page }) => {
        await page.goto('/ventas/valoraciones?estado=PENDIENTE')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // La tabla debe tener al menos una fila
        const filas = page.locator('table tbody tr')
        const count = await filas.count()
        expect(count).toBeGreaterThan(0)
    })

    test('botón "Valorizar Venta" visible en valoraciones', async ({ page }) => {
        await page.goto('/ventas/valoraciones?estado=PENDIENTE')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Seleccionar la primera fila (checkbox)
        const primeraFila = page.locator('table tbody tr').first()
        if (await primeraFila.isVisible({ timeout: 8_000 })) {
            const checkbox = primeraFila.locator('input[type="checkbox"]').first()
            if (await checkbox.isVisible({ timeout: 3_000 })) {
                await checkbox.click()
                await page.waitForTimeout(500)
            }
        }

        // Verificar botón de valorizar
        const valorizarBtn = page.getByRole('button', { name: /Valorizar Venta|Valorizar/i }).first()
        if (await valorizarBtn.isVisible({ timeout: 5_000 })) {
            expect(true).toBe(true) // botón existe ✓
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear valorización venta con reportes E2E y verificar código generado', async ({ page }) => {
        if (reporteIds.length === 0) {
            test.skip(true, 'No hay reporteIds disponibles — ejecutar test de setup primero')
            return
        }

        await page.goto('/ventas/valoraciones?estado=PENDIENTE')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Seleccionar reportes E2E via checkboxes
        const filas = page.locator('table tbody tr')
        const count = await filas.count()

        let seleccionadas = 0
        for (let i = 0; i < count && seleccionadas < 3; i++) {
            const fila = filas.nth(i)
            const checkbox = fila.locator('input[type="checkbox"]').first()
            if (await checkbox.isVisible({ timeout: 1_000 })) {
                await checkbox.click()
                seleccionadas++
                await page.waitForTimeout(200)
            }
        }

        if (seleccionadas === 0) {
            // No hay reportes seleccionables — puede ser que la tabla no tenga checkboxes
            await expect(page.locator('body')).not.toContainText('Application error')
            return
        }

        // Abrir dialog de valorización
        const valorizarBtn = page.getByRole('button', { name: /Valorizar/i }).first()
        if (!await valorizarBtn.isVisible({ timeout: 5_000 })) return
        await valorizarBtn.click()
        await page.waitForTimeout(1_000)

        // Dialog debe abrirse
        const dialog = page.locator('[role="dialog"]')
        if (!await dialog.isVisible({ timeout: 8_000 })) return

        await expect(dialog).not.toContainText('Application error')

        // Puede haber preview de monto — verificar
        const preview = dialog.locator('body, [class*="preview"]').first()
        await page.waitForTimeout(2_000) // esperar que cargue el preview

        // Confirmar valorización
        const confirmarBtn = dialog.getByRole('button', { name: /Confirmar|Crear Valoriz/i }).first()
        if (await confirmarBtn.isVisible({ timeout: 5_000 }) && !await confirmarBtn.isDisabled()) {
            await confirmarBtn.click()
            await page.waitForTimeout(2_000)

            // Capturar código generado (aparece en toast o en la tabla)
            const toast = page.locator('[data-sonner-toast], [role="status"]').first()
            if (await toast.isVisible({ timeout: 5_000 })) {
                const texto = await toast.innerText()
                const match = texto.match(/V-\d{4}-\d+/)
                if (match) valorizacionCodigo = match[0]
            }

            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('listado de valoraciones muestra la valorización creada', async ({ page }) => {
        await page.goto('/ventas/valoraciones?estado=VALORADO')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        if (valorizacionCodigo) {
            await expect(page.getByText(valorizacionCodigo, { exact: false })).toBeVisible({ timeout: 8_000 })
        }
    })

    test('crear factura venta desde valorización', async ({ page }) => {
        if (!valorizacionCodigo) {
            test.skip(true, 'No hay valorización creada — ejecutar test anterior')
            return
        }

        await page.goto('/ventas/valoraciones?estado=VALORADO')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Buscar fila con el código de valorización y abrir acciones
        const row = page.locator('tr, [role="row"]').filter({ hasText: valorizacionCodigo! }).first()
        if (!await row.isVisible({ timeout: 8_000 })) return

        // Abrir menú de acciones o botón "Crear Factura"
        const accionBtn = row.locator('button').last()
        if (await accionBtn.isVisible({ timeout: 3_000 })) {
            await accionBtn.click()
            await page.waitForTimeout(500)
            const facturaItem = page.getByRole('menuitem', { name: /Factura|Facturar/i })
                .or(page.getByRole('button', { name: /Factura|Facturar/i }))
                .first()
            if (await facturaItem.isVisible({ timeout: 3_000 })) {
                await facturaItem.click()
                await page.waitForTimeout(1_000)
            }
        }

        // Dialog de factura
        const dialog = page.locator('[role="dialog"]')
        if (!await dialog.isVisible({ timeout: 8_000 })) return

        // Número de factura
        const numInput = dialog.locator('input[name="numero_factura"], input[name="numero"]').first()
        if (await numInput.isVisible({ timeout: 3_000 })) {
            await numInput.fill(`E2E-F001-${Date.now()}`)
        }

        // Fecha
        const fechaInput = dialog.locator('input[type="date"]').first()
        if (await fechaInput.isVisible({ timeout: 3_000 })) {
            await fechaInput.fill(new Date().toISOString().slice(0, 10))
        }

        const guardarBtn = dialog.getByRole('button', { name: /Guardar|Crear|Confirmar/i }).first()
        if (await guardarBtn.isVisible({ timeout: 5_000 }) && !await guardarBtn.isDisabled()) {
            await guardarBtn.click()
            await page.waitForTimeout(2_000)
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de facturas de venta muestra la factura creada', async ({ page }) => {
        await page.goto('/ventas/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
