import { Suspense } from 'react'
import { getCotizaciones } from '@/lib/actions/cotizaciones'
import { Skeleton } from '@/components/ui/skeleton'
import { CotizacionesTable } from '@/components/cotizaciones/cotizaciones-table'

async function CotizacionesList({ onlyActive }: { onlyActive: boolean }) {
    // Fetch all or filtered?
    // getCotizaciones(term, onlyActive)
    // If onlyActive is true, it returns active.
    // If onlyActive is false, it returns ALL (based on previous analysis).
    // So we need to filter manually if we want ONLY trash.
    const allData = await getCotizaciones(undefined, false)

    const filteredData = onlyActive
        ? allData.filter((c: { is_active: boolean }) => c.is_active)
        : allData.filter((c: { is_active: boolean }) => !c.is_active)

    return (
        <CotizacionesTable data={filteredData} />
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
