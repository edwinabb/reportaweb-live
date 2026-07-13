// app/api/cron/trial-expiry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('companies')
        .update({ trial_status: 'expired' })
        .eq('trial_status', 'active')
        .lt('trial_expires_at', new Date().toISOString())
        .select('id, name')

    return NextResponse.json({ ok: !error, expired: data?.length ?? 0, error: error?.message })
}
