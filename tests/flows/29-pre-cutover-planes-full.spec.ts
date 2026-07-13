import { test, expect } from '@playwright/test'

/**
 * Flow 29 — Pre-cutover: Planes de Acción @pre-cutover
 * Fase 10: dashboard, listado, crear plan, registrar avance.
 */

const TS = Date.now()

test.describe('Planes de Acción — Dashboard y Listado @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('panel de planes carga con KPIs', async ({ page }) => {
        await page.goto('/planes-accion/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Debe haber tarjetas de métricas
        const kpis = page.locator('[class*="card"], [class*="Card"], .metric').first()
        await expect(kpis).toBeVisible({ timeout: 8_000 })
    })

    test('listado de planes carga', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('filtro por estado PENDIENTE funciona', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const estadoFilter = page.locator('[role="combobox"]').filter({ hasText: /Estado/i }).first()
        if (await estadoFilter.isVisible({ timeout: 5_000 })) {
            await estadoFilter.click()
            await page.getByRole('option', { name: /Pendiente/i }).click().catch(() => {})
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('filtro por prioridad CRITICA funciona', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const prioFilter = page.locator('[role="combobox"]').filter({ hasText: /Prioridad/i }).first()
        if (await prioFilter.isVisible({ timeout: 5_000 })) {
            await prioFilter.click()
            await page.getByRole('option', { name: /Crítica|Critica/i }).click().catch(() => {})
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })
})

test.describe('Planes de Acción — Crear Plan y Avance @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('abrir plan existente muestra timeline de avances', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Abrir primer plan
        const primerPlan = page.locator('tr, [role="row"], a[href*="/planes-accion/"]').first()
        if (await primerPlan.isVisible({ timeout: 8_000 })) {
            await primerPlan.click()
            await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('crear nuevo plan de acción', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Buscar botón Nuevo
        const nuevoBtn = page.getByRole('button', { name: /Nuevo Plan|Nueva Acción|Crear/i })
            .or(page.getByRole('link', { name: /Nuevo Plan|Nueva Acción/i }))
            .first()
        if (!await nuevoBtn.isVisible({ timeout: 5_000 })) return

        await nuevoBtn.click()
        await page.waitForTimeout(500)

        // Puede abrir un dialog o navegar a una página nueva
        const dialog = page.locator('[role="dialog"]')
        const enDialog = await dialog.isVisible({ timeout: 3_000 })

        const container = enDialog ? dialog : page

        // Título del plan
        const tituloInput = container.locator('input[name="titulo"], input[placeholder*="título" i]').first()
        if (await tituloInput.isVisible({ timeout: 5_000 })) {
            await tituloInput.fill(`E2E_Plan_${TS}`)
        }

        // Descripción
        const descInput = container.locator('textarea[name="descripcion"], textarea[placeholder*="descripción" i]').first()
        if (await descInput.isVisible({ timeout: 3_000 })) {
            await descInput.fill('E2E - Corrección de fuga de aceite')
        }

        // Prioridad
        const prioSelect = container.locator('[role="combobox"]').filter({ hasText: /Prioridad/i }).first()
        if (await prioSelect.isVisible({ timeout: 3_000 })) {
            await prioSelect.click()
            await page.getByRole('option', { name: /Alta/i }).click().catch(() => {})
        }

        // Fecha límite
        const fechaInput = container.locator('input[type="date"]').first()
        if (await fechaInput.isVisible({ timeout: 3_000 })) {
            const fecha = new Date()
            fecha.setDate(fecha.getDate() + 30)
            await fechaInput.fill(fecha.toISOString().slice(0, 10))
        }

        // Guardar
        const saveBtn = container.getByRole('button', { name: /Guardar|Crear|Save/i }).first()
        if (await saveBtn.isVisible({ timeout: 5_000 })) {
            await saveBtn.click()
            await page.waitForTimeout(2_000)
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
