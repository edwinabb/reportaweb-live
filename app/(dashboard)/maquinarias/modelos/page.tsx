import { getMaquinariaModelos } from "@/lib/actions/maquinaria-models"
import { ModelosClientPage } from "./client-page"
import { PageDescription } from "@/components/ui/page-description"

export default async function ModelosPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const isTrash = params.view === 'trash'
    const OnlyActive = !isTrash

    const modelos = await getMaquinariaModelos(OnlyActive)

    return (
        <div className="flex flex-col gap-4">
            <h1 className="sr-only">Modelos de Maquinaria</h1>
            <PageDescription>
                Catálogo de modelos de equipos (marca, tipo y capacidad) que se asignan a las maquinarias.
                Buscá por modelo, marca o tipo, filtrá por columna y creá nuevos modelos.
            </PageDescription>

            <ModelosClientPage modelos={modelos} isTrash={isTrash} />
        </div>
    )
}
