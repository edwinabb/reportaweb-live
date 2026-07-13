'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { seedDemoData, type FleetType } from '@/lib/trial-seed'
import { setupTenantConfig } from '@/lib/actions/onboarding'
import { sendEmail } from '@/lib/email'
import { renderTrialEmailDia1 } from '@/lib/trial-email-templates'

// captureWithContext does not exist in lib/sentry.ts — using console.error instead
// (CLAUDE.md references it but it has not been implemented yet)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterTrialInput {
    adminName:   string   // full name
    email:       string
    password:    string
    companyName: string
    country:     string
    fleetType:   FleetType | null
    fleetSize:   number | null
}

export interface RegisterTrialResult {
    success: boolean
    error?:  string
}

// ─── registerTrial ────────────────────────────────────────────────────────────

export async function registerTrial(input: RegisterTrialInput): Promise<RegisterTrialResult> {
    const adminClient = createAdminClient()

    try {
        // 1. Check if email already exists in profiles
        const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', input.email)
            .maybeSingle()

        if (existingProfile) {
            return { success: false, error: 'Este email ya está registrado.' }
        }

        // 2. Create company
        const now = new Date()
        const trialExpiry = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)

        const { data: company, error: companyError } = await adminClient
            .from('companies')
            .insert({
                name:              input.companyName,
                ubicacion_pais:    input.country,
                is_active:         true,
                trial_status:      'active',
                trial_start_at:    now.toISOString(),
                trial_expires_at:  trialExpiry.toISOString(),
                fleet_type:        input.fleetType,
                fleet_size:        input.fleetSize,
                timezone:          'America/Lima',
            })
            .select('id')
            .single()

        if (companyError || !company) {
            throw new Error(`Error creando empresa: ${companyError?.message ?? 'sin datos'}`)
        }

        // 3. Create Supabase Auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email:          input.email,
            password:       input.password,
            email_confirm:  true,
        })

        // 4. On auth error: rollback company
        if (authError || !authData.user) {
            await adminClient.from('companies').delete().eq('id', company.id)
            return { success: false, error: authError?.message ?? 'Error creando usuario.' }
        }

        // 5. Create profile
        const nameParts   = input.adminName.trim().split(/\s+/)
        const firstName   = nameParts[0] ?? ''
        const lastName    = nameParts.slice(1).join(' ')

        const { error: profileError } = await adminClient
            .from('profiles')
            .insert({
                id:         authData.user.id,
                tenant_id:  company.id,
                first_name: firstName,
                last_name:  lastName,
                email:      input.email,
                role:       'admin_tenant',
            })

        if (profileError) {
            // Rollback: delete auth user and company
            await adminClient.auth.admin.deleteUser(authData.user.id)
            await adminClient.from('companies').delete().eq('id', company.id)
            throw new Error(`Error creando perfil: ${profileError.message}`)
        }

        // 6. Seed demo data
        await seedDemoData({
            tenantId:    company.id,
            fleetType:   input.fleetType,
            companyName: input.companyName,
            adminUserId: authData.user.id,
        })

        // 7. Setup tenant config
        await setupTenantConfig(company.id)

        // 8. Send Day 1 email and log it
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://web.reportar.app'}/planificacion`
        const { subject, html } = renderTrialEmailDia1({
            adminName:   input.adminName,
            companyName: input.companyName,
            fleetType:   input.fleetType,
            dashboardUrl,
        })

        const emailResult = await sendEmail({ to: input.email, subject, html })

        if (emailResult.success) {
            await adminClient.from('trial_emails_log').insert({
                tenant_id: company.id,
                dia:       1,
            })
        }

        // 9. Return success
        return { success: true }

    } catch (e: unknown) {
        // 10. Catch-all error handler
        const message = e instanceof Error ? e.message : String(e)
        console.error('[registerTrial]', e)
        return { success: false, error: message }
    }
}

// ─── extendTrial ──────────────────────────────────────────────────────────────

export async function extendTrial(tenantId: string, days = 7): Promise<void> {
    const adminClient = createAdminClient()

    const { data: company, error } = await adminClient
        .from('companies')
        .select('trial_expires_at')
        .eq('id', tenantId)
        .single()

    if (error || !company) {
        throw new Error(`extendTrial: empresa no encontrada — ${error?.message ?? 'sin datos'}`)
    }

    const now           = Date.now()
    const currentExpiry = company.trial_expires_at ? new Date(company.trial_expires_at).getTime() : now
    const baseTime      = Math.max(currentExpiry, now)
    const newExpiry     = new Date(baseTime + days * 24 * 60 * 60 * 1000)

    const { error: updateError } = await adminClient
        .from('companies')
        .update({
            trial_expires_at: newExpiry.toISOString(),
            trial_status:     'active',
        })
        .eq('id', tenantId)

    if (updateError) {
        throw new Error(`extendTrial: error actualizando — ${updateError.message}`)
    }
}

// ─── convertTrial ─────────────────────────────────────────────────────────────

export async function convertTrial(tenantId: string): Promise<void> {
    const adminClient = createAdminClient()

    const { error } = await adminClient
        .from('companies')
        .update({
            trial_status:    'converted',
            trial_expires_at: null,
        })
        .eq('id', tenantId)

    if (error) {
        throw new Error(`convertTrial: error actualizando — ${error.message}`)
    }
}

// ─── requestTrialExtension ───────────────────────────────────────────────────

export async function requestTrialExtension(tenantId: string, adminEmail: string): Promise<void> {
    // Extend by 3 days
    await extendTrial(tenantId, 3)

    // Notify internal admin
    const notifyEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'info@reportar.app'

    await sendEmail({
        to:      notifyEmail,
        subject: `[Trial] Solicitud de extensión — ${adminEmail}`,
        html:    `<p>El usuario <strong>${adminEmail}</strong> (tenant: <code>${tenantId}</code>) ha solicitado una extensión de trial.</p><p>Se han añadido 3 días automáticamente.</p>`,
    })
}
