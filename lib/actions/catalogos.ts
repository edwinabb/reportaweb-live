"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getSupabaseContext } from '@/lib/action-context'

export async function getRubros(onlyActive = true) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('rubros')
        .select('id, nombre, tenant_id')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .order('nombre', { ascending: true })

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error) return []
    return data
}

export async function getPaises() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('paises')
        .select('id, nombre')
        .eq('is_active', true)
        .order('nombre', { ascending: true })

    if (error) return []
    return data
}

export async function getDepartamentos() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('departamentos')
        .select('nombre')
        .order('nombre', { ascending: true })

    if (error) return []
    return data.map((d: any) => d.nombre)
}

export async function getProvincias(departamento: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('ubigeo')
        .select('provincia')
        .eq('departamento', departamento)
        .order('provincia', { ascending: true })

    if (error) return []
    const unique = Array.from(new Set(data.map((item: any) => item.provincia)))
    return unique
}

export async function getDistritos(departamento: string, provincia: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('ubigeo')
        .select('codigo, distrito')
        .eq('departamento', departamento)
        .eq('provincia', provincia)
        .order('distrito', { ascending: true })

    if (error) return []
    return data
}

// --- MISSING CONTACT CATALOGS ---

export async function getContactosCargos(onlyActive = true) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('contactos_cargo')
        .select('id, nombre')
        .eq('tenant_id', tenantId)
        .order('nombre')

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) return []
    return data
}

export async function getContactosAreas(onlyActive = true) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('contactos_area')
        .select('id, nombre')
        .eq('tenant_id', tenantId)
        .order('nombre', { ascending: true })

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) return []
    return data
}

export async function createContactoCargo(nombre: string) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    const { data, error } = await adminClient
        .from('contactos_cargo')
        .insert({
            tenant_id: tenantId,
            nombre: nombre.toUpperCase(),
            created_by: user.id
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, item: data }
}

export async function createContactoArea(nombre: string) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    const { data, error } = await adminClient
        .from('contactos_area')
        .insert({
            tenant_id: tenantId,
            nombre: nombre.toUpperCase(),
            created_by: user.id
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, item: data }
}

export async function createCatalogo(table: string, nombre: string) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    const { data, error } = await adminClient
        .from(table)
        .insert({
            tenant_id: tenantId,
            nombre: nombre.toUpperCase(),
            created_by: user.id
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, item: data }
}

// --- PERSONAL CATALOGS ---

export async function getPersonalCargos() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data, error } = await adminClient
        .from('personal_cargos')
        .select('id, nombre')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('nombre', { ascending: true })

    if (error) return []
    return data
}

export async function createPersonalCargo(nombre: string) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    const { data, error } = await adminClient
        .from('personal_cargos')
        .insert({
            tenant_id: tenantId,
            nombre: nombre.toUpperCase(),
            created_by: user.id
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, item: data }
}

// --- SITIOS CATALOGS ---

export async function getSitiosTipos(onlyActive = true) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('sitios_tipo')
        .select('id, nombre')
        .eq('tenant_id', tenantId)
        .order('nombre', { ascending: true })

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) return []
    return data
}

export async function createSitioTipo(nombre: string) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    const { data, error } = await adminClient
        .from('sitios_tipo')
        .insert({
            tenant_id: tenantId,
            nombre: nombre.toUpperCase(),
            created_by: user.id
        })
        .select()
        .single()

    if (error) return { success: false, message: error.message }
    return { success: true, item: data }
}
// --- USER JOB TITLES ---

export async function getJobTitles() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data, error } = await adminClient
        .from('job_titles')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching job titles:', error)
        return []
    }
    return data
}

export async function deleteCatalogo(table: string, id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from(table)
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function restoreCatalogo(table: string, id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from(table)
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    return { success: true }
}

export async function getUbigeoPaginated(page = 1, perPage = 10, query = '') {
    const supabase = await createClient()

    // Create base query
    let dbQuery = supabase
        .from('ubigeo')
        .select('*', { count: 'exact' })

    if (query) {
        dbQuery = dbQuery.or(`departamento.ilike.%${query}%,provincia.ilike.%${query}%,distrito.ilike.%${query}%`)
    }

    const start = (page - 1) * perPage
    const end = start + perPage - 1

    const { data, error, count } = await dbQuery
        .order('departamento')
        .order('provincia')
        .order('distrito')
        .range(start, end)

    if (error) {
        console.error('Error fetching ubigeo:', error)
        return { data: [], totalPages: 0, totalCount: 0 }
    }

    const totalPages = count ? Math.ceil(count / perPage) : 0
    return { data, totalPages, totalCount: count || 0 }
}

