'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type TareaMini = {
    id: string
    codigo: string | null
    descripcion: string | null
    estado: string | null
    prioridad?: string | null
    fechas?: Array<{
        id: string
        fecha_inicio: string | null
        fecha_fin: string | null
        recursos?: Array<{ personal_id?: string | null; maquinaria_id?: string | null }>
    }>
}

type Props = {
    tareas: TareaMini[]
    semanaInicio: string
    semanaFin: string
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function AgendaSemanal({ tareas, semanaInicio, semanaFin }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const dias = React.useMemo(() => {
        const arr: string[] = []
        const inicio = new Date(semanaInicio)
        for (let i = 0; i < 7; i++) {
            const d = new Date(inicio)
            d.setDate(inicio.getDate() + i)
            arr.push(d.toISOString().slice(0, 10))
        }
        return arr
    }, [semanaInicio])

    const navegar = (offsetDias: number) => {
        const ref = new Date(semanaInicio)
        ref.setDate(ref.getDate() + offsetDias)
        const url = new URL(window.location.href)
        url.searchParams.set('semana', ref.toISOString().slice(0, 10))
        router.push(url.pathname + url.search)
    }

    // Agrupar tareas por día (considera overlap con tareas_fechas)
    const tareasPorDia = React.useMemo(() => {
        const map = new Map<string, TareaMini[]>()
        dias.forEach(d => map.set(d, []))

        for (const t of tareas) {
            const fechas = t.fechas ?? []
            for (const f of fechas) {
                if (!f.fecha_inicio) continue
                const inicioF = new Date(f.fecha_inicio).toISOString().slice(0, 10)
                const finF = f.fecha_fin
                    ? new Date(f.fecha_fin).toISOString().slice(0, 10)
                    : inicioF
                for (const d of dias) {
                    if (d >= inicioF && d <= finF) {
                        const arr = map.get(d)!
                        if (!arr.find(x => x.id === t.id)) arr.push(t)
                    }
                }
            }
        }
        return map
    }, [tareas, dias])

    const totalSemana = new Set<string>()
    tareasPorDia.forEach(arr => arr.forEach(t => totalSemana.add(t.id)))

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <h1 className="text-2xl font-semibold tracking-tight">Agenda semanal</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {new Date(semanaInicio).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'long',
                        })}{' '}
                        —{' '}
                        {new Date(semanaFin).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                        })}{' '}
                        · {totalSemana.size} tareas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navegar(-7)}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Semana anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navegar(0)}>
                        Hoy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navegar(7)}>
                        Semana siguiente <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {dias.map((iso, idx) => {
                    const tareasDia = tareasPorDia.get(iso) ?? []
                    const esHoy = iso === new Date().toISOString().slice(0, 10)
                    return (
                        <Card
                            key={iso}
                            className={`p-3 min-h-[180px] ${esHoy ? 'ring-2 ring-orange-500' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase">
                                        {DIAS[idx]}
                                    </div>
                                    <div className={`text-lg font-semibold ${esHoy ? 'text-orange-600' : ''}`}>
                                        {new Date(iso).getDate()}
                                    </div>
                                </div>
                                {tareasDia.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {tareasDia.length}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                {tareasDia.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">—</p>
                                ) : (
                                    tareasDia.map(t => (
                                        <Link
                                            key={t.id}
                                            href={`/planificacion?tarea=${t.id}`}
                                            className="block bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded p-2 text-xs leading-snug"
                                        >
                                            <div className="font-mono text-[10px] text-orange-700">{t.codigo ?? '—'}</div>
                                            <div className="font-medium text-gray-800 truncate">
                                                {t.descripcion ?? 'Sin descripción'}
                                            </div>
                                            {t.estado && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                                    {t.estado}
                                                </div>
                                            )}
                                        </Link>
                                    ))
                                )}
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
