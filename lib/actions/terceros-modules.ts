'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { TerceroContacto, TerceroPersonal, TerceroSitio, PersonalExterno } from '@/types/terceros'
import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'



// --- CONTACTOS ---

export async function getTerceroContactos(onlyActive = true, terceroId?: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('terceros_contactos')
        .select(`
            *,
            tercero:tercero_id(razon_social)
        `)
        .eq('tenant_id', tenantId)

    if (terceroId) {
        query = query.eq('tercero_id', terceroId)
    }

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query
        .order('nombre_completo', { ascending: true })

    if (error) return []
    return data
}

export async function createTerceroContacto(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const tercero_id = formData.get('tercero_id') as string
    const nombre_completo = formData.get('nombre_completo') as string
    const cargo = formData.get('cargo') as string
    const area = formData.get('area') as string
    // Doble escritura texto + FK durante la transición (DUDA-TER-005)
    const cargo_id = (formData.get('cargo_id') as string) || null
    const area_id = (formData.get('area_id') as string) || null
    const telefono = formData.get('telefono') as string
    const email = formData.get('email') as string

    if (!tercero_id || !nombre_completo) {
        return { message: 'Campos requeridos faltantes' }
    }

    const { data: newContacto, error } = await adminClient
        .from('terceros_contactos')
        .insert({
            tenant_id: tenantId,
            tercero_id,
            nombre_completo,
            cargo,
            area,
            cargo_id,
            area_id,
            telefono,
            email,
            created_by: user.id,
            updated_by: user.id
        })
        .select('id')
        .single()

    if (error) return { message: 'Error al crear contacto: ' + error.message }

    safeRevalidatePath('/terceros/contactos')
    return { message: 'Contacto creado', success: true, id: newContacto?.id }
}

export async function updateTerceroContacto(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const id = formData.get('id') as string
    const tercero_id = formData.get('tercero_id') as string
    const nombre_completo = formData.get('nombre_completo') as string
    const cargo = formData.get('cargo') as string
    const area = formData.get('area') as string
    // Doble escritura texto + FK durante la transición (DUDA-TER-005)
    const cargo_id = formData.get('cargo_id')
    const area_id = formData.get('area_id')
    const telefono = formData.get('telefono') as string
    const email = formData.get('email') as string

    if (!id || !tercero_id || !nombre_completo) {
        return { message: 'Campos requeridos faltantes' }
    }

    const updateData: Record<string, unknown> = {
        tercero_id,
        nombre_completo,
        cargo,
        area,
        telefono,
        email,
        updated_by: user.id,
        updated_at: new Date().toISOString()
    }
    // El dialog solo envía el FK cuando resuelve el texto contra el catálogo;
    // si no viene (texto legacy o catálogo aún cargando), se conserva el existente
    if (cargo_id !== null) updateData.cargo_id = (cargo_id as string) || null
    if (area_id !== null) updateData.area_id = (area_id as string) || null

    const { error } = await adminClient
        .from('terceros_contactos')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al actualizar contacto: ' + error.message }
    safeRevalidatePath('/terceros/contactos')
    return { message: 'Contacto actualizado', success: true }
}

export async function deleteTerceroContacto(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('terceros_contactos')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al eliminar' }
    safeRevalidatePath('/terceros/contactos')
    return { message: 'Eliminado correctamente', success: true }
}

export async function restoreTerceroContacto(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('terceros_contactos')
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al restaurar' }
    safeRevalidatePath('/terceros/contactos')
    return { message: 'Restaurado correctamente', success: true }
}

// --- PERSONAL (externo = profiles vinculados a un tercero, decisión DUDA-TER-006) ---

/**
 * Personal de terceros = Users del sistema vinculados a una empresa tercera
 * (profiles.tercero_id IS NOT NULL o personal_externo = true).
 * La tabla terceros_personal queda deprecada (migración de datos en curso aparte).
 */
