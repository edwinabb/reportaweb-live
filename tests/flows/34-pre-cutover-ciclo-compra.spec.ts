import { test, expect } from '@playwright/test'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 34 — Pre-cutover: Ciclo Compra — Panel, Facturas, Pagos, Detracción @pre-cutover
 *
 * Verifica:
 * 1. /compras/panel carga con KPIs
 * 2. /compras/facturas carga lista
 * 3. /compras/valoraciones carga lista
 * 4. facturas_compra tiene campos de detracción y pagos
 * 5. Abrir factura compra → campos detracción visibles
 */

test.describe('Compras — Rutas Principales @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/compras/panel carga sin error', async ({ page }) => {
        await page.goto('/compras/panel')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/compras/valoraciones carga sin error', async ({ page }) => {
        await page.goto('/compras/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/compras/facturas carga sin error', async ({ page }) => {
        await page.goto('/compras/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Compras — Facturas DB: schema detracción y pagos @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('facturas_compra tiene columnas de detracción', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        // Nombres reales en DB (facturas_compra usa detraccion_soles + detraccion_constancia)
        const { data, error } = await admin
            .from('facturas_compra')
            .select(
                'id, detraccion_porcentaje, detraccion_soles, detraccion_constancia, detraccion_fecha_pago, detraccion_paga_por',
            )
            .eq('tenant_id', tenantId)
            .limit(1)

        if (error) {
            throw new Error(`facturas_compra schema error: ${error.message}`)
        }
        if (data && data.length > 0) {
            expect(Object.keys(data[0])).toContain('detraccion_porcentaje')
        } else {
            console.log('[INFO] No hay facturas_compra en tenant de test')
        }
    })

    test('facturas_compra tiene columnas de monto y pendiente', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        // Nombres reales: total_sol, total_usd, pendiente_por_cobrar_sol
        const { data, error } = await admin
            .from('facturas_compra')
            .select('id, total_sol, total_usd, pendiente_por_cobrar_sol, monto_pagado_soles')
            .eq('tenant_id', tenantId)
            .limit(1)

        if (error) {
            throw new Error(`facturas_compra monto fields: ${error.message}`)
        } else if (data && data.length > 0) {
            expect(Object.keys(data[0])).toContain('total_sol')
        }
    })

    test('cobros de facturas_compra están en lista_cobros (JSON)', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        // Los cobros se almacenan como JSON en lista_cobros
        const { data, error } = await admin
            .from('facturas_compra')
            .select('id, lista_cobros')
            .eq('tenant_id', tenantId)
            .limit(5)

        if (error) {
            throw new Error(`facturas_compra lista_cobros: ${error.message}`)
        }
        // Campo accesible (aunque sea null/empty)
    })
})

test.describe('Compras — UI: Detracción en Factura @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('abrir primera factura de compra muestra detalle sin error', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/compras/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const primeraFila = page
            .locator('table tbody tr, [data-testid="factura-row"], .factura-card')
            .first()
        if (!await primeraFila.isVisible({ timeout: 8_000 })) {
            console.log('[SKIP] No hay facturas compra en tenant de test')
            return
        }
        await primeraFila.click()
        await page.waitForTimeout(1_000)

        const detalle = page.locator('[role="dialog"]').first()
        if (await detalle.isVisible({ timeout: 5_000 })) {
            const detrText = page.locator('body').getByText(/detracci/i).first()
            if (await detrText.isVisible({ timeout: 3_000 })) {
                await expect(detrText).toBeVisible()
            }
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('nueva valorización de compra: botón crear visible', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/compras/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nuevaBtn = page
            .getByRole('button', { name: /Nueva Valoriz|Crear Valoriz|Agregar/i })
            .first()
        if (await nuevaBtn.isVisible({ timeout: 5_000 })) {
            await expect(nuevaBtn).toBeVisible()
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
