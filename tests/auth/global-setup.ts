import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TENANT_ID = process.env.TEST_TENANT_ID || '1cb97ec7-326c-4376-93ee-ed317d3da51b'

const AUTH_FILES = ['.auth/admin.json', '.auth/planner.json', '.auth/viewer.json']
const MAX_AUTH_AGE_HOURS = 168 // 7 days

const E2E_USERS = [
    {
        email: process.env.TEST_PLANNER_EMAIL || 'e2e-planner@reporta.la',
        password: process.env.TEST_PLANNER_PASSWORD!,
        role: 'planner',
        firstName: 'E2E',
        lastName: 'Planner',
    },
    {
        email: process.env.TEST_ADMIN_EMAIL || 'e2e-admin@reporta.la',
        password: process.env.TEST_ADMIN_PASSWORD!,
        role: 'admin_tenant',
        firstName: 'E2E',
        lastName: 'Admin',
    },
    {
        email: process.env.TEST_VIEWER_EMAIL || 'e2e-viewer@reporta.la',
        password: process.env.TEST_VIEWER_PASSWORD!,
        role: 'viewer',
        firstName: 'E2E',
        lastName: 'Viewer',
    },
]

const E2E_PLANNER_JOB_TITLE = 'E2E PLANNER'
const E2E_VIEWER_JOB_TITLE  = 'E2E VIEWER'

async function resetPlannerPermisos(supabase: ReturnType<typeof createClient>): Promise<void> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'e2e-planner@reporta.la')
        .single()
    if (!profile) return

    // Ensure E2E PLANNER job_title exists
    let jobTitleId: string | null = null
    const { data: existing } = await supabase
        .from('job_titles')
        .select('id')
        .eq('name', E2E_PLANNER_JOB_TITLE)
        .eq('tenant_id', TENANT_ID)
        .single()

    if (existing) {
        jobTitleId = existing.id
    } else {
        const { data: created } = await supabase
            .from('job_titles')
            .insert({ name: E2E_PLANNER_JOB_TITLE, tenant_id: TENANT_ID, is_active: true })
            .select('id')
            .single()
        jobTitleId = created?.id ?? null
        if (jobTitleId) console.log('[global-setup] job_title E2E PLANNER creado ✓')
    }
    if (!jobTitleId) return

    // Ensure profile_details row exists with the E2E cargo
    const { data: details } = await supabase
        .from('profile_details')
        .select('id, job_title_id')
        .eq('id', profile.id)
        .single()

    if (!details) {
        await supabase.from('profile_details').insert({
            id: profile.id,
            job_title_id: jobTitleId,
            tenant_id: TENANT_ID,
        })
        console.log('[global-setup] profile_details del planner E2E creado ✓')
    } else if (details.job_title_id !== jobTitleId) {
        await supabase.from('profile_details')
            .update({ job_title_id: jobTitleId })
            .eq('id', profile.id)
        console.log('[global-setup] job_title_id del planner E2E corregido ✓')
    }

    // Ensure all modules are enabled for this cargo
    const { data: recursos } = await supabase.from('sistema_recursos').select('id')
    if (recursos?.length) {
        await supabase.from('cargo_permisos').upsert(
            recursos.map(r => ({
                cargo_id: jobTitleId!,
                recurso_id: r.id,
                tenant_id: TENANT_ID,
                puede_ver: true,
                puede_ingresar: true,
                puede_editar: true,
            })),
            { onConflict: 'cargo_id,recurso_id,tenant_id' }
        )
    }
    console.log('[global-setup] cargo_permisos del planner E2E reseteados ✓')
}

