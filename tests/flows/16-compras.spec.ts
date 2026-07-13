import { test, expect } from '@playwright/test'

/**
 * Flow 16 — Compras: panel, valorizaciones, facturas @critical
 *
 * Paralelo a ventas. Admin opera, viewer solo ve.
 */

test.describe('Compras — Admin @critical', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('panel de compras carga sin errores', async ({ page }) => {
        await page.goto('/compras/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('500 — Server Error')
    })

    test('listado de valorizaciones de compra carga', async ({ page }) => {
        await page.goto('/compras/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('listado de facturas de compra carga', async ({ page }) => {
        await page.goto('/compras/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('filtros de fecha en listado de compras', async ({ page }) => {
        await page.goto('/compras/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const filtroFecha = page.locator('input[type="date"], input[placeholder*="fecha"]').first()
        if (await filtroFecha.isVisible()) {
            await filtroFecha.fill('2026-01-01')
            await page.waitForTimeout(500)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })
})

test.describe('Compras — Viewer @roles', () => {
    test.use({ storageState: '.auth/viewer.json' })

    test('viewer puede ver panel de compras', async ({ page }) => {
        await page.goto('/compras/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
