import { getAdminClient, getTestTenantId, getTestUserId, getTestAdminId } from './supabase-admin'

/**
 * Data factories para tests E2E.
 *
 * Patrón: cada factory crea un registro y devuelve su ID. Todos los registros
 * creados se trackean para cleanup automático con `cleanupTestData(trackerId)`.
 *
 * Convención: todos los recursos de test llevan prefijo `E2E_` en el nombre
 * para identificarlos visualmente en la DB y limpiar manualmente si algo falla.
 */

const TEST_PREFIX = 'E2E_'

type Tracker = {
    tareas: string[]
    tareas_fechas: string[]
    tareas_recursos: string[]
    reportes_personal: string[]
    reportes_maquinaria: string[]
    reportes_combustible: string[]
    personalIds: string[]
    maquinariaIds: string[]
    cotizaciones: string[]
    terceroPersonalIds: string[]
    inspecciones: string[]
}

/**
 * Crea un tracker nuevo para esta corrida de test. Pasalo a todas las factories
 * y al `cleanupTestData` al final.
 */
export function newTracker(): Tracker {
    return {
        tareas: [],
        tareas_fechas: [],
        tareas_recursos: [],
        reportes_personal: [],
        reportes_maquinaria: [],
        reportes_combustible: [],
        personalIds: [],
        maquinariaIds: [],
        cotizaciones: [],
        terceroPersonalIds: [],
        inspecciones: [],
    }
}

// -----------------------------------------------------------------------------
// SEEDING — asegura que existan recursos mínimos para testear
// -----------------------------------------------------------------------------

/**
 * Busca un user en auth.users por email iterando todas las páginas.
 * listUsers devuelve máximo ~1000 por página pero algunas versiones lo capean más bajo,
 * así que paginamos hasta que no venga nada.
 */
async function findAuthUserIdByEmail(email: string): Promise<string> {
    const admin = getAdminClient()
    const PER_PAGE = 1000
    let page = 1
    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
        if (error) throw new Error(`listUsers page ${page}: ${error.message}`)
        if (!data || data.users.length === 0) break
        const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
        if (found) return found.id
        if (data.users.length < PER_PAGE) break
        page++
    }
    throw new Error(`findAuthUserIdByEmail: no se encontró ${email} en auth.users`)
}

/**
 * Busca o crea un profile de personal con rol `member` en el tenant de test.
 * Lo agregamos al tracker solo si lo creamos (si existía previamente, no lo borramos).
 */
export async function ensurePersonal(
    tracker: Tracker,
    suffix: string,
): Promise<{ id: string; nombre: string }> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const email = `e2e_personal_${suffix}@reporta.test`
    const nombre = `${TEST_PREFIX}Personal ${suffix}`

    // Buscar leftover tanto en profiles como en auth.users — pueden estar
    // desincronizados si un cleanup anterior borró profile pero no auth.user.
    const { data: existingProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    let userId: string

    if (existingProfile) {
        userId = existingProfile.id
    } else {
        // Intentar crear; si ya existe (leftover huérfano), paginar auth.users para
        // encontrar su ID. listUsers pagina de 50 por default y el project tiene
        // más usuarios que eso, por eso iteramos.
        const { data: authData, error: authErr } = await admin.auth.admin.createUser({
            email,
            password: `e2e_${suffix}_pwd_2026`,
            email_confirm: true,
        })

        if (authData?.user) {
            userId = authData.user.id
        } else if (authErr?.message.includes('already been registered')) {
            userId = await findAuthUserIdByEmail(email)
        } else {
            throw new Error(`ensurePersonal auth: ${authErr?.message}`)
        }
    }

    // Track siempre (aunque sea leftover de corrida anterior), así el cleanup
    // deja la DB determinística cada run.
    tracker.personalIds.push(userId)

    // Upsert — el trigger handle_new_user() crea el profile con los defaults,
    // nosotros sobrescribimos con los campos del test.
    const { error: upsertErr } = await admin.from('profiles').upsert(
        {
            id: userId,
            first_name: `${TEST_PREFIX}Personal`,
            last_name: suffix,
            email,
            tenant_id: tenantId,
            role: 'member',
            is_active: true,
        },
        { onConflict: 'id' },
    )
    if (upsertErr) throw new Error(`ensurePersonal profile upsert: ${upsertErr.message}`)

    return { id: userId, nombre }
}

/**
 * Busca o crea una maquinaria de test en el tenant.
 */
