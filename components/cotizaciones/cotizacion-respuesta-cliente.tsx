'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import {
    CheckCircle2, XCircle, AlertCircle, Loader2,
    ExternalLink, ClipboardCheck, CalendarCheck
} from 'lucide-react'
import {
    getCotizacionRespuesta,
    crearTareasAprobadas,
} from '@/lib/actions/cotizaciones'

interface Props {
    cotizacion_id: string
    moneda: string
}

type DetalleRespuesta = {
    id: string
    orden: number
    cantidad: number
    precio_tipo: string | null
    precio_valor: number | null
    precio_negociado: number | null
    estado_aprobacion: string | null
    tarea_id: string | null
    servicio: {
        id: string
        nombre: string
        cantidad_precios?: number | null
        precio_1_tipo?: string | null
        precio_1_tipo_nombre?: string | null
        precio_1_valor?: number | null
        precio_2_tipo?: string | null
        precio_2_tipo_nombre?: string | null
        precio_2_valor?: number | null
        precio_3_tipo?: string | null
        precio_3_tipo_nombre?: string | null
        precio_3_valor?: number | null
    } | null
    tarea: { id: string; codigo: string; titulo: string; estado: string | null } | null
}

type CotizacionRespuesta = {
    id: string
    numero: string
    estado: string | null
    comentarios_cliente: string | null
    observaciones_cliente: string | null
    fecha_aprobacion: string | null
    aprobado_por: string | null
    moneda: string
    cliente: { id: string; razon_social: string } | null
    sitio: { id: string; nombre: string } | null
    detalles: DetalleRespuesta[]
}

