import { test, expect } from '@playwright/test'
import {
    openListado,
    toggleActivosPapelera,
    buscarEnListado,
    exportarXLS,
    abrirEmbudoColumna,
    paginar,
    loginComo,
    esperarListadoEstable,
    contarFilasListado,
} from './listado-v12'

/**
 * Smoke test de los helpers del template de listados v1.2.
 *
 * Queda en `.skip` hasta que FASE C2bis mergee el `webServer` en
 * `playwright.config.ts` + las credenciales de admin en `.env.test`.
 * Sin eso, Playwright no levanta el dev server y los setups de auth fallan
 * (ver `docs/testing/inventario-e2e-2026-10.md` §1).
 *
 * Cuando se desbloquee: cambiar `test.describe.skip` por `test.describe`.
 */
test.describe.skip('smoke helpers listado v1.2 — requiere C2bis mergeado', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('openListado + buscar + toggle + paginar + XLS + embudo', async ({ page }) => {
        // openListado
        await openListado(page, '/users')

        // contarFilasListado inicial
        const initial = await contarFilasListado(page)
        expect(initial).toBeGreaterThanOrEqual(0)

        // buscarEnListado + esperarListadoEstable
        await buscarEnListado(page, 'ZZZ_improbable_match_')
        await esperarListadoEstable(page)

        // Limpiar y volver a listar
        await buscarEnListado(page, '')

        // toggleActivosPapelera: ir a papelera y volver
        await toggleActivosPapelera(page, 'papelera')
        await toggleActivosPapelera(page, 'activos')

        // abrirEmbudoColumna: Rol es columna tipificada en Usuarios
        const menu = await abrirEmbudoColumna(page, 'Rol')
        await expect(menu).toBeVisible()
        await page.keyboard.press('Escape')

        // paginar — tolerante si solo hay 1 página
        const next = page.getByRole('button', { name: /Ir a página siguiente/i }).first()
        if (await next.isEnabled().catch(() => false)) {
            await paginar(page, 'siguiente')
            await paginar(page, 'anterior')
        }

        // exportarXLS
        const download = await exportarXLS(page)
        expect(download.suggestedFilename()).toMatch(/USUARIOS.*\.xls/i)
    })

    test('loginComo flujo directo (sin storageState)', async ({ browser }) => {
        const ctx = await browser.newContext()
        const page = await ctx.newPage()
        const email = process.env.TEST_ADMIN_EMAIL
        if (!email) test.skip(true, 'TEST_ADMIN_EMAIL no está en env')
        await loginComo(page, email!)
        await ctx.close()
    })
})
