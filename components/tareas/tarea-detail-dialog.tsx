"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Clock, Calendar, User, Truck, FileText, Plus,
    CheckCircle2, Fuel, HardHat, FileCheck, Building2, Briefcase, MapPin, Phone, Pencil, FileDown,
} from "lucide-react"
import { getReportesPersonal, getReportesMaquinaria, getReportesCombustible, getTerceroPersonalList } from "@/lib/actions/reportes"
import { ReportePersonalForm } from "@/components/reportes/reporte-personal-form"
import { ReporteMaquinariaForm } from "@/components/reportes/reporte-maquinaria-form"
import { ReporteCombustibleForm } from "@/components/reportes/reporte-combustible-form"
import { getInformes, type InformeListItem } from "@/lib/actions/formatos-informes"
import { getPlantillasPublicadas } from "@/lib/actions/formatos"
import { getInspeccionesForTarea } from "@/lib/actions/inspecciones"
import { NuevoInformeDialog } from "@/components/informes/nuevo-informe-dialog"
import Link from "next/link"
import {
    getConfigInformeMaquinaria,
    getConfigInformePersonal,
    type ConfigInformeMaquinaria,
    type ConfigInformePersonal,
} from "@/lib/actions/informes-config"
import { getTareaWithDetails } from "@/lib/actions/planificacion"
import type { TareaDetalle, TareaRecursoWithNames } from "@/types/planificacion"
import { EditRecursosDialog } from "@/components/planificacion/edit-recursos-dialog"

interface Props {
    tareaId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    personalList: any[]
    maquinariaList: any[]
    onResourcesChanged?: () => void
    selectedDate?: string | null
}

