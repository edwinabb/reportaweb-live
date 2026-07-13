'use server'

import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/lib/utils/tenant-context'

export type NotificacionReceptor = {
    id: string
    tenant_id: string
    tipo_correo: string
    email: string
    nombre: string
    frecuencia: string
    dia_semana: number | null
    is_active: boolean
    created_at: string
}

export async function getNotificacionesReceptores(): Promise<NotificacionReceptor[]> {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return []

    const { data } = await adminClient
        .from('notificaciones_receptores')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('tipo_correo')
        .order('nombre')

    return (data ?? []) as NotificacionReceptor[]
}

export async function createNotificacionReceptor(input: {
    tipo_correo: string
    email: string
    nombre: string
    frecuencia: string
    dia_semana?: number | null
}): Promise<{ success: boolean; message?: string }> {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient.from('notificaciones_receptores').insert({
        tenant_id: tenantId,
        tipo_correo: input.tipo_correo,
        email: input.email.toLowerCase().trim(),
        nombre: input.nombre.trim().toUpperCase(),
        frecuencia: input.frecuencia,
        dia_semana: input.frecuencia === 'SEMANAL' ? (input.dia_semana ?? null) : null,
    })

    if (error) return { success: false, message: error.message }
    revalidatePath('/configuracion/notificaciones')
    return { success: true }
}

export async function deleteNotificacionReceptor(id: string): Promise<{ success: boolean; message?: string }> {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('notificaciones_receptores')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    revalidatePath('/configuracion/notificaciones')
    return { success: true }
}

export async function toggleNotificacionReceptor(id: string, is_active: boolean): Promise<{ success: boolean }> {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { success: false }

    const { error } = await adminClient
        .from('notificaciones_receptores')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false }
    revalidatePath('/configuracion/notificaciones')
    return { success: true }
}
