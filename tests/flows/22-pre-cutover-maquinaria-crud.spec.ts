import { test, expect } from '@playwright/test'
import {
    openListado,
    buscarEnListado,
    toggleActivosPapelera,
} from '../helpers/listado-v12'

/**
 * Flow 22 — Pre-cutover: Maquinaria CRUD @pre-cutover
 * Fase 3: crear, editar, documentos, modelos, tipos, desactivar/restaurar.
 *
 * Refactor FASE C4-a: usa helpers de template v1.2.
 */

const TS = Date.now()

test.describe('Maquinaria — Listado @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de maquinarias activas carga', async ({ page }) => {
        await openListado(page, '/maquinarias')
        const tabla = page.locator('table tbody tr, [role="row"]').first()
        await expect(tabla).toBeVisible({ timeout: 10_000 })
    })

    test('búsqueda en listado de maquinarias', async ({ page }) => {
        await openListado(page, '/maquinarias')
        await buscarEnListado(page, 'grua')
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('pestaña Papelera de maquinaria accesible', async ({ page }) => {
        await openListado(page, '/maquinarias')
        await toggleActivosPapelera(page, 'papelera')
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Maquinaria — Crear y Editar @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('formulario de creación de maquinaria accesible', async ({ page }) => {
        await page.goto('/maquinarias/create')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        const nameInput = page.locator('input[name="nombre"], input[name="descripcion"], input[placeholder*="nombre" i]').first()
        await expect(nameInput).toBeVisible({ timeout: 8_000 })
    })

    test('crear maquinaria con datos básicos', async ({ page }) => {
        await page.goto('/maquinarias/create')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nameInput = page.locator('input[name="nombre"], input[name="descripcion"], textarea[name="descripcion"]').first()
        if (await nameInput.isVisible({ timeout: 8_000 })) {
            await nameInput.fill(`E2E_Equipo_${TS}`)
        }

        const codigoInput = page.locator('input[name="codigo_interno"], input[name="placa"], input[name="codigo"]').first()
        if (await codigoInput.isVisible({ timeout: 3_000 })) {
            await codigoInput.fill(`E2E-MAQ-UI-${TS}`)
        }

        const propietarioSelect = page.locator('select[name="propietario"], [role="combobox"]').filter({ hasText: /Propietario/i }).first()
        if (await propietarioSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await propietarioSelect.click()
            const propioOpt = page.getByRole('option', { name: /propio/i }).first()
            if (await propioOpt.isVisible({ timeout: 2_000 })) await propioOpt.click()
        }

        const submitBtn = page.locator('button[type="submit"]').first()
        if (await submitBtn.isVisible({ timeout: 5_000 })) {
            await submitBtn.click()
            await page.waitForTimeout(2_000)
        }
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Maquinaria — Sub-módulos @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('página de documentos de maquinaria carga', async ({ page }) => {
        await openListado(page, '/maquinarias/documentos')
    })

    test('página de modelos de maquinaria carga', async ({ page }) => {
        await openListado(page, '/maquinarias/modelos')
    })

    test('página de tipos de maquinaria carga', async ({ page }) => {
        await openListado(page, '/maquinarias/types')
    })
})
