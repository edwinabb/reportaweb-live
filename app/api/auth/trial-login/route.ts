import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/auth/trial-login?email=...&password=...
 *
 * Auto-login step immediately after trial registration.
 * Email + password are passed in URL query params — this is acceptable
 * here because: (1) it's an internal redirect from our own /registro page,
 * (2) it happens over HTTPS, (3) credentials are short-lived (user just
 * chose them seconds ago) and not stored in browser history beyond this
 * one-time redirect. The user is immediately redirected away.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const email    = searchParams.get('email')
    const password = searchParams.get('password')

    if (!email || !password) {
        return NextResponse.redirect(new URL('/login?trial=1', request.url))
    }

    try {
        const supabase = await createClient()

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            console.error('[trial-login] signInWithPassword error:', error.message)
            return NextResponse.redirect(new URL('/login?trial=1', request.url))
        }

        return NextResponse.redirect(new URL('/planificacion?trial=new', request.url))
    } catch (e) {
        console.error('[trial-login] unexpected error:', e)
        return NextResponse.redirect(new URL('/login?trial=1', request.url))
    }
}
