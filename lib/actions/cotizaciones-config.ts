'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseContext } from '@/lib/action-context'



// ==========================================
// GENERIC CONFIG ACTIONS
// ==========================================

export async function getConfigData(table: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data, error } = await adminClient
        .from(table)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) {
        // Suppress "relation does not exist" error (42P01) or any other error for this optional table
        if (error.code === '42P01' || table === 'cotizaciones_configuracion_doc') {
            // console.warn(`Table ${table} missing or fetch error.`, error) // Optional: uncomment for debug
            return []
        }
        console.error(`Error fetching ${table}:`, error)
        return []
    }
    return data
}

export async function createConfigItem(table: string, nombre: string, extraFields: any = {}) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from(table)
        .insert({
            tenant_id: tenantId,
            nombre,
            created_by: user.id,
            ...extraFields
        })

    if (error) {
        console.error(`Error creating in ${table}:`, error)
        return { success: false, message: error.message }
    }

    revalidatePath('/settings/cotizaciones')
    return { success: true, message: 'Creado correctamente' }
}

export async function deleteConfigItem(table: string, id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from(table)
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    revalidatePath('/settings/cotizaciones')
    return { success: true }
}

export async function restoreConfigItem(table: string, id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from(table)
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    revalidatePath('/settings/cotizaciones')
    return { success: true }
}

export async function updateConfigItem(table: string, id: string, nombre: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from(table)
        .update({ nombre })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    revalidatePath('/settings/cotizaciones')
    return { success: true }
}

export async function updateActividadMatriz(id: string, nombre: string, descripcion: string, responsable_default: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('actividades_matriz')
        .update({
            nombre,
            descripcion,
            responsable_default
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    revalidatePath('/settings/cotizaciones')
    return { success: true }
}

// Specific for Actividades Matriz (with description)
export async function createActividadMatriz(nombre: string, descripcion: string, responsable_default: string) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    // Get max orden
    const { data: max } = await adminClient
        .from('actividades_matriz')
        .select('orden')
        .eq('tenant_id', tenantId)
        .order('orden', { ascending: false })
        .limit(1)
        .single()
    const orden = (max?.orden || 0) + 1

    const { error } = await adminClient.from('actividades_matriz').insert({
        tenant_id: tenantId,
        nombre,
        descripcion,
        responsable_default,
        orden,
        created_by: user.id
    })

    if (error) return { success: false, message: error.message }
    revalidatePath('/settings/cotizaciones')
    return { success: true }
}

// Specific for Document Configuration
export async function createConfigDoc(nombre: string, contenido: string) {
    return createConfigItem('cotizaciones_configuracion_doc', nombre, { contenido })
}

export async function updateConfigDoc(id: string, contenido: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('cotizaciones_configuracion_doc')
        .update({ contenido })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    revalidatePath('/settings/cotizaciones')
    return { success: true }
}


export async function getGlobalPDFConfig() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data } = await adminClient
        .from('cotizaciones_configuracion')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

    return data
}

export async function saveGlobalPDFConfig(config: any) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    // Check if config exists
    const { data: existing } = await adminClient
        .from('cotizaciones_configuracion')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()

    // OJO: el payload DEBE incluir solo columnas que existen en
    // `cotizaciones_configuracion`. Columnas actuales (ver types/supabase.ts):
    //   banco, bubble_id, despedida, firma_autorizado_url, firma_gerente_url,
    //   forma_pago1, forma_pago2, imagen_banco, imagen_firma, introduccion,
    //   is_active, mostrar_firma, pie_pagina, saludo, terminos_condiciones.
    // NO hay `texto_aceptacion`. Si en UI hay campo para ese texto, hoy se
    // guarda como parte de `terminos_condiciones` o por cotización en
    // `cotizaciones.pdf_config` (JSONB). Si se quiere columna dedicada se
    // necesita migración nueva.
    const payload = {
        forma_pago1: config.forma_pago1,
        forma_pago2: config.forma_pago2,
        despedida: config.despedida,
        mostrar_firma: config.mostrar_firma,
        introduccion: config.introduccion || config.texto_introduccion,
        terminos_condiciones: config.terminos_condiciones || config.texto_notas_precios,
        // "Texto de Aceptación" del form UI → columna `pie_pagina` (así lo lee
        // el form también — línea 76 del cotizacion-global-config-form). No
        // existe columna `texto_aceptacion`; tratar de guardarla producía
        // PGRST "column not found" y bloqueaba el submit.
        pie_pagina: config.texto_aceptacion ?? config.pie_pagina,
        imagen_banco: config.imagen_banco || config.imagen_banco_url,
        firma_autorizado_url: config.firma_autorizado_url || config.firma_autorizada_usuario_id,
        imagen_firma: config.imagen_firma || config.firma_imagen_url,
        updated_at: new Date().toISOString(),
    }

    // Clean undefined
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key])


    if (existing) {
        // Update
        const { error } = await adminClient
            .from('cotizaciones_configuracion')
            .update(payload)
            .eq('id', existing.id)

        if (error) return { success: false, message: error.message }
    } else {
        // Create
        const { error } = await adminClient
            .from('cotizaciones_configuracion')
            .insert({
                tenant_id: tenantId,
                ...payload
            })

        if (error) return { success: false, message: error.message }
    }

    revalidatePath('/settings/cotizaciones')
    return { success: true, message: 'Configuración guardada' }
}

export async function getTenantInfo() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data } = await adminClient
        .from('tenants')
        .select('logo_url, nombre_comercial, razon_social')
        .eq('id', tenantId)
        .single()

    return data
}
