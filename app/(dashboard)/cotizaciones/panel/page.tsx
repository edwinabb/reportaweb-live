import { Suspense } from 'react'
import { getCotizacionesDashboardStats } from '@/lib/actions/cotizaciones'
import { Skeleton } from '@/components/ui/skeleton'
import { CotizacionesPanel } from '@/components/cotizaciones/cotizaciones-panel'

async function PanelContent({ month }: { month?: number }) {
    const stats = await getCotizacionesDashboardStats({ month })
    if (!stats) {
        return <p className="text-sm text-muted-foreground">No se pudo cargar el panel.</p>
    }
    return <CotizacionesPanel stats={stats} />
}

export default async function PanelCotizacionesPage({
    searchParams,
}: {
    searchParams: Promise<{ mes?: string }>
}) {
    const params = await searchParams
    const month = params.mes ? parseInt(params.mes, 10) : undefined

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Panel de Cotizaciones</h1>
            <Suspense fallback={<Skeleton className="h-[700px] w-full" />}>
                <PanelContent month={month} />
            </Suspense>
        </div>
    )
}
