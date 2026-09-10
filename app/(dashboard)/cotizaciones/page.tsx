import { Suspense } from 'react'
import { getCotizaciones, getCotizacionesEstadoCounts } from '@/lib/actions/cotizaciones'
import { Skeleton } from '@/components/ui/skeleton'
import { CotizacionesTable } from '@/components/cotizaciones/cotizaciones-table'

async function CotizacionesList({ onlyActive }: { onlyActive: boolean }) {
    // Fetch all or filtered?
    // getCotizaciones(term, onlyActive)
    // If onlyActive is true, it returns active.
    // If onlyActive is false, it returns ALL (based on previous analysis).
    // So we need to filter manually if we want ONLY trash.
    // NOTA: getCotizaciones no pagina (cap de 1000 filas de PostgREST), por lo
    // que las KPI cards usan un conteo exacto aparte (getCotizacionesEstadoCounts)
    // en vez de contar sobre este array, que puede venir truncado.
    const [allData, estadoCounts] = await Promise.all([
        getCotizaciones(undefined, false),
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
