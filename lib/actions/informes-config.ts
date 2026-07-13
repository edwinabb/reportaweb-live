'use server'

/**
 * Server actions para config_informe_maquinaria + config_informe_personal.
 *
 * Las configs son 1:1 con tenant (PK = tenant_id). Se crean con defaults
 * en la migración de seed, y este módulo solo permite LEER y ACTUALIZAR
 * (no create/delete — la fila siempre existe).
 */

import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'
import { z } from 'zod'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type ConfigInformeMaquinaria = {
    tenant_id: string
    cantidad_turnos: number
    cantidad_riggers: number
    incluye_firma_cliente: boolean
    incluye_foto_trabajo: boolean
    incluye_foto_reporte_escrito: boolean
    incluye_tipo_recorrido: boolean
    incluye_salida_autorizada: boolean
    incluye_tonelaje_placa: boolean
    codigo_formato: string
    version_formato: string
    fecha_formato: string
    updated_at: string | null
    updated_by: string | null
}

export type ConfigInformePersonal = {
    tenant_id: string
    cantidad_turnos: number
    incluye_horas_extras: boolean
    incluye_horas_extras_extraord: boolean
    incluye_horas_dominicales: boolean
    incluye_gastos: boolean
    incluye_firma_cliente_horas: boolean
    incluye_firma_trabajador: boolean
    incluye_foto_trabajo: boolean
    codigo_formato: string
    version_formato: string
    fecha_formato: string
    updated_at: string | null
    updated_by: string | null
}

export type ConfigChecklist = {
    tenant_id: string
    mostrar_empresa: boolean
    mostrar_cliente: boolean
    mostrar_tarea: boolean
    mostrar_medidores: boolean
    mostrar_observaciones: boolean
    texto_declaracion: string | null
    label_footer: string
    planes_accion_notificar_a: string[]
}

export type ActionResult = {
    success?: boolean
    message?: string
    errors?: Record<string, string[] | undefined>
}

// ────────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────────

const checklistSchema = z.object({
    mostrar_empresa: z.coerce.boolean(),
    mostrar_cliente: z.coerce.boolean(),
    mostrar_tarea: z.coerce.boolean(),
    mostrar_medidores: z.coerce.boolean(),
    mostrar_observaciones: z.coerce.boolean(),
    texto_declaracion: z.string().optional(),
    label_footer: z.string().min(1).max(50),
    planes_accion_notificar_a: z.string().optional(), // JSON array de UUIDs serializado
})

const maquinariaSchema = z.object({
    cantidad_turnos: z.coerce.number().int().min(1).max(3),
    cantidad_riggers: z.coerce.number().int().min(0).max(2),
    incluye_firma_cliente: z.coerce.boolean(),
    incluye_foto_trabajo: z.coerce.boolean(),
    incluye_foto_reporte_escrito: z.coerce.boolean(),
    incluye_tipo_recorrido: z.coerce.boolean(),
    incluye_salida_autorizada: z.coerce.boolean(),
    incluye_tonelaje_placa: z.coerce.boolean(),
    codigo_formato: z.string().min(1).max(20),
    version_formato: z.string().min(1).max(20),
    fecha_formato: z.string().min(1).max(20),
})

const personalSchema = z.object({
    cantidad_turnos: z.coerce.number().int().min(1).max(3),
    incluye_horas_extras: z.coerce.boolean(),
    incluye_horas_extras_extraord: z.coerce.boolean(),
    incluye_horas_dominicales: z.coerce.boolean(),
    incluye_gastos: z.coerce.boolean(),
    incluye_firma_cliente_horas: z.coerce.boolean(),
    incluye_firma_trabajador: z.coerce.boolean(),
    incluye_foto_trabajo: z.coerce.boolean(),
    codigo_formato: z.string().min(1).max(20),
    version_formato: z.string().min(1).max(20),
    fecha_formato: z.string().min(1).max(20),
})

// FormData checkboxes: vienen como "on" si están marcados o faltan del body si no.
function fdBool(fd: FormData, key: string): boolean {
    return fd.get(key) === 'on' || fd.get(key) === 'true'
}

function parseChecklist(fd: FormData) {
    return checklistSchema.safeParse({
        mostrar_empresa: fdBool(fd, 'mostrar_empresa'),
        mostrar_cliente: fdBool(fd, 'mostrar_cliente'),
        mostrar_tarea: fdBool(fd, 'mostrar_tarea'),
        mostrar_medidores: fdBool(fd, 'mostrar_medidores'),
        mostrar_observaciones: fdBool(fd, 'mostrar_observaciones'),
        texto_declaracion: fd.get('texto_declaracion'),
        label_footer: fd.get('label_footer'),
        planes_accion_notificar_a: fd.get('planes_accion_notificar_a'),
    })
}

function parseMaquinaria(fd: FormData) {
    return maquinariaSchema.safeParse({
        cantidad_turnos: fd.get('cantidad_turnos'),
        cantidad_riggers: fd.get('cantidad_riggers'),
        incluye_firma_cliente: fdBool(fd, 'incluye_firma_cliente'),
        incluye_foto_trabajo: fdBool(fd, 'incluye_foto_trabajo'),
        incluye_foto_reporte_escrito: fdBool(fd, 'incluye_foto_reporte_escrito'),
        incluye_tipo_recorrido: fdBool(fd, 'incluye_tipo_recorrido'),
        incluye_salida_autorizada: fdBool(fd, 'incluye_salida_autorizada'),
        incluye_tonelaje_placa: fdBool(fd, 'incluye_tonelaje_placa'),
        codigo_formato: fd.get('codigo_formato'),
        version_formato: fd.get('version_formato'),
        fecha_formato: fd.get('fecha_formato'),
    })
}

