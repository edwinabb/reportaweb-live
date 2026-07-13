'use server'

import { getSupabaseContext } from '@/lib/action-context'
import { Plantilla } from '@/types/formatos'


export async function getPlantillas(onlyActive = true) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('plantillas')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nombre', { ascending: true })

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching plantillas:', error)
        return []
    }

    return data as Plantilla[]
}

export async function getPlantillaById(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('plantillas')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single()

    if (error) return null

    return data as Plantilla
}

export async function createPlantilla(data: Partial<Plantilla>) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { data: newPlantilla, error } = await adminClient
        .from('plantillas')
        .insert({
            tenant_id: tenantId,
            nombre: data.nombre,
            descripcion: data.descripcion,
            estructura: data.estructura || [],
            is_active: true
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Plantilla creada', id: newPlantilla.id }
}

export async function updatePlantilla(id: string, data: Partial<Plantilla>) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('plantillas')
        .update({
            nombre: data.nombre,
            descripcion: data.descripcion,
            estructura: data.estructura,
            is_active: data.is_active
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Plantilla actualizada' }
}

export async function deletePlantilla(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    // Soft delete usually, but table has is_active?
    // Let's toggle is_active to false for now, or real delete if no usage? 
    // Safest is soft delete via is_active = false.

    const { error } = await adminClient
        .from('plantillas')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Plantilla desactivada' }
}
