'use server'

import { Maquinaria } from '@/types/maquinaria'
import { revalidatePath } from 'next/cache'

import { getTenantContext } from '@/lib/utils/tenant-context'

export async function getMaquinarias(query = '', onlyActive = true) {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return []

    let dbQuery = adminClient
        .from('maquinarias')
        .select(`
            *,
            proveedor:terceros!maquinarias_proveedor_id_fkey(razon_social),
            modelo_rel:maquinaria_modelos(modelo)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', onlyActive)
        .order('created_at', { ascending: false })

    if (query) {
        dbQuery = dbQuery.or(`nombre.ilike.%${query}%,marca.ilike.%${query}%,modelo.ilike.%${query}%,placa.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
        console.error('Error fetching maquinarias:', JSON.stringify(error, null, 2))
        return []
    }

    // Map to flat structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((m: any) => {
        const modeloName = m.modelo_rel?.modelo || m.modelo || '-';
        return {
            ...m,
            modelo: modeloName
        }
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createMaquinaria(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getTenantContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const nombre = formData.get('nombre') as string
    const codigo_interno = formData.get('codigo_interno') as string
    const categoria = formData.get('categoria') as string
    const marca = formData.get('marca') as string
    const modelo_id = formData.get('modelo_id') as string
    const modelo = formData.get('modelo') as string
    const placa = formData.get('placa') as string
    const capacidad = formData.get('capacidad') as string
    const propietario = formData.get('propietario') as string
    const proveedor_id = formData.get('proveedor_id') as string || null
    const anio_fabricacion = formData.get('anio_fabricacion') ? parseInt(formData.get('anio_fabricacion') as string) : null
    const foto = formData.get('foto') as File | null

    let foto_url = null
    if (foto && foto.size > 0) {
        const { cleanPathString } = await import('@/lib/utils')
        const cleanNombre = cleanPathString(nombre)
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const fileExt = foto.name.split('.').pop()

        // Path: /nombre-equipo/foto/nombre-equipo-foto-YYYYMMDD
        const fileName = `${cleanNombre}/foto/${cleanNombre}-foto-${dateStr}.${fileExt}`

        const { error: uploadError } = await adminClient
            .storage
            .from('maquinarias')
            .upload(fileName, foto, { upsert: true, contentType: foto.type })

        if (!uploadError) {
            const { data: { publicUrl } } = adminClient.storage.from('maquinarias').getPublicUrl(fileName)
            foto_url = publicUrl
        } else {
            console.error('Upload photo error', uploadError)
        }
    }

    const { error } = await adminClient
        .from('maquinarias')
        .insert({
            nombre,
            codigo_interno,
            categoria,
            marca,
            modelo_id: modelo_id || null,
            modelo,
            placa,
            capacidad,
            propietario,
            proveedor_id,
            anio_fabricacion,
            foto_url,
            tenant_id: tenantId,
            created_by: user.id
        })

    if (error) {
        return { message: 'Error: ' + error.message }
    }

    revalidatePath('/maquinarias')
    return { message: 'Maquinaria creada correctamente', success: true }
}

export async function getMaquinariaById(id: string) {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('maquinarias')
        .select(`
            *,
            proveedor:terceros(razon_social),
            modelo_ref:maquinaria_modelos(*)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

    if (error) return null
    return data as Maquinaria
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateMaquinaria(prevState: any, formData: FormData) {
    const { adminClient, tenantId, user } = await getTenantContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const id = formData.get('id') as string
    const nombre = formData.get('nombre') as string
    const codigo_interno = formData.get('codigo_interno') as string
    const categoria = formData.get('categoria') as string
    const marca = formData.get('marca') as string
    const modelo_id = formData.get('modelo_id') as string
    const modelo = formData.get('modelo') as string
    const placa = formData.get('placa') as string
    const capacidad = formData.get('capacidad') as string
    const propietario = formData.get('propietario') as string
    const proveedor_id = formData.get('proveedor_id') as string || null
    const anio_fabricacion = formData.get('anio_fabricacion') ? parseInt(formData.get('anio_fabricacion') as string) : null
    const foto = formData.get('foto') as File | null

    if (!id || !nombre) {
        return { message: 'Datos incompletos' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
        nombre,
        codigo_interno,
        categoria,
        marca,
        modelo_id: modelo_id || null,
        modelo,
        placa,
        capacidad,
        propietario,
        proveedor_id,
        anio_fabricacion,
        updated_by: user.id,
        updated_at: new Date().toISOString()
    }

    if (foto && foto.size > 0) {
        const { cleanPathString } = await import('@/lib/utils')
        const cleanNombre = cleanPathString(nombre)
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const fileExt = foto.name.split('.').pop()

        // Path: /nombre-equipo/foto/nombre-equipo-foto-YYYYMMDD
        const fileName = `${cleanNombre}/foto/${cleanNombre}-foto-${dateStr}.${fileExt}`

        const { error: uploadError } = await adminClient
            .storage
            .from('maquinarias')
            .upload(fileName, foto, { upsert: true, contentType: foto.type })

        if (!uploadError) {
            const { data: { publicUrl } } = adminClient.storage.from('maquinarias').getPublicUrl(fileName)
            updateData.foto_url = publicUrl
        } else {
            console.error('Upload photo error', uploadError)
        }
    }

    const { error } = await adminClient
        .from('maquinarias')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('Error updating maquinaria:', error)
        return { message: 'Error al actualizar: ' + error.message }
    }

    revalidatePath('/maquinarias')
    return { message: 'Maquinaria actualizada correctamente', success: true }
}

export async function deleteMaquinaria(id: string) {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('maquinarias')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al eliminar maquinaria: ' + error.message }

    revalidatePath('/maquinarias')
    return { message: 'Maquinaria eliminada correctamente', success: true }
}

export async function restoreMaquinaria(id: string) {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('maquinarias')
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { message: 'Error al restaurar maquinaria: ' + error.message }

    revalidatePath('/maquinarias')
    return { message: 'Maquinaria restaurada correctamente', success: true }
}
