
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getTerceroSitios } from "@/lib/actions/terceros-modules"
import { getTercerosForSelect } from "@/lib/actions/terceros"
import { SitiosClientPage } from "./client-page"

interface PageProps {
    searchParams: Promise<{ view?: string }>
}

export default async function SitiosPage({ searchParams }: PageProps) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    const sitios = await getTerceroSitios(!isTrash)
    const terceros = await getTercerosForSelect()

    return (
        <div className="flex flex-col gap-4">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/terceros">Terceros</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Sitios</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <SitiosClientPage sitios={sitios} terceros={terceros} isTrash={isTrash} />
        </div>
    )
}
