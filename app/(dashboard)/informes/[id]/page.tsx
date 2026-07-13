import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { getInformeCompleto } from '@/lib/actions/formatos-informes'
import { getMaquinaria, getPersonal } from '@/lib/actions/planificacion'
import { Button } from '@/components/ui/button'
import { InformeFillForm } from '@/components/informes/informe-fill-form'
import { InformeReadView } from '@/components/informes/informe-read-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Informe | Formatos — Reporta.la',
}

export default async function InformeDetallePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const [informe, maquinarias, personal] = await Promise.all([
        getInformeCompleto(id),
        getMaquinaria(),
        getPersonal(),
    ])

    if (!informe) return notFound()

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/informes">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a informes
                    </Link>
                </Button>
            </div>

            {informe.estado === 'BORRADOR' ? (
                <InformeFillForm
                    informe={informe}
                    maquinarias={maquinarias}
                    personal={personal}
                />
            ) : (
                <InformeReadView informe={informe} />
            )}
        </div>
    )
}
