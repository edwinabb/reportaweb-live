import { getPersonalExterno } from "@/lib/actions/terceros-modules"
import { PersonalClientPage } from "./client-page"
import { PageDescription } from "@/components/ui/page-description"

interface PageProps {
    searchParams: Promise<{ view?: string }>
}

export default async function PersonalPage({ searchParams }: PageProps) {
    const params = await searchParams
    const isTrash = params.view === 'trash'

    // Personal de terceros = usuarios del sistema vinculados a una empresa tercera (DUDA-TER-006)
    const personal = await getPersonalExterno(!isTrash)

    return (
        <div className="flex flex-col gap-4">
            <h1 className="sr-only">Personal de Terceros</h1>
            <PageDescription>
                Personal externo: usuarios del sistema vinculados a una empresa tercera.
                Buscá por nombres, apellidos o número de documento, filtrá por cargo o empresa
                y exportá a Excel. El alta se hace creando un nuevo usuario.
            </PageDescription>
            <PersonalClientPage personal={personal} isTrash={isTrash} />
        </div>
    )
}
