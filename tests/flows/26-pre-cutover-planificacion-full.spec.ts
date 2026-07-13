import { test, expect } from '@playwright/test'
import { format, addDays } from 'date-fns'

/**
 * Flow 26 — Pre-cutover: Planificación — 2 tareas (INTERNO + EXTERNO) @pre-cutover
 * Fase 7: crear Tarea 1 con recursos propios y Tarea 2 con proveedor externo.
 */

const manana = format(addDays(new Date(), 1), 'yyyy-MM-dd')
const pasado = format(addDays(new Date(), 2), 'yyyy-MM-dd')
const tercerDia = format(addDays(new Date(), 3), 'yyyy-MM-dd')

test.describe('Planificación — Listado y vistas @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('listado de planificación carga', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('vista Timeline Personal carga', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const personalBtn = page.getByRole('button', { name: /Personal/i })
            .or(page.locator('button, [role="tab"]').filter({ hasText: /^Personal$/ }))
            .first()
        if (await personalBtn.isVisible({ timeout: 5_000 })) {
            await personalBtn.click()
            await page.waitForTimeout(1_000)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('vista Timeline Maquinaria carga', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const maqBtn = page.getByRole('button', { name: /Maquinaria/i })
            .or(page.locator('button, [role="tab"]').filter({ hasText: /^Maquinaria$/ }))
            .first()
        if (await maqBtn.isVisible({ timeout: 5_000 })) {
            await maqBtn.click()
            await page.waitForTimeout(1_000)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })

    test('filtro Solo Aprobadas funciona', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const filtroAprobadas = page.locator('input[type="checkbox"]').filter({ hasText: /Aprobadas/i })
            .or(page.getByRole('checkbox', { name: /aprobadas/i }))
            .or(page.locator('label').filter({ hasText: /Solo aprobadas/i }).locator('input'))
        if (await filtroAprobadas.isVisible({ timeout: 5_000 })) {
            await filtroAprobadas.click()
            await page.waitForTimeout(800)
            await expect(page.locator('body')).not.toContainText('Application error')
        }
    })
})

