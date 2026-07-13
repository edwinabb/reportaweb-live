import { Page, expect, Locator } from '@playwright/test'

/**
 * Page Object para /planificacion.
 *
 * Convención: métodos `goto*` navegan y esperan, `expect*` hacen assertions,
 * `click*` interactúan sin esperar assertion.
 */
export class PlanificacionPage {
    constructor(public readonly page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto('/planificacion')
        // La página es client-side con useEffect que fetchea — esperamos que
        // los skeletons desaparezcan.
        await this.waitUntilLoaded()
    }

    async gotoNueva(): Promise<void> {
        await this.page.goto('/planificacion/nueva')
        await expect(this.page.getByRole('heading', { level: 1 }).or(
            this.page.getByLabel(/Título de la tarea/i),
        )).toBeVisible({ timeout: 10_000 })
    }

    /** Espera a que la página termine de cargar tareas (desaparecen skeletons). */
    async waitUntilLoaded(): Promise<void> {
        // networkidle puede no alcanzarse si hay subscriptions/polling activo.
        // Estrategia: intentar networkidle con timeout generoso; si falla, esperar
        // el botón Hoy como indicador de que la UI está renderizada y usable.
        await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(async () => {
            await this.page.locator('[data-testid="btn-hoy"]').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
        })
    }

    // View switchers ---------------------------------------------------------

    // Los tab-buttons "Personal" y "Maquinaria" chocan con los items del sidebar
    // que tienen el mismo nombre. Scopeamos a <main> para desambiguar.
    async switchToList(): Promise<void> {
        await this.page.locator('[data-testid="btn-listado"]').click()
    }

    async switchToPersonal(): Promise<void> {
        await this.page.locator('[data-testid="btn-personal"]').click()
    }

    async switchToMaquinaria(): Promise<void> {
        await this.page.locator('[data-testid="btn-maquinaria"]').click()
    }

    // Listado assertions -----------------------------------------------------

    /**
     * Verifica que una tarea por código aparezca en el listado.
     * Busca en <tbody> porque el código va en alguna celda.
     */
    async expectTareaInList(codigo: string): Promise<void> {
        await expect(
            this.page.locator('table tbody').getByText(codigo, { exact: false }),
        ).toBeVisible({ timeout: 10_000 })
    }

    // Timeline assertions ----------------------------------------------------

    /**
     * Devuelve el row del timeline (resource) por su nombre visible.
     * Uso: await planificacion.timelineRow('E2E_Personal A').locator(...)
     */
    timelineRow(resourceName: string): Locator {
        return this.page
            .locator('table tbody tr')
            .filter({ hasText: resourceName })
    }

    /**
     * Verifica que una tarea aparezca en el timeline para un recurso dado.
     * El componente renderiza el código de la tarea en celdas con clase orange-100.
     */
    async expectAssignmentInTimeline(
        resourceName: string,
        tareaCodigo: string,
    ): Promise<void> {
        const row = this.timelineRow(resourceName)
        await expect(row).toBeVisible({ timeout: 10_000 })
        await expect(row.getByText(tareaCodigo, { exact: false })).toBeVisible()
    }

    // Navegación por semana --------------------------------------------------

    async goToToday(): Promise<void> {
        // Garantiza que estamos en /planificacion antes de buscar el botón Hoy
        if (!this.page.url().includes('/planificacion') || this.page.url().includes('/planificacion/nueva')) {
            await this.goto()
        }
        await this.page.locator('[data-testid="btn-hoy"]').click()
        await this.waitUntilLoaded()
    }
}
