import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTickets } from '@/lib/actions/soporte'
import type { TicketEstado, SeccionSoporte, TicketCriticidad } from '@/lib/soporte-shared'
import { TicketsList } from '@/components/soporte/tickets-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Soporte | Reporta.la' }

export default async function SoportePage({
    searchParams,
}: {
    searchParams: Promise<{ estado?: string; seccion?: string; criticidad?: string; page?: string }>
}) {
    const sp = await searchParams
    const page       = parseInt(sp.page ?? '1', 10)
    const estado     = sp.estado     as TicketEstado   | undefined
    const seccion    = sp.seccion    as SeccionSoporte  | undefined
    const criticidad = sp.criticidad as TicketCriticidad | undefined

    const { data: tickets, total } = await getTickets({ estado, seccion, criticidad, page })

    return (
        <div className="flex flex-col gap-6">
            <Suspense fallback={null}>
                <TicketsList
                    tickets={tickets}
                    total={total}
                    currentPage={page}
                    currentEstado={estado}
                    currentSeccion={seccion}
                    currentCriticidad={criticidad}
                />
            </Suspense>
        </div>
    )
}
