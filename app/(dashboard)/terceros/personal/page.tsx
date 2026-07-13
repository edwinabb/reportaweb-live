
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getTerceroPersonal } from "@/lib/actions/terceros-modules"
import { getTerceros } from "@/lib/actions/terceros"
import { PersonalClientPage } from "./client-page"

interface PageProps {
    searchParams: Promise<{ view?: string }>
}

export default async function PersonalPage({ searchParams }: PageProps) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    const personal = await getTerceroPersonal(!isTrash)
    const terceros = await getTerceros()

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
                        <BreadcrumbPage>Personal</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <PersonalClientPage personal={personal} terceros={terceros} isTrash={isTrash} />
        </div>
    )
}