export async function getPersonalExterno(onlyActive = true, terceroId?: string): Promise<PersonalExterno[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('profiles')
        .select(`
            id, first_name, last_name, email, phone, doc_number, is_active,
            tercero_id, personal_externo,
            profile_details (
                doc_type,
                job_title:job_title_id(name)
            ),
            tercero:tercero_id(razon_social)
        `)
        .eq('tenant_id', tenantId)

    if (terceroId) {
        query = query.eq('tercero_id', terceroId)
    } else {
        query = query.or('tercero_id.not.is.null,personal_externo.eq.true')
    }

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query
        .order('first_name', { ascending: true })

    if (error) {
        console.error('Error fetching personal externo:', error)
        return []
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((p) => {
        const details = Array.isArray(p.profile_details) ? p.profile_details[0] : p.profile_details
        return {
            id: p.id,
            nombres: p.first_name ?? '',
            apellidos: p.last_name ?? '',
            email: p.email ?? null,
            telefono: p.phone ?? null,
            tipo_doc: details?.doc_type ?? null,
            numero_doc: p.doc_number ?? null,
            cargo: details?.job_title?.name ?? null,
            empresa: p.tercero?.razon_social ?? null,
            is_active: p.is_active ?? true,
        }
    })
}

// --- PERSONAL (tabla propia — DEPRECADA, se mantiene por compatibilidad) ---

export async function getTerceroPersonal(onlyActive = true) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('terceros_personal')
        .select(`
            id, tercero_id, tenant_id,
            nombres, apellidos, pais_nacionalidad, tipo_doc, numero_doc,
            cargo, email, telefono, firma_url, foto_url, pin, is_active,
            tercero:tercero_id(razon_social)
        `)
        .eq('tenant_id', tenantId)

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query
        .order('nombres', { ascending: true })

    if (error) return []
    return (data ?? []).map((p: any) => ({
        id:                p.id,
        tenant_id:         p.tenant_id,
        tercero_id:        p.tercero_id,
        nombres:           p.nombres ?? '',
        apellidos:         p.apellidos ?? '',
        email:             p.email ?? null,
        telefono:          p.telefono ?? null,
        numero_doc:        p.numero_doc ?? null,
        tipo_doc:          p.tipo_doc ?? null,
        cargo:             p.cargo ?? null,
        pais_nacionalidad: p.pais_nacionalidad ?? null,
        firma_url:         p.firma_url ?? null,
        foto_url:          p.foto_url ?? null,
        pin:               p.pin ?? null,
        is_active:         p.is_active ?? true,
        tercero:           p.tercero,
    })) as TerceroPersonal[]
}

export async function createTerceroPersonal(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const tercero_id = formData.get('tercero_id') as string
    const nombres = formData.get('nombres') as string
    const apellidos = formData.get('apellidos') as string
    const pais_nacionalidad = formData.get('pais_nacionalidad') as string
    const tipo_doc = formData.get('tipo_doc') as string
    const numero_doc = formData.get('numero_doc') as string
    const cargo = formData.get('cargo') as string
    const email = formData.get('email') as string
    const telefono = formData.get('telefono') as string
    const firma_url = formData.get('firma_url') as string
    const foto_url = formData.get('foto_url') as string
    const pin = formData.get('pin') as string

    if (!tercero_id || !nombres || !apellidos) {
        return { message: 'Campos requeridos faltantes' }
    }

    const { error } = await adminClient
        .from('terceros_personal')
        .insert({
            tenant_id: tenantId,
            tercero_id,
            nombres,
            apellidos,
            pais_nacionalidad,
            tipo_doc,
            numero_doc,
            cargo,
            email,
            telefono,
            firma_url,
            foto_url,
            pin: pin || null,
            created_by: user.id,
            updated_by: user.id
        })

    if (error) return { message: 'Error al crear personal: ' + error.message }

    safeRevalidatePath('/terceros/personal')
    return { message: 'Personal creado', success: true }
}

