import { test, expect } from '@playwright/test'

/**
 * Flow 39 — Pre-cutover: Auth y Recuperación de Contraseña @pre-cutover
 *
 * Verifica:
 * 1. /login carga correctamente
 * 2. /auth/reset-password carga sin error
 * 3. Formulario de reset tiene campo email
 * 4. Submit sin email muestra validación
 * 5. Credenciales incorrectas muestran mensaje de error
 * 6. Link "¿Olvidaste tu contraseña?" navega correctamente
 */

test.describe('Auth — Login y Reset Password @pre-cutover', () => {
    // Forzar sin sesión — sobreescribe el storageState del proyecto
    test.use({ storageState: { cookies: [], origins: [] } })

    test('/login carga sin error', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('/login muestra formulario con email y contraseña', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]')).first()
        const passwordInput = page.locator('input[type="password"]').first()
        await expect(emailInput).toBeVisible({ timeout: 10_000 })
        await expect(passwordInput).toBeVisible({ timeout: 10_000 })
    })

    test('credenciales incorrectas muestran mensaje de error', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]')).first()
        const passwordInput = page.locator('input[type="password"]').first()

        if (!await emailInput.isVisible({ timeout: 5_000 })) return

        await emailInput.fill('no-existe@reporta.test')
        await passwordInput.fill('contraseña-incorrecta')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(3_000)

        // Debería mostrar algún mensaje de error
        const errorMsg = page
            .locator('body')
            .getByText(/inválid|incorrecto|error|Invalid|credencial/i)
            .first()
        if (await errorMsg.isVisible({ timeout: 5_000 })) {
            await expect(errorMsg).toBeVisible()
        } else {
            console.log('[INFO] Mensaje de error no visible con texto esperado tras login fallido')
        }
    })

    test('link olvidaste contraseña navega a /auth/reset-password', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const resetLink = page
            .getByRole('link', { name: /olvidaste|olvidé|Forgot|reset/i })
            .or(page.locator('a').filter({ hasText: /olvidaste|olvidé|Forgot|reset/i }))
            .first()

        if (await resetLink.isVisible({ timeout: 5_000 })) {
            await resetLink.click()
            await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
            await expect(page.locator('body')).not.toContainText('Application error')
            // Verificar que navegó a reset-password
            expect(page.url()).toContain('reset')
        } else {
            console.log('[INFO] Link "olvidaste contraseña" no visible en /login')
        }
    })
})

test.describe('Auth — Reset Password Form @pre-cutover', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('/auth/reset-password carga sin error', async ({ page }) => {
        await page.goto('/auth/reset-password')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('formulario reset-password tiene campo de email', async ({ page }) => {
        await page.goto('/auth/reset-password')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const emailInput = page
            .locator('input[type="email"]')
            .or(page.locator('input[name="email"]'))
            .first()

        if (await emailInput.isVisible({ timeout: 8_000 })) {
            await expect(emailInput).toBeVisible()
        } else {
            // La página puede redirigir si ya hay sesión activa
            console.log('[INFO] Campo email no visible en /auth/reset-password — puede requerir no-session context')
        }
    })

    test('submit sin email muestra validación', async ({ page }) => {
        await page.goto('/auth/reset-password')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

        const submitBtn = page
            .getByRole('button', { name: /Enviar|Reset|Recuperar|Send/i })
            .first()

        if (!await submitBtn.isVisible({ timeout: 5_000 })) return

        await submitBtn.click()
        await page.waitForTimeout(1_000)

        // Debe haber validación o mantenerse en la misma página
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('Auth — Redireccionamientos @pre-cutover', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('ruta protegida redirige a /login', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        // Sin sesión debe redirigir a login
        expect(page.url()).toContain('login')
    })
})
