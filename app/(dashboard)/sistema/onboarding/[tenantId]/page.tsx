import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getTenantOnboardingStatus } from '@/lib/actions/onboarding'
import { WizardShell, type StepDef } from '@/components/sistema/onboarding/wizard-shell'
import { StepEmpresa } from '@/components/sistema/onboarding/step-empresa'
import { StepUsuarios } from '@/components/sistema/onboarding/step-usuarios'
import { StepTerceros } from '@/components/sistema/onboarding/step-terceros'
import { StepMaquinaria } from '@/components/sistema/onboarding/step-maquinaria'
import { StepServicios } from '@/components/sistema/onboarding/step-servicios'
import { StepConfig } from '@/components/sistema/onboarding/step-config'

type Props = {
    params: Promise<{ tenantId: string }>
    searchParams: Promise<{ step?: string }>
}

export default async function OnboardingTenantPage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'reporta_admin') redirect('/planificacion')

    const { tenantId } = await params
    const { step } = await searchParams
    const currentStep = Math.max(1, Math.min(6, parseInt(step || '1') || 1))

    // Fetch company name
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )
    const { data: company } = await admin.from('companies').select('name, trial_status').eq('id', tenantId).single()
    if (!company) redirect('/sistema/onboarding')
    const isTrial = company?.trial_status === 'active'

    const status = await getTenantOnboardingStatus(tenantId)

    const steps: StepDef[] = [
        { number: 1, name: 'Empresa y Admin', required: true, done: status.step1Done && status.step2Done },
        { number: 2, name: 'Usuarios', required: true, done: status.step2Done },
        { number: 3, name: 'Terceros', required: false, done: status.step4Done },
        { number: 4, name: 'Maquinaria', required: false, done: status.step5Done },
        { number: 5, name: 'Servicios', required: false, done: status.step6Done },
        { number: 6, name: 'Configuración', required: false, done: status.configDone },
    ]

    return (
        <WizardShell
            tenantId={tenantId}
            tenantName={company.name}
            currentStep={currentStep}
            steps={steps}
        >
            {currentStep === 1 && <StepEmpresa tenantId={tenantId} />}
            {currentStep === 2 && <StepUsuarios tenantId={tenantId} isTrial={isTrial} />}
            {currentStep === 3 && <StepTerceros tenantId={tenantId} />}
            {currentStep === 4 && <StepMaquinaria tenantId={tenantId} isTrial={isTrial} />}
            {currentStep === 5 && <StepServicios tenantId={tenantId} isTrial={isTrial} />}
            {currentStep === 6 && <StepConfig tenantId={tenantId} />}
        </WizardShell>
    )
}
