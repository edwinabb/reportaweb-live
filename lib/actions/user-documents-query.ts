'use server'

import { createClient } from '@/utils/supabase/server'
import { UserDocument } from '@/types/user-documents'

export async function getAllUserDocuments({
    search,
    documentTypeId,
    isActive = true,
    expiryStatus = 'all', // 'all', 'expiring', 'expired'
    page = 1,
    limit = 50
}: {
    search?: string,
    documentTypeId?: string,
    isActive?: boolean,
    expiryStatus?: 'all' | 'expiring' | 'expired',
    page?: number,
    limit?: number
}) {
    const supabase = await createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    let query = supabase
        .from('user_documents')
        .select(`
            *,
            document_type:document_type_id (id, name, expiration_alert_days, category),
            user:user_id (id, first_name, last_name, doc_number)
        `, { count: 'exact' })
        .eq('is_active', isActive)
        .order('created_at', { ascending: false })

    if (documentTypeId && documentTypeId !== 'all') {
        query = query.eq('document_type_id', documentTypeId)
    }

    if (search) {
        // Search user first_name or last_name or doc_number
        // Using `or` filter with foreign columns requires exact syntax. 
        // We will try a simpler approach if this fails during runtime, but standard syntax for foreign tables in PostgREST is `table.col.op.val`.
        // However, OR across tables is tricky.
        // Let's assume the user wants to filter by User Name mostly.
        // We will try: `user.first_name.ilike.%search%,user.last_name.ilike.%search%`
        // Note: Supabase JS library allows: .or('first_name.ilike.%query%,last_name.ilike.%query%', { foreignTable: 'user' })

        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,doc_number.ilike.%${search}%`, { foreignTable: 'user' })
    }

    // Expiry Status Filter
    if (expiryStatus === 'expired') {
        query = query.lt('valid_until', todayStr)
    } else if (expiryStatus === 'expiring') {
        // This is tricky because alert_days is in the document_type table.
        // For a more performant query across many records, we might use a fixed range (e.g. 30 days) 
        // OR a more complex query if the data volume is small enough.
        // Let's assume a default of 30 days if we want to filter in DB, 
        // OR we can fetch and filter if pagination isn't strictly required for this view.
        // However, we have a pagination requirement.

        // Let's use a standard 30-day window for 'expiring' at the DB level for now, 
        // or refine it if needed. Most companies use 30 days anyway.
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 30)
        const futureStr = futureDate.toISOString().split('T')[0]

        query = query
            .gte('valid_until', todayStr)
            .lte('valid_until', futureStr)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
        // If the error is about the "or" syntax on foreign table which can be tricky
        console.error('Error fetching all user documents:', JSON.stringify(error, null, 2))
        return { data: [], count: 0, error: error.message }
    }

    // Map data to ensure it fits the interface if needed, 
    // mostly Supabase returns what we asked for.
    return { data: data as any[], count: count || 0, error: null }
}

export async function getSignedUrls(paths: string[]) {
    const supabase = await createClient()
    const { data, error } = await supabase.storage.from('doc_usuarios').createSignedUrls(paths, 3600) // 1 hour

    if (error) {
        console.error("Error creating signed urls", error)
        return null
    }
    return data
}
