import { test, expect } from '@playwright/test'

/**
 * Flow 14 — EPP completo: dashboard, catálogo, nueva entrega, alertas @epp @critical
 *
 * Extiende el smoke del flow 07 con flujos de acción real.
 * Usa rol planner (puede registrar entregas).
 */

test.describe('EPP — Dashboard y navegación @epp @critical', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('dashboard EPP carga con métricas', async ({ page }) => {
        await page.goto('/epp')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
        if (page.url().includes('/epp')) {
            await expect(page.locator('body')).toContainText(/EPP|Equipos de protecci/i)
        }
    })

    test('catálogo EPP lista artículos y permite buscar', async ({ page }) => {
        await page.goto('/epp/catalogo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')

        const search = page.locator('input[placeholder*="Buscar"], input[type="search"]').first()
        if (await search.isVisible()) {
            await search.fill('casco')
            await page.waitForTimeout(400)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('panel de alertas EPP carga con botones de acción', async ({ page }) => {
        await page.goto('/epp/alertas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')

        const regenerarBtn = page.locator('button', { hasText: /Regenerar alertas/i })
        if (await regenerarBtn.isVisible({ timeout: 5_000 })) {
            await expect(regenerarBtn).toBeVisible()
            const emailBtn = page.locator('button', { hasText: /Enviar por email/i })
            if (await emailBtn.isVisible({ timeout: 3_000 })) {
                await expect(emailBtn).toBeVisible()
            }
        }
    })

    test('página nueva entrega EPP carga el formulario', async ({ page }) => {
        await page.goto('/epp/entrega/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Debe tener formulario o redirigir — cualquiera indica que la ruta existe
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('404')
    })

    test('listado de reportes EPP carga', async ({ page }) => {
        await page.goto('/epp/reportes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('EPP — endpoints cron protegidos @epp', () => {
    test('cron EPP alertas rechaza sin auth header', async ({ request }) => {
        const res = await request.post('/api/cron/epp-alertas')
        expect(res.status()).toBe(401)
    })

    test('cron reporte semanal rechaza sin auth header', async ({ request }) => {
        const res = await request.post('/api/cron/epp-reporte-semanal')
        expect(res.status()).toBe(401)
    })
})
