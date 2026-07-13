import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { getSupabaseContext } from '@/lib/action-context'
import {
    getConfigInformeMaquinaria,
    getConfigInformePersonal,
    getConfigChecklist,
} from '@/lib/actions/informes-config'
import { InformesConfigTabs } from './informes-config-tabs'

export default async function SettingsInformesPage() {
    const { adminClient, user, tenantId } = await getSupabaseContext()
    if (!adminClient || !user) redirect('/login')

    const [configMaquinaria, configPersonal, configChecklist, usersResult] = await Promise.all([
        getConfigInformeMaquinaria(),
        getConfigInformePersonal(),
        getConfigChecklist(),
        tenantId
            ? adminClient
                .from('profiles')
                .select('id, first_name, last_name, role')
                .eq('tenant_id', tenantId)
                .in('role', ['admin_tenant', 'supervisor', 'reporta_admin'])
                .order('first_name')
            : Promise.resolve({ data: [], error: null }),
    ])

    const tenantUsers = (usersResult?.data ?? []) as {
        id: string
        first_name: string | null
        last_name: string | null
        role: string | null
    }[]

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Configuración de Informes</h2>
                <p className="text-muted-foreground">
                    Controlá qué secciones aparecen en los reportes de Maquinaria, Personal y Checklist.
                    La configuración afecta el formulario web, la app móvil y el PDF generado.
                </p>
            </div>
            <Separator />

            <InformesConfigTabs
                configMaquinaria={configMaquinaria}
                configPersonal={configPersonal}
                configChecklist={configChecklist}
                tenantUsers={tenantUsers}
            />
        </div>
    )
}
