import type { Metadata } from 'next'

import { getInformes } from '@/lib/actions/formatos-informes'
import { getPlantillasPublicadas } from '@/lib/actions/formatos'
import { InformesList } from '@/components/informes/informes-list'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Informes | Formatos — Reporta.la',
    description: 'Listado de informes de inspección, checklists y reportes llenados',
}

export default async function InformesPage({
    searchParams,
}: {
    searchParams: Promise<{ estado?: string; q?: string }>
}) {
    const params = await searchParams
    const [informes, plantillas] = await Promise.all([
        getInformes({ estado: params.estado, q: params.q }),
        getPlantillasPublicadas(),
    ])

    return (
        <div className="flex flex-col gap-6 p-6">
            <InformesList
                informes={informes}
                initialEstado={params.estado ?? ''}
                initialQ={params.q ?? ''}
                plantillas={plantillas}
            />
        </div>
    )
}