export async function ensureMaquinaria(
    tracker: Tracker,
    suffix: string,
): Promise<{ id: string; nombre: string; codigo: string }> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const codigo = `${TEST_PREFIX}MAQ-${suffix}`
    const nombre = `${TEST_PREFIX}Grúa de test ${suffix}`

    const { data: existing } = await admin
        .from('maquinarias')
        .select('id, nombre, codigo_interno, modelo')
        .eq('codigo_interno', codigo)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (existing) {
        // Clear modelo if set — getRecursosForPlanning builds display name as
        // [categoria,marca,modelo,capacidad].filter(Boolean).join('·') || m.nombre
        // so a non-null modelo masks m.nombre in the timeline.
        if (existing.modelo) {
            await admin.from('maquinarias').update({ modelo: null }).eq('id', existing.id)
        }
        tracker.maquinariaIds.push(existing.id)
        return {
            id: existing.id,
            nombre: existing.nombre || nombre,
            codigo: existing.codigo_interno || codigo,
        }
    }

    const { data, error } = await admin
        .from('maquinarias')
        .insert({
            tenant_id: tenantId,
            nombre,
            codigo_interno: codigo,
            propietario: 'propio',
            is_active: true,
            habilitado: true,
        })
        .select('id')
        .single()
    if (error || !data) throw new Error(`ensureMaquinaria: ${error?.message}`)

    tracker.maquinariaIds.push(data.id)
    return { id: data.id, nombre, codigo }
}

// -----------------------------------------------------------------------------
// FACTORIES — crean la entidad bajo test y la trackean
// -----------------------------------------------------------------------------

export interface CreateTareaInput {
    titulo: string
    sitio?: string
    clienteNombre?: string
    prioridad?: 'BAJA' | 'MEDIA' | 'ALTA'
    tipoTarea?: string
    descripcion?: string
    personalIds?: string[]
}

/**
 * Crea el encabezado de una tarea directamente en la DB. Devuelve el ID.
 * Las fechas y recursos se crean con `addIntervalo` + `assignResource` después.
 */
export async function createTarea(tracker: Tracker, input: CreateTareaInput): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    // Código único — contador local. Para tests no necesitamos el consecutivo real.
    const codigo = `${TEST_PREFIX}T-${Date.now()}`

    // NOTA: `tipo_tarea` del input no se persiste porque la DB no tiene esa columna
    // todavía (ver TAREAS — pendiente migration). Se mantiene en el input para no
    // romper los call-sites cuando la agreguemos.
    void input.tipoTarea

    const { data, error } = await admin
        .from('tareas')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            codigo,
            titulo: `${TEST_PREFIX}${input.titulo}`,
            descripcion: input.descripcion || null,
            cliente_nombre: input.clienteNombre || null,
            sitio: input.sitio || null,
            prioridad: input.prioridad || 'MEDIA',
            estado: 'PENDIENTE',
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`createTarea: ${error?.message}`)

    tracker.tareas.push(data.id)
    return data.id
}

export interface AddIntervaloInput {
    tareaId: string
    // Consecutivo:
    fechaInicio?: string // YYYY-MM-DD
    fechaFin?: string // YYYY-MM-DD
    // O salteado:
    fechasMultiples?: string[] // YYYY-MM-DD[]
    notas?: string
}

/**
 * Crea un intervalo de fechas en `tareas_fechas` para una tarea.
 * Devuelve el `tarea_fecha_id` al que después se asignan recursos.
 */
export async function addIntervalo(tracker: Tracker, input: AddIntervaloInput): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()

    const { data, error } = await admin
        .from('tareas_fechas')
        .insert({
            tenant_id: tenantId,
            tarea_id: input.tareaId,
            fecha_inicio: input.fechaInicio || null,
            fecha_fin: input.fechaFin || null,
            fechas_multiples: input.fechasMultiples || null,
            notas: input.notas || null,
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`addIntervalo: ${error?.message}`)

    tracker.tareas_fechas.push(data.id)
    return data.id
}

export interface AssignResourceInput {
    tareaId: string
    tareaFechaId: string
    tipo: 'PERSONAL' | 'MAQUINARIA'
    resourceId: string
}

/**
 * Asigna un recurso a un intervalo de tarea (`tareas_recursos`).
 * Devuelve el ID del assignment.
 */
