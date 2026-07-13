import type { Metadata } from 'next'

import { getFormatos } from '@/lib/actions/formatos'
import { PlantillasList } from '@/components/formatos/plantillas-list'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Plantillas de Formatos | Reporta.la',
    description: 'Catálogo de plantillas de formatos (inspecciones, checklists, reportes)',
}

export default async function FormatosPage() {
    const plantillas = await getFormatos()

    return (
        <div className="flex flex-col gap-6 p-6">
            <PlantillasList plantillas={plantillas} />
        </div>
    )
}
