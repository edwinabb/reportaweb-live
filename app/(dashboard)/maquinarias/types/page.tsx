import { getMaquinariaTipos } from "@/lib/actions/maquinaria-types"
import { TypesClientPage } from "./client-page"
import { PageDescription } from "@/components/ui/page-description"

export default async function MaquinariaTypesPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const isTrash = params.view === 'trash'
    const OnlyActive = !isTrash

    const tipos = await getMaquinariaTipos(OnlyActive)

    // Fetch helper data
    const { getMaquinariaCategorias, getMaquinariaModelosList } = await import("@/lib/actions/maquinaria-types")
    const categories = await getMaquinariaCategorias()
    const models = await getMaquinariaModelosList()

    return (
        <div className="flex flex-col gap-4">
            <h1 className="sr-only">Tipos de Documentos de Maquinaria</h1>
            <PageDescription>
                Tipos de documentos exigibles a la maquinaria (seguros, certificados, revisiones).
                Buscá por nombre, filtrá por vencimiento u obligatoriedad y definí nuevos tipos.
            </PageDescription>

            <TypesClientPage
                tipos={tipos}
                isTrash={isTrash}
                categories={categories}
                models={models}
            />
        </div>
    )
}
