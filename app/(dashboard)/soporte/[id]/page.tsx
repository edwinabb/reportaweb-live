import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getTicketById, getRespuestas } from '@/lib/actions/soporte'
import { TicketDetalle } from '@/components/soporte/ticket-detalle'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ticket de Soporte | Reporta.la' }

export default async function TicketDetallePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [ticket, respuestas, profileResult] = await Promise.all([
        getTicketById(id),
        getRespuestas(id),
        user ? supabase.from('profiles').select('role').eq('id', user.id).single() : Promise.resolve({ data: null }),
    ])

    if (!ticket) return notFound()

    const profile = profileResult.data
    const isAdmin = ['reporta_admin','admin_tenant'].includes(profile?.role ?? '')

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/soporte">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a tickets
                    </Link>
                </Button>
            </div>
            <TicketDetalle
                ticket={ticket}
                respuestas={respuestas}
                isAdmin={isAdmin}
                currentUserId={user?.id ?? ''}
            />
        </div>
    )
}