export async function updateTerceroPersonal(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const id = formData.get('id') as string
    const tercero_id = formData.get('tercero_id') as string
    const nombres = formData.get('nombres') as string
    const apellidos = formData.get('apellidos') as string
    const pais_nacionalidad = formData.get('pais_nacionalidad') as string
    const tipo_doc = formData.get('tipo_doc') as string
    const numero_doc = formData.get('numero_doc') as string
    const cargo = formData.get('cargo') as string
    const email = formData.get('email') as string
    const telefono = formData.get('telefono') as string
    const firma_url = formData.get('firma_url') as string
    const foto_url = formData.get('foto_url') as string
    const pin = formData.get('pin') as string

    if (!id || !tercero_id || !nombres) {
        return { message: 'Campos requeridos faltantes' }
    }

    const { error } = await adminClient
        .from('terceros_personal')
        .update({
            tercero_id,
            nombres,
            apellidos,
            pais_nacionalidad,
            tipo_doc,
            numero_doc,
            cargo,
            email,
            telefono,
            firma_url,
            foto_url,
            pin: pin || null,
            updated_by: user.id,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al actualizar personal: ' + error.message }
    safeRevalidatePath('/terceros/personal')
    return { message: 'Personal actualizado', success: true }
}

export async function deleteTerceroPersonal(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('terceros_personal')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al eliminar' }
    safeRevalidatePath('/terceros/personal')
    return { message: 'Eliminado correctamente', success: true }
}

export async function restoreTerceroPersonal(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('terceros_personal')
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al restaurar' }
    safeRevalidatePath('/terceros/personal')
    return { message: 'Restaurado correctamente', success: true }
}

// --- SITIOS ---

export async function getTerceroSitios(onlyActive = true, terceroId?: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    // If filtering by terceroId, we need to find filtered sitio IDs first
    let filteredSitioIds: string[] | null = null
    if (terceroId) {
        const { data: rels } = await adminClient
            .from('terceros_sitios_rel')
            .select('sitio_id')
            .eq('tercero_id', terceroId)
            .eq('tenant_id', tenantId)

        if (rels) {
            filteredSitioIds = rels.map(r => r.sitio_id)
        } else {
            return [] // No relations found, return empty
        }
    }

    // First get sitios with tipo name
    let query = adminClient
        .from('terceros_sitios')
        .select(`
            *,
            sitio_tipo:tipo(nombre)
        `)
        .eq('tenant_id', tenantId)

    if (filteredSitioIds !== null) {
        if (filteredSitioIds.length === 0) return []
        query = query.in('id', filteredSitioIds)
    }

    if (onlyActive) {
        query = query.eq('is_active', true)
    }

    const { data: sitios, error: sitiosError } = await query
        .order('nombre', { ascending: true })

    if (sitiosError || !sitios) return []

    // Batch query all terceros relationships in one round trip (avoids N+1)
    const sitioIds = sitios.map(s => s.id)
    const { data: allRels } = sitioIds.length > 0
        ? await adminClient
            .from('terceros_sitios_rel')
            .select(`sitio_id, tercero:tercero_id(id, razon_social)`)
            .in('sitio_id', sitioIds)
            .eq('tenant_id', tenantId)
        : { data: [] }

    const relsBySitio = new Map<string, { id: string; razon_social: string }[]>()
    for (const rel of allRels ?? []) {
        const t = (rel as any).tercero
        if (!t) continue
        if (!relsBySitio.has(rel.sitio_id)) relsBySitio.set(rel.sitio_id, [])
        relsBySitio.get(rel.sitio_id)!.push(t)
    }

    const sitiosWithTerceros = sitios.map((sitio) => ({
        ...sitio,
        terceros: relsBySitio.get(sitio.id) ?? [],
        tipo_id: sitio.tipo,
        tipo: (sitio as any).sitio_tipo?.nombre || sitio.tipo,
    }))

    return sitiosWithTerceros
}

export async function createTerceroSitio(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const tercero_ids = formData.get('tercero_ids') as string // Comma-separated IDs
    const nombre = formData.get('nombre') as string
    const codigo = formData.get('codigo') as string
    const direccion = formData.get('direccion') as string
    const ciudad = formData.get('ciudad') as string
    const tipo = formData.get('tipo') as string
    const latitud = formData.get('latitud')
    const longitud = formData.get('longitud')

    if (!nombre) {
        return { message: 'Nombre es requerido' }
    }

    // Create sitio
    const { data: sitio, error: sitioError } = await adminClient
        .from('terceros_sitios')
        .insert({
            tenant_id: tenantId,
            nombre,
            codigo: codigo || null,
            direccion,
            ciudad,
            tipo: tipo || null, // uuid FK a sitios_tipo — '' rompe el cast
            latitud: latitud ? Number(latitud) : null,
            longitud: longitud ? Number(longitud) : null,
            created_by: user.id,
            updated_by: user.id
        })
        .select()
        .single()

    if (sitioError || !sitio) return { message: 'Error al crear sitio: ' + sitioError?.message }

    // Create terceros relationships
    if (tercero_ids) {
        const ids = tercero_ids.split(',').filter(Boolean)
        if (ids.length > 0) {
            const relations = ids.map(tercero_id => ({
                tenant_id: tenantId,
                sitio_id: sitio.id,
                tercero_id,
                created_by: user.id
            }))

            const { error: relError } = await adminClient
                .from('terceros_sitios_rel')
                .insert(relations)

            if (relError) return { message: `Error al vincular cliente al sitio: ${relError.message}` }
        }
    }

    safeRevalidatePath('/terceros/sitios')
    return { message: 'Sitio creado', success: true, nombre: sitio.nombre }
}

export async function updateTerceroSitio(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const id = formData.get('id') as string
    const tercero_ids = formData.get('tercero_ids') as string // Comma-separated IDs
    const nombre = formData.get('nombre') as string
    const codigo = formData.get('codigo') as string
    const direccion = formData.get('direccion') as string
    const ciudad = formData.get('ciudad') as string
    const tipo = formData.get('tipo') as string
    const latitud = formData.get('latitud')
    const longitud = formData.get('longitud')

    if (!id || !nombre) {
        return { message: 'Campos requeridos faltantes' }
    }

    const updateData: Record<string, unknown> = {
        nombre,
        codigo: codigo || null,
        direccion,
        ciudad,
        tipo: tipo || null, // uuid FK a sitios_tipo — '' rompe el cast
        updated_by: user.id,
        updated_at: new Date().toISOString()
    }
    // El dialog solo envía coordenadas cuando el usuario las fijó en el mapa;
    // si faltan, se conservan las almacenadas (sitios migrados pueden tener una sola)
    if (latitud !== null) updateData.latitud = latitud ? Number(latitud) : null
    if (longitud !== null) updateData.longitud = longitud ? Number(longitud) : null

    // Update sitio
    const { error } = await adminClient
        .from('terceros_sitios')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al actualizar sitio: ' + error.message }

    // Update terceros relationships
    // Delete existing relationships
    const { error: delError } = await adminClient
        .from('terceros_sitios_rel')
        .delete()
        .eq('sitio_id', id)
        .eq('tenant_id', tenantId)

    if (delError) return { message: `Error al actualizar terceros del sitio: ${delError.message}` }

    // Create new relationships
    if (tercero_ids) {
        const ids = tercero_ids.split(',').filter(Boolean)
        if (ids.length > 0) {
            const relations = ids.map(tercero_id => ({
                tenant_id: tenantId,
                sitio_id: id,
                tercero_id,
                created_by: user.id
            }))

            const { error: relError } = await adminClient
                .from('terceros_sitios_rel')
                .insert(relations)

            if (relError) return { message: `Error al vincular terceros al sitio: ${relError.message}` }
        }
    }

    safeRevalidatePath('/terceros/sitios')
    return { message: 'Sitio actualizado', success: true }
}

export async function deleteTerceroSitio(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('terceros_sitios')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al eliminar' }
    safeRevalidatePath('/terceros/sitios')
    return { message: 'Eliminado correctamente', success: true }
}

export async function restoreTerceroSitio(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('terceros_sitios')
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al restaurar' }
    safeRevalidatePath('/terceros/sitios')
    return { message: 'Restaurado correctamente', success: true }
}
