import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/**
 * Cliente Supabase con service_role key para setup/teardown de tests.
 * Bypassa RLS — usar SOLO en tests, nunca exponer al cliente.
 */
export function getAdminClient(): SupabaseClient {
    if (adminClient) return adminClient

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error(
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
            'Asegurate de que viven en .env.test o .env.local.',
        )
    }

    adminClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    return adminClient
}

/**
 * Tenant del user de test. Por default CISE, override con TEST_TENANT_ID.
 * Los tests necesitan saber el tenant para insertar data del tenant correcto.
 */
export function getTestTenantId(): string {
    return (
        process.env.TEST_TENANT_ID ||
        '1cb97ec7-326c-4376-93ee-ed317d3da51b' // CISE por default
    )
}

/**
 * User UUID del test user (planner por default). Se usa como `created_by` en inserts.
 * Lo buscamos por email en auth.users la primera vez y cacheamos por email.
 */
const userIdCache = new Map<string, string>()

export async function getTestUserIdByEmail(email: string): Promise<string> {
    if (userIdCache.has(email)) return userIdCache.get(email)!

    const admin = getAdminClient()
    const { data, error } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    if (error || !data || !data.id) {
        throw new Error(
            `No se encontró profile del test user ${email}. ` +
            `Asegurate de que exista en public.profiles con su tenant_id asignado.`,
        )
    }

    const userId: string = data.id
    userIdCache.set(email, userId)
    return userId
}

/** Planner (default) — usado por los tests existentes de planificación */
export async function getTestUserId(): Promise<string> {
    const email = process.env.TEST_PLANNER_EMAIL || process.env.TEST_USER_EMAIL
    if (!email) throw new Error('Missing TEST_PLANNER_EMAIL / TEST_USER_EMAIL')
    return getTestUserIdByEmail(email)
}

/** Admin tenant */
export async function getTestAdminId(): Promise<string> {
    const email = process.env.TEST_ADMIN_EMAIL
    if (!email) throw new Error('Missing TEST_ADMIN_EMAIL')
    return getTestUserIdByEmail(email)
}

/** Viewer */
export async function getTestViewerId(): Promise<string> {
    const email = process.env.TEST_VIEWER_EMAIL
    if (!email) throw new Error('Missing TEST_VIEWER_EMAIL')
    return getTestUserIdByEmail(email)
}
