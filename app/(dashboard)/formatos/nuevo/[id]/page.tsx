import { getPlantillaById } from '@/lib/actions/plantillas'
import { getMaquinarias } from '@/lib/actions/maquinarias'
import { getConfigChecklist } from '@/lib/actions/informes-config'
import { DynamicInspectionForm } from '@/components/formatos/dynamic-inspection-form'
import { notFound } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tarea_id?: string }>
}

export default async function LlenarInspeccionPage(props: Props) {
    const [params, searchParams] = await Promise.all([props.params, props.searchParams])
    const [plantilla, maquinarias, configChecklist] = await Promise.all([
        getPlantillaById(params.id),
        getMaquinarias('', true),
        getConfigChecklist(),
    ])

    if (!plantilla) return notFound()

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-orange-600">
                    {plantilla.nombre}
                </h2>
                <p className="text-muted-foreground">
                    {plantilla.descripcion}
                </p>
            </div>

            <Separator className="bg-orange-200" />

            <div className="flex-1 max-w-5xl mx-auto w-full">
                <DynamicInspectionForm
                    maquinarias={maquinarias}
                    plantillaId={plantilla.id}
                    templateStructure={plantilla.estructura as any}
                    tareaId={searchParams.tarea_id}
                    configChecklist={configChecklist}
                />
            </div>
        </div>
    )
}