export function CotizacionRespuestaCliente({ cotizacion_id, moneda }: Props) {
    const [data, setData] = useState<CotizacionRespuesta | null>(null)
    const [loading, setLoading] = useState(true)
    const [creatingTareas, setCreatingTareas] = useState(false)

    const simbolo = moneda === 'PEN' ? 'S/' : 'USD'

    const load = useCallback(async () => {
        setLoading(true)
        const resp = await getCotizacionRespuesta(cotizacion_id)
        if (resp) {
            setData(resp as unknown as CotizacionRespuesta)
        }
        setLoading(false)
    }, [cotizacion_id])

    useEffect(() => { load() }, [load])

    const handleCrearTareas = async () => {
        setCreatingTareas(true)
        const result = await crearTareasAprobadas(cotizacion_id)
        setCreatingTareas(false)
        if (result.success) {
            toast.success(result.message)
            await load()
        } else {
            toast.error(result.message)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                    No se pudo cargar la información de la cotización.
                </CardContent>
            </Card>
        )
    }

    const detalles = data.detalles ?? []
    const aprobados = detalles.filter(d => d.estado_aprobacion === 'APROBADA')
    const rechazados = detalles.filter(d => d.estado_aprobacion === 'RECHAZADA')
    const pendientes = detalles.filter(d => !d.estado_aprobacion || d.estado_aprobacion === 'PENDIENTE')
    const aprobadosSinTarea = aprobados.filter(d => !d.tarea_id)

    const tieneRespuesta = aprobados.length > 0 || rechazados.length > 0

    return (
        <div className="space-y-6">

            {/* Header con estado y comentarios */}
            <Card>
                <CardHeader>
                    <CardTitle>Respuesta del Cliente</CardTitle>
                    <CardDescription>
                        Revisa la decisión del cliente por cada servicio y crea las tareas para los ítems aprobados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {!tieneRespuesta ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 border border-dashed rounded-lg justify-center">
                            <AlertCircle className="h-4 w-4" />
                            El cliente aún no ha respondido. Envía el enlace de aprobación en el paso 5.
                        </div>
                    ) : (
                        <>
                            {/* Estado + fecha */}
                            <div className="flex flex-wrap items-center gap-3">
                                {data.estado === 'APROBADA' && (
                                    <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Aprobada
                                    </Badge>
                                )}
                                {data.estado === 'ENVIADA' && (
                                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" /> Con observaciones
                                    </Badge>
                                )}
                                {data.fecha_aprobacion && (
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(data.fecha_aprobacion).toLocaleDateString('es-PE', {
                                            day: '2-digit', month: 'long', year: 'numeric'
                                        })}
                                    </span>
                                )}
                                {data.aprobado_por && (
                                    <span className="text-xs text-muted-foreground">· {data.aprobado_por}</span>
                                )}
                            </div>

                            {/* Comentarios generales */}
                            {data.comentarios_cliente && (
                                <div className="rounded-lg bg-slate-50 border p-3 text-sm text-slate-700 whitespace-pre-wrap">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                                        Comentarios del cliente
                                    </span>
                                    {data.comentarios_cliente}
                                </div>
                            )}

                            {/* Contadores */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg border bg-green-50 border-green-200 p-3 text-center">
                                    <div className="text-2xl font-black text-green-600">{aprobados.length}</div>
                                    <div className="text-xs font-medium text-green-700 uppercase tracking-wide mt-0.5">Aprobados</div>
                                </div>
                                <div className={`rounded-lg border p-3 text-center ${rechazados.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className={`text-2xl font-black ${rechazados.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{rechazados.length}</div>
                                    <div className={`text-xs font-medium uppercase tracking-wide mt-0.5 ${rechazados.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>Rechazados</div>
                                </div>
                                <div className="rounded-lg border bg-gray-50 border-gray-200 p-3 text-center">
                                    <div className="text-2xl font-black text-gray-400">{pendientes.length}</div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">Pendientes</div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Servicios */}
            {detalles.length > 0 && (
                <div className="space-y-3">
                    {detalles
                        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                        .map((det) => {
                            const isAp = det.estado_aprobacion === 'APROBADA'
                            const isRe = det.estado_aprobacion === 'RECHAZADA'
                            const isPending = !det.estado_aprobacion || det.estado_aprobacion === 'PENDIENTE'

                            return (
                                <Card key={det.id} className={
                                    isAp ? 'border-green-200 bg-green-50/40' :
                                    isRe ? 'border-red-200 bg-red-50/40' :
                                    ''
                                }>
                                    <CardContent className="pt-4 pb-4 space-y-3">
                                        {/* Header del item */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {isAp && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                                                {isRe && <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                                                {isPending && <AlertCircle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />}
                                                <span className="font-semibold text-sm">
                                                    {det.servicio?.nombre ?? 'Servicio'}
                                                </span>
                                                {det.precio_tipo && (
                                                    <span className="text-xs text-muted-foreground">· {det.precio_tipo}</span>
                                                )}
                                            </div>
                                            <Badge className={
                                                isAp ? 'bg-green-100 text-green-800 border-green-200' :
                                                isRe ? 'bg-red-100 text-red-800 border-red-200' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                            }>
                                                {isAp ? 'Aprobado' : isRe ? 'Rechazado' : 'Pendiente'}
                                            </Badge>
                                        </div>

                                        {/* Precios del catálogo */}
                                        <div className="text-sm">
                                            <span className="text-xs text-muted-foreground block mb-1">Precios del catálogo</span>
                                            {([1, 2, 3] as const).map(idx => {
                                                const nombre = det.servicio?.[`precio_${idx}_tipo_nombre` as keyof typeof det.servicio] as string | null
                                                const valor = det.servicio?.[`precio_${idx}_valor` as keyof typeof det.servicio] as number | null
                                                if (!valor) return null
                                                return (
                                                    <div key={idx} className="mb-1">
                                                        {nombre && <span className="text-[10px] text-muted-foreground uppercase mr-1">{nombre}:</span>}
                                                        <span className="font-medium">{simbolo} {valor.toFixed(2)}</span>
                                                    </div>
                                                )
                                            })}
                                            {(det.cantidad ?? 1) > 1 && (
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    × {det.cantidad}
                                                </span>
                                            )}
                                        </div>

                                        {/* Tarea vinculada */}
                                        {det.tarea && (
                                            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <CalendarCheck className="h-4 w-4 text-green-700 shrink-0" />
                                                    <div>
                                                        <span className="text-xs font-semibold text-green-900 font-mono">
                                                            {det.tarea.codigo}
                                                        </span>
                                                        <span className="text-xs text-green-700 ml-2">
                                                            {det.tarea.estado ?? 'CONFIRMADA'}
                                                        </span>
                                                        <div className="text-[11px] text-green-600 mt-0.5">
                                                            Pendiente: asignar fechas y recursos
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link href={`/planificacion/nueva?tarea=${det.tarea.id}`}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs gap-1 border-green-300 text-green-800 hover:bg-green-100 shrink-0"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        Editar tarea
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                </div>
            )}

            {/* Botón crear tareas */}
            {tieneRespuesta && aprobadosSinTarea.length > 0 && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleCrearTareas}
                        disabled={creatingTareas}
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                        {creatingTareas
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <ClipboardCheck className="h-4 w-4" />}
                        Crear {aprobadosSinTarea.length} tarea{aprobadosSinTarea.length !== 1 ? 's' : ''} (aprobados)
                    </Button>
                </div>
            )}

            {tieneRespuesta && aprobadosSinTarea.length === 0 && aprobados.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Todas las tareas han sido creadas.
                </div>
            )}
        </div>
    )
}
