import { test, expect, chromium } from '@playwright/test'

/**
 * Flow 09 — Auth: login, logout, redirección, persistencia de sesión @auth @smoke
 *
 * Estos tests NO usan storageState (corren sin sesión previa) porque
 * prueban el propio flujo de autenticación.  Se declaran en un describe
 * con `use: { storageState: undefined }` para ignorar el project default.
 */

test.describe('Auth — login / logout @auth', () => {
    // Contexto limpio sin sesión (storageState: undefined no anula el project-level
    // en todos los runners de Playwright; usamos estado vacío explícito)
    test.use({ storageState: { cookies: [], origins: [] } })

    test('login válido redirige al dashboard @smoke', async ({ page }) => {
        const email = process.env.TEST_PLANNER_EMAIL || process.env.TEST_USER_EMAIL
        const pass  = process.env.TEST_PLANNER_PASSWORD || process.env.TEST_USER_PASSWORD
        if (!email || !pass) test.skip(true, 'Credenciales de planner no configuradas')

        await page.goto('/login')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        // #email es el input del formulario principal (evita el input de reset de contraseña)
        await page.locator('input#email').fill(email!)
        await page.locator('input#password, input[type="password"]').first().fill(pass!)
        await page.click('button[type="submit"]')

        await page.waitForURL(/\/(planificacion|select-tenant|)$/, { timeout: 15_000 })
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('login con password incorrecto muestra mensaje de error @smoke', async ({ page }) => {
        const email = process.env.TEST_PLANNER_EMAIL || process.env.TEST_USER_EMAIL
        if (!email) test.skip(true, 'TEST_PLANNER_EMAIL no configurado')

        await page.goto('/login')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        await page.locator('input#email').fill(email!)
        await page.locator('input#password, input[type="password"]').first().fill('contraseña_incorrecta_99!')
        await page.click('button[type="submit"]')

        // Debe mostrar un mensaje de error (no redirige)
        await expect(page.locator('body')).toContainText(/contraseña|credenciales|inválid|Invalid/i, { timeout: 8_000 })
        await expect(page).toHaveURL(/\/login/)
    })

    test('ruta protegida sin sesión redirige a /login', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForURL(/\/login/, { timeout: 10_000 })
        await expect(page).toHaveURL(/\/login/)
    })

    test('ruta protegida admin sin sesión redirige a /login', async ({ page }) => {
        await page.goto('/users')
        await page.waitForURL(/\/login/, { timeout: 10_000 })
        await expect(page).toHaveURL(/\/login/)
    })
})

test.describe('Auth — logout @auth', () => {
    // IMPORTANTE: usar sesión vacía + login inline para no cargar ningún .auth/*.json.
    // Supabase rota el refresh_token cuando se usa por primera vez; si cargamos viewer.json
    // o planner.json aquí, el token del archivo queda invalidado y todos los tests
    // posteriores de ese rol fallan con redirección a /login.
    test.use({ storageState: { cookies: [], origins: [] } })

    test('logout limpia sesión y redirige a /login', async ({ page }) => {
        const email = process.env.TEST_VIEWER_EMAIL || 'e2e-viewer@reporta.la'
        const pass  = process.env.TEST_VIEWER_PASSWORD
        if (!pass) test.skip(true, 'TEST_VIEWER_PASSWORD no configurado')

        // Login inline — crea una sesión nueva en memoria (distinta a la de viewer.json)
        await page.goto('/login')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await page.locator('input#email').fill(email)
        await page.locator('input#password, input[type="password"]').first().fill(pass!)
        await page.click('button[type="submit"]')
        await page.waitForURL(/\/(planificacion|select-tenant|)$/, { timeout: 15_000 })

        // El botón de logout está en el dropdown del header (avatar redondeado)
        const userMenuBtn = page.locator('button.rounded-full').first()
        await expect(userMenuBtn).toBeVisible({ timeout: 8_000 })
        await userMenuBtn.click()
        // Esperar a que el dropdown abra (Radix DropdownMenuContent)
        await page.waitForSelector('[data-radix-popper-content-wrapper]', { timeout: 5_000 }).catch(() => null)
        // Submitear el form de logout directamente (asChild en DropdownMenuItem puede
        // bloquear el click normal)
        const logoutForm = page.locator('form').filter({ has: page.locator('button', { hasText: /Cerrar Sesión/i }) })
        if (await logoutForm.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await logoutForm.locator('button[type="submit"]').click({ force: true })
        } else {
            // fallback: click directo en el botón
            await page.locator('button', { hasText: /Cerrar Sesión/i }).click({ force: true })
        }

        await page.waitForURL(/\/login/, { timeout: 20_000 })
        await expect(page).toHaveURL(/\/login/)

        // Verificar que no puede navegar al dashboard sin volver a loguear
        await page.goto('/planificacion')
        await page.waitForURL(/\/login/, { timeout: 10_000 })
        await expect(page).toHaveURL(/\/login/)
    })
})