export async function assignResource(tracker: Tracker, input: AssignResourceInput): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    const row: Record<string, unknown> = {
        tenant_id: tenantId,
        tarea_id: input.tareaId,
        tarea_fecha_id: input.tareaFechaId,
        tipo_recurso: input.tipo,
        created_by: userId,
        is_active: true,
    }
    if (input.tipo === 'PERSONAL') row.personal_id = input.resourceId
    else row.maquinaria_id = input.resourceId

    const { data, error } = await admin.from('tareas_recursos').insert(row).select('id').single()

    if (error || !data) throw new Error(`assignResource: ${error?.message}`)

    tracker.tareas_recursos.push(data.id)
    return data.id
}

// -----------------------------------------------------------------------------
// FACTORIES — REPORTES
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// FACTORY — TERCEROS PERSONAL
// -----------------------------------------------------------------------------

/**
 * Busca o crea un tercero de tipo PROVEEDOR activo en el tenant de test.
 * Retorna su id y razon_social.
 */
export async function ensureTerceroProveedor(tracker: Tracker): Promise<{ id: string; razonSocial: string }> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    // Buscar uno existente (cualquier tipo que sea PROVEEDOR o AMBOS)
    const { data: existing } = await admin
        .from('terceros')
        .select('id, razon_social')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('tipo', ['PROVEEDOR', 'AMBOS'])
        .limit(1)

    if (existing && existing.length > 0) {
        return { id: existing[0].id, razonSocial: existing[0].razon_social }
    }

    // Si no hay ninguno, crear uno mínimo
    const nombre = `${TEST_PREFIX}Proveedor_${Date.now().toString().slice(-6)}`
    const { data, error } = await admin
        .from('terceros')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            razon_social: nombre,
            tipo: 'PROVEEDOR',
            is_active: true,
        })
        .select('id, razon_social')
        .single()

    if (error || !data) throw new Error(`ensureTerceroProveedor: no se pudo crear tercero proveedor. ${error?.message ?? ''}`)
    return { id: data.id, razonSocial: data.razon_social }
}

/** @deprecated usa ensureTerceroProveedor */
export async function findProveedorTercero(): Promise<{ id: string; razonSocial: string }> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()

    const { data } = await admin
        .from('terceros')
        .select('id, razon_social')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('tipo', ['PROVEEDOR', 'AMBOS'])
        .limit(1)

    if (!data || data.length === 0) throw new Error('findProveedorTercero: no hay terceros proveedor activos en el tenant de test')
    return { id: data[0].id, razonSocial: data[0].razon_social }
}

export interface CreateTerceroPersonalInput {
    terceroId: string
    nombres: string
    apellidos?: string
    cargo?: string
    email?: string
}

export async function createTerceroPersonal(
    tracker: Tracker,
    input: CreateTerceroPersonalInput,
): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    const { data, error } = await admin
        .from('terceros_personal')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            tercero_id: input.terceroId,
            nombres: input.nombres,
            apellidos: input.apellidos ?? 'E2E',
            cargo: input.cargo ?? 'E2E_CARGO',
            email: input.email ?? `e2e_tp_${Date.now()}@reporta.test`,
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`createTerceroPersonal: ${error?.message}`)
    tracker.terceroPersonalIds.push(data.id)
    return data.id
}

// -----------------------------------------------------------------------------
// FACTORIES — REPORTES
// -----------------------------------------------------------------------------

export interface CreateReportePersonalInput {
    tareaId: string
    personalId?: string
    terceroPersonalId?: string
    tipoPersonal?: 'INTERNO' | 'EXTERNO'
    maquinariaId?: string
    fecha: string // YYYY-MM-DD
    totalHoras?: number
    trabajoRealizado?: string
    gastoTotal?: number
}

export async function createReportePersonal(
    tracker: Tracker,
    input: CreateReportePersonalInput,
): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    const tipoPersonal = input.tipoPersonal ?? (input.terceroPersonalId ? 'EXTERNO' : 'INTERNO')

    const { data, error } = await admin
        .from('reportes_personal')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            tarea_id: input.tareaId,
            personal_id: tipoPersonal === 'INTERNO' ? (input.personalId ?? null) : null,
            tercero_personal_id: tipoPersonal === 'EXTERNO' ? (input.terceroPersonalId ?? null) : null,
            tipo_personal: tipoPersonal,
            maquinaria_id: input.maquinariaId || null,
            fecha_reporte: input.fecha,
            total_horas: input.totalHoras ?? 8,
            trabajo_realizado: input.trabajoRealizado || `${TEST_PREFIX}Trabajo reportado`,
            gasto_total: input.gastoTotal ?? 0,
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`createReportePersonal: ${error?.message}`)
    tracker.reportes_personal.push(data.id)
    return data.id
}

