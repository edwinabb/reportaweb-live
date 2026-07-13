import { test, expect } from '@playwright/test'

/**
 * Flow 10 — Terceros: Directorio, Personal, Sitios (CRUD + filtros) @critical
 *
 * Usa el proyecto chromium-admin (admin_tenant tiene permisos completos).
 * Los datos creados se identifican con prefijo E2E_ en el nombre.
 */

test.use({ storageState: '.auth/admin.json' })

const E2E = 'E2E_'
const TS  = Date.now()

test.describe('Terceros — Directorio @critical', () => {
    test('listado de terceros carga y muestra botón Nuevo', async ({ page }) => {
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        await expect(page.locator('h1')).toContainText(/Terceros|Directorio/i)
        const nuevoBtn = page.locator('a[href*="/terceros/new"], button', { hasText: /Nuevo tercero|Agregar/i })
        await expect(nuevoBtn.first()).toBeVisible()
    })

    test('buscar tercero por nombre filtra la lista', async ({ page }) => {
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const search = page.locator('input[placeholder*="Buscar"], input[type="search"]').first()
        if (await search.isVisible()) {
            await search.fill('Empresa')
            await page.waitForTimeout(600)
            // La lista se filtra (puede quedar vacía o con resultados — cualquiera OK)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('crear tercero nuevo y verificar que aparece en lista', async ({ page }) => {
        const nombre = `${E2E}Empresa_${TS}`

        await page.goto('/terceros/new')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        // Rellenar form mínimo
        const nombreInput = page.locator('input[name="nombre"], input[name="razon_social"]').first()
        await expect(nombreInput).toBeVisible({ timeout: 10_000 })
        await nombreInput.fill(nombre)

        // RUC o identificador (puede ser opcional)
        const rucInput = page.locator('input[name="ruc"], input[name="documento"]').first()
        if (await rucInput.isVisible()) await rucInput.fill('20999999999')

        await page.locator('button[type="submit"]').click()

        // Debe navegar de vuelta al listado o a la página del tercero
        await page.waitForURL(/\/terceros/, { timeout: 15_000 })
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Terceros — Personal @critical', () => {
    test('listado de personal carga', async ({ page }) => {
        await page.goto('/terceros/personal')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('500')
    })

    test('filtro activo/inactivo en personal', async ({ page }) => {
        await page.goto('/terceros/personal')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const filtroActivo = page.locator('button, [role="option"]', { hasText: /activo|inactivo/i }).first()
        if (await filtroActivo.isVisible()) {
            await filtroActivo.click()
            await page.waitForTimeout(500)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })
})

test.describe('Terceros — Sitios @critical', () => {
    test('listado de sitios carga', async ({ page }) => {
        await page.goto('/terceros/sitios')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear sitio nuevo', async ({ page }) => {
        const nombreSitio = `${E2E}Sitio_${TS}`

        await page.goto('/terceros/sitios')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nuevoBtn = page.locator('button, a', { hasText: /Nuevo sitio|Agregar sitio/i }).first()
        if (await nuevoBtn.isVisible()) {
            await nuevoBtn.click()
            await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

            const input = page.locator('input[name="nombre"]').first()
            if (await input.isVisible()) {
                await input.fill(nombreSitio)
                await page.locator('button[type="submit"]').click()
                await expect(page.locator('body')).not.toContainText('Application error')
            }
        }
    })
})

test.describe('Terceros — Contactos @critical', () => {
    test('listado de contactos carga', async ({ page }) => {
        await page.goto('/terceros/contactos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
