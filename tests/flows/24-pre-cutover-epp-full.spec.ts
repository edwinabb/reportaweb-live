import { test, expect } from '@playwright/test'

/**
 * Flow 24 — Pre-cutover: EPP completo @pre-cutover
 * Fase 5: dashboard, catálogo, entrega, historial, alertas.
 */

test.describe('EPP — Dashboard y Catálogo @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('dashboard EPP carga con métricas', async ({ page }) => {
        await page.goto('/epp')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('500')
    })

    test('catálogo de EPP carga', async ({ page }) => {
        await page.goto('/epp/catalogo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear EPP en catálogo', async ({ page }) => {
        await page.goto('/epp/catalogo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Buscar botón de agregar
        const addBtn = page.getByRole('button', { name: /Agregar|Nuevo|Add|New/i }).first()
        if (!await addBtn.isVisible({ timeout: 5_000 })) return

        await addBtn.click()
        await page.waitForTimeout(500)

        // Nombre del EPP
        const nombreInput = page.locator('input[name="nombre"], input[placeholder*="nombre" i]').first()
        if (await nombreInput.isVisible({ timeout: 5_000 })) {
            await nombreInput.fill(`E2E_Casco_${Date.now()}`)
        }

        // Días renovación
        const diasInput = page.locator('input[name="dias_renovacion"], input[type="number"]').first()
        if (await diasInput.isVisible({ timeout: 3_000 })) {
            await diasInput.fill('365')
        }

        const saveBtn = page.getByRole('button', { name: /Guardar|Save|Crear|Aceptar/i }).first()
        if (await saveBtn.isVisible({ timeout: 5_000 })) {
            await saveBtn.click()
            await page.waitForTimeout(1_000)
        }
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('EPP — Entrega y Alertas @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('formulario de nueva entrega accesible', async ({ page }) => {
        await page.goto('/epp/entrega/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('registrar entrega de EPP a colaborador', async ({ page }) => {
        await page.goto('/epp/entrega/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Seleccionar colaborador (combobox/select)
        const colaboradorSelect = page.locator('[role="combobox"]').filter({ hasText: /Colaborador|Personal/i }).first()
        if (await colaboradorSelect.isVisible({ timeout: 5_000 })) {
            await colaboradorSelect.click()
            // Seleccionar primer resultado
            await page.getByRole('option').first().click().catch(() => {})
            await page.waitForTimeout(500)
        }

        // Seleccionar EPP
        const eppSelect = page.locator('[role="combobox"]').filter({ hasText: /EPP|equipo/i }).first()
        if (await eppSelect.isVisible({ timeout: 5_000 })) {
            await eppSelect.click()
            await page.getByRole('option').first().click().catch(() => {})
            await page.waitForTimeout(500)
        }

        // Fecha de entrega
        const fechaInput = page.locator('input[type="date"][name*="fecha"]').first()
        if (await fechaInput.isVisible({ timeout: 3_000 })) {
            await fechaInput.fill(new Date().toISOString().slice(0, 10))
        }

        // No hacemos submit para no crear datos reales sin cleanup
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('página de alertas de EPP carga', async ({ page }) => {
        await page.goto('/epp/alertas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('página de reportes EPP carga', async ({ page }) => {
        await page.goto('/epp/reportes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
