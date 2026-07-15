'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

/**
 * Documentos ACTIVOS con más de 1 mes de vencidos, para el ritual de
 * depuración (pasarlos a INACTIVO en lote). Ordenados del más antiguo
 * al más reciente para que los grupos "+6 meses", "+5 meses"… salgan primero.
 */
export async function getDepurableDocuments({ page = 1, limit = 20 }: { page?: number, limit?: number }) {
    const supabase = await createClient()

    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - 1)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
        .from('user_documents')
        .select(`
            id, file_name, file_path, valid_until, is_active,
            document_type:document_type_id (id, name),
            user:user_id (id, first_name, last_name, doc_number)
        `, { count: 'exact' })
        .eq('is_active', true)
        .not('valid_until', 'is', null)
        .lt('valid_until', cutoffStr)
        .order('valid_until', { ascending: true })
        .range(from, to)

    if (error) {
        console.error('Error fetching depurable documents:', error)
        return { data: [], count: 0, error: error.message }
    }

    return { data: (data as any[]) ?? [], count: count || 0, error: null }
}

/**
 * Pasa a INACTIVO los documentos seleccionados (confirmados por el usuario).
 */
export async function deactivateUserDocuments(ids: string[]): Promise<{ success: boolean, message: string }> {
    if (!ids.length) return { success: false, message: 'No hay documentos seleccionados' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'No autenticado' }

    const { error } = await supabase
        .from('user_documents')
        .update({
            is_active: false,
            modified_by: user.id,
            modified_at: new Date().toISOString(),
        })
        .in('id', ids)

    if (error) {
        console.error('Error deactivating documents:', error)
        return { success: false, message: 'Error al inactivar documentos' }
    }

    revalidatePath('/users/documents')
    revalidatePath('/users/documents/depurar')
    return { success: true, message: `${ids.length} documento(s) pasados a INACTIVO` }
}
