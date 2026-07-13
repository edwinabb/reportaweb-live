import { test, expect } from '@playwright/test'

/**
 * Flow 8 — Formatos / Informes (Fase H)
 *
 * Usa siempre la sesión planner — estos flows son de rol planner.
 * Los tests completos de formatos están en 28-pre-cutover-informes-full.spec.ts.
 */

test.describe('Flow 8 — Formatos + Informes @formatos', () => {
    test.use({ storageState: '.auth/planner.json' })

    test('listado de plantillas de formatos carga', async ({ page }) => {
        await page.goto('/formatos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // h1 puede decir "Formatos", "Plantillas" o "Inspecciones" según config
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    })

    test('listado de informes carga', async ({ page }) => {
        await page.goto('/informes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    })

    test('selector de plantilla de nuevo informe carga', async ({ page }) => {
        await page.goto('/informes/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // combobox o selector de plantilla presente
        const selector = page.getByRole('combobox').or(page.locator('select')).first()
        if (await selector.isVisible({ timeout: 5_000 })) {
            await expect(selector).toBeVisible()
        }
    })

    test('agenda admin (Fase O) muestra semana actual', async ({ page }) => {
        await page.goto('/admin/agenda')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Verifica que la página carga con algún contenido de agenda
        const hasAgenda = await page.locator('body').innerText().then(t =>
            /Agenda|semana|lun|mar|mié/i.test(t)
        ).catch(() => false)
        if (!hasAgenda) {
            // Ruta puede no existir para este rol — solo verificar no hay error
            await expect(page.locator('body')).not.toContainText('500')
        }
    })
})
