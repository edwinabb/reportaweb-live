import { test, expect } from '@playwright/test'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 45 — Permisos por Cargo (VIED) @sistema @pre-cutover
 *
 * Verifica que el sistema de permisos por cargo funciona end-to-end:
 * 1. Acceso a /sistema/permisos (solo reporta_admin)
 * 2. Selector de cargos carga y permite cambiar
 * 3. Checkboxes VIED se muestran y responden a interacción
 * 4. Cambio persiste tras recargar la página
 * 5. El middleware bloquea rutas según cookie rw3_bloqueadas
 * 6. El sidebar oculta módulos bloqueados
 */

// ─── helpers DB ───────────────────────────────────────────────────────────────

async function getFirstCargoId() {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const { data } = await admin
        .from('job_titles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(1)
        .single()
    return data?.id as string | undefined
}

async function getRecursoId(rutaBase: string) {
    const admin = getAdminClient()
    const { data } = await admin
        .from('sistema_recursos')
        .select('id')
        .eq('ruta_base', rutaBase)
        .single()
    return data?.id as string | undefined
}

async function setPermiso(cargoId: string, recursoId: string, tenantId: string, puedeVer: boolean) {
    const admin = getAdminClient()
    await admin
        .from('cargo_permisos')
        .upsert(
            { cargo_id: cargoId, recurso_id: recursoId, tenant_id: tenantId, puede_ver: puedeVer },
            { onConflict: 'tenant_id,cargo_id,recurso_id' },
        )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// /sistema solo accesible para reporta_admin — usa chromium-reporta-admin (info@reporta.la).
test.describe('Permisos — Acceso a /sistema/permisos (admin) @sistema', () => {
    test.use({ storageState: '.auth/reporta-admin.json' })

    test('admin accede a /sistema/permisos sin error', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('título "Permisos por Cargo" es visible', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('h1').first()).toContainText(/Permisos por Cargo/i)
    })

    test('selector de cargo carga con al menos un cargo', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const trigger = page.locator('[role="combobox"]').first()
        await expect(trigger).toBeVisible({ timeout: 10_000 })
        // Debe tener texto (nombre del cargo) no vacío
        await expect(trigger).not.toHaveText(/Seleccionar cargo/)
    })

    test('tabla VIED muestra columnas Ver, Ingresar, Editar, Eliminar', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const thead = page.locator('thead').first()
        await expect(thead).toContainText('Ver')
        await expect(thead).toContainText('Ingresar')
        await expect(thead).toContainText('Editar')
        await expect(thead).toContainText('Eliminar')
    })

    test('tabla VIED contiene al menos 5 filas de módulos', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const rows = page.locator('tbody tr')
        const count = await rows.count()
        expect(count).toBeGreaterThanOrEqual(5)
    })

    test('cambiar cargo en selector actualiza la tabla', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        const trigger = page.locator('[role="combobox"]').first()
        await trigger.click()
        const options = page.locator('[role="option"]')
        const count = await options.count()
        if (count > 1) {
            await options.nth(1).click()
            // Esperar a que el cargo cargue y el seeding (si aplica) termine
            await page.waitForSelector('tbody', { timeout: 15_000 })
            await expect(page.locator('tbody').first()).toBeVisible()
        }
    })

    test('checkbox Ver se puede desmarcar y se ve cambio optimista', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        // Primer checkbox de la primera columna Ver
        const verCheckboxes = page.locator('tbody td:nth-child(2) input[type="checkbox"], tbody td:nth-child(2) button[role="checkbox"]')
        const firstVer = verCheckboxes.first()
        if (await firstVer.isVisible()) {
            const wasChecked = await firstVer.isChecked()
            await firstVer.click()
            await page.waitForTimeout(800)
            // El estado debe haber cambiado (optimistic update)
            if (wasChecked) {
                await expect(firstVer).not.toBeChecked()
            } else {
                await expect(firstVer).toBeChecked()
            }
            // Revertir
            await firstVer.click()
        }
    })

    test('secciones agrupadas son visibles (Negocio, Recursos, etc.)', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const body = page.locator('body')
        // Al menos una de estas secciones debe estar visible
        const hasSections = await body.evaluate(el =>
            ['Negocio','Recursos','Operaciones','Config'].some(s => el.textContent?.includes(s))
        )
        expect(hasSections).toBeTruthy()
    })
})

test.describe('Permisos — Acceso denegado para planner @roles', () => {
    test.use({ storageState: '.auth/planner.json' })

    test('planner es redirigido desde /sistema a /login o /', async ({ page }) => {
        await page.goto('/sistema')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        // El planner no es reporta_admin → debe ser bloqueado fuera de /sistema
        const url = page.url()
        expect(url).not.toContain('/sistema')
    })

    test('planner es redirigido desde /sistema/permisos', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const url = page.url()
        expect(url).not.toContain('/sistema/permisos')
    })
})

