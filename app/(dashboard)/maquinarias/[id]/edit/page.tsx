
import { Suspense } from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getMaquinariaById } from "@/lib/actions/maquinarias"
import { getTerceros } from "@/lib/actions/terceros"
import { getMaquinariaModelos } from "@/lib/actions/maquinaria-models"
import { getMaquinariaDocumentos } from "@/lib/actions/maquinaria-docs"
import { getMaquinariaTipos } from "@/lib/actions/maquinaria-types"
import { notFound } from "next/navigation"
import { MaquinariaEditClient } from "./client-edit-page"

interface EditMaquinariaPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditMaquinariaPage({ params }: EditMaquinariaPageProps) {
    const { id } = await params

    // Parallel fetching
    const [maquinaria, proveedores, modelos, documentos, tiposDocs] = await Promise.all([
        getMaquinariaById(id),
        getTerceros(), // Fetch all terceros
        getMaquinariaModelos(false), // Fetch ALL models (including inactive) to ensure we find the assigned one
        getMaquinariaDocumentos(id),
        getMaquinariaTipos(true)
    ])

    if (!maquinaria) {
        notFound()
    }

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
                        <BreadcrumbPage>Editar Equipo</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <MaquinariaEditClient
                initialData={maquinaria}
                proveedores={proveedores}
                modelos={modelos}
                documentos={documentos}
                tiposDocs={tiposDocs}
            />
        </div>
    )
}
