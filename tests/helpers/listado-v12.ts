import { expect, type Download, type Locator, type Page } from '@playwright/test'

/**
 * Helpers reutilizables para tests E2E del template de listados UI v1.2.
 *
 * Base: `docs/UI-TEMPLATE-LISTADOS.md` + inventario estático en
 * `docs/testing/inventario-e2e-2026-10.md` (FASE C2). Centraliza los patrones
 * de selectores que hoy aparecen duplicados en >14 specs de `tests/flows/`.
 *
 * Convenciones:
 *  - Todos los helpers son best-effort: si el elemento no existe, lanzan un
 *    error claro de Playwright (nunca silenciosamente).
 *  - No producen logs ruidosos (sólo si `DEBUG_E2E_HELPERS` está en env).
 *  - No tocan `.auth/*.json` ni assume ningún proyecto Playwright específico.
 */

const DEBUG = !!process.env.DEBUG_E2E_HELPERS

function debug(...args: unknown[]) {
    if (DEBUG) console.log('[listado-v12]', ...args)
}

/**
 * Navega a una ruta de listado v1.2 y espera a que esté lista.
 *
 * - `page.goto(ruta)`
 * - `waitForLoadState('networkidle')`
 * - Asegura que la página NO muestra `"Application error"`
 * - Verifica que exista el `<h1 className="sr-only">` que el template v1.2
 *   usa como marker (regla 1: SIN título visible, SI sr-only por a11y).
 *
 * @example
 *   await openListado(page, '/users')
 */
export async function openListado(page: Page, ruta: string): Promise<void> {
    debug('openListado', ruta)
    await page.goto(ruta)
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
    await expect(page.locator('body')).not.toContainText('Application error', { timeout: 5_000 })
    // Marker v1.2: h1 sr-only con el nombre del módulo.
    const h1 = page.locator('h1').first()
    await expect(h1).toBeAttached({ timeout: 10_000 })
}

/**
 * Clickea el toggle Activos/Papelera del template v1.2.
 *
 * El componente real (`components/common/view-mode-toggle.tsx` y la versión
 * inline de `/users`) es DOS botones separados con texto "Activos" / "Papelera";
 * NO es un `tab` role, por eso los specs que usan `getByRole('tab', ...)`
 * están rotos. Este helper acepta ambas variantes.
 *
 * @example
 *   await toggleActivosPapelera(page, 'papelera')
 */
export async function toggleActivosPapelera(
    page: Page,
    modo: 'activos' | 'papelera',
): Promise<void> {
    debug('toggleActivosPapelera', modo)
    const nombre = modo === 'activos' ? /^Activos$/i : /^Papelera$/i
    const btn = page.getByRole('button', { name: nombre }).first()
    await expect(btn, `No se encontró el botón ${modo} del toggle v1.2`).toBeVisible({ timeout: 10_000 })
    await btn.click()
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await esperarListadoEstable(page).catch(() => {})
}

/**
 * Llena el buscador multicampo del template v1.2 y espera el debounce
 * (~600 ms, igual al que todos los specs ya hardcodean) + que el listado
 * termine de refrescar.
 *
 * Placeholder estándar: `"Buscar por nombre, documento o email..."` (regla 2
 * del template). Este helper cubre también `input[type="search"]` por
 * compatibilidad con páginas aún no migradas.
 *
 * @example
 *   await buscarEnListado(page, 'Empresa SAC')
 */
export async function buscarEnListado(page: Page, query: string): Promise<void> {
    debug('buscarEnListado', query)
    const input = page
        .locator('input[placeholder*="Buscar"], input[type="search"]')
        .first()
    await expect(input, 'Input de búsqueda v1.2 no encontrado').toBeVisible({ timeout: 10_000 })
    await input.fill(query)
    // Debounce estandarizado en el template.
    await page.waitForTimeout(600)
    await esperarListadoEstable(page).catch(() => {})
}

/**
 * Clickea el botón "↓XLS" (regla 5 del template) y captura el `Download`.
 * El botón real es icon-only con `title="Descargar Excel (lo filtrado)"`.
 *
 * El caller decide qué assertear (filename, bytes, etc.).
 *
 * @example
 *   const download = await exportarXLS(page)
 *   expect(download.suggestedFilename()).toMatch(/^USUARIOS-\d{4}-\d{2}-\d{2}/)
 */
export async function exportarXLS(page: Page): Promise<Download> {
    debug('exportarXLS')
    const btn = page.getByRole('button', { name: /Descargar Excel/i }).first()
    await expect(btn, 'Botón XLS v1.2 no encontrado (title="Descargar Excel (lo filtrado)")')
        .toBeVisible({ timeout: 10_000 })
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        btn.click(),
    ])
    return download
}

/**
 * Abre el popover del embudo de filtro de la columna indicada
 * (`<ColumnFilterHeader title="…">`). Devuelve el locator del
 * `[role="menu"]` abierto para que el caller elija opciones.
 *
 * @example
 *   const menu = await abrirEmbudoColumna(page, 'Rol')
 *   await menu.getByRole('menuitemcheckbox', { name: 'Admin' }).click()
 */
