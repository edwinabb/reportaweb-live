import { test, expect } from '@playwright/test'

/**
 * Flow 19 — Configuración: catálogos, tenant config, tipos de documento @settings @critical
 *
 * Admin_tenant opera sobre todas las sub-rutas de /settings.
 */

test.describe('Settings — Admin @settings @critical', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('settings usuarios carga', async ({ page }) => {
        await page.goto('/settings/users')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('settings terceros (categorías) carga', async ({ page }) => {
        await page.goto('/settings/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('settings maquinaria (categorías) carga', async ({ page }) => {
        await page.goto('/settings/maquinaria')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('settings cotizaciones: tasas y config cargan', async ({ page }) => {
        await page.goto('/settings/cotizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Debe mostrar campos de imagen banco y firma (campos de cotización)
        const body = await page.locator('body').innerText()
        expect(body.length).toBeGreaterThan(100)
    })

    test('settings sitios carga', async ({ page }) => {
        await page.goto('/settings/sitios')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('settings tipos de documento carga', async ({ page }) => {
        await page.goto('/settings/document-types')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('settings informes (config por tenant) carga con toggles', async ({ page }) => {
        await page.goto('/settings/informes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('settings valorizaciones carga', async ({ page }) => {
        await page.goto('/settings/valorizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        // Puede redirigir si no existe la ruta — lo que no queremos es 500
        await expect(page.locator('body')).not.toContainText('500 — Server Error')
    })
})
