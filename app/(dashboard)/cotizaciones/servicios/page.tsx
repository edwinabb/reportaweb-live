import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getServicios } from "@/lib/actions/servicios"
import { ServiciosClientPage } from "./client-page"

export default async function ServiciosPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const isTrash = params.view === 'trash'
    // For services, we want to replicate the Maquinaria pattern:
    // If trash view, fetch all (or only inactive if supported)
    // Looking at getServicios: if onlyActive is false, it fetches ALL (no filter).
    // So we pass !isTrash (false) if viewing trash, getting ALL.
    // Client page will filter.
    const OnlyActive = !isTrash

    const servicios = await getServicios(undefined, undefined, OnlyActive)

    return (
        <div className="flex flex-col gap-4">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/cotizaciones">Cotizaciones</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Servicios</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <ServiciosClientPage servicios={servicios} isTrash={isTrash} />
        </div>
    )
}
