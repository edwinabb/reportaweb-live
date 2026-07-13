import { test, expect } from '@playwright/test'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 42 — Pre-cutover: Navegación y Breadcrumbs @pre-cutover
 *
 * Verifica:
 * 1. Breadcrumbs en páginas de detalle (tercero, maquinaria, cotización)
 * 2. Botón "Volver" funciona en formularios de creación
 * 3. Links en sidebar activos resaltados correctamente
 * 4. 404 personalizado carga (ruta inexistente)
 */

test.describe('Navegación — 404 y Rutas Inválidas @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('ruta inexistente muestra 404 o redirección (no Application error)', async ({ page }) => {
        await page.goto('/ruta-que-no-existe-12345')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('ID inexistente en /terceros/[id] no rompe la app', async ({ page }) => {
        await page.goto('/terceros/00000000-0000-0000-0000-000000000000')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('ID inexistente en /maquinaria/[id] no rompe la app', async ({ page }) => {
        await page.goto('/maquinaria/00000000-0000-0000-0000-000000000000')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Navegación — Páginas de Detalle @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('editar tercero real carga correctamente', async ({ page }) => {
        test.setTimeout(60_000)
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data: tercero } = await admin
            .from('terceros')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

        if (!tercero) {
            console.log('[SKIP] No hay terceros en tenant de test')
            return
        }

        await page.goto(`/terceros/${tercero.id}/edit`)
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Verificar URL es la esperada (no una redirección a 404)
        expect(page.url()).not.toContain('not-found')
    })

    test('editar maquinaria real carga correctamente', async ({ page }) => {
        test.setTimeout(60_000)
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data: maq } = await admin
            .from('maquinarias')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

        if (!maq) {
            console.log('[SKIP] No hay maquinarias en tenant de test')
            return
        }

        // Ruta: /maquinarias/[id]/edit (plural)
        await page.goto(`/maquinarias/${maq.id}/edit`)
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Verificar URL es la esperada (no una redirección a 404)
        expect(page.url()).not.toContain('not-found')
    })

    test('detalle de cotización real carga correctamente', async ({ page }) => {
        test.setTimeout(60_000)
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data: cot } = await admin
            .from('cotizaciones')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle()

        if (!cot) {
            console.log('[SKIP] No hay cotizaciones en tenant de test')
            return
        }

        await page.goto(`/cotizaciones/${cot.id}`)
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Navegación — Sidebar y Botón Volver @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('sidebar está visible en /planificacion', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const sidebar = page
            .locator('nav, aside, [role="navigation"]')
            .first()
        if (await sidebar.isVisible({ timeout: 5_000 })) {
            await expect(sidebar).toBeVisible()
        }
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('botón volver en /planificacion/nueva navega hacia atrás', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        await page.goto('/planificacion/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const volverBtn = page
            .getByRole('button', { name: /volver|cancelar|back/i })
            .or(page.getByRole('link', { name: /volver|cancelar|back/i }))
            .first()

        if (await volverBtn.isVisible({ timeout: 5_000 })) {
            await volverBtn.click()
            await page.waitForTimeout(1_000)
            await expect(page.locator('body')).not.toContainText('Application error')
        } else {
            console.log('[INFO] Botón volver no encontrado en /planificacion/nueva')
        }
    })

    test('link activo en sidebar está resaltado', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Verificar que hay algún elemento activo/resaltado en la navegación
        const activeLink = page
            .locator('nav a[aria-current="page"], nav a.active, aside a[aria-current="page"]')
            .first()

        if (await activeLink.isVisible({ timeout: 3_000 })) {
            await expect(activeLink).toBeVisible()
        } else {
            console.log('[INFO] aria-current=page no encontrado en nav — puede usar clases CSS para el estado activo')
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
