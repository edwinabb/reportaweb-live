'use server'

import { getSupabaseContext } from '@/lib/action-context'

export interface Festivo {
    fecha: string
    descripcion: string | null
}

/** Devuelve todos los festivos activos del país del tenant actual. */
export async function getFestivosForTenant(): Promise<Festivo[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data: company } = await adminClient
        .from('companies')
        .select('ubicacion_pais')
        .eq('id', tenantId)
        .single()

    if (!company?.ubicacion_pais) return []

    const { data } = await adminClient
        .from('app_calendario_festivos')
        .select('fecha, descripcion')
        .eq('pais_id', company.ubicacion_pais)
        .eq('is_active', true)
        .order('fecha')

    return data ?? []
}

/** Devuelve festivos activos del tenant en un rango de fechas (YYYY-MM-DD). */
export async function getFestivosInRange(startDate: string, endDate: string): Promise<Festivo[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data: company } = await adminClient
        .from('companies')
        .select('ubicacion_pais')
        .eq('id', tenantId)
        .single()

    if (!company?.ubicacion_pais) return []

    const { data } = await adminClient
        .from('app_calendario_festivos')
        .select('fecha, descripcion')
        .eq('pais_id', company.ubicacion_pais)
        .eq('is_active', true)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha')

    return data ?? []
}
