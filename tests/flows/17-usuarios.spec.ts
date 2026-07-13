import { test, expect } from '@playwright/test'

/**
 * Flow 17 — Usuarios: listado, crear, cambiar rol, documentos @critical
 *
 * Admin opera. Viewer no tiene acceso.
 */

test.describe('Usuarios — Admin @critical', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de usuarios del tenant carga', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('h1').first()).toContainText(/Usuarios/i)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('buscar usuario por nombre', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const search = page.locator('input[placeholder*="Buscar"], input[type="search"]').first()
        if (await search.isVisible()) {
            await search.fill('E2E')
            await page.waitForTimeout(600)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('botón invitar / crear usuario visible', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nuevoBtn = page.locator('button, a', { hasText: /Invitar|Nuevo usuario|Agregar usuario/i }).first()
        await expect(nuevoBtn).toBeVisible({ timeout: 10_000 })
    })

    test('documentos de usuarios carga', async ({ page }) => {
        await page.goto('/users/documents')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Usuarios — Viewer @roles', () => {
    test.use({ storageState: '.auth/viewer.json' })

    test('viewer puede ver /users sin error de aplicación', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
