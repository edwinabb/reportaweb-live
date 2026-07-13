import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { StepEmpresa } from '@/components/sistema/onboarding/step-empresa'

export default async function NuevoTenantPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'reporta_admin') redirect('/planificacion')

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Nuevo tenant</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                    Completa los datos de la empresa y el usuario administrador para comenzar el onboarding.
                </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
                <StepEmpresa />
            </div>
        </div>
    )
}
