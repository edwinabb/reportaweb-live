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
const COOKIE_TRIAL     = 'rw3_trial'
const COOKIE_ROLE      = 'rw3_role'
const COOKIE_MAX_AGE   = 3_600  // 1 hora (igual que el access token de Supabase)
const COOKIE_TRIAL_MAX_AGE = 300  // 5 min — trial puede expirar por reloj, no por mutación

type CachedTrial = {
    status: 'active' | 'expired' | 'converted' | 'exempt' | string | null
    expires_at: string | null
    tenant_id: string | null
}

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

    let { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // getUser() puede devolver null de forma transitoria durante la rotación del
        // access token (race de refresh en el edge) aunque la sesión siga vigente en
        // el navegador. Si todavía hay una cookie de sesión de Supabase presente,
        // reintentamos una vez antes de tratar esto como logout real — evita el
        // 307 /login→/planificacion intermitente reportado en DUDA-COT-000
        // (docs/auditoria-ui/06-cotizaciones.md). Un usuario realmente sin sesión
        // no tiene esta cookie, así que el camino rápido (sin reintento) no cambia.
        const hasAuthCookie = request.cookies
            .getAll()
            .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

        if (hasAuthCookie) {
            const retry = await supabase.auth.getUser()
            user = retry.data.user
        }
    }

    if (!user) {
        // Limpiar cookies de permisos y timezone al cerrar sesión
        response.cookies.delete(COOKIE_BLOCKED)
        response.cookies.delete(COOKIE_TIMEZONE)
        response.cookies.delete(COOKIE_TRIAL)
        response.cookies.delete(COOKIE_ROLE)

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
        const roleCookie = request.cookies.get(COOKIE_ROLE)?.value
        let role: string | null = roleCookie ?? null
        if (!role) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            role = profile?.role ?? null
            if (role) {
                response.cookies.set(COOKIE_ROLE, role, {
                    path: '/',
                    maxAge: COOKIE_MAX_AGE,
                    sameSite: 'lax',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                })
            }
        }
        if (role !== 'reporta_admin') {
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
            // Cookie-cache del estado de trial para evitar 2 queries por request.
            // TTL 5 min: trial puede expirar por paso del reloj, no por mutación,
            // así que el cache corto es suficiente. Las actions que mutan trial
            // (lib/actions/trial.ts) borran esta cookie para forzar re-fetch.
            const trialCookie = request.cookies.get(COOKIE_TRIAL)?.value
            let cached: CachedTrial | null = null
            if (trialCookie) {
                try {
                    cached = JSON.parse(decodeURIComponent(trialCookie)) as CachedTrial
                } catch { /* cookie corrupta → re-fetch */ }
            }

            let trialStatus = cached?.status ?? null
            let trialExpiresAt = cached?.expires_at ?? null
            let tenantId = cached?.tenant_id ?? null

            if (!cached) {
                const { data: profileTrial } = await supabase
                    .from('profiles')
                    .select('tenant_id')
                    .eq('id', user.id)
                    .single()

                tenantId = profileTrial?.tenant_id ?? null

                if (tenantId) {
                    const { data: company } = await supabase
                        .from('companies')
                        .select('trial_status, trial_expires_at')
                        .eq('id', tenantId)
                        .single()

                    trialStatus = company?.trial_status ?? null
                    trialExpiresAt = company?.trial_expires_at ?? null
                }

                const toCache: CachedTrial = {
                    status: trialStatus,
                    expires_at: trialExpiresAt,
                    tenant_id: tenantId,
                }
                response.cookies.set(
                    COOKIE_TRIAL,
                    encodeURIComponent(JSON.stringify(toCache)),
                    {
                        path: '/',
                        maxAge: COOKIE_TRIAL_MAX_AGE,
                        sameSite: 'lax',
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                    }
                )
            }

            const isExpired = trialStatus === 'expired'
            const isActiveButExpired =
                trialStatus === 'active' &&
                trialExpiresAt != null &&
                new Date(trialExpiresAt) < new Date()

            if (isExpired || isActiveButExpired) {
                if (isActiveButExpired && tenantId) {
                    // Fire-and-forget: mark as expired in DB
                    supabase
                        .from('companies')
                        .update({ trial_status: 'expired' })
                        .eq('id', tenantId)
                        .then(() => {}) // intentionally ignored
                }

                // Invalidar cookie para que el próximo request lea el estado real
                response.cookies.delete(COOKIE_TRIAL)

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
