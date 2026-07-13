import { NuevaTareaForm } from '@/components/planificacion/nueva-tarea-form'
import { getPersonal, getMaquinaria, getTareaById } from '@/lib/actions/planificacion'
import { getTerceros } from '@/lib/actions/terceros'
import { getPersonalCargos } from '@/lib/actions/catalogos'

interface PageProps {
    searchParams: Promise<{ tarea?: string; fecha?: string }>
}

export default async function NuevaTareaPage({ searchParams }: PageProps) {
    const params = await searchParams
    const [personal, maquinaria, clientes, proveedores, cargos, tareaToEdit] = await Promise.all([
        getPersonal(),
        getMaquinaria(),
        getTerceros('', true, 'CLIENTE'),
        getTerceros('', true, 'PROVEEDOR'),
        getPersonalCargos(),
        params.tarea ? getTareaById(params.tarea) : Promise.resolve(null),
    ])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center">
                <div className="w-full max-w-5xl">
                    <div className="rounded-lg border p-6 bg-background">
                        <NuevaTareaForm
                            personalList={personal}
                            maquinariaList={maquinaria}
                            clientes={clientes}
                            proveedores={proveedores}
                            cargos={cargos}
                            tareaToEdit={tareaToEdit ?? undefined}
                            fechaInicio={params.fecha}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
