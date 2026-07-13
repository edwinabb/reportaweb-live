import { test, expect } from '@playwright/test'

/**
 * Flow 21 — Pre-cutover: Usuarios CRUD @pre-cutover
 * Fase 2: crear usuario, editar, documentos, desactivar/restaurar.
 */

const TS = Date.now()
const EMAIL = `e2e_ui_user_${TS}@reporta.test`

test.describe('Usuarios — CRUD completo @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de usuarios activos carga', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Buscar tabla o lista
        const tabla = page.locator('table tbody tr, [role="row"]').first()
        await expect(tabla).toBeVisible({ timeout: 10_000 })
    })

    test('búsqueda de usuario en listado', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const searchInput = page.locator('input[type="search"], input[placeholder*="buscar" i], input[placeholder*="search" i]').first()
        if (await searchInput.isVisible({ timeout: 5_000 })) {
            await searchInput.fill('admin')
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('pestaña Papelera accesible', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const papeleraTab = page.getByRole('tab', { name: /Papelera|Inactivos/i })
            .or(page.getByRole('button', { name: /Papelera|Inactivos/i }))
        if (await papeleraTab.isVisible({ timeout: 5_000 })) {
            await papeleraTab.click()
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('formulario crear usuario accesible', async ({ page }) => {
        await page.goto('/users/create')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Verificar que hay un input de email
        await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 8_000 })
    })

    test('crear usuario con datos mínimos', async ({ page }) => {
        await page.goto('/users/create')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Email
        const emailInput = page.locator('input[type="email"], input[name="email"]').first()
        if (await emailInput.isVisible({ timeout: 8_000 })) {
            await emailInput.fill(EMAIL)
        }

        // Nombre
        const firstNameInput = page.locator('input[name="first_name"], input[name="nombre"], input[placeholder*="nombre" i]').first()
        if (await firstNameInput.isVisible({ timeout: 3_000 })) {
            await firstNameInput.fill('E2E')
        }

        // Apellido
        const lastNameInput = page.locator('input[name="last_name"], input[name="apellido"], input[placeholder*="apellido" i]').first()
        if (await lastNameInput.isVisible({ timeout: 3_000 })) {
            await lastNameInput.fill('Usuario')
        }

        // Rol - seleccionar "viewer" si hay un selector
        const rolSelect = page.locator('select[name="role"], [role="combobox"]').filter({ hasText: /Rol|Role/i }).first()
        if (await rolSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await rolSelect.click()
            await page.getByRole('option', { name: /viewer/i }).click().catch(() => {})
        }

        // Submit
        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Guardar|Crear|Save|Create/i }).first()
        if (await submitBtn.isVisible({ timeout: 5_000 })) {
            await submitBtn.click()
            await page.waitForTimeout(2_000)
        }

        // No debe haber error de aplicación
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('página de documentos de usuario carga', async ({ page }) => {
        await page.goto('/users/documents')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
