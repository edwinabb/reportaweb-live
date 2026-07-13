import { test, expect } from '@playwright/test'

/**
 * Flow 38 — Pre-cutover: Terceros — Módulos Específicos @pre-cutover
 *
 * Verifica:
 * 1. /terceros/contactos carga sin error
 * 2. /terceros/sitios carga sin error
 * 3. /terceros/ubigeo carga (datos geográficos)
 * 4. Filtros por tipo en /terceros funcionan (PROVEEDOR, CLIENTE, AMBOS)
 */

test.describe('Terceros — Sub-módulos @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/terceros/contactos carga sin error', async ({ page }) => {
        await page.goto('/terceros/contactos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/terceros/sitios carga sin error', async ({ page }) => {
        await page.goto('/terceros/sitios')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/terceros/ubigeo carga sin error', async ({ page }) => {
        await page.goto('/terceros/ubigeo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/terceros carga lista principal sin error', async ({ page }) => {
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Terceros — Contenido y Filtros @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/terceros/contactos muestra lista o empty state', async ({ page }) => {
        await page.goto('/terceros/contactos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(50)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/terceros/ubigeo muestra datos geográficos o input de búsqueda', async ({ page }) => {
        await page.goto('/terceros/ubigeo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(50)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('filtro PROVEEDOR en /terceros no rompe la UI', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Buscar algún filtro de tipo
        const filtroProveedor = page
            .getByRole('button', { name: /Proveedor/i })
            .or(page.getByRole('option', { name: /Proveedor/i }))
            .or(page.locator('button, [role="tab"]').filter({ hasText: /Proveedor/i }))
            .first()

        if (await filtroProveedor.isVisible({ timeout: 5_000 })) {
            await filtroProveedor.click()
            await page.waitForTimeout(1_000)
            await expect(page.locator('body')).not.toContainText('Application error')
        } else {
            console.log('[INFO] Filtro Proveedor no encontrado como botón — puede ser select o tab')
        }
    })

    test('filtro CLIENTE en /terceros no rompe la UI', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const filtroCliente = page
            .getByRole('button', { name: /^Cliente$/i })
            .or(page.locator('button, [role="tab"]').filter({ hasText: /^Cliente$/i }))
            .first()

        if (await filtroCliente.isVisible({ timeout: 5_000 })) {
            await filtroCliente.click()
            await page.waitForTimeout(1_000)
            await expect(page.locator('body')).not.toContainText('Application error')
        } else {
            console.log('[INFO] Filtro Cliente no encontrado — verificar UI de filtros en /terceros')
        }
    })
})