export interface CreateReporteMaquinariaInput {
    tareaId: string
    maquinariaId: string
    operadorId: string
    fecha: string
    totalHoras?: number
    horasAlquiler?: number
    tipoUso?: 'OPERACION' | 'ALQUILER' | 'ESPERA'
    trabajoRealizado?: string
    tipoRecorrido?: 'NO_APLICA' | 'SOLO_IDA' | 'IDA_VUELTA'
    estadoVenta?: 'PENDIENTE' | 'VALORADO' | 'FACTURADO' | null
    estadoCompra?: 'PENDIENTE' | 'VALORADO' | 'FACTURADO' | null
}

export async function createReporteMaquinaria(
    tracker: Tracker,
    input: CreateReporteMaquinariaInput,
): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    const { data, error } = await admin
        .from('reportes_maquinaria')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            tarea_id: input.tareaId,
            maquinaria_id: input.maquinariaId,
            operador_id: input.operadorId,
            fecha_reporte: input.fecha,
            total_horas: input.totalHoras ?? 8,
            tipo_uso: input.tipoUso ?? 'OPERACION',
            horas_alquiler: input.horasAlquiler ?? null,
            trabajo_realizado: input.trabajoRealizado || `${TEST_PREFIX}Trabajo maquinaria`,
            tipo_recorrido: input.tipoRecorrido || 'NO_APLICA',
            estado_venta: input.estadoVenta ?? 'PENDIENTE',
            estado_compra: input.estadoCompra ?? null,
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`createReporteMaquinaria: ${error?.message}`)
    tracker.reportes_maquinaria.push(data.id)
    return data.id
}

// -----------------------------------------------------------------------------
// FACTORY — COTIZACIONES (setup DB directo, sin UI)
// -----------------------------------------------------------------------------

export interface CotizacionDetalleInput {
    descripcion: string
    cantidad: number
    precio_valor?: number
    orden: number
}

export interface CreateCotizacionInput {
    clienteId?: string
    estado?: string
    detalles?: CotizacionDetalleInput[]
}

/**
 * Crea una cotización directamente en DB con token/PIN para pruebas de aprobación.
 * Devuelve { id, token, pin, numero } para navegar a /aprobacion/{token}.
 */
export async function createCotizacion(
    tracker: Tracker,
    input: CreateCotizacionInput = {},
): Promise<{ id: string; token: string; pin: string; numero: string }> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestAdminId()

    let clienteId = input.clienteId
    if (!clienteId) {
        const { data: cliente } = await admin
            .from('terceros')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
        clienteId = cliente?.id ?? undefined
    }

    const token = `E2E_TOK_${Date.now()}`
    const pin = '1234'
    const today = new Date().toISOString().slice(0, 10)
    const year = new Date().getFullYear()
    const vencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const numero = `E2E-${Date.now()}-${year}`

    const { data, error } = await admin
        .from('cotizaciones')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            cliente_id: clienteId ?? null,
            estado: input.estado ?? 'ENVIADA',
            numero,
            token_aprobacion: token,
            pin_aprobacion: pin,
            fecha_emision: today,
            fecha_vencimiento: vencimiento,
            is_active: true,
        })
        .select('id, numero')
        .single()

    if (error || !data) throw new Error(`createCotizacion: ${error?.message}`)
    tracker.cotizaciones.push(data.id)

    if (input.detalles?.length) {
        const rows = input.detalles.map((d) => ({
            tenant_id: tenantId,
            cotizacion_id: data.id,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            precio_valor: d.precio_valor ?? 1000,
            orden: d.orden,
            estado_aprobacion: 'PENDIENTE',
        }))
        const { error: detErr } = await admin.from('cotizaciones_detalle').insert(rows)
        if (detErr) throw new Error(`createCotizacion detalles: ${detErr.message}`)
    }

    return { id: data.id, token, pin, numero: data.numero ?? '' }
}

export interface CreateReporteCombustibleInput {
    tareaId: string
    maquinariaId: string
    fecha: string
    galones: number
    tipoCombustible?: 'DIESEL' | 'GASOLINA_90' | 'GASOLINA_95' | 'GLP'
    horometroActual?: number
    precioUnitario?: number
}

