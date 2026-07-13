'use server'

import { getSupabaseContext } from '@/lib/action-context'

export interface DashboardMetrics {
    inspeccionesDelMes: number
    tareasActivas: number
    cotizacionesPendientes: number
    cotizacionesAprobadasMes: number
    ultimasCotizaciones: {
        id: string
        numero: string
        cliente: string
        estado: string
        total_pen: number | null
        created_at: string
    }[]
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const { adminClient, tenantId } = await getSupabaseContext()

    if (!adminClient || !tenantId) {
        return {
            inspeccionesDelMes: 0,
            tareasActivas: 0,
            cotizacionesPendientes: 0,
            cotizacionesAprobadasMes: 0,
            ultimasCotizaciones: [],
        }
    }

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
        { count: inspeccionesCount },
        { count: tareasCount },
        { count: cotizacionesPendientesCount },
        { count: cotizacionesAprobadasCount },
        { data: ultimasCotizaciones },
    ] = await Promise.all([
        // Inspecciones creadas este mes
        adminClient
            .from('inspecciones')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .gte('created_at', firstOfMonth),

        // Tareas activas (pendientes + en proceso)
        adminClient
            .from('tareas')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .in('estado', ['PENDIENTE', 'EN_PROCESO']),

        // Cotizaciones pendientes (borrador + enviadas)
        adminClient
            .from('cotizaciones')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .in('estado', ['BORRADOR', 'ENVIADA']),

        // Cotizaciones aprobadas este mes
        adminClient
            .from('cotizaciones')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .eq('estado', 'APROBADA')
            .gte('created_at', firstOfMonth),

        // Últimas 5 cotizaciones con nombre de cliente
        adminClient
            .from('cotizaciones')
            .select('id, numero, estado, total_pen, created_at, tercero:terceros(razon_social)')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5),
    ])

    return {
        inspeccionesDelMes: inspeccionesCount ?? 0,
        tareasActivas: tareasCount ?? 0,
        cotizacionesPendientes: cotizacionesPendientesCount ?? 0,
        cotizacionesAprobadasMes: cotizacionesAprobadasCount ?? 0,
        ultimasCotizaciones: (ultimasCotizaciones ?? []).map((c) => ({
            id: c.id,
            numero: c.numero ?? '—',
            cliente: (c.tercero as { razon_social?: string } | null)?.razon_social ?? 'Sin cliente',
            estado: c.estado,
            total_pen: c.total_pen,
            created_at: c.created_at,
        })),
    }
}
