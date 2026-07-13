import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { getFormatoById } from '@/lib/actions/formatos'
import { Button } from '@/components/ui/button'
import { FormatoDetalle } from '@/components/formatos/formato-detalle'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Plantilla | Formatos — Reporta.la',
}

export default async function FormatoDetallePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const formato = await getFormatoById(id)

    if (!formato) return notFound()

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/formatos">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a plantillas
                    </Link>
                </Button>
            </div>
            <FormatoDetalle formato={formato} />
        </div>
    )
}
