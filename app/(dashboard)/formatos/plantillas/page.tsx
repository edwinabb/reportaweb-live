import { getPlantillas } from '@/lib/actions/plantillas'
import { PlantillasTable } from '@/components/formatos/plantillas/plantillas-table'
import { columns } from '@/components/formatos/plantillas/plantillas-columns'

export const dynamic = 'force-dynamic'

export default async function PlantillasPage() {
    const plantillas = await getPlantillas(false) // Including inactive (future feature)

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Plantillas</h2>
            </div>
            <PlantillasTable columns={columns} data={plantillas} />
        </div>
    )
}
