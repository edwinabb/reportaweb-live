import { Suspense } from 'react'
import { getPlanesAccion, getPlanesStats } from '@/lib/actions/planes'
import { PlanesTable } from '@/components/planes/planes-table'
import { PlanesStats } from '@/components/planes/planes-stats'
import { Separator } from '@/components/ui/separator'
import type { ColumnFilterOption } from '@/components/ui/column-filter-header'

export const dynamic = 'force-dynamic'

const ESTADO_OPTIONS: ColumnFilterOption[] = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'En proceso', value: 'EN_PROCESO' },
    { label: 'Revisión', value: 'REVISION' },
    { label: 'Cerrado', value: 'CERRADO' },
    { label: 'Verificado', value: 'VERIFICADO' },
    { label: 'Rechazado', value: 'RECHAZADO' },
]

const PRIORIDAD_OPTIONS: ColumnFilterOption[] = [
    { label: 'Crítica', value: 'CRITICA' },
    { label: 'Alta', value: 'ALTA' },
    { label: 'Media', value: 'MEDIA' },
    { label: 'Baja', value: 'BAJA' },
]

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
                    <PlanesTable
                        data={planes}
                        estadoOptions={ESTADO_OPTIONS}
                        prioridadOptions={PRIORIDAD_OPTIONS}
                    />
                </Suspense>
            </div>
        </div>
    )
}
