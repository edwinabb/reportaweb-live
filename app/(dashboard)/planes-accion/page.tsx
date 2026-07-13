import { Suspense } from 'react'
import { getPlanesAccion, getPlanesStats } from '@/lib/actions/planes'
import { PlanesTable } from '@/components/planes/planes-table'
import { columns } from '@/components/planes/planes-columns'
import { PlanesStats } from '@/components/planes/planes-stats'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

export default async function PlanesAccionPage() {
    const [planes, stats] = await Promise.all([
        getPlanesAccion({ onlyActive: true }),
        getPlanesStats(),
    ])

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <h1 className="text-2xl font-semibold tracking-tight">Planes de acción</h1>
            <PlanesStats stats={stats} />

            <Separator />

            <div className="flex-1">
                <Suspense fallback={<div>Cargando planes...</div>}>
                    <PlanesTable columns={columns} data={planes} />
                </Suspense>
            </div>
        </div>
    )
}
