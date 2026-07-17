import { getTerceroSitios } from "@/lib/actions/terceros-modules"
import { getTercerosForSelect } from "@/lib/actions/terceros"
import { SitiosClientPage } from "./client-page"
import { PageDescription } from "@/components/ui/page-description"

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
            <h1 className="sr-only">Sitios de Terceros</h1>
            <PageDescription>
                Sitios de trabajo asociados a las empresas terceras. Buscá por nombre, código
                o empresa, filtrá por tipo o empresa, exportá a Excel y registrá nuevos sitios.
            </PageDescription>
            <SitiosClientPage sitios={sitios} terceros={terceros} isTrash={isTrash} />
        </div>
    )
}
