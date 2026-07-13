import { test, expect } from '@playwright/test'

/**
 * Flow 28 — Acceso denegado para planner @critical
 *
 * Valida que planner (usuario interno) no puede acceder a módulos
 * restringidos (cotizaciones, ventas, compras).
 * - Planner: solo accede a /planificacion y /formatos
 * - No puede ver /cotizaciones, /ventas, /compras
 */

test.describe('Acceso denegado para planner @critical', () => {
    test.use({ storageState: '.auth/planner.json' })

    test('planner intenta /cotizaciones → redirigido a /planificacion o /login', async ({ page }) => {
        await page.goto('/cotizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        // Expect redirect to /planificacion or forced re-login
        await expect(page).toHaveURL(/\/planificacion|\/login/)
    })

    test('planner intenta /ventas → redirigido a /planificacion o /login', async ({ page }) => {
        await page.goto('/ventas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).toHaveURL(/\/planificacion|\/login/)
    })

    test('planner intenta /compras → redirigido a /planificacion o /login', async ({ page }) => {
        await page.goto('/compras')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).toHaveURL(/\/planificacion|\/login/)
    })

    test('planner PUEDE acceder a /formatos (módulo permitido)', async ({ page }) => {
        await page.goto('/formatos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        // Should not be redirected to login
        await expect(page).not.toHaveURL(/\/login/)
        // Should not show application error
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