export async function abrirEmbudoColumna(page: Page, columna: string): Promise<Locator> {
    debug('abrirEmbudoColumna', columna)
    const trigger = page.getByRole('button', { name: new RegExp(`Filtrar por ${columna}`, 'i') }).first()
    await expect(trigger, `Embudo de la columna "${columna}" no encontrado`).toBeVisible({ timeout: 10_000 })
    await trigger.click()
    const menu = page.locator('[role="menu"]').last()
    await expect(menu).toBeVisible({ timeout: 5_000 })
    return menu
}

/**
 * Paginación v1.2 (`TablePaginationBar` / `DataTablePagination`). Acepta:
 *  - `'siguiente'` / `'anterior'`: 1 paso.
 *  - `number`: va a esa página clickeando el botón ▶ / ◀ las veces necesarias
 *    (el componente no expone un botón "ir a N" numerado — sólo first/prev/next/last).
 *
 * @example
 *   await paginar(page, 'siguiente')
 *   await paginar(page, 3)
 */
export async function paginar(
    page: Page,
    direccion: 'siguiente' | 'anterior' | number,
): Promise<void> {
    debug('paginar', direccion)
    const prev = page.getByRole('button', { name: /Ir a página anterior/i }).first()
    const next = page.getByRole('button', { name: /Ir a página siguiente/i }).first()
    const first = page.getByRole('button', { name: /Ir a primera página/i }).first()

    if (direccion === 'siguiente') {
        await expect(next).toBeEnabled({ timeout: 10_000 })
        await next.click()
    } else if (direccion === 'anterior') {
        await expect(prev).toBeEnabled({ timeout: 10_000 })
        await prev.click()
    } else {
        if (direccion < 1) throw new Error(`paginar: página inválida ${direccion}`)
        // Reset a 1 y avanzar — la barra v1.2 no tiene botón numerado.
        if (await first.isEnabled().catch(() => false)) await first.click()
        await esperarListadoEstable(page).catch(() => {})
        for (let i = 1; i < direccion; i++) {
            await expect(next, `No se puede llegar a la página ${direccion}`).toBeEnabled({ timeout: 10_000 })
            await next.click()
            await esperarListadoEstable(page).catch(() => {})
        }
    }
    await esperarListadoEstable(page).catch(() => {})
}

/**
 * Login reutilizable para specs que NO quieren usar `.auth/*.json`
 * (por ejemplo, pruebas de flows de auth, 2FA, cambios de password, etc.).
 *
 * Lee `password` de env si no se pasa: `TEST_<SLUG>_PASSWORD` donde
 * `<SLUG>` es el email sin dominio, upper-case y con `_` (fallback a
 * `TEST_ADMIN_PASSWORD`).
 *
 * @example
 *   await loginComo(page, 'info@reporta.la')
 */
export async function loginComo(page: Page, email: string, password?: string): Promise<void> {
    debug('loginComo', email)
    const pwd = password
        ?? process.env[`TEST_${email.split('@')[0].toUpperCase().replace(/\W+/g, '_')}_PASSWORD`]
        ?? process.env.TEST_ADMIN_PASSWORD
    if (!pwd) {
        throw new Error(
            `loginComo: falta password para ${email}. Pasalo como arg o setealo en .env.test.`,
        )
    }
    await page.goto('/login')
    await page.fill('input[name="email"], input[type="email"]', email)
    await page.fill('input[name="password"], input[type="password"]', pwd)
    await page.click('button[type="submit"]')
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 })
    if (page.url().endsWith('/select-tenant')) {
        const firstTenant = page
            .locator('[data-testid="tenant-card"], button:has-text("Entrar")')
            .first()
        await firstTenant.click()
        await page.waitForURL(url => !url.pathname.endsWith('/select-tenant'), { timeout: 10_000 })
    }
    await expect(page.locator('body')).not.toContainText('Application error', { timeout: 5_000 })
}

/**
 * Espera a que el listado quede estable:
 *  - cualquier spinner `[role="status"]` o `.animate-spin` desaparece,
 *  - el conteo de filas del body no cambia durante 300 ms.
 *
 * No lanza si no hay spinner — solo verifica estabilidad.
 *
 * @example
 *   await buscarEnListado(page, 'X'); await esperarListadoEstable(page)
 */
export async function esperarListadoEstable(page: Page): Promise<void> {
    const spinner = page.locator('[role="status"], .animate-spin').first()
    if (await spinner.isVisible().catch(() => false)) {
        await spinner.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
    }
    let last = await contarFilasListado(page).catch(() => -1)
    await page.waitForTimeout(300)
    let now = await contarFilasListado(page).catch(() => -1)
    // Un reintento más si cambió, por si el render tardó.
    if (last !== now) {
        last = now
        await page.waitForTimeout(300)
        now = await contarFilasListado(page).catch(() => -1)
    }
    debug('esperarListadoEstable rows', now)
}

/**
 * Cuenta las filas del body de la tabla principal (excluye el `<thead>`).
 * Si no hay tabla visible devuelve 0.
 *
 * @example
 *   const n = await contarFilasListado(page); expect(n).toBeGreaterThan(0)
 */
export async function contarFilasListado(page: Page): Promise<number> {
    const rows = page.locator('table tbody tr')
    return rows.count().catch(() => 0)
}
