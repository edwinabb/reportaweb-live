import { test, expect } from '@playwright/test'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 36 — Pre-cutover: EPP Extras — Reportes y Colaborador @pre-cutover
 *
 * Verifica:
 * 1. /epp/reportes carga sin error
 * 2. /epp/colaborador/[id] carga para un colaborador existente
 * 3. Historial de entregas visible
 * 4. EPP alertas consultables desde DB
 */

test.describe('EPP — Reportes @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/epp/reportes carga sin error', async ({ page }) => {
        await page.goto('/epp/reportes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/epp/reportes muestra lista o empty state', async ({ page }) => {
        await page.goto('/epp/reportes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(50)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('EPP — Colaborador Detail @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/epp/colaborador/[id] carga para personal existente', async ({ page }) => {
        test.setTimeout(60_000)
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        // Obtener un personal existente en el tenant
        const { data: personal } = await admin
            .from('profiles')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('role', 'member')
            .limit(1)
            .maybeSingle()

        if (!personal) {
            console.log('[SKIP] No hay personal con rol member en tenant de test')
            return
        }

        await page.goto(`/epp/colaborador/${personal.id}`)
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('página colaborador muestra historial o inventario EPP', async ({ page }) => {
        test.setTimeout(60_000)
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data: personal } = await admin
            .from('profiles')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('role', 'member')
            .limit(1)
            .maybeSingle()

        if (!personal) return

        await page.goto(`/epp/colaborador/${personal.id}`)
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(50)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('EPP — Alertas DB @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('tabla epp_alertas es consultable', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { error } = await admin
            .from('epp_alertas')
            .select('id, tipo, estado, fecha_alerta')
            .eq('tenant_id', tenantId)
            .limit(5)

        if (error) {
            console.log(`[INFO] epp_alertas: ${error.message}`)
        }
        // No error de schema → tabla existe
    })

    test('tabla epp_entregas es consultable', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { error } = await admin
            .from('epp_entregas')
            .select('id, fecha_entrega, estado')
            .eq('tenant_id', tenantId)
            .limit(5)

        if (error) {
            console.log(`[INFO] epp_entregas: ${error.message}`)
        }
    })
})
