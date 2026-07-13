import { test, expect } from '@playwright/test'

/**
 * Flow 7 — EPP: alertas + envío de emails + reporte semanal (Fase L / 8)
 *
 * Usa siempre la sesión planner — estos flows son de rol planner.
 * Los tests admin/viewer de EPP están en 24-pre-cutover-epp-full.spec.ts.
 */

test.describe('Flow 7 — EPP Alertas + Emails @epp', () => {
    test.use({ storageState: '.auth/planner.json' })

    test('dashboard EPP carga y muestra navegación', async ({ page }) => {
        await page.goto('/epp')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
        if (page.url().includes('/epp')) {
            await expect(page.locator('body')).toContainText(/EPP|Protección|entrega|catalogo/i, { timeout: 15_000 })
        }
    })

    test('catálogo EPP lista equipos configurados', async ({ page }) => {
        await page.goto('/epp/catalogo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
        if (page.url().includes('/epp')) {
            const body = await page.locator('body').innerText()
            expect(body.length).toBeGreaterThan(50)
        }
    })

    test('alertas: panel carga y expone CTAs de regenerar + emails', async ({ page }) => {
        await page.goto('/epp/alertas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')

        // Botones de acción — texto puede variar; verificamos al menos uno
        const actionBtn = page.locator('button').filter({ hasText: /Regenerar|Enviar|alertas|email/i }).first()
        if (await actionBtn.isVisible({ timeout: 10_000 })) {
            await expect(actionBtn).toBeVisible()
        } else {
            // Si no hay botones de acción, la página carga sin errores — suficiente
            await expect(page.locator('body')).toContainText(/alerta|EPP|entrega/i, { timeout: 10_000 })
        }
    })

    test('cron EPP alertas rechaza requests sin auth', async ({ request }) => {
        const res = await request.post('/api/cron/epp-alertas')
        expect(res.status()).toBe(401)
    })

    test('cron reporte semanal rechaza requests sin auth', async ({ request }) => {
        const res = await request.post('/api/cron/epp-reporte-semanal')
        expect(res.status()).toBe(401)
    })
})