async function resetViewerPermisos(supabase: ReturnType<typeof createClient>): Promise<void> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'e2e-viewer@reporta.la')
        .single()
    if (!profile) return

    // Ensure E2E VIEWER job_title exists
    let jobTitleId: string | null = null
    const { data: existing } = await supabase
        .from('job_titles')
        .select('id')
        .eq('name', E2E_VIEWER_JOB_TITLE)
        .eq('tenant_id', TENANT_ID)
        .single()

    if (existing) {
        jobTitleId = existing.id
    } else {
        const { data: created } = await supabase
            .from('job_titles')
            .insert({ name: E2E_VIEWER_JOB_TITLE, tenant_id: TENANT_ID, is_active: true })
            .select('id')
            .single()
        jobTitleId = created?.id ?? null
        if (jobTitleId) console.log('[global-setup] job_title E2E VIEWER creado ✓')
    }
    if (!jobTitleId) return

    // Ensure profile_details row exists with the E2E viewer cargo
    const { data: details } = await supabase
        .from('profile_details')
        .select('id, job_title_id')
        .eq('id', profile.id)
        .single()

    if (!details) {
        await supabase.from('profile_details').insert({
            id: profile.id,
            job_title_id: jobTitleId,
            tenant_id: TENANT_ID,
        })
        console.log('[global-setup] profile_details del viewer E2E creado ✓')
    } else if (details.job_title_id !== jobTitleId) {
        await supabase.from('profile_details')
            .update({ job_title_id: jobTitleId })
            .eq('id', profile.id)
        console.log('[global-setup] job_title_id del viewer E2E corregido ✓')
    }

    // Viewer: puede_ver=true, puede_ingresar=false, puede_editar=false (solo lectura)
    const { data: recursos } = await supabase.from('sistema_recursos').select('id')
    if (recursos?.length) {
        await supabase.from('cargo_permisos').upsert(
            recursos.map(r => ({
                cargo_id: jobTitleId!,
                recurso_id: r.id,
                tenant_id: TENANT_ID,
                puede_ver: true,
                puede_ingresar: false,
                puede_editar: false,
            })),
            { onConflict: 'cargo_id,recurso_id,tenant_id' }
        )
    }
    console.log('[global-setup] cargo_permisos del viewer E2E reseteados ✓')
}

async function globalSetup() {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.warn(
            '[global-setup] NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados — ' +
            'se omite creación automática de usuarios E2E. ' +
            'Agregalos en .env.local y vuelve a correr los tests.'
        )
        return
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    // Siempre resetear cargo_permisos del planner y viewer E2E antes de cada run.
    // Previene que un fallo a mitad de los tests deje módulos bloqueados entre runs.
    await resetPlannerPermisos(supabase)
    await resetViewerPermisos(supabase)

    // Skip expensive user sync if auth files are fresh (< MAX_AUTH_AGE_HOURS old)
    if (AUTH_FILES.every(f => {
        try {
            const stat = fs.statSync(path.resolve(process.cwd(), f))
            return (Date.now() - stat.mtimeMs) < MAX_AUTH_AGE_HOURS * 3600_000
        } catch { return false }
    })) {
        console.log('[global-setup] Auth files are fresh — skipping user sync.')
        return
    }

    for (const user of E2E_USERS) {
        let userId: string

        // Intentar crear — si ya existe, recuperar su id
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
        })

        if (createError) {
            const alreadyExists = createError.message.toLowerCase().includes('already')
            if (!alreadyExists) {
                console.error(`[global-setup] Error creando ${user.email}:`, createError.message)
                continue
            }

            // Buscar el usuario existente para obtener su id
            const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
            if (listError || !list) {
                console.error(`[global-setup] No se pudo listar usuarios:`, listError?.message)
                continue
            }
            const found = list.users.find(u => u.email === user.email)
            if (!found) {
                console.error(`[global-setup] Usuario ${user.email} existe pero no se pudo encontrar en listado`)
                continue
            }
            userId = found.id
            // Actualizar contraseña por si cambió en .env.test
            await supabase.auth.admin.updateUserById(userId, { password: user.password })
            console.log(`[global-setup] Usuario ya existía (contraseña sincronizada): ${user.email}`)
        } else {
            userId = created.user.id
            console.log(`[global-setup] Usuario creado: ${user.email}`)
        }

        // Upsert profile con tenant y rol correctos
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
                {
                    id: userId,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    email: user.email,
                    tenant_id: TENANT_ID,
                    role: user.role,
                    is_active: true,
                },
                { onConflict: 'id' }
            )

        if (profileError) {
            console.error(`[global-setup] Error en profile ${user.email}:`, profileError.message)
        }
    }
}

export default globalSetup