function parsePersonal(fd: FormData) {
    return personalSchema.safeParse({
        cantidad_turnos: fd.get('cantidad_turnos'),
        incluye_horas_extras: fdBool(fd, 'incluye_horas_extras'),
        incluye_horas_extras_extraord: fdBool(fd, 'incluye_horas_extras_extraord'),
        incluye_horas_dominicales: fdBool(fd, 'incluye_horas_dominicales'),
        incluye_gastos: fdBool(fd, 'incluye_gastos'),
        incluye_firma_cliente_horas: fdBool(fd, 'incluye_firma_cliente_horas'),
        incluye_firma_trabajador: fdBool(fd, 'incluye_firma_trabajador'),
        incluye_foto_trabajo: fdBool(fd, 'incluye_foto_trabajo'),
        codigo_formato: fd.get('codigo_formato'),
        version_formato: fd.get('version_formato'),
        fecha_formato: fd.get('fecha_formato'),
    })
}

// ────────────────────────────────────────────────────────────────
// Getters
// ────────────────────────────────────────────────────────────────

export async function getConfigChecklist(): Promise<ConfigChecklist | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('config_checklist')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        console.error('[getConfigChecklist]', error)
        return null
    }
    return data as ConfigChecklist | null
}

export async function getConfigInformeMaquinaria(): Promise<ConfigInformeMaquinaria | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('config_informe_maquinaria')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        console.error('[getConfigInformeMaquinaria]', error)
        return null
    }
    return data as ConfigInformeMaquinaria | null
}

export async function getConfigInformePersonal(): Promise<ConfigInformePersonal | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('config_informe_personal')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        console.error('[getConfigInformePersonal]', error)
        return null
    }
    return data as ConfigInformePersonal | null
}

// ────────────────────────────────────────────────────────────────
// Updaters (useActionState compatible)
// ────────────────────────────────────────────────────────────────

export async function updateConfigInformeMaquinaria(
    _prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) {
        return { message: 'Sesión expirada. Iniciá sesión de nuevo.' }
    }

    const parsed = parseMaquinaria(formData)
    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: 'Datos inválidos en la configuración de maquinaria.',
        }
    }

    const { error } = await adminClient
        .from('config_informe_maquinaria')
        .upsert(
            { tenant_id: tenantId, ...parsed.data, updated_at: new Date().toISOString(), updated_by: user.id },
            { onConflict: 'tenant_id' }
        )

    if (error) {
        console.error('[updateConfigInformeMaquinaria]', error)
        return { message: `Error al guardar: ${error.message}` }
    }

    safeRevalidatePath('/settings/informes')
    return { success: true, message: 'Configuración de reporte de maquinaria actualizada.' }
}

export async function updateConfigInformePersonal(
    _prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) {
        return { message: 'Sesión expirada. Iniciá sesión de nuevo.' }
    }

    const parsed = parsePersonal(formData)
    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: 'Datos inválidos en la configuración de personal.',
        }
    }

    const { error } = await adminClient
        .from('config_informe_personal')
        .upsert(
            { tenant_id: tenantId, ...parsed.data, updated_at: new Date().toISOString(), updated_by: user.id },
            { onConflict: 'tenant_id' }
        )

    if (error) {
        console.error('[updateConfigInformePersonal]', error)
        return { message: `Error al guardar: ${error.message}` }
    }

    safeRevalidatePath('/settings/informes')
    return { success: true, message: 'Configuración de reporte de personal actualizada.' }
}

export async function updateConfigChecklist(
    _prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) {
        return { message: 'Sesión expirada. Iniciá sesión de nuevo.' }
    }

    const parsed = parseChecklist(formData)
    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: 'Datos inválidos en la configuración de checklist.',
        }
    }

    // planes_accion_notificar_a viene como JSON string "[]" desde el cliente
    let notificar: string[] = []
    try {
        const raw = parsed.data.planes_accion_notificar_a
        notificar = raw ? JSON.parse(raw) : []
    } catch { notificar = [] }

    const payload = {
        tenant_id: tenantId,
        mostrar_empresa: parsed.data.mostrar_empresa,
        mostrar_cliente: parsed.data.mostrar_cliente,
        mostrar_tarea: parsed.data.mostrar_tarea,
        mostrar_medidores: parsed.data.mostrar_medidores,
        mostrar_observaciones: parsed.data.mostrar_observaciones,
        texto_declaracion: parsed.data.texto_declaracion?.trim() || null,
        label_footer: parsed.data.label_footer,
        planes_accion_notificar_a: notificar,
    }

    const { error } = await adminClient
        .from('config_checklist')
        .upsert(payload, { onConflict: 'tenant_id' })

    if (error) {
        console.error('[updateConfigChecklist]', error)
        return { message: `Error al guardar: ${error.message}` }
    }

    safeRevalidatePath('/settings/informes')
    return { success: true, message: 'Configuración de checklist actualizada.' }
}
