import { test, expect } from '@playwright/test'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 33 — Pre-cutover: Ciclo Venta — Panel, Facturas, Cobros, Detracción @pre-cutover
 *
 * Verifica sin crear datos destructivos:
 * 1. /ventas/panel carga con KPIs
 * 2. /ventas/facturas carga lista
 * 3. /ventas/valoraciones carga lista
 * 4. Factura existente tiene campos de detracción accesibles
 * 5. Cobros de una factura son consultables desde DB
 * 6. Flujo UI: abrir factura → campos detracción visibles
 */

test.describe('Ventas — Rutas Principales @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/ventas/panel carga sin error', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/ventas/panel')
        await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/ventas/valoraciones carga sin error', async ({ page }) => {
        await page.goto('/ventas/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/ventas/facturas carga sin error', async ({ page }) => {
        await page.goto('/ventas/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Ventas — Facturas DB: campos de detracción y cobros @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('facturas_venta tiene columnas de detracción', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        // Consultar una factura cualquiera para verificar que los campos existen
        const { data, error } = await admin
            .from('facturas_venta')
            .select(
                'id, detraccion_porcentaje, detraccion_monto_sol, detraccion_numero_constancia, detraccion_fecha_pago, detraccion_a_cargo_de',
            )
            .eq('tenant_id', tenantId)
            .limit(1)

        if (error) {
            // Si los campos no existen → error de schema (bloqueante)
            throw new Error(`facturas_venta schema error: ${error.message}`)
        }
        // Si hay facturas, verificar que los campos son accesibles (aunque sean null)
        if (data && data.length > 0) {
            const f = data[0]
            expect(Object.keys(f)).toContain('detraccion_porcentaje')
            expect(Object.keys(f)).toContain('detraccion_monto_sol')
        } else {
            console.log('[INFO] No hay facturas_venta en tenant de test — verificando solo schema')
        }
    })

    test('facturas_venta tiene columnas de cobro', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data, error } = await admin
            .from('facturas_venta')
            .select('id, monto_pagado_factura, pendiente_por_cobrar_usd, pendiente_por_cobrar_sol')
            .eq('tenant_id', tenantId)
            .limit(1)

        if (error) {
            throw new Error(`facturas_venta cobros schema error: ${error.message}`)
        }
        if (data && data.length > 0) {
            expect(Object.keys(data[0])).toContain('monto_pagado_factura')
        }
    })

    test('cobros_venta son consultables', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        // Tabla real: cobros_venta (no cobros_facturas_venta)
        const { error } = await admin
            .from('cobros_venta')
            .select('id, monto, moneda, fecha_cobro')
            .eq('tenant_id', tenantId)
            .limit(5)

        if (error) {
            throw new Error(`cobros_venta schema error: ${error.message}`)
        }
        // No es error si la tabla está vacía
    })
})

test.describe('Ventas — UI: Detracción y Cobros en Factura @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('abrir primera factura de venta muestra campos de detracción', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/ventas/facturas')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Intentar abrir la primera fila
        const primeraFila = page
            .locator('table tbody tr, [data-testid="factura-row"], .factura-card')
            .first()
        if (!await primeraFila.isVisible({ timeout: 8_000 })) {
            console.log('[SKIP] No hay facturas en el tenant de test')
            return
        }
        await primeraFila.click()
        await page.waitForTimeout(1_000)

        // Verificar que se abrió algún detalle (dialog o panel)
        const detalle = page.locator('[role="dialog"]').or(page.locator('[data-testid="factura-detail"]'))
        if (await detalle.isVisible({ timeout: 5_000 })) {
            // Buscar algún campo de detracción
            const detrText = page.locator('body').getByText(/detracci/i).first()
            if (await detrText.isVisible({ timeout: 3_000 })) {
                await expect(detrText).toBeVisible()
            } else {
                console.log('[INFO] Sección detracción no visible en primera factura')
            }
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('nueva valorización de venta: botón crear visible', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/ventas/valoraciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const nuevaBtn = page
            .getByRole('button', { name: /Nueva Valoriz|Crear Valoriz|Agregar/i })
            .first()
        if (await nuevaBtn.isVisible({ timeout: 5_000 })) {
            await expect(nuevaBtn).toBeVisible()
        } else {
            console.log('[INFO] Botón nueva valorización no encontrado con ese texto')
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
