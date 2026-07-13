import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function getTenantContext() {
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
        // Fallback to profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()
        tenantId = profile?.tenant_id
    }

    // Secondary fallback: user_metadata (useful for fresh logins before cookie is set)
    if (!tenantId) {
        tenantId = user.user_metadata?.tenant_id
    }

    return { adminClient: supabaseAdmin, tenantId, user }
}
