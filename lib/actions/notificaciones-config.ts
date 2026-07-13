'use server'

import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'

export type EppNotifConfig = {
    epp_notificar_observaciones_a: string[]
}

export async function getEppNotifConfig(): Promise<EppNotifConfig> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { epp_notificar_observaciones_a: [] }

    const { data } = await adminClient
        .from('companies')
        .select('epp_notificar_observaciones_a')
        .eq('id', tenantId)
        .maybeSingle()

    return {
        epp_notificar_observaciones_a: data?.epp_notificar_observaciones_a ?? [],
    }
}

export async function updateEppNotifConfig(userIds: string[]): Promise<{ success: boolean; message: string }> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('companies')
        .update({ epp_notificar_observaciones_a: userIds })
        .eq('id', tenantId)

    if (error) return { success: false, message: error.message }
    safeRevalidatePath('/settings/notificaciones')
    return { success: true, message: 'Configuración guardada' }
}
