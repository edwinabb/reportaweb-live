'use server'

/**
 * Server actions para config_valorizacion_venta + config_valorizacion_compra.
 * 1:1 con tenant — solo read + upsert.
 */

import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'
import { z } from 'zod'

export type ConfigValorizacion = {
    tenant_id: string
    codigo_formato: string
    version_formato: string
    fecha_formato: string
    igv_default: number
    detraccion_default: number
    updated_at: string | null
    updated_by: string | null
}

export type ActionResult = {
    success?: boolean
    message?: string
    errors?: Record<string, string[] | undefined>
}

const schema = z.object({
    codigo_formato: z.string().min(1).max(20),
    version_formato: z.string().min(1).max(20),
    fecha_formato: z.string().min(1).max(20),
    igv_default: z.coerce.number().min(0).max(100),
    detraccion_default: z.coerce.number().min(0).max(100),
})

function parse(fd: FormData) {
    return schema.safeParse({
        codigo_formato: fd.get('codigo_formato'),
        version_formato: fd.get('version_formato'),
        fecha_formato: fd.get('fecha_formato'),
        igv_default: fd.get('igv_default'),
        detraccion_default: fd.get('detraccion_default'),
    })
}

export async function getConfigValorizacionVenta(): Promise<ConfigValorizacion | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('config_valorizacion_venta')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        console.error('[getConfigValorizacionVenta]', error)
        return null
    }
    return data as ConfigValorizacion | null
}

export async function getConfigValorizacionCompra(): Promise<ConfigValorizacion | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('config_valorizacion_compra')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        console.error('[getConfigValorizacionCompra]', error)
        return null
    }
    return data as ConfigValorizacion | null
}

async function upsertConfig(
    table: 'config_valorizacion_venta' | 'config_valorizacion_compra',
    _prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) {
        return { message: 'Sesión expirada. Iniciá sesión de nuevo.' }
    }

    const parsed = parse(formData)
    if (!parsed.success) {
        return {
            errors: parsed.error.flatten().fieldErrors,
            message: 'Datos inválidos en la configuración de valorización.',
        }
    }

    const { error } = await adminClient
        .from(table)
        .upsert(
            { tenant_id: tenantId, ...parsed.data, updated_at: new Date().toISOString(), updated_by: user.id },
            { onConflict: 'tenant_id' }
        )

    if (error) {
        console.error(`[upsertConfig ${table}]`, error)
        return { message: `Error al guardar: ${error.message}` }
    }

    safeRevalidatePath('/settings/valorizaciones')
    return {
        success: true,
        message: table === 'config_valorizacion_venta'
            ? 'Configuración de valorización de venta actualizada.'
            : 'Configuración de valorización de compra actualizada.',
    }
}

export async function updateConfigValorizacionVenta(prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
    return upsertConfig('config_valorizacion_venta', prev, fd)
}

export async function updateConfigValorizacionCompra(prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
    return upsertConfig('config_valorizacion_compra', prev, fd)
}
