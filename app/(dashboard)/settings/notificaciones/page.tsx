import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { Bell } from 'lucide-react'
import { getSupabaseContext } from '@/lib/action-context'
import { getEppNotifConfig } from '@/lib/actions/notificaciones-config'
import { EppNotifForm } from '@/components/settings/epp-notif-form'

export default async function SettingsNotificacionesPage() {
    const { adminClient, user, tenantId } = await getSupabaseContext()
    if (!adminClient || !user) redirect('/login')

    const [eppConfig, usersResult] = await Promise.all([
        getEppNotifConfig(),
        tenantId
            ? adminClient
                .from('profiles')
                .select('id, first_name, last_name, role')
                .eq('tenant_id', tenantId)
                .in('role', ['admin_tenant', 'supervisor', 'reporta_admin'])
                .eq('is_active', true)
                .order('first_name')
            : Promise.resolve({ data: [], error: null }),
    ])

    const tenantUsers = (usersResult.data ?? []) as {
        id: string
        first_name: string | null
        last_name: string | null
        role: string | null
    }[]

    return (
        <div className="flex flex-col h-full space-y-6 p-8 max-w-2xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Bell className="h-6 w-6 text-orange-500" />
                    Configuración de Notificaciones
                </h2>
                <p className="text-muted-foreground mt-1">
                    Define quién recibe alertas automáticas de cada módulo.
                </p>
            </div>

            <Separator />

            <div className="space-y-2">
                <h3 className="font-semibold text-base">EPP — Observaciones de operarios</h3>
                <p className="text-sm text-muted-foreground">
                    Cuando un operario confirma la recepción de EPP con ítems observados desde la app,
                    se notifica por email a las personas seleccionadas.
                </p>
            </div>

            <EppNotifForm
                users={tenantUsers}
                initialSelected={eppConfig.epp_notificar_observaciones_a}
            />
        </div>
    )
}
