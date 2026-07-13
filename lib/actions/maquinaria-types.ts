'use server'

import { getSupabaseContext } from '@/lib/action-context'
import { MaquinariaTipoDoc } from '@/types/maquinaria'
import { revalidatePath } from 'next/cache'


export async function getMaquinariaTipos(onlyActive = true) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data, error } = await adminClient
        .from('maquinaria_tipos_docs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', onlyActive)
        .order('nombre')

    if (error) {
        console.error('Error fetching tipos docs:', error)
        return []
    }

    return data as MaquinariaTipoDoc[]
}

export async function getMaquinariaCategorias() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    // Fetch distinct categories from maquinaria_modelos
    // Note: Supabase/PostgREST doesn't support distinct on specific columns directly easily in JS client types 
    // without a function or using .select('tipo_equipo').range(0,1000) then filtering set.
    // However, we can use a raw rpc or just fetch all active models and distinct them in code (if list is small).
    // For now, let's fetch active models and distinct types.

    // Better approach: fetch all distinct tipo_equipo from models
    // Since we don't have many, this is fine.
    const { data } = await adminClient
        .from('maquinaria_modelos')
        .select('tipo_equipo')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

    if (!data) return []

    // Unique
    const categories = Array.from(new Set(data.map(d => d.tipo_equipo).filter(Boolean)))
    return categories.sort()
}

export async function getMaquinariaModelosList() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data } = await adminClient
        .from('maquinaria_modelos')
        .select('id, modelo, marca')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('marca', { ascending: true })
        .order('modelo', { ascending: true })

    return data || []
}

export async function createMaquinariaTipo(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const nombre = formData.get('nombre') as string
    const aplica_a = formData.get('aplica_a') as string
    const categoria = formData.get('categoria') as string

    // New Fields
    const categoria_equipo = formData.get('categoria_equipo') as string
    const modelo_id = formData.get('modelo_id') as string // UUID or empty
    const es_obligatorio = formData.get('es_obligatorio') === 'on'

    // Auto-determine expiration req based on category
    const requiere_vencimiento = categoria === 'seguro' || categoria === 'con_vencimiento'

    const dias_alerta = parseInt(formData.get('dias_alerta') as string) || 0

    if (!nombre) return { message: 'Nombre requerido' }

    // Validate logic
    let final_cat = null
    let final_mod = null

    if (aplica_a === 'categoria') {
        if (!categoria_equipo) return { message: 'Seleccione una categoría de equipo' }
        final_cat = categoria_equipo
    } else if (aplica_a === 'modelo') {
        if (!modelo_id) return { message: 'Seleccione un modelo' }
        final_mod = modelo_id
    }

    const { error } = await adminClient
        .from('maquinaria_tipos_docs')
        .insert({
            tenant_id: tenantId,
            nombre,
            aplica_a: (aplica_a === 'categoria' || aplica_a === 'modelo') ? 'maquinaria' : aplica_a, // Norm this? Or use 'todos'/'maquinaria' etc.
            // Wait, aplica_a in DB enum is 'todos', 'vehiculo', 'maquinaria'.
            // If user selects 'Category' or 'Model', it implies 'maquinaria' (or vehicle).
            // Let's force 'maquinaria' if specific, or keep logic.
            // If they chose 'Category', they pick a Cat. If 'Model', they pick a Model.
            // We should store 'aplica_a' as 'maquinaria' mostly, but we need to know the specifics.
            // Actually, let's keep 'aplica_a' as the broad scope, and specific fields filter further.
            // But if user selected 'Category' in the UI dropdown for "Aplica a", we need to map that.
            // UI Dropdown: "Todos", "Solo Vehículos", "Solo Maquinaria", "Por Categoría", "Por Modelo".
            // If "Por Categoría" -> Store applies_to='maquinaria' (or appropriate) AND set categoria_equipo.

            // Let's assume standard is 'maquinaria' if specific.
            // Or maybe 'todos' if it applies to generic stuff?
            // Safer: 'maquinaria' if cat/model is set. 
            categoria,
            requiere_vencimiento,
            dias_alerta,
            es_obligatorio,
            categoria_equipo: final_cat,
            modelo_id: final_mod,
            created_by: user.id,
            updated_by: user.id
        })

    if (error) return { message: 'Error: ' + error.message }

    revalidatePath('/maquinarias/types')
    return { message: 'Tipo creado correctamente', success: true }
}

export async function updateMaquinariaTipo(id: string, _prevState: unknown, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const nombre = formData.get('nombre') as string
    const aplica_a = formData.get('aplica_a') as string
    const categoria = formData.get('categoria') as string
    const categoria_equipo = formData.get('categoria_equipo') as string
    const modelo_id = formData.get('modelo_id') as string
    const es_obligatorio = formData.get('es_obligatorio') === 'on'
    const requiere_vencimiento = categoria === 'seguro' || categoria === 'con_vencimiento'
    const dias_alerta = parseInt(formData.get('dias_alerta') as string) || 0

    if (!nombre) return { message: 'Nombre requerido' }

    let final_cat: string | null = null
    let final_mod: string | null = null
    if (aplica_a === 'categoria') {
        if (!categoria_equipo) return { message: 'Seleccione una categoría de equipo' }
        final_cat = categoria_equipo
    } else if (aplica_a === 'modelo') {
        if (!modelo_id) return { message: 'Seleccione un modelo' }
        final_mod = modelo_id
    }

    const { error } = await adminClient
        .from('maquinaria_tipos_docs')
        .update({
            nombre,
            aplica_a,
            categoria,
            requiere_vencimiento,
            dias_alerta,
            es_obligatorio,
            categoria_equipo: final_cat,
            modelo_id: final_mod,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error: ' + error.message }

    revalidatePath('/maquinarias/types')
    return { message: 'Tipo actualizado correctamente', success: true }
}

export async function deleteMaquinariaTipo(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('maquinaria_tipos_docs')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al eliminar' }

    revalidatePath('/maquinarias/types')
    return { message: 'Eliminado correctamente', success: true }
}

export async function restoreMaquinariaTipo(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('maquinaria_tipos_docs')
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al restaurar' }

    revalidatePath('/maquinarias/types')
    return { message: 'Restaurado correctamente', success: true }
}
