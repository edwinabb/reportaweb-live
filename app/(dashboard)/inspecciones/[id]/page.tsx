import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileDown, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'

import { getInspeccionById } from '@/lib/actions/inspecciones'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Inspección | Reporta.la',
}

const ESTADO_META: Record<string, { label: string; cls: string }> = {
    COMPLETADO:  { label: 'Completado',  cls: 'bg-green-50 text-green-700 border-green-200' },
    EN_PROCESO:  { label: 'En proceso',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    APROBADO:    { label: 'Aprobado',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    RECHAZADO:   { label: 'Rechazado',   cls: 'bg-red-50 text-red-700 border-red-200' },
}

const ITEM_META: Record<string, { cls: string }> = {
    SI:         { cls: 'text-green-700' },
    OK:         { cls: 'text-green-700' },
    NO:         { cls: 'text-red-700 font-semibold' },
    FALLA:      { cls: 'text-red-700 font-semibold' },
    NO_APLICA:  { cls: 'text-gray-400' },
}

export default async function InspeccionDetallePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const inspeccion = await getInspeccionById(id)

    if (!inspeccion) return notFound()

    const maq = inspeccion.maquinaria as any
    const est = ESTADO_META[inspeccion.estado ?? ''] ?? { label: inspeccion.estado ?? '—', cls: '' }
    const puntaje = inspeccion.puntaje ?? null
    const puntajeColor = puntaje == null
        ? 'text-muted-foreground'
        : puntaje >= 80
        ? 'text-green-600'
        : puntaje >= 60
        ? 'text-amber-600'
        : 'text-red-600'

    // Agrupar detalles por categoría
    type Detalle = { id: string; categoria: string | null; orden: number; item: string; estado: string; comentario: string | null }
    const detalles: Detalle[] = ((inspeccion.detalles ?? []) as any[]).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    const cats = new Map<string, Detalle[]>()
    for (const d of detalles) {
        const key = d.categoria ?? 'General'
        if (!cats.has(key)) cats.set(key, [])
        cats.get(key)!.push(d)
    }

    const fecha = inspeccion.fecha_inspeccion
        ? new Date(inspeccion.fecha_inspeccion).toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : '—'

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/planificacion">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Link>
                </Button>
            </div>

            {/* Header */}
            <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="text-sm text-muted-foreground font-mono">
                            {inspeccion.codigo_interno ?? inspeccion.id.slice(0, 8)}
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">Inspección Diaria de Grúa</h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={est.cls}>{est.label}</Badge>
                            {inspeccion.tiene_fallas && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Con fallas
                                </Badge>
                            )}
                            {puntaje != null && (
                                <span className={`text-sm font-semibold ${puntajeColor}`}>
                                    Puntaje: {puntaje}%
                                </span>
                            )}
                        </div>
                    </div>
                    <Button asChild variant="outline">
                        <a href={`/api/inspecciones/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <FileDown className="mr-2 h-4 w-4" /> PDF
                        </a>
                    </Button>
                </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-xs text-muted-foreground uppercase font-medium mb-1">Equipo</div>
                        <div className="font-medium">{maq?.nombre ?? '—'}</div>
                        {maq?.codigo_interno && <div className="text-muted-foreground font-mono text-xs">{maq.codigo_interno}</div>}
                        {(maq?.marca || maq?.modelo) && (
                            <div className="text-muted-foreground text-xs">{[maq.marca, maq.modelo].filter(Boolean).join(' ')}</div>
                        )}
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground uppercase font-medium mb-1">Fecha</div>
                        <div className="capitalize">{fecha}</div>
                    </div>
                    {inspeccion.supervisor && (
                        <div>
                            <div className="text-xs text-muted-foreground uppercase font-medium mb-1">Realizado por</div>
                            <div>{(inspeccion.supervisor as any).full_name ?? '—'}</div>
                        </div>
                    )}
                    {inspeccion.horometro_actual != null && (
                        <div>
                            <div className="text-xs text-muted-foreground uppercase font-medium mb-1">Horómetro</div>
                            <div>{inspeccion.horometro_actual} h</div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Items por categoría */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    Ítems inspeccionados ({detalles.length})
                </h2>
                <div className="space-y-6">
                    {Array.from(cats.entries()).map(([catName, items]) => (
                        <div key={catName}>
                            <h3 className="text-sm font-semibold uppercase text-muted-foreground border-b pb-1 mb-2">{catName}</h3>
                            <div className="space-y-1">
                                {items.map(item => {
                                    const meta = ITEM_META[item.estado] ?? { cls: 'text-muted-foreground' }
                                    const label = item.estado === 'OK' ? 'SI' : item.estado === 'FALLA' ? 'NO' : item.estado
                                    return (
                                        <div key={item.id} className="flex items-start justify-between gap-2 py-1 border-b last:border-b-0">
                                            <div className="flex-1 text-sm">{item.item}</div>
                                            <div className={`text-sm font-medium w-20 text-right shrink-0 ${meta.cls}`}>{label}</div>
                                            {item.comentario && (
                                                <div className="w-full text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-0.5">
                                                    Obs: {item.comentario}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Observaciones */}
            {inspeccion.observaciones && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-2">Observaciones generales</h2>
                    <p className="text-sm whitespace-pre-wrap">{inspeccion.observaciones}</p>
                </Card>
            )}

            {/* Planes de acción generados */}
            {inspeccion.planes_accion && (inspeccion.planes_accion as any[]).length > 0 && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-3">Planes de acción generados</h2>
                    <div className="space-y-2">
                        {(inspeccion.planes_accion as any[]).map((plan: any) => (
                            <div key={plan.id} className="flex items-center justify-between py-1 border-b last:border-b-0">
                                <div className="text-sm">{plan.titulo}</div>
                                <Link href={`/planes-accion/${plan.id}`} className="text-xs text-orange-600 hover:underline">
                                    Ver plan
                                </Link>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
