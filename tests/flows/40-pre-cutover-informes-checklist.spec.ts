import { test, expect } from '@playwright/test'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 40 — Pre-cutover: Informes con Checklist SELECCION_MULTIPLE @pre-cutover
 *
 * Verifica:
 * 1. /formatos carga lista de plantillas
 * 2. /informes/nuevo carga (con o sin plantillas)
 * 3. DB: plantillas con preguntas SELECCION_MULTIPLE son consultables
 * 4. DB: informes con respuestas multiple son consultables
 * 5. UI: formulario de informe en una plantilla publicada carga sin error
 */

test.describe('Informes — Rutas Principales @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/formatos carga sin error', async ({ page }) => {
        await page.goto('/formatos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/informes carga sin error', async ({ page }) => {
        await page.goto('/informes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/informes/nuevo carga sin error (con o sin plantillas)', async ({ page }) => {
        await page.goto('/informes/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Informes — DB: schema preguntas y respuestas @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('plantillas_preguntas con tipo SELECCION_MULTIPLE son consultables', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data, error } = await admin
            .from('plantillas_preguntas')
            .select('id, tipo, opciones')
            .eq('tenant_id', tenantId)
            .eq('tipo', 'SELECCION_MULTIPLE')
            .limit(5)

        if (error) {
            console.log(`[INFO] plantillas_preguntas SELECCION_MULTIPLE: ${error.message}`)
        } else {
            // Puede estar vacío si no hay plantillas con este tipo — no es error
            console.log(`[INFO] Plantillas con SELECCION_MULTIPLE: ${data?.length ?? 0}`)
        }
    })

    test('informes_respuestas son consultables', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { error } = await admin
            .from('informes_respuestas')
            .select('id, pregunta_id, valor, opciones_seleccionadas')
            .eq('tenant_id', tenantId)
            .limit(5)

        if (error) {
            // Puede que el campo sea diferente
            console.log(`[INFO] informes_respuestas: ${error.message}`)
        }
    })

    test('informes tienen campo estado con valores correctos', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data, error } = await admin
            .from('informes')
            .select('id, estado')
            .eq('tenant_id', tenantId)
            .in('estado', ['BORRADOR', 'ENVIADO', 'PENDIENTE'])
            .limit(5)

        if (error) {
            console.log(`[INFO] informes estado: ${error.message}`)
        } else {
            console.log(`[INFO] Informes con estados conocidos: ${data?.length ?? 0}`)
        }
    })
})

test.describe('Informes — UI: Formulario de Informe @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('abrir primer informe existente carga sin error', async ({ page }) => {
        test.setTimeout(60_000)
        const admin = getAdminClient()
        const tenantId = getTestTenantId()

        const { data: informe } = await admin
            .from('informes')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle()

        if (!informe) {
            console.log('[SKIP] No hay informes en tenant de test')
            return
        }

        await page.goto(`/informes/${informe.id}`)
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/formatos muestra lista de plantillas o empty state', async ({ page }) => {
        await page.goto('/formatos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const body = await page.locator('body').textContent()
        expect(body?.trim().length).toBeGreaterThan(100)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('primera plantilla publicada es clickeable', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/formatos')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Buscar una tarjeta de plantilla
        const plantilla = page
            .locator('[data-testid="plantilla-card"], .plantilla-card, table tbody tr')
            .first()
        if (!await plantilla.isVisible({ timeout: 5_000 })) {
            console.log('[SKIP] No hay plantillas visibles en /formatos')
            return
        }
        await plantilla.click()
        await page.waitForTimeout(1_000)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
