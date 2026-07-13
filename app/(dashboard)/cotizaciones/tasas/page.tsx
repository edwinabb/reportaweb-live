import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getTasasCambio } from "@/lib/actions/tasas-cambio"
import { TasasClientPage } from "./client-page"

export const metadata = {
    title: 'Tasas de Cambio | Reporta',
    description: 'Gestión de tasas de cambio diarias',
}

export default async function TasasCambioPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    // getTasasCambio(origen, destino, fecha, onlyActive)
    const OnlyActive = !isTrash
    const tasas = await getTasasCambio(undefined, undefined, undefined, OnlyActive)

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
                        <BreadcrumbPage>Tasas de Cambio</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <TasasClientPage tasas={tasas} isTrash={isTrash} />
        </div>
    )
}
