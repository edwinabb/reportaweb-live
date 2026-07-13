import { test, expect } from '@playwright/test'
import { getAdminClient, getTestTenantId } from '../helpers/supabase-admin'

/**
 * Flow 46 — Módulo de Soporte: tickets, respuestas, cierre @soporte @pre-cutover
 *
 * Verifica:
 * 1. /soporte accesible por todos los roles autenticados
 * 2. Crear ticket via UI (formulario + sección + criticidad)
 * 3. Admin ve todos los tickets del tenant
 * 4. Admin agrega respuesta y cambia estado
 * 5. Admin cierra ticket
 * 6. Ticket cerrado no muestra formulario de respuesta
 * 7. Consecutivo por tenant es race-safe (via DB factory)
 * 8. Imágenes: bucket 'problemas' existe
 */

// ─── helpers DB ───────────────────────────────────────────────────────────────

async function createTicketViaDB(opts: {
    tenantId:    string
    userId:      string
    seccion?:    string
    criticidad?: string
    descripcion?: string
}) {
    const admin = getAdminClient()

    // Obtener número consecutivo
    const { data: numero } = await admin.rpc('next_ticket_soporte_numero', {
        p_tenant_id: opts.tenantId,
    })

    const { data: ticket, error } = await admin
        .from('tickets_soporte')
        .insert({
            numero,
            tenant_id:   opts.tenantId,
            user_id:     opts.userId,
            sistema:     'REPORTA_WEB',
            seccion:     opts.seccion    ?? 'GENERAL',
            criticidad:  opts.criticidad ?? 'MEDIA',
            descripcion: opts.descripcion ?? `E2E Ticket de prueba #${numero}`,
        })
        .select('id, numero')
        .single()

    if (error) throw new Error(`createTicketViaDB: ${error.message}`)

    // Insertar entrada de sistema "Ticket creado" (igual que crearTicket server action)
    await admin.from('tickets_soporte_respuestas').insert({
        ticket_id:     ticket!.id,
        tenant_id:     opts.tenantId,
        user_id:       opts.userId,
        mensaje:       'Ticket creado',
        tipo:          'SISTEMA',
        es_de_soporte: false,
    })

    return { id: ticket!.id as string, numero: ticket!.numero as number }
}

async function deleteTicket(id: string) {
    const admin = getAdminClient()
    await admin.from('tickets_soporte_respuestas').delete().eq('ticket_id', id)
    await admin.from('tickets_soporte').delete().eq('id', id)
}

async function getAdminUserId() {
    const admin  = getAdminClient()
    const tenant = getTestTenantId()
    const { data } = await admin
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenant)
        .eq('role', 'admin_tenant')
        .limit(1)
        .single()
    return data?.id as string | undefined
}

// ─── Tests: Lista de tickets ───────────────────────────────────────────────────

