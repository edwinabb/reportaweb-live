import { Suspense } from 'react'
import { getCotizaciones, getCotizacionesEstadoCounts } from '@/lib/actions/cotizaciones'
import { Skeleton } from '@/components/ui/skeleton'
import { CotizacionesTable } from '@/components/cotizaciones/cotizaciones-table'

async function CotizacionesList({ onlyActive }: { onlyActive: boolean }) {
    // getCotizaciones ahora pagina (cap default 50). Para el listado completo
    // de activos/papelera se levanta el limit hasta 500 (ventana suficiente
    // para CISE/GRUAS). KPI counts siguen via getCotizacionesEstadoCounts.
    const [{ data: allData }, estadoCounts] = await Promise.all([
        getCotizaciones(undefined, false, { page: 1, limit: 500 }),
        getCotizacionesEstadoCounts(),
    ])

    const filteredData = onlyActive
        ? allData.filter((c: { is_active: boolean }) => c.is_active)
        : allData.filter((c: { is_active: boolean }) => !c.is_active)

    return (
        <CotizacionesTable data={filteredData} estadoCounts={estadoCounts} />
    )
}

export default async function CotizacionesPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const view = params.view || 'active'
    const onlyActive = view === 'active'

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Cotizaciones</h1>
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                <CotizacionesList onlyActive={onlyActive} />
            </Suspense>
        </div>
    )
}
