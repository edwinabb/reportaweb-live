'use server'

import { createClient } from "@/utils/supabase/server"
import { OpcionRespuesta } from "@/types/formatos"
import { getSupabaseContext } from '@/lib/action-context'

export async function getFormasPago(tenantId: string | null = null) {
    let tid = tenantId
    if (!tid) {
        const ctx = await getSupabaseContext()
        tid = ctx.tenantId || null
    }
    if (!tid) return []

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('formas_pago')
        .select('*')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .order('nombre', { ascending: true })

    if (error) {
        console.error('Error fetching formas_pago:', JSON.stringify(error, null, 2))
        return []
    }
    return data
}

export async function getPlazosPago(tenantId: string | null = null) {
    let tid = tenantId
    if (!tid) {
        const ctx = await getSupabaseContext()
        tid = ctx.tenantId ?? null
    }
    if (!tid) return []

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('plazos_pago')
        .select('*')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .order('nombre', { ascending: true })

    if (error) {
        console.error('Error fetching plazos_pago:', JSON.stringify(error, null, 2))
        return []
    }
    return data
}

export async function getOpcionesRespuesta(tenantId: string | null, category?: string) {
    // Legacy support or for other options not yet migrated
    const supabase = await createClient()

    try {
        let query = supabase
            .from('options_sets')
            .select('*')
            .eq('is_active', true)

        if (tenantId) {
            query = query.eq('tenant_id', tenantId)
        } else {
            query = query.is('tenant_id', null)
        }

        if (category) {
            query = query.eq('name', category)
        }

        const { data, error } = await query.order('name', { ascending: true })

        if (error) {
            // Suppress error if table not found to avoid noise if we know it's missing
            if (error.code !== 'PGRST205') {
                console.error('Error fetching options sets:', JSON.stringify(error, null, 2))
            }
            return []
        }

        return data as OpcionRespuesta[]
    } catch (error) {
        console.error('Unexpected error in getOpcionesRespuesta:', error)
        return []
    }
}

export async function addOptionValue(category: string, value: string) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado', success: false }

    const cleanValue = value.trim().toUpperCase()
    const cleanCategory = category.trim().toUpperCase()

    try {
        if (cleanCategory === 'FORMAS_PAGO') {
            const { error: insertError } = await adminClient
                .from('formas_pago')
                .insert({
                    tenant_id: tenantId,
                    nombre: cleanValue,
                    is_active: true,
                    created_by: user.id,
                    updated_by: user.id
                })

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation
                    return { message: 'La forma de pago ya existe', success: false }
                }
                return { message: 'Error al crear forma de pago: ' + insertError.message, success: false }
            }
            return { message: 'Forma de pago creada', success: true, value: cleanValue }

        } else if (cleanCategory === 'PLAZOS_PAGO') {
            const { error: insertError } = await adminClient
                .from('plazos_pago')
                .insert({
                    tenant_id: tenantId,
                    nombre: cleanValue,
                    dias: 0, // Default to 0 as we only have name
                    is_active: true,
                    created_by: user.id,
                    updated_by: user.id
                })

            if (insertError) {
                if (insertError.code === '23505') {
                    return { message: 'El plazo de pago ya existe', success: false }
                }
                return { message: 'Error al crear plazo de pago: ' + insertError.message, success: false }
            }
            return { message: 'Plazo de pago creado', success: true, value: cleanValue }

        } else {
            return { message: 'Categoría de opción no soportada: ' + category, success: false }
        }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { message: 'Error inesperado: ' + errMsg, success: false }
    }
}

