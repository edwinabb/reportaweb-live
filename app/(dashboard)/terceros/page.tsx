import { Suspense } from "react"
import { getTerceros } from "@/lib/actions/terceros"
import { TercerosTable } from "./terceros-table"
import { PageDescription } from "@/components/ui/page-description"

export default async function TercerosPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    return (
        <div className="flex flex-col gap-4">
            <h1 className="sr-only">Terceros</h1>
            <PageDescription>
                Directorio de empresas terceras (clientes y proveedores). Buscá por razón social,
                RUC o nombre comercial, filtrá por rubro o tipo, exportá a Excel y registrá nuevas empresas.
            </PageDescription>
            <Suspense fallback={<div>Cargando...</div>}>
                <TercerosList isTrash={isTrash} />
            </Suspense>
        </div>
    )
}

async function TercerosList({ isTrash }: { isTrash: boolean }) {
    // Vista activa → solo activos; Papelera → trae TODO y el cliente filtra inactivos
    const data = await getTerceros(undefined, !isTrash)
    return <TercerosTable data={data} isTrash={isTrash} />
}
