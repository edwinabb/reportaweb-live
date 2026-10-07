import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { getInspecciones } from '@/lib/actions/inspecciones'
import { getMaquinarias } from '@/lib/actions/maquinarias'
import { Button } from '@/components/ui/button'
import { InspeccionesList } from '@/components/formatos/inspecciones-list'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Inspecciones | Reporta.la',
    description: 'Historial de inspecciones y checklists completados',
}

export default async function InspeccionesPage() {
    // E5: getInspecciones ahora pagina con default limit=50 + count.
    // Pedimos limit alto (500) para mantener comportamiento previo del listado.
    // UI con paginacion controlada vendria en una pasada futura.
    const [inspeccionesResult, maquinarias] = await Promise.all([
        getInspecciones(undefined, undefined, undefined, true, { limit: 500 }),
        getMaquinarias('', true),
    ])
    const inspecciones = inspeccionesResult.data

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inspecciones</h1>
                    <p className="text-muted-foreground text-sm">
                        Historial de checklists completados por equipo
                    </p>
                </div>
                <Button asChild className="bg-orange-600 hover:bg-orange-700">
                    <Link href="/formatos/nuevo">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Inspección
                    </Link>
                </Button>
            </div>

            <InspeccionesList inspecciones={inspecciones} maquinarias={maquinarias} />
        </div>
    )
}
