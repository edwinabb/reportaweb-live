import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { getSupabaseContext } from '@/lib/action-context'
import { getConfigValorizacionVenta, getConfigValorizacionCompra } from '@/lib/actions/valorizaciones-config'
import { ValorizacionesConfigTabs } from './valorizaciones-config-tabs'

export default async function SettingsValorizacionesPage() {
    const { adminClient, user } = await getSupabaseContext()
    if (!adminClient || !user) redirect('/login')

    const [configVenta, configCompra] = await Promise.all([
        getConfigValorizacionVenta(),
        getConfigValorizacionCompra(),
    ])

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Configuración de Valorizaciones</h2>
                <p className="text-muted-foreground">
                    Parámetros financieros (IGV, detracción) y header del formato para PDFs de Valorización de Venta y Compra.
                </p>
            </div>
            <Separator />

            <ValorizacionesConfigTabs
                configVenta={configVenta}
                configCompra={configCompra}
            />
        </div>
    )
}
