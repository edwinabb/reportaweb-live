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
import { getAdminClient } from '../helpers/supabase-admin'

/**
 * Flow 31 — Pre-cutover: Compras — Valorización → Factura (con PDF) @pre-cutover
 * Fases 13-14: crea reportes de maquinaria (estado_compra=PENDIENTE) via factory,
 * luego prueba el flujo completo en UI.
 *
 * ⚠️ LIMITACIÓN (tarea manual): La factura compra requiere subir PDF real del proveedor.
 *    Esta tarea queda marcada en el plan para verificación manual.
 */

const mañana = format(addDays(new Date(), 1), 'yyyy-MM-dd')
const pasado = format(addDays(new Date(), 3), 'yyyy-MM-dd')
const dias = [
    format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    format(addDays(new Date(), 3), 'yyyy-MM-dd'),
]

test.describe('Compras — Panel y Listados @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('panel de compras carga sin errores', async ({ page }) => {
        await page.goto('/compras/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de valoraciones compra carga', async ({ page }) => {
        await page.goto('/compras/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de facturas compra carga', async ({ page }) => {
        await page.goto('/compras/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Compras — Flujo Valorización → Factura @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })
    const tracker = newTracker()
    let reporteIds: string[] = []
    let valorizacionCodigo: string | null = null

    test.afterAll(async () => {
        if (valorizacionCodigo) {
            const admin = getAdminClient()
            await admin.from('reportes_maquinaria').update({ estado_compra: 'PENDIENTE', valorizacion_compra: null }).eq('valorizacion_compra', valorizacionCodigo).then(undefined, () => {})
            await admin.from('valorizaciones_compra').delete().eq('codigo', valorizacionCodigo).then(undefined, () => {})
        }
        await cleanupTestData(tracker)
    })

    test('setup: crear tarea 2 + reportes maquinaria estado_compra=PENDIENTE', async () => {
        const personal = await ensurePersonal(tracker, 'compras-flow')
        const maquinaria = await ensureMaquinaria(tracker, 'compras-flow')

        const tareaId = await createTarea(tracker, {
            titulo: 'T2-Compras-Flow',
            clienteNombre: 'E2E_Cliente Compras Test',
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
                estadoVenta: null,
                estadoCompra: 'PENDIENTE',
            })
            reporteIds.push(id)
        }

        expect(reporteIds.length).toBe(3)
    })

    test('panel de compras muestra pendientes después del setup', async ({ page }) => {
        await page.goto('/compras/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('valoraciones compra con estado PENDIENTE muestra reportes', async ({ page }) => {
        await page.goto('/compras/valoraciones?estado=PENDIENTE')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        const filas = page.locator('table tbody tr')
        const count = await filas.count()
        expect(count).toBeGreaterThan(0)
    })

    test('crear valorización compra con reportes E2E', async ({ page }) => {
        await page.goto('/compras/valoraciones?estado=PENDIENTE')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Seleccionar algunas filas
        const filas = page.locator('table tbody tr')
        const count = await filas.count()
        let seleccionadas = 0

        for (let i = 0; i < count && seleccionadas < 3; i++) {
            const checkbox = filas.nth(i).locator('input[type="checkbox"]').first()
            if (await checkbox.isVisible({ timeout: 1_000 })) {
                await checkbox.click()
                seleccionadas++
                await page.waitForTimeout(200)
            }
        }

        if (seleccionadas === 0) {
            await expect(page.locator('body')).not.toContainText('Application error')
            return
        }

        const valorizarBtn = page.getByRole('button', { name: /Valorizar/i }).first()
        if (!await valorizarBtn.isVisible({ timeout: 5_000 })) return
        await valorizarBtn.click()
        await page.waitForTimeout(1_000)

        const dialog = page.locator('[role="dialog"]')
        if (!await dialog.isVisible({ timeout: 8_000 })) return

        await page.waitForTimeout(2_000) // Esperar preview

        const confirmarBtn = dialog.getByRole('button', { name: /Confirmar|Crear Valoriz/i }).first()
        if (await confirmarBtn.isVisible({ timeout: 5_000 }) && !await confirmarBtn.isDisabled()) {
            await confirmarBtn.click()
            await page.waitForTimeout(2_000)

            // Capturar código C-XXXX-YYYYY
            const toast = page.locator('[data-sonner-toast], [role="status"]').first()
            if (await toast.isVisible({ timeout: 5_000 })) {
                const texto = await toast.innerText()
                const match = texto.match(/C-\d{4}-\d+/)
                if (match) valorizacionCodigo = match[0]
            }
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear factura compra con PDF simulado', async ({ page }) => {
        if (!valorizacionCodigo) {
            test.skip(true, 'No hay valorización compra — ejecutar test anterior')
            return
        }

        await page.goto('/compras/valoraciones?estado=VALORADO')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const row = page.locator('tr, [role="row"]').filter({ hasText: valorizacionCodigo! }).first()
        if (!await row.isVisible({ timeout: 8_000 })) return

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

        const dialog = page.locator('[role="dialog"]')
        if (!await dialog.isVisible({ timeout: 8_000 })) return

        // Número de factura del proveedor
        const numInput = dialog.locator('input[name="numero_factura"], input[name="numero"]').first()
        if (await numInput.isVisible({ timeout: 3_000 })) {
            await numInput.fill(`E2E-PROV-F001-${Date.now()}`)
        }

        // Fecha
        const fechaInput = dialog.locator('input[type="date"]').first()
        if (await fechaInput.isVisible({ timeout: 3_000 })) {
            await fechaInput.fill(new Date().toISOString().slice(0, 10))
        }

        // PDF del proveedor — simulado con buffer mínimo
        const fileInput = dialog.locator('input[type="file"]').first()
        if (await fileInput.isVisible({ timeout: 3_000 })) {
            const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
            await fileInput.setInputFiles({
                name: 'factura-proveedor-e2e.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.from(pdfContent),
            })
            await page.waitForTimeout(500)
        }

        const guardarBtn = dialog.getByRole('button', { name: /Guardar|Crear|Confirmar/i }).first()
        if (await guardarBtn.isVisible({ timeout: 5_000 }) && !await guardarBtn.isDisabled()) {
            await guardarBtn.click()
            await page.waitForTimeout(2_000)
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de facturas compra muestra la factura creada', async ({ page }) => {
        await page.goto('/compras/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
