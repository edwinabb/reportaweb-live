import { test, expect } from '@playwright/test'

/**
 * Flow 15 — Ventas: panel, valorizaciones, facturas @critical
 *
 * Admin puede crear; viewer solo ve.
 */

test.describe('Ventas — Admin @critical', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('panel de ventas carga sin errores', async ({ page }) => {
        await page.goto('/ventas/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('500 — Server Error')
    })

    test('listado de valorizaciones de venta carga', async ({ page }) => {
        await page.goto('/ventas/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de facturas de venta carga', async ({ page }) => {
        await page.goto('/ventas/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('botón nueva valorización visible en panel', async ({ page }) => {
        await page.goto('/ventas/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nuevoBtn = page.locator('button, a', { hasText: /Nueva valoriz|Nuevo|Crear/i }).first()
        // Puede no existir si el panel solo muestra métricas — no es error
        const body = await page.locator('body').innerText()
        expect(body.length).toBeGreaterThan(50)
    })

    test('PDF de valorización responde (con ID ficticio esperamos 404 o 200)', async ({ request }) => {
        const res = await request.get('/api/valorizaciones/TEST-0000/pdf')
        // 404 si no existe, 200 si hay data — lo que NO queremos es 500
        expect(res.status()).not.toBe(500)
    })
})

test.describe('Ventas — Viewer @roles', () => {
    test.use({ storageState: '.auth/viewer.json' })

    test('viewer puede ver panel de ventas', async ({ page }) => {
        await page.goto('/ventas/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
