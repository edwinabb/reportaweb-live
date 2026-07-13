import type { Metadata } from 'next'

import { getTareas } from '@/lib/actions/planificacion'
import { AgendaSemanal } from '@/components/admin/agenda-semanal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Agenda · Admin | Reporta.la',
    description: 'Calendario consolidado de tareas programadas',
}

export default async function AgendaAdminPage({
    searchParams,
}: {
    searchParams: Promise<{ semana?: string }>
}) {
    const params = await searchParams
    const { inicio, fin } = calcularSemana(params.semana)
    const tareas = await getTareas(inicio, fin)

    return (
        <div className="flex flex-col gap-6 p-6">
            <AgendaSemanal
                tareas={tareas as any[]}
                semanaInicio={inicio}
                semanaFin={fin}
            />
        </div>
    )
}

function calcularSemana(iso?: string) {
    const base = iso ? new Date(iso) : new Date()
    // Lunes de esa semana
    const dia = base.getDay() // 0=Dom, 1=Lun
    const offset = dia === 0 ? -6 : 1 - dia
    const lunes = new Date(base)
    lunes.setDate(base.getDate() + offset)
    lunes.setHours(0, 0, 0, 0)
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    return {
        inicio: lunes.toISOString().slice(0, 10),
        fin: domingo.toISOString().slice(0, 10),
    }
}