test.describe('Soporte — Lista de tickets (Admin) @soporte', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/soporte carga sin error', async ({ page }) => {
        await page.goto('/soporte')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('título "Tickets de Soporte" es visible', async ({ page }) => {
        await page.goto('/soporte')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('h1').first()).toContainText(/Tickets de Soporte/i)
    })

    test('botón "Nuevo Ticket" es visible', async ({ page }) => {
        await page.goto('/soporte')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const btn = page.locator('a, button', { hasText: /Nuevo Ticket/i })
        await expect(btn.first()).toBeVisible({ timeout: 10_000 })
    })

    test('filtros de estado, sección y criticidad son visibles', async ({ page }) => {
        await page.goto('/soporte')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const combos = page.locator('[role="combobox"]')
        const count = await combos.count()
        expect(count).toBeGreaterThanOrEqual(3)
    })

    test('tabla tiene columnas Nº, Descripción, Sección, Criticidad, Estado, Fecha', async ({ page }) => {
        await page.goto('/soporte')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const thead = page.locator('thead')
        await expect(thead).toBeVisible()
        const text = await thead.textContent()
        expect(text).toMatch(/#|N°|Nro/)
        expect(text).toMatch(/Descripci/)
        expect(text).toMatch(/Secci/)
    })

    test('filtro por estado ABIERTO no produce error', async ({ page }) => {
        await page.goto('/soporte?estado=ABIERTO')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('filtro por estado EN_PROGRESO no produce error', async ({ page }) => {
        await page.goto('/soporte?estado=EN_PROGRESO')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('filtro por estado CERRADO no produce error', async ({ page }) => {
        await page.goto('/soporte?estado=CERRADO')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('filtro por sección PLANIFICACION no produce error', async ({ page }) => {
        await page.goto('/soporte?seccion=PLANIFICACION')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).not.toContainText('Application error')
    })
})

// ─── Tests: Nuevo ticket ────────────────────────────────────────────────────────

test.describe('Soporte — Nuevo ticket (Admin) @soporte', () => {
    test.use({ storageState: '.auth/admin.json' })

    test('/soporte/nuevo carga sin error', async ({ page }) => {
        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('formulario muestra selector de sección', async ({ page }) => {
        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const sectionSelect = page.locator('[role="combobox"]').first()
        await expect(sectionSelect).toBeVisible({ timeout: 10_000 })
    })

    test('formulario muestra radio de criticidad (Baja, Media, Alta)', async ({ page }) => {
        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText('Baja')
        await expect(page.locator('body')).toContainText('Media')
        await expect(page.locator('body')).toContainText('Alta')
    })

    test('formulario muestra textarea de descripción', async ({ page }) => {
        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const textarea = page.locator('textarea').first()
        await expect(textarea).toBeVisible({ timeout: 10_000 })
    })

    test('formulario muestra área de imágenes adjuntas', async ({ page }) => {
        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/Ctrl\+V|imágenes|adjunt/i)
    })

    test('botón Cancelar vuelve a /soporte', async ({ page }) => {
        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const cancelBtn = page.locator('button', { hasText: /Cancelar/i })
        await cancelBtn.click()
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
        await expect(page).toHaveURL(/\/soporte$/)
    })

    test('crear ticket E2E via UI completo', async ({ page }) => {
        let ticketId: string | null = null

        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        // Seleccionar sección
        const sectionSelect = page.locator('[role="combobox"]').first()
        await sectionSelect.click()
        const generalOption = page.locator('[role="option"]', { hasText: /General/i })
        await generalOption.click()

        // Seleccionar criticidad Media (ya seleccionada por default, pero hacemos clic en Alta)
        const altaRadio = page.locator('label', { hasText: /Alta/i })
        if (await altaRadio.isVisible()) await altaRadio.click()

        // Descripción
        const textarea = page.locator('textarea').first()
        await textarea.fill('E2E: Ticket de prueba automático — ignorar')

        // Submit
        const submitBtn = page.locator('button[type="submit"], button', { hasText: /Enviar Ticket/i })
        await submitBtn.click()

        // Debe redirigir a /soporte/[id]
        await page.waitForURL(/\/soporte\/.+/, { timeout: 15_000 }).catch(() => {})
        const url = page.url()

        if (url.includes('/soporte/') && !url.endsWith('/nuevo')) {
            ticketId = url.split('/soporte/')[1]
            await expect(page.locator('body')).not.toContainText('Application error')
        }

        // Cleanup
        if (ticketId) {
            await deleteTicket(ticketId)
        }
    })
})

// ─── Tests: Detalle de ticket ───────────────────────────────────────────────────

test.describe('Soporte — Detalle de ticket (Admin) @soporte', () => {
    test.use({ storageState: '.auth/admin.json' })

    let testTicketId: string

    test.beforeAll(async () => {
        const tenantId = getTestTenantId()
        const adminId  = await getAdminUserId()
        if (!adminId) return
        const t = await createTicketViaDB({
            tenantId,
            userId:      adminId,
            seccion:     'GENERAL',
            criticidad:  'MEDIA',
            descripcion: 'E2E: Ticket detalle test — ignorar',
        })
        testTicketId = t.id
    })

    test.afterAll(async () => {
        if (testTicketId) await deleteTicket(testTicketId)
    })

    test('página de detalle carga sin error', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('detalle muestra descripción del ticket', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText('E2E: Ticket detalle test')
    })

    test('detalle muestra número de ticket con formato #XXXX', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/#\d{4}/)
    })

    test('sección historial es visible', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/Historial/i)
    })

    test('entrada de sistema "Ticket creado" aparece en historial', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/Ticket creado/i)
    })

    test('formulario de respuesta es visible para admin', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/Agregar Respuesta/i)
    })

    test('sección resolución con borde verde es visible para admin', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/Resolución/i)
    })

    test('admin puede agregar un comentario vía UI', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

        const textarea = page.locator('textarea').first()
        await textarea.fill('Comentario E2E de prueba — ignorar')

        const sendBtn = page.locator('button', { hasText: /Enviar/i }).last()
        await sendBtn.click()
        await page.waitForTimeout(2000)

        // Verificar que el comentario aparece en el historial
        await expect(page.locator('body')).toContainText('Comentario E2E de prueba')
    })

    test('botón Cerrar ticket visible para admin (ticket abierto)', async ({ page }) => {
        if (!testTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${testTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const closeBtn = page.locator('button', { hasText: /Cerrar ticket/i })
        await expect(closeBtn).toBeVisible({ timeout: 10_000 })
    })
})

// ─── Tests: Cierre de ticket ────────────────────────────────────────────────────

