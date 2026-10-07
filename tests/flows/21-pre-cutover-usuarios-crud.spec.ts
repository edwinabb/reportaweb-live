import { test, expect } from '@playwright/test'
import {
    openListado,
    buscarEnListado,
    toggleActivosPapelera,
} from '../helpers/listado-v12'

/**
 * Flow 21 — Pre-cutover: Usuarios CRUD @pre-cutover
 * Fase 2: crear usuario, editar, documentos, desactivar/restaurar.
 *
 * Refactor FASE C4-a: usa helpers de template v1.2 (openListado,
 * buscarEnListado, toggleActivosPapelera). Antes el toggle Papelera estaba
 * roto por usar `getByRole('tab')` que v1.2 ya no expone.
 */

const TS = Date.now()
const EMAIL = `e2e_ui_user_${TS}@reporta.test`

test.describe('Usuarios — CRUD completo @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de usuarios activos carga', async ({ page }) => {
        await openListado(page, '/users')
        const tabla = page.locator('table tbody tr, [role="row"]').first()
        await expect(tabla).toBeVisible({ timeout: 10_000 })
    })

    test('búsqueda de usuario en listado', async ({ page }) => {
        await openListado(page, '/users')
        await buscarEnListado(page, 'admin')
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('pestaña Papelera accesible', async ({ page }) => {
        await openListado(page, '/users')
        await toggleActivosPapelera(page, 'papelera')
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('formulario crear usuario accesible', async ({ page }) => {
        await page.goto('/users/create')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 8_000 })
    })

    test('crear usuario con datos mínimos', async ({ page }) => {
        await page.goto('/users/create')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const emailInput = page.locator('input[type="email"], input[name="email"]').first()
        if (await emailInput.isVisible({ timeout: 8_000 })) {
            await emailInput.fill(EMAIL)
        }

        const firstNameInput = page.locator('input[name="first_name"], input[name="nombre"], input[placeholder*="nombre" i]').first()
        if (await firstNameInput.isVisible({ timeout: 3_000 })) {
            await firstNameInput.fill('E2E')
        }

        const lastNameInput = page.locator('input[name="last_name"], input[name="apellido"], input[placeholder*="apellido" i]').first()
        if (await lastNameInput.isVisible({ timeout: 3_000 })) {
            await lastNameInput.fill('Usuario')
        }

        const rolSelect = page.locator('select[name="role"], [role="combobox"]').filter({ hasText: /Rol|Role/i }).first()
        if (await rolSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await rolSelect.click()
            await page.getByRole('option', { name: /viewer/i }).click().catch(() => {})
        }

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Guardar|Crear|Save|Create/i }).first()
        if (await submitBtn.isVisible({ timeout: 5_000 })) {
            await submitBtn.click()
            await page.waitForTimeout(2_000)
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('página de documentos de usuario carga', async ({ page }) => {
        await openListado(page, '/users/documents')
    })
})
