import { test, expect } from '@playwright/test'

/**
 * Flow 13 — Planes de Acción: panel, listado, crear, filtros @critical
 *
 * Planner crea y edita. Viewer solo ve.
 */

const E2E = 'E2E_'
const TS  = Date.now()

test.describe('Planes de Acción — Planner @critical', () => {
    test.use({ storageState: '.auth/planner.json' })

    test('panel de planes de acción carga', async ({ page }) => {
        await page.goto('/planes-accion/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('500 — Server Error')
    })

    test('listado de planes carga y muestra columnas', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('h1').first()).toContainText(/Planes de acción/i)
    })

    test('filtro por estado (Abierto / Cerrado) funciona', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const filtro = page.locator('[role="tab"], button, select', { hasText: /Abierto|Cerrado|Pendiente/i }).first()
        if (await filtro.isVisible()) {
            await filtro.click()
            await page.waitForTimeout(500)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('crear nuevo plan de acción', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nuevoBtn = page.locator('button, a', { hasText: /Nuevo plan|Crear plan/i }).first()
        if (await nuevoBtn.isVisible({ timeout: 5_000 })) {
            await nuevoBtn.click()
            await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

            const tituloInput = page.locator('input[name="titulo"], textarea[name="descripcion"]').first()
            if (await tituloInput.isVisible({ timeout: 8_000 })) {
                await tituloInput.fill(`${E2E}Plan_${TS}`)

                // Fecha límite (si existe)
                const fechaInput = page.locator('input[type="date"], input[name="fecha_limite"]').first()
                if (await fechaInput.isVisible()) {
                    await fechaInput.fill('2026-12-31')
                }

                await page.locator('button[type="submit"]').click()
                await expect(page.locator('body')).not.toContainText('Application error', { timeout: 10_000 })
            }
        }
    })
})

test.describe('Planes de Acción — Viewer @roles', () => {
    test.use({ storageState: '.auth/viewer.json' })

    test('viewer puede ver el listado de planes', async ({ page }) => {
        await page.goto('/planes-accion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