export function TareaDetailDialog({ tareaId, open, onOpenChange, personalList, maquinariaList, onResourcesChanged, selectedDate }: Props) {
    const [tarea, setTarea] = useState<TareaDetalle | null>(null)
    const [reportesPersonal, setReportesPersonal] = useState<any[]>([])
    const [reportesMaquinaria, setReportesMaquinaria] = useState<any[]>([])
    const [reportesCombustible, setReportesCombustible] = useState<any[]>([])
    const [informes, setInformes] = useState<InformeListItem[]>([])
    const [inspecciones, setInspecciones] = useState<any[]>([])
    const [configPersonal, setConfigPersonal] = useState<ConfigInformePersonal | null>(null)
    const [configMaquinaria, setConfigMaquinaria] = useState<ConfigInformeMaquinaria | null>(null)
    const [terceroPersonalList, setTerceroPersonalList] = useState<any[]>([])
    const [plantillas, setPlantillas] = useState<any[]>([])

    const [activeTab, setActiveTab] = useState("general")
    const [loading, setLoading] = useState(false)

    // Sub-dialogs state
    const [activeForm, setActiveForm] = useState<'PERSONAL' | 'MAQUINARIA' | 'COMBUSTIBLE' | null>(null)
    const [editingRecursos, setEditingRecursos] = useState<'PERSONAL' | 'MAQUINARIA' | null>(null)

    useEffect(() => {
        if (open && tareaId) {
            loadDetails(tareaId)
            setActiveTab(selectedDate ? 'reportes' : 'general')
        }
    }, [open, tareaId, selectedDate])

    const loadDetails = async (id: string) => {
        setLoading(true)
        try {
            // Parallel + tolerante a fallas
            const results = await Promise.allSettled([
                getTareaWithDetails(id),
                getReportesPersonal(id),
                getReportesMaquinaria(id),
                getReportesCombustible(id),
                getInformes({ tarea_id: id }),
                getConfigInformePersonal(),
                getConfigInformeMaquinaria(),
                getTerceroPersonalList(),
                getInspeccionesForTarea(id),
                getPlantillasPublicadas(),
            ])
            const value = <T,>(i: number, fallback: T): T => {
                const r = results[i]
                return r.status === 'fulfilled' ? (r.value as T) : fallback
            }
            setTarea(value<TareaDetalle | null>(0, null))
            setReportesPersonal(value<unknown[]>(1, []) as unknown[])
            setReportesMaquinaria(value<unknown[]>(2, []) as unknown[])
            setReportesCombustible(value<unknown[]>(3, []) as unknown[])
            setInformes(value<InformeListItem[]>(4, []))
            setConfigPersonal(value<ConfigInformePersonal | null>(5, null))
            setConfigMaquinaria(value<ConfigInformeMaquinaria | null>(6, null))
            setTerceroPersonalList(value<unknown[]>(7, []) as unknown[])
            setInspecciones(value<any[]>(8, []))
            setPlantillas(value<any[]>(9, []))

            for (const [i, r] of results.entries()) {
                if (r.status === 'rejected') {
                    console.warn(`[TareaDetailDialog] load[${i}] failed:`, r.reason)
                }
            }
        } catch (error) {
            console.error('Error loading details', error)
        } finally {
            setLoading(false)
        }
    }

    // Personal interno asignado a esta tarea (sin duplicados)
    // NOTE: must be before any early return to satisfy Rules of Hooks
    const personalAsignado = useMemo(() => {
        const seen = new Set<string>()
        const result: { id: string; first_name: string | null; last_name: string | null }[] = []
        for (const fecha of tarea?.fechas ?? []) {
            for (const r of (fecha.recursos ?? [])) {
                const p = (r as any).personal
                if (p && !seen.has(p.id)) {
                    seen.add(p.id)
                    result.push({ id: p.id, first_name: p.first_name ?? null, last_name: p.last_name ?? null })
                }
            }
        }
        return result
    }, [tarea])

    const currentPersonalIds = useMemo(() => {
        const ids = new Set<string>()
        for (const f of tarea?.fechas ?? []) {
            for (const r of (f as any).recursos ?? []) {
                if (r.tipo_recurso === 'PERSONAL' && r.personal_id) ids.add(r.personal_id)
            }
        }
        return Array.from(ids)
    }, [tarea])

    const currentMaquinariaIds = useMemo(() => {
        const ids = new Set<string>()
        for (const f of tarea?.fechas ?? []) {
            for (const r of (f as any).recursos ?? []) {
                if (r.tipo_recurso === 'MAQUINARIA' && r.maquinaria_id) ids.add(r.maquinaria_id)
            }
        }
        return Array.from(ids)
    }, [tarea])

    // Maquinaria interna asignada a esta tarea (sin duplicados)
    const maquinariaAsignada = useMemo(() => {
        const seen = new Set<string>()
        const result: { id: string; nombre?: string | null; codigo?: string | null; codigo_interno?: string | null }[] = []
        for (const fecha of tarea?.fechas ?? []) {
            for (const r of (fecha as unknown as { recursos: TareaRecursoWithNames[] }).recursos ?? []) {
                const m = r.maquinaria
                if (m && !seen.has(m.id)) {
                    seen.add(m.id)
                    result.push({ id: m.id, nombre: m.nombre ?? null, codigo: m.codigo_interno ?? null, codigo_interno: m.codigo_interno ?? null })
                }
            }
        }
        return result
    }, [tarea])

    if (!tareaId) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b bg-gray-50/50">
                    <div className="flex items-start justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                <Badge variant="outline" className="bg-white font-mono">
                                    {tarea?.codigo ?? `T-${tareaId.slice(0, 4)}`}
                                </Badge>
                                <span>Planificación</span>
                                {tarea?.estado && (
                                    <Badge
                                        className={
                                            tarea.estado === 'CONFIRMADA' ? 'bg-green-100 text-green-700 border-green-200' :
                                                tarea.estado === 'COMPLETADA' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    tarea.estado === 'CANCELADA' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        'bg-gray-100 text-gray-700 border-gray-200'
                                        }
                                        variant="outline"
                                    >
                                        {tarea.estado}
                                    </Badge>
                                )}
                                {tarea?.prioridad && (
                                    <Badge
                                        className={
                                            tarea.prioridad === 'ALTA' ? 'bg-red-50 text-red-700 border-red-200' :
                                                tarea.prioridad === 'BAJA' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                        }
                                        variant="outline"
                                    >
                                        Prioridad {tarea.prioridad}
                                    </Badge>
                                )}
                            </div>
                            <DialogTitle className="text-xl font-bold text-gray-800 truncate">
                                {tarea?.titulo ?? 'Cargando…'}
                            </DialogTitle>
                            <DialogDescription className="mt-1 flex items-center gap-4 flex-wrap text-xs">
                                {tarea?.cliente?.razon_social && (
                                    <span className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> {tarea.cliente.razon_social}
                                    </span>
                                )}
                                {tarea?.sitio && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {tarea.sitio}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {formatRangoFechas(tarea)}
                                </span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 min-h-0 flex flex-col">
                    <Tabs defaultValue="general" className="flex-1 flex flex-col" value={activeTab} onValueChange={setActiveTab}>
                        <div className="px-6 border-b">
                            <TabsList className="bg-transparent h-12 w-full justify-start gap-6 p-0">
                                <TabsTrigger value="general" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 h-12 bg-transparent text-gray-500 data-[state=active]:text-orange-600">
                                    1. Información General
                                </TabsTrigger>
                                <TabsTrigger value="recursos" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 h-12 bg-transparent text-gray-500 data-[state=active]:text-orange-600">
                                    2. Recursos
                                </TabsTrigger>
                                <TabsTrigger value="formatos" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 h-12 bg-transparent text-gray-500 data-[state=active]:text-orange-600">
                                    3. Inspecciones
                                </TabsTrigger>
                                <TabsTrigger
                                    value="reportes"
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 h-12 bg-transparent text-gray-500 data-[state=active]:text-orange-600"
                                >
                                    4. Reportes
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 bg-gray-50/30">
                            <div className="p-6">
                                <TabsContent value="general" className="mt-0 space-y-6">
                                    {loading && !tarea ? (
                                        <div className="text-sm text-gray-400 p-6 text-center">Cargando…</div>
                                    ) : !tarea ? (
                                        <div className="text-sm text-red-500 p-6 text-center">No se pudo cargar la tarea.</div>
                                    ) : (
                                        <>
                                            <Card>
                                                <CardContent className="pt-6 space-y-4">
                                                    <h3 className="font-semibold text-sm uppercase text-gray-500">Datos de la tarea</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                                        <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Cliente"
                                                            value={tarea.cliente?.razon_social ?? tarea.cliente_nombre ?? '—'}
                                                            sub={tarea.cliente?.ruc ? `RUC ${tarea.cliente.ruc}` : undefined}
                                                        />
                                                        <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Contacto"
                                                            value={tarea.contacto?.nombre_completo ?? '—'}
                                                            sub={[tarea.contacto?.cargo, tarea.contacto?.telefono].filter(Boolean).join(' · ') || undefined}
                                                        />
                                                        <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Sitio"
                                                            value={tarea.sitio || '—'}
                                                        />
                                                        <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Cotización"
                                                            value={cotizacionLabel(tarea)}
                                                            sub={tarea.cotizacion?.estado ? `Estado: ${tarea.cotizacion.estado}` : undefined}
                                                        />
                                                        <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Tipo de tarea"
                                                            value={tarea.tipo_tarea ?? '—'}
                                                        />
                                                        <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Servicio"
                                                            value={tarea.servicio_ref ?? '—'}
                                                        />
                                                        <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Fechas"
                                                            value={formatRangoFechas(tarea)}
                                                            sub={cantidadDiasLabel(tarea)}
                                                        />
                                                        <InfoRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Confirmada"
                                                            value={tarea.estado === 'CONFIRMADA' ? 'Sí' : 'No'}
                                                        />
                                                    </div>
                                                    {(tarea as any).cotizacion?.descripcion_requerimiento && (
                                                        <div className="pt-2">
                                                            <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                                                                <FileText className="h-3 w-3" /> Observaciones de la propuesta
                                                            </div>
                                                            <div className="text-sm text-gray-700 bg-gray-50 rounded border p-3 whitespace-pre-wrap">
                                                                {(tarea as any).cotizacion.descripcion_requerimiento}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {tarea.descripcion && (
                                                        <div className="pt-2">
                                                            <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                                                                <FileText className="h-3 w-3" /> Observaciones
                                                            </div>
                                                            <div className="text-sm text-gray-700 bg-gray-50 rounded border p-3 whitespace-pre-wrap">
                                                                {tarea.descripcion}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                        </>
                                    )}
                                </TabsContent>

                                <TabsContent value="recursos" className="mt-0 space-y-6">
                                    {loading && !tarea ? (
                                        <div className="text-sm text-gray-400 p-6 text-center">Cargando…</div>
                                    ) : !tarea ? (
                                        <div className="text-sm text-red-500 p-6 text-center">No se pudo cargar la tarea.</div>
                                    ) : (
                                        <Card>
                                            <CardContent className="pt-6 space-y-4">
                                                <h3 className="font-semibold text-sm uppercase text-gray-500">Recursos Asignados</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <RecursosColumn
                                                        icon={<HardHat className="h-3.5 w-3.5" />}
                                                        title="Personal"
                                                        recursos={flattenRecursos(tarea, 'PERSONAL')}
                                                        onEdit={() => setEditingRecursos('PERSONAL')}
                                                    />
                                                    <RecursosColumn
                                                        icon={<Truck className="h-3.5 w-3.5" />}
                                                        title="Maquinaria"
                                                        recursos={flattenRecursos(tarea, 'MAQUINARIA')}
                                                        onEdit={() => setEditingRecursos('MAQUINARIA')}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                <TabsContent value="reportes" className="mt-0 space-y-6">

                                    {/* Encabezado de fecha cuando hay contexto de día */}
                                    {selectedDate && (
                                        <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                                            <Calendar className="h-4 w-4 shrink-0" />
                                            Reportes del {format(new Date(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es }).replace(/^./, c => c.toUpperCase())}
                                        </div>
                                    )}

                                    {/* REPORTES PERSONAL */}
                                    {(() => {
                                        const lista = selectedDate
                                            ? reportesPersonal.filter((r: any) => r.fecha_reporte === selectedDate)
                                            : reportesPersonal
                                        return (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="font-semibold text-sm uppercase text-gray-600 flex items-center gap-2">
                                                        <User className="h-4 w-4" /> Reportes de Personal (Horas / Gastos)
                                                    </h3>
                                                    <Button size="sm" variant="secondary" className="h-8 gap-2 text-xs" onClick={() => setActiveForm('PERSONAL')}>
                                                        <Plus className="h-3 w-3" /> Agregar Reporte
                                                    </Button>
                                                </div>
                                                {lista.length === 0 ? (
                                                    <div className="text-center p-8 border border-dashed rounded bg-white text-gray-400 text-sm">
                                                        No hay reportes de personal{selectedDate ? ' para este día' : ''}.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {lista.map((r: any) => (
                                                            <div key={r.id} className="bg-white p-3 rounded border flex items-center justify-between shadow-sm">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-gray-800">{r.personal?.first_name} {r.personal?.last_name}</span>
                                                                    <span className="text-xs text-gray-500">{format(new Date(r.fecha_reporte), "dd MMM yyyy", { locale: es })} • {r.total_horas} horas</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex flex-col items-end">
                                                                        <Badge variant="outline">{r.maquinaria?.codigo_interno || 'Sin equipo'}</Badge>
                                                                        {r.gasto_total > 0 && <span className="text-xs font-semibold text-green-600 mt-1">S/. {r.gasto_total}</span>}
                                                                    </div>
                                                                    <a href={`/api/reportes-personal/${r.id}/pdf`} target="_blank" rel="noopener noreferrer" title="Descargar PDF" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                                                                        <FileDown className="h-4 w-4" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    <Separator />

                                    {/* REPORTES MAQUINARIA */}
                                    {(() => {
                                        const lista = selectedDate
                                            ? reportesMaquinaria.filter((r: any) => r.fecha_reporte === selectedDate)
                                            : reportesMaquinaria
                                        return (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="font-semibold text-sm uppercase text-gray-600 flex items-center gap-2">
                                                        <Truck className="h-4 w-4" /> Reportes de Maquinaria
                                                    </h3>
                                                    <Button size="sm" variant="secondary" className="h-8 gap-2 text-xs" onClick={() => setActiveForm('MAQUINARIA')}>
                                                        <Plus className="h-3 w-3" /> Agregar Reporte
                                                    </Button>
                                                </div>
                                                {lista.length === 0 ? (
                                                    <div className="text-center p-8 border border-dashed rounded bg-white text-gray-400 text-sm">
                                                        No hay reportes de maquinaria{selectedDate ? ' para este día' : ''}.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {lista.map((r: any) => (
                                                            <div key={r.id} className="bg-white p-3 rounded border flex items-center justify-between shadow-sm">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-gray-800">{r.maquinaria?.nombre}</span>
                                                                    <span className="text-xs text-gray-500">{format(new Date(r.fecha_reporte), "dd MMM yyyy", { locale: es })} • {r.total_horas} horas</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline">{r.operador?.first_name} (Op)</Badge>
                                                                    <a href={`/api/reportes-maquinaria/${r.id}/pdf`} target="_blank" rel="noopener noreferrer" title="Descargar PDF" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                                                                        <FileDown className="h-4 w-4" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    <Separator />

                                    {/* REPORTES COMBUSTIBLE */}
                                    {(() => {
                                        const lista = selectedDate
                                            ? reportesCombustible.filter((r: any) => r.fecha_reporte === selectedDate)
                                            : reportesCombustible
                                        return (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="font-semibold text-sm uppercase text-gray-600 flex items-center gap-2">
                                                        <Fuel className="h-4 w-4" /> Control de Combustible
                                                    </h3>
                                                    <Button size="sm" variant="secondary" className="h-8 gap-2 text-xs" onClick={() => setActiveForm('COMBUSTIBLE')}>
                                                        <Plus className="h-3 w-3" /> Nuevo Consumo
                                                    </Button>
                                                </div>
                                                {lista.length === 0 ? (
                                                    <div className="text-center p-8 border border-dashed rounded bg-white text-gray-400 text-sm">
                                                        No hay registros de combustible{selectedDate ? ' para este día' : ''}.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {lista.map((r: any) => (
                                                            <div key={r.id} className="bg-white p-3 rounded border flex items-center justify-between shadow-sm">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-gray-800">{r.maquinaria?.nombre || 'Sin maquinaria'}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {format(new Date(r.fecha_reporte), "dd MMM yyyy", { locale: es })} • {r.galones ?? 0} gal {r.tipo_combustible ? `· ${r.tipo_combustible}` : ''}
                                                                        {r.proveedor_grifo ? ` · ${r.proveedor_grifo}` : ''}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <Badge variant="outline">{r.maquinaria?.codigo_interno || 'Sin código'}</Badge>
                                                                    {(r.monto_total ?? 0) > 0 && <span className="text-xs font-semibold text-green-600 mt-1">S/. {r.monto_total}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                </TabsContent>

                                <TabsContent value="formatos" className="mt-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm uppercase text-gray-600 flex items-center gap-2">
                                            <FileCheck className="h-4 w-4" /> Informes (Formatos)
                                        </h3>
                                        <NuevoInformeDialog
                                            plantillas={plantillas}
                                            defaultTareaId={tareaId ?? undefined}
                                            defaultTarea={tarea ? { id: tarea.id, codigo: tarea.codigo ?? null, titulo: tarea.titulo, cliente: tarea.cliente ? { id: tarea.cliente.id, razon_social: tarea.cliente.razon_social } : null } : undefined}
                                        />
                                    </div>

                                    {/* Inspecciones técnicas (checklist de maquinaria) */}
                                    {inspecciones.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Inspecciones Técnicas ({inspecciones.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {inspecciones.map((ins: any) => {
                                                    const maq: any = ins.maquinaria
                                                    const fecha = ins.fecha_inspeccion
                                                        ? new Date(ins.fecha_inspeccion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                                        : '—'
                                                    return (
                                                        <Link
                                                            key={ins.id}
                                                            href={`/inspecciones/${ins.id}`}
                                                            target="_blank"
                                                            className="bg-white p-3 rounded border flex items-center justify-between shadow-sm hover:bg-gray-50"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-800 font-mono text-xs">
                                                                    {ins.codigo_interno ?? ins.codigo ?? ins.id.slice(0, 8)}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {maq?.codigo_interno ?? maq?.nombre ?? '—'} · {fecha}
                                                                    {ins.puntaje !== null && ins.puntaje !== undefined && (
                                                                        <> · <span className={ins.puntaje >= 80 ? 'text-green-600' : ins.puntaje >= 60 ? 'text-amber-600' : 'text-red-600'}>{ins.puntaje}%</span></>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {ins.tiene_fallas && (
                                                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px]">
                                                                        Con fallas
                                                                    </Badge>
                                                                )}
                                                                <Badge
                                                                    variant="outline"
                                                                    className={ins.estado === 'COMPLETADO' ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-600'}
                                                                >
                                                                    {ins.estado ?? 'REGISTRADA'}
                                                                </Badge>
                                                            </div>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Informes de formatos (sistema nuevo) */}
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2 flex items-center gap-1">
                                        <FileCheck className="h-3 w-3" /> Informes Formatos WEB
                                    </h4>
                                    {informes.length === 0 ? (
                                        <div className="text-center p-8 border border-dashed rounded bg-white text-gray-400 text-sm">
                                            No hay informes para esta tarea.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {informes.map(i => (
                                                <Link
                                                    key={i.id}
                                                    href={`/informes/${i.id}`}
                                                    target="_blank"
                                                    className="bg-white p-3 rounded border flex items-center justify-between shadow-sm hover:bg-gray-50"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-800 font-mono text-xs">
                                                            {i.codigo_informe ?? 'sin correlativo'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {i.formato_codigo} · {i.formato_nombre}
                                                        </span>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            i.estado === 'APROBADO'
                                                                ? 'text-green-600 border-green-200 bg-green-50'
                                                                : i.estado === 'RECHAZADO'
                                                                ? 'text-red-600 border-red-200 bg-red-50'
                                                                : i.estado === 'BORRADOR'
                                                                ? 'text-gray-600'
                                                                : 'text-blue-600 border-blue-200 bg-blue-50'
                                                        }
                                                    >
                                                        {i.estado}
                                                    </Badge>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </DialogContent>

            {/* NESTED DIALOG FOR FORMS */}
            <Dialog open={!!activeForm} onOpenChange={(open) => !open && setActiveForm(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {activeForm === 'PERSONAL' && 'Reporte de Personal'}
                            {activeForm === 'MAQUINARIA' && 'Reporte de Maquinaria'}
                            {activeForm === 'COMBUSTIBLE' && 'Control de Combustible'}
                        </DialogTitle>
                    </DialogHeader>

                    {activeForm === 'PERSONAL' && (
                        <ReportePersonalForm
                            tareaId={tareaId}
                            personalList={personalAsignado}
                            terceroPersonalList={terceroPersonalList}
                            config={configPersonal}
                            onSuccess={() => {
                                setActiveForm(null)
                                loadDetails(tareaId) // Reload list
                            }}
                            onCancel={() => setActiveForm(null)}
                        />
                    )}

                    {activeForm === 'MAQUINARIA' && (
                        <ReporteMaquinariaForm
                            tareaId={tareaId}
                            maquinariaList={maquinariaAsignada.length > 0 ? maquinariaAsignada : maquinariaList}
                            personalList={personalAsignado.length > 0 ? personalAsignado : personalList} // Operators are also personal
                            config={configMaquinaria}
                            onSuccess={() => {
                                setActiveForm(null)
                                loadDetails(tareaId)
                            }}
                            onCancel={() => setActiveForm(null)}
                        />
                    )}

                    {activeForm === 'COMBUSTIBLE' && (
                        <ReporteCombustibleForm
                            tareaId={tareaId}
                            maquinariaList={maquinariaList}
                            onSuccess={() => {
                                setActiveForm(null)
                                loadDetails(tareaId)
                            }}
                            onCancel={() => setActiveForm(null)}
                        />
                    )}

                </DialogContent>
            </Dialog>

            {editingRecursos && (
                <EditRecursosDialog
                    tareaId={tareaId}
                    tipo={editingRecursos}
                    open={!!editingRecursos}
                    onOpenChange={(o) => { if (!o) setEditingRecursos(null) }}
                    onSuccess={() => {
                        setEditingRecursos(null)
                        loadDetails(tareaId)
                        onResourcesChanged?.()
                    }}
                    personalList={personalList.map((p: any) => ({ id: p.id, nombre: p.nombre, avatar: p.avatar ?? null }))}
                    maquinariaList={maquinariaList.map((m: any) => ({ id: m.id, nombre: m.nombre, codigo: m.codigo }))}
                    currentPersonalIds={currentPersonalIds}
                    currentMaquinariaIds={currentMaquinariaIds}
                />
            )}
        </Dialog>
    )
}

// -----------------------------------------------------------------------------
// Subcomponentes y helpers del tab General
// -----------------------------------------------------------------------------

function InfoRow({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode
    label: string
    value: string
    sub?: string
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                {icon} {label}
            </div>
            <div className="text-sm text-gray-800 font-medium truncate" title={value}>{value}</div>
            {sub && <div className="text-xs text-gray-500 truncate" title={sub}>{sub}</div>}
        </div>
    )
}

interface RecursoRow {
    id: string
    nombre: string
    detalle?: string | null
    esExterno: boolean
    proveedorNombre?: string | null
}

function RecursosColumn({
    icon,
    title,
    recursos,
    onEdit,
}: {
    icon: React.ReactNode
    title: string
    recursos: RecursoRow[]
    onEdit?: () => void
}) {
    return (
        <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                {icon} {title} <span className="text-gray-500 normal-case">({recursos.length})</span>
                {onEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="ml-auto text-gray-400 hover:text-orange-600 transition-colors p-0.5 rounded"
                        title={`Editar ${title.toLowerCase()}`}
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                )}
            </div>
            {recursos.length === 0 ? (
                <div className="text-xs text-gray-400 italic border border-dashed rounded bg-white p-3">
                    Sin {title.toLowerCase()} asignado
                </div>
            ) : (
                <div className="space-y-1.5">
                    {recursos.map((r) => (
                        <div
                            key={r.id}
                            className={`bg-white border rounded p-2 flex items-start justify-between gap-2 border-l-4 ${r.esExterno ? 'border-l-orange-500' : 'border-l-blue-500'}`}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-800 truncate" title={r.nombre}>{r.nombre}</div>
                                {r.detalle && (
                                    <div className="text-xs text-gray-500 truncate" title={r.detalle}>{r.detalle}</div>
                                )}
                                {r.esExterno && r.proveedorNombre && (
                                    <div className="text-[10px] text-orange-700 truncate mt-0.5" title={r.proveedorNombre}>
                                        Proveedor: {r.proveedorNombre}
                                    </div>
                                )}
                            </div>
                            {r.esExterno ? (
                                <span className="text-[10px] uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded shrink-0">Externo</span>
                            ) : (
                                <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">Interno</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function flattenRecursos(tarea: TareaDetalle | null, tipo: 'PERSONAL' | 'MAQUINARIA'): RecursoRow[] {
    if (!tarea) return []
    const seen = new Map<string, RecursoRow>()
    for (const f of tarea.fechas ?? []) {
        for (const r of (f as unknown as { recursos: TareaRecursoWithNames[] }).recursos ?? []) {
            if (r.tipo_recurso !== tipo) continue
            const esExterno = Boolean(r.proveedor_id || r.recurso_externo_nombre)
            let key: string
            let nombre: string
            let detalle: string | null = null
            if (tipo === 'PERSONAL') {
                if (esExterno) {
                    nombre = r.recurso_externo_nombre || 'Recurso externo'
                    key = `ext-p-${r.proveedor_id ?? ''}-${nombre}`
                    detalle = 'Subcontratado'
                } else {
                    const p = r.personal
                    nombre = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Sin nombre'
                    detalle = p?.doc_number ? `DNI ${p.doc_number}` : null
                    key = `p-${p?.id ?? r.id}`
                }
            } else {
                if (esExterno) {
                    nombre = r.recurso_externo_nombre || 'Equipo externo'
                    key = `ext-m-${r.proveedor_id ?? ''}-${nombre}`
                    detalle = 'Alquiler externo'
                } else {
                    const m = r.maquinaria
                    const parts = [m?.codigo_interno, m?.nombre].filter(Boolean).join(' · ') || 'Sin datos'
                    nombre = parts
                    detalle = [m?.modelo, m?.placa].filter(Boolean).join(' · ') || null
                    key = `m-${m?.id ?? r.id}`
                }
            }
            if (!seen.has(key)) {
                seen.set(key, {
                    id: key,
                    nombre,
                    detalle,
                    esExterno,
                    proveedorNombre: r.proveedor?.razon_social ?? null,
                })
            }
        }
    }
    return Array.from(seen.values())
}

function formatRangoFechas(tarea: TareaDetalle | null): string {
    if (!tarea || !tarea.fechas || tarea.fechas.length === 0) return 'Sin fechas'
    const dias = diasTarea(tarea)
    if (dias.length === 0) return 'Sin fechas'
    const primero = dias[0]
    const ultimo = dias[dias.length - 1]
    if (primero === ultimo) {
        return format(new Date(primero), "dd MMM yyyy", { locale: es })
    }
    return `${format(new Date(primero), "dd MMM", { locale: es })} → ${format(new Date(ultimo), "dd MMM yyyy", { locale: es })}`
}

function cantidadDiasLabel(tarea: TareaDetalle | null): string | undefined {
    if (!tarea) return undefined
    const n = diasTarea(tarea).length
    if (n <= 1) return undefined
    return `${n} días`
}

function diasTarea(tarea: TareaDetalle): string[] {
    const set = new Set<string>()
    for (const f of tarea.fechas ?? []) {
        if (f.fechas_multiples && f.fechas_multiples.length > 0) {
            for (const d of f.fechas_multiples) set.add(d)
        } else if (f.fecha_inicio && f.fecha_fin) {
            const start = new Date(f.fecha_inicio)
            const end = new Date(f.fecha_fin)
            const cursor = new Date(start)
            while (cursor <= end) {
                set.add(cursor.toISOString().slice(0, 10))
                cursor.setUTCDate(cursor.getUTCDate() + 1)
            }
        }
    }
    return Array.from(set).sort()
}

function cotizacionLabel(tarea: TareaDetalle): string {
    if (tarea.cotizacion) {
        const { numero, anio } = tarea.cotizacion
        if (numero && anio) return `${numero}-${anio}`
        return numero ?? `CT-${tarea.cotizacion.id.slice(0, 4)}`
    }
    return tarea.cotizacion_ref ?? '—'
}
