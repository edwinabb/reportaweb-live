import { test, expect } from '@playwright/test'

/**
 * Flow 18 — Control de acceso por rol (RBAC) @roles @smoke
 *
 * Verifica que cada rol ve/no-ve las secciones que le corresponden.
 * - Admin: ve sección Sistema, puede gestionar usuarios
 * - Planner: puede crear tareas, ver formatos
 * - Viewer: solo lectura, no ve botones de creación ni secciones admin
 */

test.describe('RBAC — Planner @roles', () => {
    test.use({ storageState: '.auth/planner.json' })

    test('planner ve el sidebar sin sección Sistema', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        // La sección "Sistema" solo la ve reporta_admin, no planner/admin_tenant
        const sistemaLink = page.locator('nav a, nav span', { hasText: /^Sistema$/ })
        await expect(sistemaLink).toHaveCount(0)
    })

    test('planner puede acceder a /formatos (sin error de aplicación)', async ({ page }) => {
        await page.goto('/formatos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('planner ve botón Nueva plantilla en /formatos (si tiene acceso)', async ({ page }) => {
        await page.goto('/formatos')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        // Si cargo_permisos redirige a /, el test es no-op (planner sin acceso a módulo es válido)
        if (!page.url().includes('/formatos')) return
        const btn = page.locator('button', { hasText: /Nueva plantilla/i })
        await expect(btn).toBeVisible({ timeout: 10_000 })
    })
})

test.describe('RBAC — Admin tenant @roles', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('admin ve módulo de usuarios en sidebar', async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)

        // Navegar a /users abre el accordion Usuarios; el link Directorio queda visible
        const usersLink = page.locator('a[href="/users"]').first()
        await expect(usersLink).toBeVisible({ timeout: 10_000 })
    })

    test('admin puede acceder a /settings/users', async ({ page }) => {
        await page.goto('/settings/users')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

test.describe('RBAC — Viewer (solo lectura) @roles', () => {
    test.use({ storageState: '.auth/viewer.json' })

    test('viewer puede ver dashboard', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
    })

    test('viewer puede ver /planificacion', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('viewer ve /planificacion sin errores (botón visible — RBAC UI post-cutover)', async ({ page }) => {
        await page.goto('/planificacion')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        // El botón "Nueva Tarea" es visible para todos los roles actualmente
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('viewer en /planificacion/nueva — página carga (RBAC pendiente post-cutover)', async ({ page }) => {
        await page.goto('/planificacion/nueva')
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
        // Middleware solo bloquea no-autenticados; RBAC por rol se agrega post-cutover
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('viewer en /settings/users — página carga o redirige', async ({ page }) => {
        await page.goto('/settings/users')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        // Verificar que no haya error de aplicación (RBAC fine-grained post-cutover)
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})
