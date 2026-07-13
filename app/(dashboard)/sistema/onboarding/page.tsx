import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTenants } from '@/lib/actions/tenants'
import { getTenantOnboardingStatus } from '@/lib/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, ArrowRight } from 'lucide-react'
import { TrialsTable, type TrialRow } from '@/components/sistema/onboarding/trials-table'

export default async function OnboardingListPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'reporta_admin') redirect('/planificacion')

    const companies = await getTenants()

    // Fetch onboarding status for each company in parallel
    const statuses = await Promise.all(
        companies.map(c => getTenantOnboardingStatus(c.id).then(s => ({ id: c.id, ...s })))
    )
    const statusMap = Object.fromEntries(statuses.map(s => [s.id, s]))

    // Fetch trial companies
    const { data: trialCompanies } = await supabase
        .from('companies')
        .select('id, name, fleet_type, fleet_size, trial_status, trial_start_at, trial_expires_at')
        .not('trial_status', 'is', null)
        .order('trial_start_at', { ascending: false })

    // Fetch admin profiles for trial tenants
    let trialRows: TrialRow[] = []
    if (trialCompanies && trialCompanies.length > 0) {
        const tenantIds = trialCompanies.map(c => c.id)
        const { data: adminProfiles } = await supabase
            .from('profiles')
            .select('tenant_id, email, first_name, last_name')
            .in('tenant_id', tenantIds)
            .eq('role', 'admin_tenant')

        const adminMap: Record<string, { email: string | null; name: string | null }> = {}
        for (const p of adminProfiles ?? []) {
            if (p.tenant_id && !adminMap[p.tenant_id]) {
                const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || null
                adminMap[p.tenant_id] = { email: p.email ?? null, name }
            }
        }

        trialRows = trialCompanies.map(c => ({
            id: c.id,
            name: c.name ?? '',
            fleet_type: c.fleet_type ?? null,
            fleet_size: c.fleet_size ?? null,
            trial_status: c.trial_status ?? '',
            trial_start_at: c.trial_start_at ?? null,
            trial_expires_at: c.trial_expires_at ?? null,
            adminEmail: adminMap[c.id]?.email ?? null,
            adminName: adminMap[c.id]?.name ?? null,
        }))
    }

    const activeTrialCount = trialRows.filter(
        t => t.trial_status === 'active'
    ).length

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Onboarding de Nuevos Clientes</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Crea y configura nuevos tenants paso a paso.
                    </p>
                </div>
                <Link href="/sistema/onboarding/nuevo">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo tenant
                    </Button>
                </Link>
            </div>

            {companies.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No hay empresas registradas aún.</p>
                    <Link href="/sistema/onboarding/nuevo" className="mt-3 inline-block">
                        <Button variant="outline" size="sm">Crear el primer tenant</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {companies.map(company => {
                        const status = statusMap[company.id]
                        const stepsTotal = 6
                        const stepsDone = [
                            status?.step1Done,
                            status?.step2Done,
                            status?.step3Done,
                            status?.step4Done,
                            status?.step5Done,
                            status?.step6Done,
                        ].filter(Boolean).length

                        const nextStep = !status?.step1Done ? 1
                            : !status?.step2Done ? 2
                                : !status?.step3Done ? 3
                                    : !status?.step4Done ? 4
                                        : !status?.step5Done ? 5
                                            : !status?.step6Done ? 6
                                                : null

                        const isComplete = stepsDone >= 2 // pasos 1 y 2 son obligatorios

                        return (
                            <Card key={company.id}>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div>
                                        <CardTitle className="text-sm font-medium">{company.name}</CardTitle>
                                        {company.ruc && (
                                            <CardDescription className="text-xs mt-0.5">RUC: {company.ruc}</CardDescription>
                                        )}
                                    </div>
                                    <Badge variant={isComplete ? 'default' : 'secondary'} className="text-xs shrink-0 ml-2">
                                        {stepsDone}/{stepsTotal} pasos
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 rounded-full bg-muted mb-3">
                                        <div
                                            className="h-1.5 rounded-full bg-primary transition-all"
                                            style={{ width: `${(stepsDone / stepsTotal) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/sistema/onboarding/${company.id}?step=${nextStep ?? 1}`} className="flex-1">
                                            <Button size="sm" variant={nextStep ? 'default' : 'outline'} className="w-full">
                                                {nextStep ? 'Continuar' : 'Ver detalle'}
                                                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* ── Trials section ─────────────────────────────────────────────── */}
            <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold">Trials</h2>
                    {activeTrialCount > 0 && (
                        <Badge variant="secondary">{activeTrialCount} activo{activeTrialCount !== 1 ? 's' : ''}</Badge>
                    )}
                </div>
                <TrialsTable trials={trialRows} />
            </div>
        </div>
    )
}
