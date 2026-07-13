import { Separator } from '@/components/ui/separator'
import { getColaboradoresEpp, getCatalogoEpp } from '@/lib/actions/epp'
import { EntregaForm } from './entrega-form'

export default async function NuevaEntregaPage() {
    const [colaboradores, catalogo] = await Promise.all([
        getColaboradoresEpp(),
        getCatalogoEpp({ onlyActive: true }),
    ])

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">EPP · Nueva entrega</h2>
                <p className="text-muted-foreground">
                    Registrá los EPP entregados a un colaborador. Las fechas de vencimiento se calculan desde la vida útil del catálogo.
                </p>
            </div>
            <Separator />
            <EntregaForm colaboradores={colaboradores as any[]} catalogo={catalogo as any[]} />
        </div>
    )
}
