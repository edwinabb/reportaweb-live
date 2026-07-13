import { getJobTitles } from '@/lib/actions/job-titles'
import { getPermisosParaCargo, seedPermisosParaCargo } from '@/lib/actions/permisos'
import { PermisosCargoConfig } from '@/components/sistema/permisos-cargo-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function PermisosCargoPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!['reporta_admin', 'admin_tenant'].includes(profile?.role ?? '')) redirect('/')

    const cookieStore = await cookies()
    // reporta_admin: usa managed_tenant_id (seleccionado en /sistema) o cae a su propio tenant
    // admin_tenant: usa su propio tenant_id del perfil
    const tenantId = cookieStore.get('managed_tenant_id')?.value
        ?? (profile as any)?.tenant_id
        ?? ''

    const { data: cargos } = await getJobTitles(false, tenantId || undefined)   // incluye inactivos

    const primerCargoId = cargos?.[0]?.id ?? ''
    let initialPermisos = primerCargoId
        ? await getPermisosParaCargo(primerCargoId)
        : []

    // Auto-inicializar si el cargo existe pero no tiene permisos configurados
    if (primerCargoId && tenantId && initialPermisos.length === 0) {
        await seedPermisosParaCargo(primerCargoId, tenantId)
        initialPermisos = await getPermisosParaCargo(primerCargoId)
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-lg font-semibold">Permisos por Cargo</h1>
                <p className="text-sm text-muted-foreground">
                    Configure qué módulos puede ver y usar cada cargo.
                    Los cambios se reflejan en el menú y las rutas al siguiente login
                    (o cuando expire la cookie de sesión, aprox. 1 hora).
                </p>
            </div>

            <PermisosCargoConfig
                cargos={cargos ?? []}
                initialCargoId={primerCargoId}
                initialPermisos={initialPermisos}
                tenantId={tenantId}
            />
        </div>
    )
}
