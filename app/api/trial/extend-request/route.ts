// app/api/trial/extend-request/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requestTrialExtension } from '@/lib/actions/trial'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const tenantId   = searchParams.get('tenant')
    const adminEmail = searchParams.get('email')

    if (!tenantId || !adminEmail) {
        return NextResponse.redirect(new URL('/trial-expirado', req.url))
    }

    try {
        await requestTrialExtension(tenantId, adminEmail)
        return NextResponse.redirect(new URL('/trial-expirado?extended=1', req.url))
    } catch (err) {
        console.error('[extend-request] Error extending trial:', err)
        return NextResponse.redirect(new URL('/trial-expirado', req.url))
    }
}
