import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getMaquinariaTipos } from "@/lib/actions/maquinaria-types"
import { TypesClientPage } from "./client-page"

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
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/maquinarias">Equipos</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Tipos de Documentos</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <TypesClientPage
                tipos={tipos}
                isTrash={isTrash}
                categories={categories}
                models={models}
            />
        </div>
    )
}
