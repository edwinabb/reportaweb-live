import type { Metadata } from 'next'

import { getPlantillasPublicadas } from '@/lib/actions/formatos'
import { NuevoInformeForm } from '@/components/informes/nuevo-informe-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Nuevo informe | Formatos — Reporta.la',
}

export default async function NuevoInformePage({
    searchParams,
}: {
    searchParams: Promise<{ tarea_id?: string; formato_id?: string }>
}) {
    const params = await searchParams
    const plantillas = await getPlantillasPublicadas()

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Nuevo informe</h1>
                <p className="text-sm text-muted-foreground">
                    Elegí la plantilla y opcionalmente la tarea. Después vas a poder llenar las preguntas y firmar.
                </p>
            </div>
            <NuevoInformeForm
                plantillas={plantillas}
                defaultFormatoId={params.formato_id}
                defaultTareaId={params.tarea_id}
            />
        </div>
    )
}
