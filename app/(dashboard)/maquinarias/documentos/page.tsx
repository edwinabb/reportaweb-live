import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getMaquinarias } from "@/lib/actions/maquinarias"
import { getMaquinariaTipos } from "@/lib/actions/maquinaria-types"
import { getGlobalDocuments } from "@/lib/actions/maquinaria-docs"
import { DocumentosGlobalesClientPage, type DocGlobal } from "./client-page"

export default async function GlobalDocumentsPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    // getGlobalDocuments(onlyActive)
    const OnlyActive = !isTrash

    const [maquinarias, tipos, documentos] = await Promise.all([
        getMaquinarias(),
        getMaquinariaTipos(),
        getGlobalDocuments(OnlyActive)
    ])

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
                        <BreadcrumbPage>Documentos Globales</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <DocumentosGlobalesClientPage
                documentos={documentos as unknown as DocGlobal[]}
                maquinarias={maquinarias}
                tipos={tipos}
                isTrash={isTrash}
            />
        </div>
    )
}
