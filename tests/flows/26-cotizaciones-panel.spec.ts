import { test, expect } from '@playwright/test'

test.describe('Panel de Cotizaciones @critical', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('panel carga con los 2 gráficos y las 2 listas', async ({ page }) => {
        await page.goto('/cotizaciones/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        await expect(page.locator('h1').first()).toContainText(/Panel/i)
        await expect(page.locator('[data-testid="panel-chart-mensual"]')).toBeVisible()
        await expect(page.locator('[data-testid="panel-chart-diario"]')).toBeVisible()
        await expect(page.locator('text=Pendientes por enviar')).toBeVisible()
        await expect(page.locator('text=Enviadas').first()).toBeVisible()
    })

    test('cambiar el mes del gráfico diario actualiza la URL', async ({ page }) => {
        await page.goto('/cotizaciones/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        await page.locator('[data-testid="panel-mes-select"]').click()
        await page.getByRole('option', { name: 'Enero' }).click()
        await page.waitForURL(/mes=1/, { timeout: 10_000 })
        await expect(page.locator('[data-testid="panel-chart-diario"]')).toBeVisible()
    })

    test('link "Panel" del menú navega correctamente', async ({ page }) => {
        await page.goto('/cotizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await page.locator('a[href="/cotizaciones/panel"]').first().click()
        await expect(page).toHaveURL(/\/cotizaciones\/panel/)
    })
})
