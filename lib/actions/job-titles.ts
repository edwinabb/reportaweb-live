'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { JobTitle, jobTitleSchema } from '@/types/job-titles'

export type ActionState = {
    errors?: { [key: string]: string[] | undefined }
    message?: string
    success?: boolean
} | null

/**
 * Fetch all job titles for the current tenant
 */
export async function getJobTitles(onlyActive = true, tenantId?: string): Promise<{ data: JobTitle[] | null, error: string | null }> {
    const supabase = await createClient()

    try {
        let query = supabase
            .from('job_titles')
            .select('*')
            .order('name', { ascending: true })

        if (onlyActive) {
            query = query.eq('is_active', true)
        }

        if (tenantId) {
            query = (query as any).eq('tenant_id', tenantId)
        }

        const { data, error } = await query

        if (error) {
            console.error('[getJobTitles] Error:', error)
            return { data: null, error: error.message }
        }

        return { data: data as JobTitle[], error: null }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { data: null, error: errMsg }
    }
}

/**
 * Create or Update a Job Title
 */
export async function upsertJobTitle(
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    const rawData = {
        id: formData.get('id') as string,
        name: formData.get('name') as string,
        is_active: formData.get('is_active') === 'true',
    }

    if (!rawData.id || rawData.id === 'undefined') delete (rawData as any).id;

    const validatedFields = jobTitleSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error de validación.',
            success: false,
        }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'No autenticado', success: false }

    try {
        // Fetch Tenant ID via RPC (Security Definer Function)
        const { data: tenantId, error: tenantError } = await supabase.rpc('get_auth_tenant_id')

        if (tenantError || !tenantId) {
            return { message: 'No se pudo determinar el tenant', success: false }
        }

        const payload: any = {
            ...validatedFields.data,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
            tenant_id: tenantId // Always include tenant_id to satisfy RLS on Upsert
        }

        const { error } = await supabase
            .from('job_titles')
            .upsert(payload)

        if (error) {
            return { message: `Error DB: ${error.message}`, success: false }
        }

        revalidatePath('/settings/users/job-titles')
        return { message: 'Cargo guardado exitosamente', success: true }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { message: `Error: ${errMsg}`, success: false }
    }
}

/**
 * Toggle active status (Soft delete / Restore)
 */
export async function toggleJobTitleStatus(id: string, currentStatus: boolean): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'No autenticado', success: false }

    try {
        const { error } = await supabase
            .from('job_titles')
            .update({
                is_active: !currentStatus,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) return { message: error.message, success: false }

        revalidatePath('/settings/users/job-titles')
        return { message: `Cargo ${!currentStatus ? 'activado' : 'desactivado'}`, success: true }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { message: errMsg, success: false }
    }
}

// Simple actions for GenericCatalogTable
export async function createJobTitleSimple(name: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'No autenticado' }

    try {
        const { data: tenantId } = await supabase.rpc('get_auth_tenant_id')
        if (!tenantId) return { success: false, message: 'No tenant' }

        const { data, error } = await supabase.from('job_titles').insert({
            name: name,
            tenant_id: tenantId,
            updated_by: user.id
        }).select().single()

        if (error) return { success: false, message: error.message }
        revalidatePath('/settings/users')
        return { success: true, item: data }
    } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : 'Error desconocido'
        return { success: false, message: errMsg }
    }
}

export async function deleteJobTitleSimple(id: string): Promise<{ success: boolean; message?: string }> {
    const result = await toggleJobTitleStatus(id, true)
    return {
        success: result?.success ?? false,
        message: result?.message
    }
}

export async function restoreJobTitleSimple(id: string): Promise<{ success: boolean; message?: string }> {
    const result = await toggleJobTitleStatus(id, false)
    return {
        success: result?.success ?? false,
        message: result?.message
    }
}
