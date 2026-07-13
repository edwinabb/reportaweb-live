'use server'

import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'

export async function getEmpresaConfig(): Promise<{ timezone: string }> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { timezone: 'America/Lima' }

    const { data } = await adminClient
        .from('companies')
        .select('timezone')
        .eq('id', tenantId)
        .maybeSingle()

    return { timezone: data?.timezone ?? 'America/Lima' }
}

export async function updateTimezone(timezone: string): Promise<{ success: boolean; message: string }> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('companies')
        .update({ timezone })
        .eq('id', tenantId)

    if (error) return { success: false, message: error.message }
    safeRevalidatePath('/settings/empresa')
    return { success: true, message: 'Zona horaria actualizada' }
}
