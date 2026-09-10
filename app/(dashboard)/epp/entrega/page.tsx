import { listEntregas } from '@/lib/actions/epp'
import { EntregaListadoClient } from './entrega-listado-client'

export default async function EppEntregaListadoPage() {
    const entregas = await listEntregas({ limit: 200 })
    return (
        <div className="p-8 space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">EPP · Documentos de Entrega</h2>
                <p className="text-muted-foreground">Historial de entregas de EPP registradas.</p>
            </div>
            <EntregaListadoClient entregas={entregas} />
        </div>
    )
}