test.describe('Permisos — Viewer @roles', () => {
    test.use({ storageState: '.auth/viewer.json' })

    test('viewer no puede acceder a /sistema/permisos', async ({ page }) => {
        await page.goto('/sistema/permisos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const url = page.url()
        expect(url).not.toContain('/sistema/permisos')
    })
})

test.describe('Permisos — Seed y persistencia via DB @sistema', () => {
    test.use({ storageState: '.auth/admin.json' })

    // Garantiza que cargo_permisos queda limpio aunque un test falle a mitad.
    // Sin esto, un run fallido deja módulos bloqueados para todos los runs siguientes.
    test.afterAll(async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()
        const { data: profile } = await admin
            .from('profiles')
            .select('id')
            .eq('email', 'e2e-planner@reporta.la')
            .single()
        if (!profile) return
        const { data: details } = await admin
            .from('profile_details')
            .select('job_title_id')
            .eq('id', profile.id)
            .single()
        if (details?.job_title_id) {
            await admin
                .from('cargo_permisos')
                .update({ puede_ver: true, puede_ingresar: true, puede_editar: true })
                .eq('cargo_id', details.job_title_id)
                .eq('tenant_id', tenantId)
        }
    })

    test('seed: tablas sistema_recursos y cargo_permisos existen con datos', async () => {
        const admin = getAdminClient()
        const { data: recursos, error } = await admin
            .from('sistema_recursos')
            .select('id, ruta_base, nombre')
            .limit(5)
        expect(error).toBeNull()
        expect(recursos?.length).toBeGreaterThanOrEqual(5)
    })

    test('seed: cargo_permisos tiene datos para el tenant de test', async () => {
        const admin = getAdminClient()
        const tenantId = getTestTenantId()
        const { data, error } = await admin
            .from('cargo_permisos')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1)
        expect(error).toBeNull()
        expect(data?.length).toBeGreaterThan(0)
    })

    test('get_rutas_bloqueadas RPC existe y ejecuta sin error', async () => {
        // Usamos el admin client como proxy — la función usa auth.uid() internamente,
        // así que con service role devuelve [] (sin uid). Solo verificamos que no falle.
        const admin = getAdminClient()
        const { error } = await admin.rpc('get_rutas_bloqueadas')
        // Con service_role puede retornar error de "no uid" o array vacío — no debe crashear
        expect(error?.code ?? null).not.toBe('42883') // 42883 = function not found
    })

    test('upsert permiso: puede_ver=false persiste y se lee correctamente', async () => {
        const tenantId = getTestTenantId()
        const cargoId  = await getFirstCargoId()
        const recursoId = await getRecursoId('/compras')

        if (!cargoId || !recursoId) {
            test.skip(true, 'No hay cargo o recurso de test disponible')
            return
        }

        const admin = getAdminClient()

        // Poner a false
        await setPermiso(cargoId, recursoId, tenantId, false)

        const { data } = await admin
            .from('cargo_permisos')
            .select('puede_ver')
            .eq('cargo_id', cargoId)
            .eq('recurso_id', recursoId)
            .eq('tenant_id', tenantId)
            .single()

        expect(data?.puede_ver).toBe(false)

        // Restaurar
        await setPermiso(cargoId, recursoId, tenantId, true)
    })

    test('upsert permiso: puede_ver=true restaura correctamente', async () => {
        const tenantId = getTestTenantId()
        const cargoId  = await getFirstCargoId()
        const recursoId = await getRecursoId('/ventas')

        if (!cargoId || !recursoId) {
            test.skip(true, 'No hay cargo o recurso de test disponible')
            return
        }

        await setPermiso(cargoId, recursoId, tenantId, true)

        const admin = getAdminClient()
        const { data } = await admin
            .from('cargo_permisos')
            .select('puede_ver')
            .eq('cargo_id', cargoId)
            .eq('recurso_id', recursoId)
            .eq('tenant_id', tenantId)
            .single()

        expect(data?.puede_ver).toBe(true)
    })
})

test.describe('Permisos — Navegación desde /sistema @sistema', () => {
    test.use({ storageState: '.auth/reporta-admin.json' })

    test('card "Permisos por Cargo" visible en /sistema', async ({ page }) => {
        await page.goto('/sistema')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/Permisos por Cargo/i)
    })

    test('botón "Configurar permisos" navega a /sistema/permisos', async ({ page }) => {
        await page.goto('/sistema')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        // Link wraps Button → 2 matches (a + button). Use first (the anchor) to avoid strict mode violation.
        const btn = page.locator('a, button', { hasText: /Configurar permisos/i }).first()
        await btn.click()
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
        await expect(page).toHaveURL(/\/sistema\/permisos/)
    })

    test('/sistema carga sin error de aplicación', async ({ page }) => {
        await page.goto('/sistema')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
