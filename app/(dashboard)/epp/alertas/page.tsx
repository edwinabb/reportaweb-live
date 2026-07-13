import { Separator } from '@/components/ui/separator'
import { getAlertasPendientes } from '@/lib/actions/epp'
import { AlertasClient } from './page-client'

export default async function AlertasPage() {
    const alertas = await getAlertasPendientes()

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">EPP · Alertas de vencimiento</h2>
                <p className="text-muted-foreground">
                    EPP vencidos o próximos a vencer. Gestioná cada alerta cuando hayas hecho el reemplazo.
                </p>
            </div>
            <Separator />
            <AlertasClient alertas={alertas as any[]} />
        </div>
    )
}
