import { getTerceroContactos } from "@/lib/actions/terceros-modules"
import { getTercerosForSelect } from "@/lib/actions/terceros"
import { ContactosClientPage } from "./client-page"
import { PageDescription } from "@/components/ui/page-description"

export default async function ContactosPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    const contactos = await getTerceroContactos(!isTrash)
    const terceros = await getTercerosForSelect()

    return (
        <div className="flex flex-col gap-4">
            <h1 className="sr-only">Contactos de Terceros</h1>
            <PageDescription>
                Contactos de las empresas terceras (clientes y proveedores). Buscá por nombre,
                email o empresa, filtrá por cargo o empresa, exportá a Excel y registrá nuevos contactos.
            </PageDescription>
            <ContactosClientPage contactos={contactos} terceros={terceros} isTrash={isTrash} />
        </div>
    )
}
