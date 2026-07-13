
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export function safeRevalidatePath(path: string) {
    if (process.env.VERIFICATION_MODE === 'true') {
        console.log(`[Mock] revalidatePath('${path}')`)
        return
    }
    try {
        revalidatePath(path)
    } catch (e) {
        console.warn(`[Warning] revalidatePath failed for ${path}:`, e)
    }
}

export async function getSupabaseContext() {
    // 1. Verification/Script Mode (Bypass Next.js headers)
    if (process.env.VERIFICATION_MODE === 'true') {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

        if (!url || !key) {
            console.error('Missing Supabase URL/Key in Verification Mode')
            return { adminClient: null, tenantId: null, user: null }
        }

        const adminClient = createClient(url, key, { auth: { persistSession: false } })

        // Use provided IDs or fail
        const tenantId = process.env.TEST_TENANT_ID
        const userId = process.env.TEST_USER_ID

        if (!tenantId || !userId) {
            console.error('Missing TEST_TENANT_ID or TEST_USER_ID in Verification Mode')
            return { adminClient, tenantId: null, user: null }
        }

        return { adminClient, tenantId, user: { id: userId } }
    }

    // 2. Standard Server Action Mode
    try {
        const cookieStore = await cookies()
        const managedTenantId = cookieStore.get('managed_tenant_id')?.value

        const supabaseServer = await createServerClient()
        const { data: { user } } = await supabaseServer.auth.getUser()

        if (!user) return { adminClient: null, tenantId: null, user: null }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )

        let tenantId = managedTenantId
        if (!tenantId) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()
            tenantId = profile?.tenant_id
        }

        return { adminClient: supabaseAdmin, tenantId, user }
    } catch (error) {
        // Fallback for cases where cookies() is called outside request (should be caught by Verification Mode check, but just in case)
        console.error('Error in getSupabaseContext:', error)
        return { adminClient: null, tenantId: null, user: null }
    }
}
