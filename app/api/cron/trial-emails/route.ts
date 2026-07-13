// app/api/cron/trial-emails/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail } from '@/lib/email'
import {
    renderTrialEmailDia1,
    renderTrialEmailDia2,
    renderTrialEmailDia4,
    renderTrialEmailDia6,
    renderTrialEmailDia8,
    renderTrialEmailDia10,
    type TrialEmailData,
} from '@/lib/trial-email-templates'

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://web.reportar.app'
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const EMAIL_DAYS = [1, 2, 4, 6, 8, 10] as const

type EmailDay = (typeof EMAIL_DAYS)[number]

function renderEmail(
    dia: EmailDay,
    emailData: TrialEmailData,
    trialId: string,
    adminEmail: string
): { subject: string; html: string } {
    switch (dia) {
        case 1:  return renderTrialEmailDia1(emailData)
        case 2:  return renderTrialEmailDia2(emailData)
        case 4:  return renderTrialEmailDia4(emailData)
        case 6:  return renderTrialEmailDia6(emailData)
        case 8:  return renderTrialEmailDia8(emailData)
        case 10: return renderTrialEmailDia10({
            ...emailData,
            activateUrl: `${DASHBOARD_URL}/contacto?origen=trial&tenant=${trialId}`,
            extendUrl:   `${DASHBOARD_URL}/api/trial/extend-request?tenant=${trialId}&email=${encodeURIComponent(adminEmail)}`,
        })
    }
}

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // 1. Get all active trials
    const { data: trials, error: trialsError } = await adminClient
        .from('companies')
        .select('id, name, fleet_type, trial_start_at')
        .eq('trial_status', 'active')
        .not('trial_start_at', 'is', null)

    if (trialsError) {
        console.error('[trial-emails] Error fetching trials:', trialsError.message)
        return NextResponse.json({ ok: false, error: trialsError.message }, { status: 500 })
    }

    if (!trials?.length) {
        return NextResponse.json({ ok: true, sent: 0, skipped: 0, trials: 0 })
    }

    let sent    = 0
    let skipped = 0

    for (const trial of trials) {
        try {
            // 2. Get admin_tenant profile for this trial
            const { data: adminProfile } = await adminClient
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('tenant_id', trial.id)
                .eq('role', 'admin_tenant')
                .maybeSingle()

            if (!adminProfile?.email) {
                console.warn(`[trial-emails] No admin profile found for tenant ${trial.id}`)
                skipped++
                continue
            }

            const adminEmail = adminProfile.email
            const adminName  = [adminProfile.first_name, adminProfile.last_name]
                .filter(Boolean)
                .join(' ') || adminEmail

            const trialStartAt  = new Date(trial.trial_start_at!).getTime()
            const now           = Date.now()
            const daysElapsed   = Math.floor((now - trialStartAt) / ONE_DAY_MS)

            // 3. Get already-sent email days for this tenant
            const { data: sentLogs } = await adminClient
                .from('trial_emails_log')
                .select('dia')
                .eq('tenant_id', trial.id)

            const sentDays = new Set((sentLogs ?? []).map((r: { dia: number }) => r.dia))

            const emailData: TrialEmailData = {
                adminName,
                companyName:  trial.name ?? '',
                fleetType:    trial.fleet_type ?? null,
                dashboardUrl: `${DASHBOARD_URL}/planificacion`,
            }

            for (const dia of EMAIL_DAYS) {
                // Skip if not enough days have elapsed
                if (daysElapsed < dia) {
                    skipped++
                    continue
                }

                // Skip if already sent
                if (sentDays.has(dia)) {
                    skipped++
                    continue
                }

                // Render and send
                const { subject, html } = renderEmail(dia, emailData, trial.id, adminEmail)
                const result = await sendEmail({ to: adminEmail, subject, html })

                if (result.success) {
                    await adminClient.from('trial_emails_log').insert({
                        tenant_id: trial.id,
                        dia,
                    })
                    sent++
                } else {
                    console.error(`[trial-emails] Failed to send day ${dia} email to ${adminEmail}`)
                    skipped++
                }
            }
        } catch (err) {
            console.error(`[trial-emails] Error processing trial ${trial.id}:`, err)
        }
    }

    return NextResponse.json({ ok: true, sent, skipped, trials: trials.length })
}