export async function createReporteCombustible(
    tracker: Tracker,
    input: CreateReporteCombustibleInput,
): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()

    const precio = input.precioUnitario ?? 15
    const { data, error } = await admin
        .from('reportes_combustible')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            tarea_id: input.tareaId,
            maquinaria_id: input.maquinariaId,
            fecha_reporte: input.fecha,
            galones: input.galones,
            tipo_combustible: input.tipoCombustible || 'DIESEL',
            horometro_actual: input.horometroActual ?? 1000,
            precio_unitario: precio,
            monto_total: precio * input.galones,
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`createReporteCombustible: ${error?.message}`)
    tracker.reportes_combustible.push(data.id)
    return data.id
}

// -----------------------------------------------------------------------------
// FACTORY — INSPECCIONES
// -----------------------------------------------------------------------------

export interface CreateInspeccionInput {
    tareaId: string
    maquinariaId?: string
    fecha?: string // YYYY-MM-DD, defaults to today
    estado?: string // defaults to 'COMPLETADA'
}

/**
 * Crea una inspección mínima ligada a una tarea. Necesaria para que el tab
 * "Paso 3. Reportes" del TareaDetailDialog esté habilitado.
 */
export async function createInspeccion(tracker: Tracker, input: CreateInspeccionInput): Promise<string> {
    const admin = getAdminClient()
    const tenantId = getTestTenantId()
    const userId = await getTestUserId()
    const fecha = input.fecha ?? new Date().toISOString().slice(0, 10)

    const { data, error } = await admin
        .from('inspecciones')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            tarea_id: input.tareaId,
            maquinaria_id: input.maquinariaId ?? null,
            fecha_inspeccion: fecha,
            estado: input.estado ?? 'COMPLETADA',
            is_active: true,
        })
        .select('id')
        .single()

    if (error || !data) throw new Error(`createInspeccion: ${error?.message}`)
    tracker.inspecciones.push(data.id)
    return data.id
}

// -----------------------------------------------------------------------------
// CLEANUP
// -----------------------------------------------------------------------------

/**
 * Borra todo lo que se creó en esta corrida, en orden inverso de dependencias.
 * Llamar en afterEach o afterAll.
 */
export async function cleanupTestData(tracker: Tracker): Promise<void> {
    const admin = getAdminClient()

    // Inspecciones — tienen FK a tareas
    if (tracker.inspecciones.length > 0) {
        await admin.from('inspecciones').delete().in('id', tracker.inspecciones)
    }
    // Reportes primero — tienen FK a tareas y pueden bloquear el delete.
    if (tracker.terceroPersonalIds.length > 0) {
        await admin.from('terceros_personal').delete().in('id', tracker.terceroPersonalIds)
    }
    if (tracker.reportes_combustible.length > 0) {
        await admin.from('reportes_combustible').delete().in('id', tracker.reportes_combustible)
    }
    if (tracker.reportes_maquinaria.length > 0) {
        await admin.from('reportes_maquinaria').delete().in('id', tracker.reportes_maquinaria)
    }
    if (tracker.reportes_personal.length > 0) {
        await admin.from('reportes_personal').delete().in('id', tracker.reportes_personal)
    }
    if (tracker.tareas_recursos.length > 0) {
        await admin.from('tareas_recursos').delete().in('id', tracker.tareas_recursos)
    }
    if (tracker.tareas_fechas.length > 0) {
        await admin.from('tareas_fechas').delete().in('id', tracker.tareas_fechas)
    }
    if (tracker.tareas.length > 0) {
        // tareas_fechas y tareas_recursos tienen ON DELETE CASCADE, pero
        // ya los borramos arriba por si el tracker quedó desincronizado.
        await admin.from('tareas').delete().in('id', tracker.tareas)
    }
    if (tracker.maquinariaIds.length > 0) {
        await admin.from('maquinarias').delete().in('id', tracker.maquinariaIds)
    }
    if (tracker.cotizaciones.length > 0) {
        await admin.from('cotizaciones_detalle').delete().in('cotizacion_id', tracker.cotizaciones)
        await admin.from('cotizaciones').delete().in('id', tracker.cotizaciones)
    }
    if (tracker.personalIds.length > 0) {
        // Borrar profile primero (tiene FK a auth.users)
        await admin.from('profiles').delete().in('id', tracker.personalIds)
        // Luego borrar el auth user (requiere service_role)
        for (const userId of tracker.personalIds) {
            await admin.auth.admin.deleteUser(userId)
        }
    }
}
