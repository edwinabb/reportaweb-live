import { getNotificacionesReceptores } from '@/lib/actions/notificaciones'
import { ReceptoresTable } from '@/components/notificaciones/receptores-table'
import { AddReceptorDialog } from '@/components/notificaciones/add-receptor-dialog'

export default async function NotificacionesPage() {
    const receptores = await getNotificacionesReceptores()

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Notificaciones</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Receptores de correos automáticos del sistema
                    </p>
                </div>
                <AddReceptorDialog />
            </div>
            <ReceptoresTable receptores={receptores} />
        </div>
    )
}