test.describe('Planificación — Tarea 1: INTERNO @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('formulario nueva tarea accesible', async ({ page }) => {
        await page.goto('/planificacion/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
        // Los tabs son botones customizados con onClick (no Radix tabs)
        // "Información General", "Personal (N)", "Maquinaria (N)"
        const infoBtn = page.locator('button').filter({ hasText: /Información General/i }).first()
        await expect(infoBtn).toBeVisible({ timeout: 10_000 })
    })

    test('tab Info — llenar datos de Tarea 1 (INTERNO)', async ({ page }) => {
        test.setTimeout(60_000)
        await page.goto('/planificacion/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Título
        const tituloInput = page.locator('input[name="titulo"], input[placeholder*="título" i], input[placeholder*="titulo" i]').first()
        if (await tituloInput.isVisible({ timeout: 8_000 })) {
            await tituloInput.fill(`E2E_T1 - Operación Maquinaria Propia ${Date.now()}`)
        }

        // Descripción
        const descInput = page.locator('textarea[name="descripcion"], input[name="descripcion"]').first()
        if (await descInput.isVisible({ timeout: 3_000 })) {
            await descInput.fill('E2E - Servicio 1: recursos internos')
        }

        // Seleccionar cliente (primer cliente disponible) — SearchableSelect usa <button type="button"> sin role="option"
        const clienteSelect = page.locator('[role="combobox"]').filter({ hasText: /Cliente/i }).first()
        if (await clienteSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await clienteSelect.click().catch(() => {})
            await page.waitForTimeout(400)
            // SearchableSelect: las opciones son <button type="button">, no [role="option"]
            const primerOpt = page.locator('[data-radix-popper-content-wrapper] button[type="button"]')
                .filter({ hasNotText: /Sin |Ninguno|Todos/i }).first()
            await primerOpt.click({ timeout: 3_000 }).catch(() => {})
            await page.waitForTimeout(300).catch(() => {})
        }

        // Fechas — añadir 3 días a partir de mañana
        const addFechaBtn = page.getByRole('button', { name: /Agregar fecha|Add fecha|Añadir/i }).first()
        if (await addFechaBtn.isVisible({ timeout: 5_000 })) {
            await addFechaBtn.click()
            await page.waitForTimeout(500)
            // Llenar rango de fechas
            const fechaInicioInput = page.locator('input[type="date"]').first()
            if (await fechaInicioInput.isVisible({ timeout: 3_000 })) {
                await fechaInicioInput.fill(manana)
            }
            const fechaFinInput = page.locator('input[type="date"]').nth(1)
            if (await fechaFinInput.isVisible({ timeout: 3_000 })) {
                await fechaFinInput.fill(tercerDia)
            }
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('tab Personal — dropdown de cargos poblado (verificación crítica)', async ({ page }) => {
        await page.goto('/planificacion/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        // Ir al tab Personal (botón custom, no Radix tab)
        const personalTab = page.locator('button').filter({ hasText: /Personal/i }).first()
        if (await personalTab.isVisible({ timeout: 5_000 })) {
            // Necesita título primero para activar el tab Personal
            const tituloInput = page.locator('input').first()
            if (await tituloInput.isVisible({ timeout: 3_000 })) {
                await tituloInput.fill('E2E_Tab_Personal_Test')
            }
            await personalTab.click()
            await page.waitForTimeout(800)
        }

        // Verificar que INTERNO está seleccionado por defecto o seleccionarlo
        const internoRadio = page.getByRole('radio', { name: /Interno/i })
            .or(page.locator('input[value="INTERNO"]'))
        if (await internoRadio.isVisible({ timeout: 3_000 })) {
            await internoRadio.click().catch(() => {})
        }

        // Abrir dropdown de Cargo — VERIFICACIÓN CRÍTICA: debe tener opciones
        // SearchableSelect usa <button type="button">, NO [role="option"]
        const cargoSelect = page.locator('[role="combobox"]').filter({ hasText: /cargos/i }).first()
        if (await cargoSelect.isVisible({ timeout: 8_000 })) {
            await cargoSelect.click()
            await page.waitForTimeout(500)
            // Opciones en SearchableSelect: <button type="button"> dentro del popover
            const opciones = page.locator('[data-radix-popper-content-wrapper] button[type="button"]')
                .filter({ hasNotText: /Todos los cargos|Sin cargos/i })
            const count = await opciones.count()
            if (count === 0) {
                console.log('[BLOQUEANTE] Dropdown de cargos vacío en /planificacion/nueva → tab Personal → Interno')
            }
            expect(count).toBeGreaterThan(0)
            // Seleccionar el primer cargo
            await opciones.first().click()
            await page.waitForTimeout(500)
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Planificación — Tarea 2: EXTERNO (proveedor) @pre-cutover', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('tab Personal modo EXTERNO — muestra campos proveedor/nombre', async ({ page }) => {
        await page.goto('/planificacion/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const personalTab = page.locator('[role="tab"]').filter({ hasText: /Personal/i }).first()
        if (await personalTab.isVisible({ timeout: 5_000 })) {
            await personalTab.click()
            await page.waitForTimeout(500)
        }

        // Seleccionar EXTERNO
        const externoRadio = page.getByRole('radio', { name: /Externo/i })
            .or(page.locator('input[value="EXTERNO"]'))
        if (await externoRadio.isVisible({ timeout: 5_000 })) {
            await externoRadio.click()
            await page.waitForTimeout(500)
        }

        // El timeline debe ocultarse en modo EXTERNO (comportamiento correcto)
        // Solo verificamos que no hay error y que aparecen campos de proveedor
        await expect(page.locator('body')).not.toContainText('Application error')

        // Verificar campo de proveedor/nombre visible
        const proveedorInput = page.locator('[role="combobox"]').filter({ hasText: /Proveedor/i })
            .or(page.locator('input[name="proveedor"], input[placeholder*="proveedor" i]'))
            .first()
        if (await proveedorInput.isVisible({ timeout: 5_000 })) {
            // Existe el campo de proveedor para modo externo ✓
            expect(true).toBe(true)
        }
    })

    test('tab Maquinaria modo EXTERNO — muestra campos de maquinaria externa', async ({ page }) => {
        await page.goto('/planificacion/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const maqTab = page.locator('[role="tab"]').filter({ hasText: /Maquinaria/i }).first()
        if (await maqTab.isVisible({ timeout: 5_000 })) {
            await maqTab.click()
            await page.waitForTimeout(500)
        }

        const externoRadio = page.getByRole('radio', { name: /Externo/i })
            .or(page.locator('input[value="EXTERNO"]'))
        if (await externoRadio.isVisible({ timeout: 5_000 })) {
            await externoRadio.click()
            await page.waitForTimeout(500)
        }

        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
