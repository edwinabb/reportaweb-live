import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NuevoTicketForm } from '@/components/soporte/nuevo-ticket-form'

export const metadata: Metadata = { title: 'Nuevo Ticket de Soporte | Reporta.la' }

export default function NuevoTicketPage() {
    return (
        <div className="flex flex-col gap-6 max-w-2xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/soporte">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a tickets
                    </Link>
                </Button>
            </div>
            <div>
                <h1 className="text-lg font-semibold">Nuevo Ticket de Soporte</h1>
                <p className="text-sm text-muted-foreground">
                    Describí el problema que encontraste. Adjuntá capturas si es posible (podés pegar con Ctrl+V).
                </p>
            </div>
            <NuevoTicketForm />
        </div>
    )
}
