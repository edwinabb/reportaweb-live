import { test, expect } from '@playwright/test'

// Smoke test: los 11 módulos del sidebar responden 200 sin error boundary.
// Es el canario mínimo post-cutover. Si alguno revienta acá, el deploy no va.

const ROUTES: Array<{ path: string; label: string }> = [
    { path: '/', label: 'Dashboard' },
    { path: '/planificacion', label: 'Planificación' },
    { path: '/formatos', label: 'Inspecciones' },
    { path: '/cotizaciones', label: 'Cotizaciones' },
    { path: '/ventas/panel', label: 'Ventas panel' },
    { path: '/compras/panel', label: 'Compras panel' },
    { path: '/terceros', label: 'Terceros' },
    { path: '/maquinarias', label: 'Maquinaria' },
    { path: '/users', label: 'Usuarios' },
    { path: '/planes-accion', label: 'Planes de Acción' },
    { path: '/planes-accion/panel', label: 'Planes de Acción panel' },
    // Configuración — el módulo tiene 6 sub-rutas, no un landing /settings.
    { path: '/settings/users', label: 'Config · Usuarios' },
    { path: '/settings/terceros', label: 'Config · Terceros' },
    { path: '/settings/maquinaria', label: 'Config · Maquinaria' },
    { path: '/settings/cotizaciones', label: 'Config · Cotizaciones' },
    { path: '/settings/sitios', label: 'Config · Sitios' },
    { path: '/settings/document-types', label: 'Config · Tipos Documento' },
]

test.describe('@smoke sidebar routes', () => {
    for (const route of ROUTES) {
        test(`${route.label} (${route.path}) carga sin errores`, async ({ page }) => {
            const consoleErrors: string[] = []
            page.on('console', (msg) => {
                if (msg.type() === 'error') consoleErrors.push(msg.text())
            })

            const response = await page.goto(route.path)
            expect(response?.status(), 'HTTP status').toBeLessThan(400)

            // Error boundaries de Next.js y React
            await expect(page.locator('body')).not.toContainText('Application error', { timeout: 5_000 })
            await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error')
            await expect(page.locator('body')).not.toContainText('500 — Server Error')

            // Filtrar errores de consola ruidosos que no son fallas reales
            const ignorable = [
                /Failed to load resource.*favicon/i,
                /\[Fast Refresh\]/i,
                /DevTools/i,
                // Hydration mismatch de Radix (React 19 `useId` en Accordion/Collapsible del Sidebar).
                // Intermitente, no bloquea funcionalidad. TEST-001 en TESTING.md — fix pendiente Fase 3.
                /A tree hydrated but some attributes of the server rendered HTML didn't match/i,
                // CSP warning de Sentry: wildcard en ingest URL no es error funcional.
                /Content Security Policy.*sentry\.io/i,
                // CSP bloqueo de Vercel Analytics/Speed Insights (scripts debug en dev).
                /Content Security Policy.*vercel/i,
                /va\.vercel-scripts\.com/i,
                // 404 de scripts de Vercel analytics en dev mode (no afecta producción).
                /vercel-scripts.*404|speed-insights.*404/i,
            ]
            const realErrors = consoleErrors.filter(
                (e) => !ignorable.some((re) => re.test(e)),
            )
            expect(realErrors, 'console errors').toHaveLength(0)
        })
    }
})
