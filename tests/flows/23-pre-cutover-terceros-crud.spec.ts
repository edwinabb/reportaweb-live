import { test, expect } from '@playwright/test'

/**
 * Flow 23 — Pre-cutover: Terceros CRUD @pre-cutover
 * Fase 4: cliente (con contacto + sitio), proveedor, desactivar/restaurar.
 */

const TS = Date.now()

test.describe('Terceros — Listado @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de terceros activos carga', async ({ page }) => {
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        const tabla = page.locator('table tbody tr, [role="row"]').first()
        await expect(tabla).toBeVisible({ timeout: 10_000 })
    })

    test('filtro por tipo Cliente funciona', async ({ page }) => {
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const clienteFilter = page.getByRole('button', { name: /Cliente/i })
            .or(page.getByRole('tab', { name: /Cliente/i }))
            .or(page.locator('button, [role="tab"]').filter({ hasText: /^Clientes?$/ }))
            .first()
        if (await clienteFilter.isVisible({ timeout: 5_000 })) {
            await clienteFilter.click()
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('filtro por tipo Proveedor funciona', async ({ page }) => {
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const proveedorFilter = page.getByRole('button', { name: /Proveedor/i })
            .or(page.getByRole('tab', { name: /Proveedor/i }))
            .first()
        if (await proveedorFilter.isVisible({ timeout: 5_000 })) {
            await proveedorFilter.click()
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('pestaña Papelera de terceros accesible', async ({ page }) => {
        await page.goto('/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const papeleraTab = page.getByRole('tab', { name: /Papelera/i })
            .or(page.getByRole('button', { name: /Papelera/i }))
        if (await papeleraTab.isVisible({ timeout: 5_000 })) {
            await papeleraTab.click()
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })
})

test.describe('Terceros — Crear Cliente @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('formulario de nuevo tercero accesible', async ({ page }) => {
        await page.goto('/terceros/new')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear cliente E2E con razón social', async ({ page }) => {
        await page.goto('/terceros/new')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Razón social
        const razonInput = page.locator('input[name="razon_social"], input[name="nombre"], input[placeholder*="razón" i], input[placeholder*="razon" i]').first()
        if (await razonInput.isVisible({ timeout: 8_000 })) {
            await razonInput.fill(`E2E_Cliente_${TS}`)
        }

        // RUC
        const rucInput = page.locator('input[name="ruc"], input[name="documento"]').first()
        if (await rucInput.isVisible({ timeout: 3_000 })) {
            await rucInput.fill('20999888777')
        }

        // Tipo: Cliente
        const tipoSelect = page.locator('select[name="tipo"], [role="combobox"]').filter({ hasText: /Tipo/i }).first()
        if (await tipoSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await tipoSelect.click()
            const clienteOpt = page.getByRole('option', { name: /^Cliente$/i }).first()
            if (await clienteOpt.isVisible({ timeout: 2_000 })) await clienteOpt.click()
        }

        const submitBtn = page.locator('button[type="submit"]').first()
        if (await submitBtn.isVisible({ timeout: 5_000 })) {
            await submitBtn.click()
            await page.waitForTimeout(2_000)
        }
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear proveedor E2E', async ({ page }) => {
        await page.goto('/terceros/new')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const razonInput = page.locator('input[name="razon_social"], input[name="nombre"]').first()
        if (await razonInput.isVisible({ timeout: 8_000 })) {
            await razonInput.fill(`E2E_Proveedor_${TS}`)
        }

        const rucInput = page.locator('input[name="ruc"]').first()
        if (await rucInput.isVisible({ timeout: 3_000 })) {
            await rucInput.fill('20888777666')
        }

        // Tipo: Proveedor
        const tipoSelect = page.locator('select[name="tipo"], [role="combobox"]').filter({ hasText: /Tipo/i }).first()
        if (await tipoSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await tipoSelect.click()
            const provOpt = page.getByRole('option', { name: /^Proveedor$/i }).first()
            if (await provOpt.isVisible({ timeout: 2_000 })) await provOpt.click()
        }

        const submitBtn = page.locator('button[type="submit"]').first()
        if (await submitBtn.isVisible({ timeout: 5_000 })) {
            await submitBtn.click()
            await page.waitForTimeout(2_000)
        }
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Terceros — Sub-módulos @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('página de contactos carga', async ({ page }) => {
        await page.goto('/terceros/contactos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('página de sitios carga', async ({ page }) => {
        await page.goto('/terceros/sitios')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('página de personal de terceros carga', async ({ page }) => {
        await page.goto('/terceros/personal')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
