import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas accesibles sin autenticación
const PUBLIC_PATHS = [
    '/login',
    '/auth',
    '/aprobacion',
    '/api',              // API routes manejan su propia autenticación
    '/registro',
    '/trial-expirado',
    '/descargar-app',
]

// Rutas que nunca se bloquean aunque el recurso padre esté restringido
// (ej: perfil personal, notificaciones propias)
const ALWAYS_ALLOWED_PREFIXES = [
    '/settings/perfil',
    '/settings/notificaciones',
]

const COOKIE_BLOCKED   = 'rw3_bloqueadas'
const COOKIE_TIMEZONE  = 'rw3_timezone'
const COOKIE_MAX_AGE   = 3_600  // 1 hora (igual que el access token de Supabase)

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isAlwaysAllowed(pathname: string): boolean {
    return ALWAYS_ALLOWED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

/** True si el pathname está en la lista de rutas bloqueadas. */
function isBlocked(pathname: string, bloqueadas: string[]): boolean {
    if (bloqueadas.length === 0) return false
    if (pathname === '/') return false               // dashboard siempre accesible
    if (isAlwaysAllowed(pathname)) return false      // whitelist
    return bloqueadas.some(ruta =>
        pathname === ruta ||
        pathname.startsWith(ruta + '/') ||
        pathname.startsWith(ruta)
    )
}

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Limpiar cookies de permisos y timezone al cerrar sesión
        response.cookies.delete(COOKIE_BLOCKED)
        response.cookies.delete(COOKIE_TIMEZONE)

        if (!isPublicPath(request.nextUrl.pathname)) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
            return NextResponse.redirect(loginUrl)
        }
        return response
    }

    // Redirigir a planificacion si ya está autenticado y va a /login
    if (request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/planificacion', request.url))
    }

    // Sin verificación de permisos para rutas públicas
    if (isPublicPath(request.nextUrl.pathname)) return response
    if (isAlwaysAllowed(request.nextUrl.pathname)) return response

    // /sistema solo accesible para reporta_admin
    if (request.nextUrl.pathname.startsWith('/sistema')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        if (profile?.role !== 'reporta_admin') {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return response
    }

    // ── Trial expiry check ────────────────────────────────────────────────────
    // Only run for authenticated, non-public, non-API paths
    const pathname = request.nextUrl.pathname
    const skipTrialCheck = pathname.startsWith('/trial-expirado')
        || pathname.startsWith('/api')
        || pathname.startsWith('/login')

    if (!skipTrialCheck) {
        try {
            const { data: profileTrial } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (profileTrial?.tenant_id) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('trial_status, trial_expires_at')
                    .eq('id', profileTrial.tenant_id)
                    .single()

                const isExpired = company?.trial_status === 'expired'
                const isActiveButExpired =
                    company?.trial_status === 'active' &&
                    company?.trial_expires_at != null &&
                    new Date(company.trial_expires_at) < new Date()

                if (isExpired || isActiveButExpired) {
                    if (isActiveButExpired) {
                        // Fire-and-forget: mark as expired in DB
                        supabase
                            .from('companies')
                            .update({ trial_status: 'expired' })
                            .eq('id', profileTrial.tenant_id)
                            .then(() => {}) // intentionally ignored
                    }

                    const redirectTo = NextResponse.redirect(new URL('/trial-expirado', request.url))
                    response.cookies.getAll().forEach((cookie) => {
                        const { name, value, ...opts } = cookie
                        redirectTo.cookies.set({
                            name,
                            value,
                            path: opts.path ?? '/',
                            maxAge: opts.maxAge,
                            sameSite: opts.sameSite as 'lax' | 'strict' | 'none' | undefined,
                            httpOnly: opts.httpOnly,
                            secure: opts.secure,
                        })
                    })
                    return redirectTo
                }
            }
        } catch {
            // Trial check failure is non-fatal — allow request through
        }
    }

    // ── Enforcement de permisos por cargo + timezone por tenant ───────────────
    const existingCookie  = request.cookies.get(COOKIE_BLOCKED)
    const existingTZCookie = request.cookies.get(COOKIE_TIMEZONE)
    let bloqueadas: string[] = []

    const cookieOpts = {
        path:     '/',
        maxAge:   COOKIE_MAX_AGE,
        sameSite: 'lax' as const,
        httpOnly: false,   // JS lo lee para filtrado de sidebar y cálculos de fecha
        secure:   process.env.NODE_ENV === 'production',
    }

    if (existingCookie?.value !== undefined) {
        try {
            bloqueadas = JSON.parse(decodeURIComponent(existingCookie.value)) as string[]
        } catch {
            // Cookie inválida → se re-fetchea abajo
        }
    } else {
        // Primera request de la sesión o cookie expirada → consultar RPC + tenant timezone
        try {
            const { data } = await supabase.rpc('get_rutas_bloqueadas')
            bloqueadas = Array.isArray(data) ? data : []
        } catch {
            // RPC no disponible (ej: migración no aplicada) → sin restricciones
            bloqueadas = []
        }

        response.cookies.set(COOKIE_BLOCKED, encodeURIComponent(JSON.stringify(bloqueadas)), cookieOpts)
    }

    // Set timezone cookie on first request or if missing (user is already loaded above)
    if (existingTZCookie?.value === undefined) {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()
            if (profile?.tenant_id) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('timezone')
                    .eq('id', profile.tenant_id)
                    .single()
                response.cookies.set(COOKIE_TIMEZONE, company?.timezone ?? 'America/Lima', cookieOpts)
            }
        } catch {
            response.cookies.set(COOKIE_TIMEZONE, 'America/Lima', cookieOpts)
        }
    }

    if (isBlocked(request.nextUrl.pathname, bloqueadas)) {
        const redirectTo = NextResponse.redirect(new URL('/', request.url))
        // Preserve refreshed auth cookies so the blocked-route redirect
        // doesn't lose a just-renewed JWT (new tokens live in `response`, not
        // in the new redirect object — copying prevents a second auth failure).
        response.cookies.getAll().forEach((cookie) => {
            const { name, value, ...opts } = cookie
            redirectTo.cookies.set({
                name,
                value,
                path: opts.path ?? '/',
                maxAge: opts.maxAge,
                sameSite: opts.sameSite as 'lax' | 'strict' | 'none' | undefined,
                httpOnly: opts.httpOnly,
                secure: opts.secure,
            })
        })
        return redirectTo
    }

    return response
}
