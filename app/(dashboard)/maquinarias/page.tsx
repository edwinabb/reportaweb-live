import { Suspense } from "react"
import { getMaquinarias } from "@/lib/actions/maquinarias"
import { MaquinariaTable } from "./maquinaria-table"
import { PageDescription } from "@/components/ui/page-description"

interface PageProps {
    searchParams: Promise<{ view?: string }>
}

export default async function MaquinariaPage({ searchParams }: PageProps) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    return (
        <div className="flex flex-col gap-4">
            <h1 className="sr-only">Maquinaria</h1>
            <PageDescription>
                Listado de equipos y vehículos de la empresa. Buscá por equipo, código o placa,
                filtrá por categoría, marca, modelo o propiedad, exportá a Excel y registrá nuevos equipos.
            </PageDescription>
            <Suspense fallback={<div>Cargando...</div>}>
                <MaquinariaList isTrash={isTrash} />
            </Suspense>
        </div>
    )
}

async function MaquinariaList({ isTrash }: { isTrash: boolean }) {
    const data = await getMaquinarias('', !isTrash)
    return <MaquinariaTable data={data} isTrash={isTrash} />
}
