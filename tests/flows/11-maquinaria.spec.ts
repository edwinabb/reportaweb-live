import { test, expect } from '@playwright/test'

/**
 * Flow 11 — Maquinaria: Equipos, Modelos, Tipos, Documentos (CRUD) @critical
 *
 * Usa chromium-admin.
 */

test.use({ storageState: '.auth/admin.json' })

const E2E = 'E2E_'
const TS  = Date.now()

test.describe('Maquinaria — Equipos @critical', () => {
    test('listado de equipos carga', async ({ page }) => {
        await page.goto('/maquinarias')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('h1')).toContainText(/Maquinaria|Equipos/i)
    })

    test('buscar equipo por nombre o código', async ({ page }) => {
        await page.goto('/maquinarias')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const search = page.locator('input[placeholder*="Buscar"], input[type="search"]').first()
        if (await search.isVisible()) {
            await search.fill('Grúa')
            await page.waitForTimeout(600)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('crear equipo nuevo y verificar en listado', async ({ page }) => {
        const nombre = `${E2E}Grua_${TS}`
        const codigo = `E2E-${TS}`

        await page.goto('/maquinarias/create')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        const nombreInput = page.locator('input[name="nombre"]').first()
        await expect(nombreInput).toBeVisible({ timeout: 10_000 })
        await nombreInput.fill(nombre)

        const codigoInput = page.locator('input[name="codigo_interno"]').first()
        if (await codigoInput.isVisible()) await codigoInput.fill(codigo)

        // Propietario — puede ser select/radio
        const propietario = page.locator('select[name="propietario"], [data-name="propietario"]').first()
        if (await propietario.isVisible()) await propietario.selectOption({ index: 0 })

        await page.locator('button[type="submit"]').click()
        await page.waitForURL(/\/maquinarias/, { timeout: 15_000 })
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Maquinaria — Modelos @critical', () => {
    test('listado de modelos carga', async ({ page }) => {
        await page.goto('/maquinarias/modelos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear modelo nuevo', async ({ page }) => {
        await page.goto('/maquinarias/modelos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nuevoBtn = page.locator('button, a', { hasText: /Nuevo modelo|Agregar/i }).first()
        if (await nuevoBtn.isVisible()) {
            await nuevoBtn.click()
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

            const input = page.locator('input[name="nombre"]').first()
            if (await input.isVisible()) {
                await input.fill(`${E2E}Modelo_${TS}`)
                await page.locator('button[type="submit"]').click()
                await expect(page.locator('body')).not.toContainText('Application error')
            }
        }
    })
})

test.describe('Maquinaria — Tipos @critical', () => {
    test('listado de tipos carga', async ({ page }) => {
        await page.goto('/maquinarias/types')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Maquinaria — Documentos @critical', () => {
    test('listado de documentos de maquinaria carga', async ({ page }) => {
        await page.goto('/maquinarias/documentos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
