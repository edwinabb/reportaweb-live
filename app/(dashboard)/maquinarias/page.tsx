import { Suspense } from "react"
import { getMaquinarias } from "@/lib/actions/maquinarias"
import { MaquinariaTable } from "./maquinaria-table"

interface PageProps {
    searchParams: Promise<{ view?: string }>
}

export default async function MaquinariaPage({ searchParams }: PageProps) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    return (
            <Suspense fallback={<div>Cargando...</div>}>
                <MaquinariaList isTrash={isTrash} />
            </Suspense>
    )
}

async function MaquinariaList({ isTrash }: { isTrash: boolean }) {
    const data = await getMaquinarias('', !isTrash)
    return <MaquinariaTable data={data} isTrash={isTrash} />
}
