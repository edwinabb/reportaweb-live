import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Plus, ArrowLeft } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { getStockColaborador, getMovimientosColaborador, getColaboradoresEpp, getEntregasByColaborador } from '@/lib/actions/epp'
import { StockColaboradorClient } from './page-client'
import { EntregasColaboradorPanel } from '@/components/epp/entregas-colaborador-panel'

export default async function StockColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const [colaboradores, stock, movimientos, entregas] = await Promise.all([
        getColaboradoresEpp(),
        getStockColaborador(id),
        getMovimientosColaborador(id, { limit: 100 }),
        getEntregasByColaborador(id),
    ])

    const colaborador = (colaboradores as any[]).find((c) => c.id === id)
    if (!colaborador) notFound()

    const fullName = [colaborador.first_name, colaborador.last_name].filter(Boolean).join(' ')

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/epp" className="hover:text-foreground flex items-center gap-1">
                            <ArrowLeft className="h-3 w-3" /> EPP
                        </Link>
                        <span>/</span>
                        <span>Stock por colaborador</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{fullName}</h2>
                    <p className="text-muted-foreground">
                        {colaborador.cargo || 'Sin cargo'} · {colaborador.dni ? `DNI ${colaborador.dni}` : 'Sin DNI'}
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/epp/entrega/nueva?colaborador=${id}`}>
                        <Plus className="h-4 w-4 mr-2" /> Nueva entrega
                    </Link>
                </Button>
            </div>

            <Separator />

            <StockColaboradorClient stock={stock as any[]} movimientos={movimientos as any[]} />
            <EntregasColaboradorPanel entregas={entregas} />
        </div>
    )
}