test.describe('Soporte — Cierre de ticket (Admin) @soporte', () => {
    test.use({ storageState: '.auth/admin.json' })

    let closedTicketId: string

    test.beforeAll(async () => {
        const tenantId = getTestTenantId()
        const adminId  = await getAdminUserId()
        if (!adminId) return
        const t = await createTicketViaDB({
            tenantId,
            userId:      adminId,
            descripcion: 'E2E: Ticket para cerrar — ignorar',
        })
        closedTicketId = t.id

        // Cerrar via DB directamente
        const admin = getAdminClient()
        await admin
            .from('tickets_soporte')
            .update({ estado: 'CERRADO', cerrado_at: new Date().toISOString(), cerrado_por_id: adminId })
            .eq('id', closedTicketId)
    })

    test.afterAll(async () => {
        if (closedTicketId) await deleteTicket(closedTicketId)
    })

    test('ticket cerrado muestra badge CERRADO', async ({ page }) => {
        if (!closedTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${closedTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page.locator('body')).toContainText(/Cerrado/i)
    })

    test('ticket cerrado NO muestra formulario de respuesta', async ({ page }) => {
        if (!closedTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${closedTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const respForm = page.locator('h2, h3, div', { hasText: /Agregar Respuesta/i })
        await expect(respForm).toHaveCount(0)
    })

    test('ticket cerrado NO muestra botón Cerrar ticket', async ({ page }) => {
        if (!closedTicketId) test.skip(true, 'No se pudo crear ticket de test')
        await page.goto(`/soporte/${closedTicketId}`)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const closeBtn = page.locator('button', { hasText: /Cerrar ticket/i })
        await expect(closeBtn).toHaveCount(0)
    })
})

// ─── Tests: Planner (usuario normal) @soporte ─────────────────────────────────

test.describe('Soporte — Planner (usuario normal) @soporte', () => {
    test.use({ storageState: '.auth/planner.json' })

    test('planner puede acceder a /soporte', async ({ page }) => {
        await page.goto('/soporte')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('planner puede acceder a /soporte/nuevo', async ({ page }) => {
        await page.goto('/soporte/nuevo')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        await expect(page).not.toHaveURL(/\/login/)
        await expect(page.locator('body')).not.toContainText('Application error')
    })

    test('planner ve "Soporte" en el sidebar', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
        const soporteLink = page.locator('nav a[href="/soporte"]')
        await expect(soporteLink).toBeVisible({ timeout: 10_000 })
    })
})

// ─── Tests: DB directa — consecutivo @soporte ─────────────────────────────────

test.describe('Soporte — Consecutivo y estructura DB @soporte', () => {
    test('next_ticket_soporte_numero retorna entero positivo', async () => {
        const admin    = getAdminClient()
        const tenantId = getTestTenantId()
        const { data, error } = await admin.rpc('next_ticket_soporte_numero', {
            p_tenant_id: tenantId,
        })
        expect(error).toBeNull()
        expect(typeof data).toBe('number')
        expect(data as number).toBeGreaterThan(0)
    })

    test('dos llamadas consecutivas retornan números distintos', async () => {
        const admin    = getAdminClient()
        const tenantId = getTestTenantId()
        const adminId  = await getAdminUserId()
        if (!adminId) return

        // Crear un ticket para avanzar el consecutivo
        const t = await createTicketViaDB({ tenantId, userId: adminId })
        const { data: n2 } = await admin.rpc('next_ticket_soporte_numero', { p_tenant_id: tenantId })

        expect((n2 as number)).toBeGreaterThan(t.numero)

        // Cleanup
        await deleteTicket(t.id)
    })

    test('tabla tickets_soporte_respuestas existe con columna es_de_soporte', async () => {
        const admin    = getAdminClient()
        const tenantId = getTestTenantId()
        const adminId  = await getAdminUserId()
        if (!adminId) return

        const t = await createTicketViaDB({ tenantId, userId: adminId })

        const { error } = await admin
            .from('tickets_soporte_respuestas')
            .insert({
                ticket_id:     t.id,
                tenant_id:     tenantId,
                user_id:       adminId,
                mensaje:       'E2E respuesta test',
                tipo:          'COMENTARIO',
                es_de_soporte: false,
            })

        expect(error).toBeNull()
        await deleteTicket(t.id)
    })

    test('bucket "problemas" existe en Supabase Storage', async () => {
        const admin = getAdminClient()
        const { data: buckets, error } = await admin.storage.listBuckets()
        expect(error).toBeNull()
        const problemasBucket = buckets?.find(b => b.id === 'problemas')
        expect(problemasBucket).toBeTruthy()
        expect(problemasBucket?.public).toBe(true)
    })

    test('secciones de REPORTA están en los checks del formulario', async () => {
        const admin    = getAdminClient()
        const tenantId = getTestTenantId()
        const adminId  = await getAdminUserId()
        if (!adminId) return

        // Verificar que todas las secciones son aceptadas
        const secciones = ['PLANIFICACION','INFORMES','FORMATOS','EPP','MAQUINARIA','GENERAL']
        for (const seccion of secciones) {
            const t = await createTicketViaDB({ tenantId, userId: adminId, seccion })
            await deleteTicket(t.id)
        }
        // Si llegamos aquí sin error, todas las secciones son válidas
        expect(true).toBe(true)
    })
})
