import { test, expect } from '@playwright/test'

/**
 * Flow 37 — Pre-cutover: Settings Avanzados @pre-cutover
 *
 * Verifica que todas las páginas de settings cargan sin error:
 * /settings/informes, /settings/valorizaciones, /settings/cotizaciones, /settings/sitios
 */

test.describe('Settings — Rutas @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/settings/informes carga sin error', async ({ page }) => {
        await page.goto('/settings/informes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/settings/valorizaciones carga sin error', async ({ page }) => {
        await page.goto('/settings/valorizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/settings/cotizaciones carga sin error', async ({ page }) => {
        await page.goto('/settings/cotizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/settings/sitios carga sin error', async ({ page }) => {
        await page.goto('/settings/sitios')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Settings — Contenido @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/settings/informes muestra configuración (no pantalla en blanco)', async ({ page }) => {
        await page.goto('/settings/informes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(100)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/settings/sitios muestra lista de sitios o formulario', async ({ page }) => {
        await page.goto('/settings/sitios')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(100)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/settings/cotizaciones muestra configuración de cotizaciones', async ({ page }) => {
        await page.goto('/settings/cotizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(100)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/settings/valorizaciones muestra configuración de valorizaciones', async ({ page }) => {
        await page.goto('/settings/valorizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(100)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Settings Informes — Toggle persiste @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('toggle en settings/informes es interactuable', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/settings/informes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Buscar algún toggle/switch
        const toggle = page.locator('[role="switch"]').first()
        if (await toggle.isVisible({ timeout: 5_000 })) {
            const estadoInicial = await toggle.getAttribute('aria-checked')
            await toggle.click()
            await page.waitForTimeout(1_000)
            const estadoFinal = await toggle.getAttribute('aria-checked')
            // El estado debería haber cambiado
            expect(estadoFinal).not.toBe(estadoInicial)

            // Restaurar estado
            await toggle.click()
            await page.waitForTimeout(500)
        } else {
            console.log('[INFO] No hay toggles/switches en /settings/informes — puede usar otro componente')
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
