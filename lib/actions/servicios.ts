'use server'

import { ActionResponse, Servicio, ServicioCategoria, Moneda } from '@/types/cotizaciones'
import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'



// ============================================
// SERVICIOS ACTIONS
// ============================================

const SERVICIOS_WITH_TIPOS = `
    *,
    tipo_p1:servicios_tipo_precios!precio_1_tipo(nombre),
    tipo_p2:servicios_tipo_precios!precio_2_tipo(nombre),
    tipo_p3:servicios_tipo_precios!precio_3_tipo(nombre)
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTiposNombre(raw: any): Servicio {
    return {
        ...raw,
        precio_1_tipo_nombre: raw.tipo_p1?.nombre ?? null,
        precio_2_tipo_nombre: raw.tipo_p2?.nombre ?? null,
        precio_3_tipo_nombre: raw.tipo_p3?.nombre ?? null,
        tipo_p1: undefined,
        tipo_p2: undefined,
        tipo_p3: undefined,
    }
}

export async function getServicios(
    tipo?: ServicioCategoria,
    moneda?: Moneda,
    onlyActive = true
): Promise<Servicio[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('servicios')
        .select(SERVICIOS_WITH_TIPOS)
        .eq('tenant_id', tenantId)

    if (onlyActive) {
        // Treat NULL as active (migrated records may not have is_active set)
        query = query.or('is_active.eq.true,is_active.is.null')
    }

    if (tipo) {
        query = query.eq('tipo_servicio', tipo)
    }

    if (moneda) {
        query = query.eq('moneda', moneda)
    }

    query = query.order('codigo', { ascending: true })

    const { data, error } = await query

    if (error) {
        console.error('Error fetching servicios:', error)
        return []
    }

    return (data as any[]).map(mapTiposNombre)
}

export async function getServicioById(id: string): Promise<Servicio | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('servicios')
        .select(SERVICIOS_WITH_TIPOS)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

    if (error) {
        console.error('Error fetching servicio:', error)
        return null
    }

    return mapTiposNombre(data)
}

export async function createServicio(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const codigo = formData.get('codigo') as string
    const nombre = formData.get('nombre') as string
    const tipo_servicio = formData.get('tipo_servicio') as ServicioCategoria
    const toneladas = formData.get('toneladas') as string
    const moneda = formData.get('moneda') as Moneda
    const cantidad_precios = parseInt(formData.get('cantidad_precios') as string)
    const imagen_url = formData.get('imagen_url') as string

    if (!codigo || !nombre || !tipo_servicio || !moneda || !cantidad_precios) {
        return { message: 'Campos requeridos faltantes' }
    }

    if (cantidad_precios < 1 || cantidad_precios > 3) {
        return { message: 'La cantidad de precios debe ser entre 1 y 3' }
    }

    // Check if codigo already exists
    const { data: existing } = await adminClient
        .from('servicios')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('codigo', codigo)
        .single()

    if (existing) {
        return { message: 'Ya existe un servicio con este código' }
    }

    // Build insert object
    const insertData: Partial<Servicio> = {
        tenant_id: tenantId,
        codigo,
        nombre,
        tipo_servicio,
        toneladas: toneladas || null,
        moneda,
        cantidad_precios,
        imagen_url: imagen_url || null,
        created_by: user.id,
        updated_by: user.id
    }

    // Add precio 1
    if (cantidad_precios >= 1) {
        insertData.precio_1_tipo = formData.get('precio_1_tipo') as string
        insertData.precio_1_valor = parseFloat(formData.get('precio_1_valor') as string)
        const campo1 = formData.get('precio_1_campo_adicional') as string
        insertData.precio_1_campo_adicional = campo1 ? parseFloat(campo1) : null
    }

    // Add precio 2
    if (cantidad_precios >= 2) {
        insertData.precio_2_tipo = formData.get('precio_2_tipo') as string
        insertData.precio_2_valor = parseFloat(formData.get('precio_2_valor') as string)
        const campo2 = formData.get('precio_2_campo_adicional') as string
        insertData.precio_2_campo_adicional = campo2 ? parseFloat(campo2) : null
    }

    // Add precio 3
    if (cantidad_precios >= 3) {
        insertData.precio_3_tipo = formData.get('precio_3_tipo') as string
        const valor3 = formData.get('precio_3_valor') as string
        insertData.precio_3_valor = valor3 ? parseFloat(valor3) : null
        const campo3 = formData.get('precio_3_campo_adicional') as string
        insertData.precio_3_campo_adicional = campo3 ? parseFloat(campo3) : null
        insertData.precio_3_no_aplica = formData.get('precio_3_no_aplica') === 'true'
    }

    const { data, error } = await adminClient
        .from('servicios')
        .insert(insertData)
        .select()
        .single()

    if (error) {
        console.error('Error creating servicio:', error)
        return { message: 'Error al crear servicio: ' + error.message }
    }

    safeRevalidatePath('/cotizaciones/servicios')
    return { message: 'Servicio creado', success: true, id: data.id }
}

export async function updateServicio(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const id = formData.get('id') as string
    const codigo = formData.get('codigo') as string
    const nombre = formData.get('nombre') as string
    const tipo_servicio = formData.get('tipo_servicio') as ServicioCategoria
    const toneladas = formData.get('toneladas') as string
    const moneda = formData.get('moneda') as Moneda
    const cantidad_precios = parseInt(formData.get('cantidad_precios') as string)
    const imagen_url = formData.get('imagen_url') as string

    if (!id || !codigo || !nombre || !tipo_servicio || !moneda || !cantidad_precios) {
        return { message: 'Campos requeridos faltantes' }
    }

    if (cantidad_precios < 1 || cantidad_precios > 3) {
        return { message: 'La cantidad de precios debe ser entre 1 y 3' }
    }

    // Build update object
    const updateData: Partial<Servicio> = {
        codigo,
        nombre,
        tipo_servicio,
        toneladas: toneladas || null,
        moneda,
        cantidad_precios,
        imagen_url: imagen_url || null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
    }

    // Add precio 1
    if (cantidad_precios >= 1) {
        updateData.precio_1_tipo = formData.get('precio_1_tipo') as string
        updateData.precio_1_valor = parseFloat(formData.get('precio_1_valor') as string)
        const campo1 = formData.get('precio_1_campo_adicional') as string
        updateData.precio_1_campo_adicional = campo1 ? parseFloat(campo1) : null
    } else {
        updateData.precio_1_tipo = null
        updateData.precio_1_valor = null
        updateData.precio_1_campo_adicional = null
    }

    // Add precio 2
    if (cantidad_precios >= 2) {
        updateData.precio_2_tipo = formData.get('precio_2_tipo') as string
        updateData.precio_2_valor = parseFloat(formData.get('precio_2_valor') as string)
        const campo2 = formData.get('precio_2_campo_adicional') as string
        updateData.precio_2_campo_adicional = campo2 ? parseFloat(campo2) : null
    } else {
        updateData.precio_2_tipo = null
        updateData.precio_2_valor = null
        updateData.precio_2_campo_adicional = null
    }

    // Add precio 3
    if (cantidad_precios >= 3) {
        updateData.precio_3_tipo = formData.get('precio_3_tipo') as string
        const valor3 = formData.get('precio_3_valor') as string
        updateData.precio_3_valor = valor3 ? parseFloat(valor3) : null
        const campo3 = formData.get('precio_3_campo_adicional') as string
        updateData.precio_3_campo_adicional = campo3 ? parseFloat(campo3) : null
        updateData.precio_3_no_aplica = formData.get('precio_3_no_aplica') === 'true'
    } else {
        updateData.precio_3_tipo = null
        updateData.precio_3_valor = null
        updateData.precio_3_campo_adicional = null
        updateData.precio_3_no_aplica = false
    }

    const { error } = await adminClient
        .from('servicios')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('Error updating servicio:', error)
        return { message: 'Error al actualizar servicio: ' + error.message }
    }

    safeRevalidatePath('/cotizaciones/servicios')
    return { message: 'Servicio actualizado', success: true }
}

export async function deleteServicio(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('servicios')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('Error deleting servicio:', error)
        return { message: 'Error al eliminar' }
    }

    safeRevalidatePath('/cotizaciones/servicios')
    return { message: 'Eliminado correctamente', success: true }
}

export async function restoreServicio(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { message: 'No autorizado' }

    const { error } = await adminClient
        .from('servicios')
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('Error restoring servicio:', error)
        return { message: 'Error al restaurar' }
    }

    safeRevalidatePath('/cotizaciones/servicios')
    return { message: 'Restaurado correctamente', success: true }
}

export async function updateServicioPrecioValor(
    servicio_id: string,
    priceIdx: 1 | 2 | 3,
    valor: number
): Promise<ActionResponse> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { message: 'No autorizado' }

    const field = `precio_${priceIdx}_valor`
    const { error } = await adminClient
        .from('servicios')
        .update({ [field]: valor, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', servicio_id)
        .eq('tenant_id', tenantId)

    if (error) return { message: error.message }
    return { success: true, message: 'Precio actualizado' }
}

// ============================================
// TIPOS DE PRECIO ACTIONS
// ============================================

export async function getTiposPrecio() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data, error } = await adminClient
        .from('servicios_tipo_precios')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nombre', { ascending: true })

    if (error) {
        console.error('Error fetching tipos precio:', error)
        return []
    }

    return data
}
