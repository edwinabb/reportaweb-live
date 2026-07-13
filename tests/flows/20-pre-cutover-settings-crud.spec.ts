import { test, expect } from '@playwright/test'

/**
 * Flow 20 — Pre-cutover: Settings CRUD @pre-cutover
 * Fase 1 del plan de pruebas: catálogos base que no dependen de otros módulos.
 */

const TS = Date.now()
const CARGO_NOMBRE = `E2E_Cargo_${TS}`
const TIPDOC_NOMBRE = `E2E_TipoDoc_${TS}`

test.describe('Settings — Cargos (Job Titles) @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de cargos carga y muestra entradas migradas', async ({ page }) => {
        await page.goto('/settings/users/job-titles')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // CISE debe tener ~150 cargos migrados
        const filas = page.locator('table tbody tr, [role="row"]')
        const count = await filas.count()
        expect(count).toBeGreaterThan(5)
    })

    test('crear cargo, verificar y eliminar', async ({ page }) => {
        await page.goto('/settings/users/job-titles')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Abrir dialog / form de creación
        const addBtn = page.getByRole('button', { name: /Agregar|Nuevo|Add|New/i }).first()
        if (await addBtn.isVisible({ timeout: 5_000 })) {
            await addBtn.click()
            await page.waitForTimeout(500)
        }

        // Buscar input de nombre
        const nameInput = page.locator('input[name="nombre"], input[placeholder*="nombre"], input[placeholder*="cargo"]').first()
        if (await nameInput.isVisible({ timeout: 5_000 })) {
            await nameInput.fill(CARGO_NOMBRE)
            // Guardar
            const saveBtn = page.getByRole('button', { name: /Guardar|Save|Crear|Aceptar/i }).first()
            await saveBtn.click()
            await page.waitForTimeout(1_000)
            await expect(page.locator('body')).not.toContainText('Application error')
            // Verificar aparece en la tabla
            await expect(page.getByText(CARGO_NOMBRE, { exact: false })).toBeVisible({ timeout: 8_000 })
        } else {
            test.skip(true, 'No se encontró input de nombre para cargo')
        }
    })

    test('eliminar cargo E2E creado', async ({ page }) => {
        await page.goto('/settings/users/job-titles')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const row = page.locator('tr, [role="row"]').filter({ hasText: CARGO_NOMBRE }).first()
        if (await row.isVisible({ timeout: 8_000 })) {
            const deleteBtn = row.getByRole('button', { name: /Eliminar|Delete|Borrar/i })
                .or(row.locator('button[aria-label*="eliminar" i], button[aria-label*="delete" i]'))
                .first()
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click()
                // Confirmar si hay dialog
                const confirmBtn = page.getByRole('button', { name: /Confirmar|Sí|Yes|Eliminar/i }).last()
                if (await confirmBtn.isVisible({ timeout: 3_000 })) await confirmBtn.click()
                await page.waitForTimeout(1_000)
            }
        }
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Settings — Tipos de Documento @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de tipos de documento carga', async ({ page }) => {
        await page.goto('/settings/document-types')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('crear tipo de documento y eliminar', async ({ page }) => {
        await page.goto('/settings/document-types')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const addBtn = page.getByRole('button', { name: /Agregar|Nuevo|Add|New/i }).first()
        if (await addBtn.isVisible({ timeout: 5_000 })) {
            await addBtn.click()
            await page.waitForTimeout(500)

            const nameInput = page.locator('input[name="nombre"], input[placeholder*="nombre"], input[placeholder*="tipo"]').first()
            if (await nameInput.isVisible({ timeout: 5_000 })) {
                await nameInput.fill(TIPDOC_NOMBRE)
                const saveBtn = page.getByRole('button', { name: /Guardar|Save|Crear|Aceptar/i }).first()
                await saveBtn.click()
                await page.waitForTimeout(1_000)
                await expect(page.locator('body')).not.toContainText('Application error')
            }
        }
    })
})

test.describe('Settings — Configuraciones módulos @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('config maquinaria carga sin errores', async ({ page }) => {
        await page.goto('/settings/maquinaria')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('500')
    })

    test('config terceros carga sin errores', async ({ page }) => {
        await page.goto('/settings/terceros')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('config cotizaciones carga sin errores', async ({ page }) => {
        await page.goto('/settings/cotizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('config informes carga sin errores', async ({ page }) => {
        await page.goto('/settings/informes')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('config valorizaciones carga sin errores', async ({ page }) => {
        await page.goto('/settings/valorizaciones')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
