"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { startOfWeek, endOfWeek, addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List as ListIcon, User, Truck, Search, CheckCircle2, X, Pencil } from "lucide-react"
import { getTareas, getRecursosForPlanning, getInformesCount, getTareasBorrador, type TareaBorradorResumen, InformesCount } from "@/lib/actions/planificacion"
import { toggleOperario } from "@/lib/actions/users"
import { getFestivosInRange, type Festivo } from "@/lib/actions/festivos"
import { TareaWithRelations } from "@/types/planificacion"
import { PlanificacionTable } from "@/components/planificacion/planificacion-table"
import { ResourceTimeline } from "@/components/planificacion/resource-timeline"
import { TareaDetailDialog } from "@/components/tareas/tarea-detail-dialog"
import { EditarFechasDialog } from "@/components/planificacion/editar-fechas-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

interface Assignment {
    resourceId: string
    tipo: 'PERSONAL' | 'MAQUINARIA'
    date: string
    tarea: { id: string; titulo: string; sitio: string; codigo: string; cliente: string; horario: string }
}

interface Recursos {
    personal: { id: string, nombre: string, primer_nombre?: string | null, avatar?: string | null, cargo_id?: string | null, personal_externo?: boolean, proveedor_nombre?: string | null, is_operario?: boolean }[]
    maquinaria: { id: string, nombre: string, codigo: string, categoria?: string | null, propietario?: string | null, proveedor_id?: string | null, proveedor_nombre?: string | null }[]
    cargos: { id: string, nombre: string }[]
    categoriasUnicas: string[]
}

function PlanificacionPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialTareaId = searchParams.get('tarea')

    const [viewMode, setViewMode] = useState<'LIST' | 'PERSONAL' | 'MAQUINARIA'>('LIST')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [tareas, setTareas] = useState<TareaWithRelations[]>([])
    const [recursos, setRecursos] = useState<Recursos>({ personal: [], maquinaria: [], cargos: [], categoriasUnicas: [] })
    const [informesCounts, setInformesCounts] = useState<Record<string, Record<string, InformesCount>>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTareaId, setSelectedTareaId] = useState<string | null>(initialTareaId)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(Boolean(initialTareaId))
    const [editFechasId, setEditFechasId] = useState<string | null>(null)
    const [editFechasOpen, setEditFechasOpen] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)
    const [festivos, setFestivos] = useState<Festivo[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [onlyCotizacionAprobada, setOnlyCotizacionAprobada] = useState(false)
    const [timelineSearchP, setTimelineSearchP] = useState("")
    const [timelineSearchM, setTimelineSearchM] = useState("")
    const [filterCargo, setFilterCargo] = useState("")
    const [filterCategoria, setFilterCategoria] = useState("")
    const [onlyOccupiedP, setOnlyOccupiedP] = useState(false)
    const [onlyOccupiedM, setOnlyOccupiedM] = useState(false)
    const [onlyOperario, setOnlyOperario] = useState(false)
    const [filterTipoPersonal, setFilterTipoPersonal] = useState<'TODOS' | 'INTERNO' | 'EXTERNO'>('TODOS')
    const [filterTipoMaquinaria, setFilterTipoMaquinaria] = useState<'TODOS' | 'INTERNO' | 'EXTERNO'>('TODOS')
    const [filterProveedorP, setFilterProveedorP] = useState("")
    const [filterProveedorM, setFilterProveedorM] = useState("")
    const [borradores, setBorradores] = useState<TareaBorradorResumen[]>([])

    const startObj = startOfWeek(currentDate, { weekStartsOn: 0 })
    const endObj = endOfWeek(currentDate, { weekStartsOn: 0 })

    // Deriva assignments desde tareas ya cargadas (misma fuente que Listado).
    // Fallback por nombre: si personal_id/maquinaria_id es null (datos legacy pre-Fix4),
    // intenta emparejar recurso_externo_nombre con el nombre/código del recurso en el catálogo.
    const assignments = useMemo((): Assignment[] => {
        const startStr = format(startObj, 'yyyy-MM-dd')
        const endStr = format(endObj, 'yyyy-MM-dd')

        // Mapas de búsqueda para fallback por nombre (datos legacy con ID null)
        const personalNombreMap = new Map(recursos.personal.map((p) => [p.nombre.toUpperCase(), p.id]))
        const maquinariaNombreMap = new Map([
            ...recursos.maquinaria.map((m): [string, string] => [m.nombre.toUpperCase(), m.id]),
            // Variante sin separadores ' · ' (compatibilidad con recurso_externo_nombre de datos legacy)
            ...recursos.maquinaria.map((m): [string, string] => [m.nombre.replace(/ · /g, ' ').toUpperCase(), m.id]),
            // Solo categoría (ej: "CAMIÓN PLUMA 18 TN")
            ...recursos.maquinaria.filter((m) => m.categoria).map((m): [string, string] => [m.categoria!.toUpperCase(), m.id]),
            ...recursos.maquinaria.filter((m) => m.codigo).map((m): [string, string] => [m.codigo.toUpperCase(), m.id]),
        ])

        const result: Assignment[] = []
        for (const tarea of tareas) {
            for (const fecha of tarea.fechas || []) {
                const days: string[] = []
                if (fecha.fecha_inicio && fecha.fecha_fin) {
                    const cur = new Date(fecha.fecha_inicio + 'T00:00:00Z')
                    const stop = new Date(fecha.fecha_fin + 'T00:00:00Z')
                    const wStart = new Date(startStr + 'T00:00:00Z')
                    const wEnd = new Date(endStr + 'T00:00:00Z')
                    const d = new Date(Math.max(cur.getTime(), wStart.getTime()))
                    const e = new Date(Math.min(stop.getTime(), wEnd.getTime()))
                    while (d <= e) {
                        days.push(d.toISOString().slice(0, 10))
                        d.setUTCDate(d.getUTCDate() + 1)
                    }
                } else if (fecha.fechas_multiples) {
                    for (const d of fecha.fechas_multiples) {
                        if (d >= startStr && d <= endStr) days.push(d)
                    }
                }
                for (const recurso of fecha.recursos || []) {
                    let resourceId: string | null = recurso.tipo_recurso === 'PERSONAL' ? recurso.personal_id : recurso.maquinaria_id
                    // Fallback por nombre para datos legacy (personal_id/maquinaria_id null)
                    if (!resourceId && recurso.recurso_externo_nombre) {
                        const nameUpper = recurso.recurso_externo_nombre.toUpperCase()
                        const nameMap = recurso.tipo_recurso === 'PERSONAL' ? personalNombreMap : maquinariaNombreMap
                        resourceId = nameMap.get(nameUpper) ?? null
                    }
                    // Fallback por proveedor: máquina externa con maquinaria_id=null creada antes del fix
                    // Si el proveedor tiene exactamente 1 equipo en el catálogo, lo usamos
                    if (!resourceId && recurso.tipo_recurso === 'MAQUINARIA') {
                        const proveedorId = (recurso as any).proveedor_id as string | null
                        if (proveedorId) {
                            const candidates = recursos.maquinaria.filter((m) => m.proveedor_id === proveedorId)
                            if (candidates.length === 1) resourceId = candidates[0].id
                        }
                    }
                    if (!resourceId) continue
                    const hi = (fecha as any).hora_inicio as string | null
                    const hf = (fecha as any).hora_fin as string | null
                    const horario = hi && hf ? `${hi.slice(0, 5)} - ${hf.slice(0, 5)}` : hi ? hi.slice(0, 5) : ''
                    for (const day of days) {
                        result.push({
                            resourceId,
                            tipo: recurso.tipo_recurso as 'PERSONAL' | 'MAQUINARIA',
                            date: day,
                            tarea: {
                                id: tarea.id,
                                titulo: tarea.titulo,
                                sitio: tarea.sitio ?? '',
                                codigo: tarea.codigo ?? '',
                                cliente: tarea.cliente_nombre ?? '',
                                horario,
                            },
                        })
                    }
                }
            }
        }
        return result
    }, [tareas, startObj, endObj, recursos.personal, recursos.maquinaria])

    const proveedoresPersonal = useMemo(() =>
        Array.from(new Set(
            recursos.personal.filter((p) => p.personal_externo && p.proveedor_nombre).map((p) => p.proveedor_nombre!)
        )).sort()
    , [recursos.personal])

    const proveedoresMaquinaria = useMemo(() =>
        Array.from(new Set(
            recursos.maquinaria.filter((m) => m.propietario === 'tercero' && m.proveedor_nombre).map((m) => m.proveedor_nombre!)
        )).sort()
    , [recursos.maquinaria])

    const personalMap = useMemo(() => new Map(recursos.personal.map((p) => [p.id, p.nombre])), [recursos.personal])
    const personalPrimerNombreMap = useMemo(() => new Map(recursos.personal.map((p) => [p.id, p.primer_nombre ?? p.nombre.split(' ')[0]])), [recursos.personal])
    const maquinariaMap = useMemo(
        () => new Map(recursos.maquinaria.map((m) => [m.id, m.codigo ? `${m.codigo} · ${m.nombre}` : m.nombre])),
        [recursos.maquinaria],
    )
    const maquinariaProveedorMap = useMemo(
        () => new Map(recursos.maquinaria.filter((m) => m.proveedor_nombre).map((m) => [m.id, m.proveedor_nombre!])),
        [recursos.maquinaria],
    )

    const filteredTareas = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return tareas.filter((t) => {
            if (onlyCotizacionAprobada && t.cotizacion?.estado !== 'APROBADA') return false
            if (!q) return true
            const haystack = [t.codigo, t.titulo, t.cliente_nombre, t.cotizacion?.numero, t.cotizacion_ref, t.sitio]
                .filter(Boolean).join(' ').toLowerCase()
            return haystack.includes(q)
        })
    }, [tareas, searchQuery, onlyCotizacionAprobada])

    const occupiedPersonalIds = useMemo(() => {
        const ids = new Set<string>()
        assignments.filter((a) => a.tipo === 'PERSONAL').forEach((a) => ids.add(a.resourceId))
        return ids
    }, [assignments])

    const occupiedMaquinariaIds = useMemo(() => {
        const ids = new Set<string>()
        assignments.filter((a) => a.tipo === 'MAQUINARIA').forEach((a) => ids.add(a.resourceId))
        return ids
    }, [assignments])

    const personalParaTimeline = useMemo(() => {
        const q = timelineSearchP.trim().toLowerCase()
        return recursos.personal
            .filter((p) => {
                if (filterTipoPersonal === 'INTERNO' && p.personal_externo) return false
                if (filterTipoPersonal === 'EXTERNO' && !p.personal_externo) return false
                if (filterProveedorP && p.proveedor_nombre !== filterProveedorP) return false
                if (filterCargo && p.cargo_id !== filterCargo) return false
                if (onlyOccupiedP && !occupiedPersonalIds.has(p.id)) return false
                if (onlyOperario && !p.is_operario) return false
                if (q && !p.nombre.toLowerCase().includes(q)) return false
                return true
            })
            .sort((a, b) => {
                const aOcc = occupiedPersonalIds.has(a.id) ? 0 : 1
                const bOcc = occupiedPersonalIds.has(b.id) ? 0 : 1
                if (aOcc !== bOcc) return aOcc - bOcc
                return a.nombre.localeCompare(b.nombre)
            })
    }, [recursos.personal, timelineSearchP, filterCargo, filterProveedorP, onlyOccupiedP, onlyOperario, occupiedPersonalIds, filterTipoPersonal])

    const maquinariaParaTimeline = useMemo(() => {
        const q = timelineSearchM.trim().toLowerCase()
        return recursos.maquinaria
            .filter((m) => {
                if (filterTipoMaquinaria === 'INTERNO' && m.propietario === 'tercero') return false
                if (filterTipoMaquinaria === 'EXTERNO' && m.propietario !== 'tercero') return false
                if (filterProveedorM && m.proveedor_nombre !== filterProveedorM) return false
                if (filterCategoria && m.categoria !== filterCategoria) return false
                if (onlyOccupiedM && !occupiedMaquinariaIds.has(m.id)) return false
                if (q && !m.nombre.toLowerCase().includes(q) && !m.codigo.toLowerCase().includes(q)) return false
                return true
            })
            .sort((a, b) => {
                const aOcc = occupiedMaquinariaIds.has(a.id) ? 0 : 1
                const bOcc = occupiedMaquinariaIds.has(b.id) ? 0 : 1
                if (aOcc !== bOcc) return aOcc - bOcc
                return a.nombre.localeCompare(b.nombre)
            })
    }, [recursos.maquinaria, timelineSearchM, filterCategoria, filterProveedorM, onlyOccupiedM, occupiedMaquinariaIds, filterTipoMaquinaria])

    const dateRangeLabel = `${format(startObj, 'MMMM dd', { locale: es })} - ${format(endObj, 'MMMM dd, yyyy', { locale: es })}`
    const formattedLabel = dateRangeLabel.charAt(0).toUpperCase() + dateRangeLabel.slice(1)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            const startIso = format(startObj, 'yyyy-MM-dd')
            const endIso = format(endObj, 'yyyy-MM-dd')
            const [data, recs, festivosData] = await Promise.all([
                getTareas(startIso, endIso),
                getRecursosForPlanning(),
                getFestivosInRange(startIso, endIso),
            ])
            setFestivos(festivosData)
            setTareas(data)
            setRecursos(recs)
            const ids = (data as TareaWithRelations[]).map((t) => t.id)
            const counts = await getInformesCount(ids, startIso, endIso)
            setInformesCounts(counts)
            setIsLoading(false)
        }
        loadData()
        getTareasBorrador().then(setBorradores)
    }, [currentDate, reloadKey])

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50/50">
            {/* Header Toolbar */}
            <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-3 min-w-[200px] text-center font-medium text-sm flex items-center justify-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            {formattedLabel}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button data-testid="btn-hoy" variant="outline" size="sm" className="ml-2 h-7 text-xs bg-white shadow-sm" onClick={() => setCurrentDate(new Date())}>
                            Hoy
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg border">
                        <Button data-testid="btn-listado" variant={viewMode === 'LIST' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3 gap-2" onClick={() => setViewMode('LIST')}>
                            <ListIcon className="h-4 w-4" /> Listado
                        </Button>
                        <div className="w-px h-4 bg-gray-300 mx-1" />
                        <Button data-testid="btn-personal" variant={viewMode === 'PERSONAL' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3 gap-2" onClick={() => setViewMode('PERSONAL')}>
                            <User className="h-4 w-4" /> Personal
                            {occupiedPersonalIds.size > 0 && (
                                <span className="ml-1 bg-orange-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none font-bold">
                                    {occupiedPersonalIds.size}
                                </span>
                            )}
                        </Button>
                        <div className="w-px h-4 bg-gray-300 mx-1" />
                        <Button data-testid="btn-maquinaria" variant={viewMode === 'MAQUINARIA' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3 gap-2" onClick={() => setViewMode('MAQUINARIA')}>
                            <Truck className="h-4 w-4" /> Maquinaria
                            {occupiedMaquinariaIds.size > 0 && (
                                <span className="ml-1 bg-orange-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none font-bold">
                                    {occupiedMaquinariaIds.size}
                                </span>
                            )}
                        </Button>
                    </div>
                    <Link href="/planificacion/nueva">
                        <Button className="bg-orange-600 hover:bg-orange-700">Nueva Tarea</Button>
                    </Link>
                </div>
            </div>

            {/* Banner: tareas BORRADOR pendientes de planificar */}
            {borradores.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4 mx-6 mt-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                        {borradores.length} tarea{borradores.length > 1 ? 's' : ''} pendiente{borradores.length > 1 ? 's' : ''} de planificar
                    </p>
                    <div className="space-y-1">
                        {borradores.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100 rounded px-2 py-1">
                                <span className="font-mono font-medium shrink-0">{t.codigo ?? t.id.slice(0, 8)}</span>
                                <span className="truncate flex-1">{t.titulo}</span>
                                {t.cliente && <span className="shrink-0 text-amber-600">{(t.cliente as { razon_social: string }).razon_social}</span>}
                                <button
                                    type="button"
                                    title="Planificar tarea"
                                    className="shrink-0 p-1 rounded hover:bg-amber-200 text-amber-700 transition-colors"
                                    onClick={() => router.push(`/planificacion/nueva?tarea=${t.id}`)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sub-toolbar: búsqueda + filtros (LIST) */}
            {viewMode === 'LIST' && (
                <div className="bg-white border-b px-6 py-2 flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por código, título, cliente o cotización…" className="pl-8 pr-8 h-8 bg-gray-50/50" />
                        {searchQuery && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")} aria-label="Limpiar búsqueda">
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    <Button size="sm" variant={onlyCotizacionAprobada ? "default" : "outline"} className={`h-8 gap-1.5 text-xs ${onlyCotizacionAprobada ? 'bg-green-600 hover:bg-green-700' : ''}`} onClick={() => setOnlyCotizacionAprobada((v) => !v)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Solo cotización aprobada
                    </Button>
                    <span className="text-xs text-gray-400 ml-auto">{filteredTareas.length} de {tareas.length} tareas</span>
                </div>
            )}

            {/* Sub-toolbar: búsqueda + filtros (PERSONAL / MAQUINARIA) */}
            {(viewMode === 'PERSONAL' || viewMode === 'MAQUINARIA') && (
                <div className="bg-white border-b px-6 py-2 flex items-center gap-3">
                    {/* Badges TODOS / INTERNO / EXTERNO */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                        {(['TODOS', 'INTERNO', 'EXTERNO'] as const).map((tipo) => {
                            const active = viewMode === 'PERSONAL' ? filterTipoPersonal === tipo : filterTipoMaquinaria === tipo
                            const activeClass =
                                tipo === 'TODOS'    ? 'bg-white shadow-sm text-gray-700' :
                                tipo === 'INTERNO'  ? 'bg-white shadow-sm text-blue-600' :
                                                     'bg-white shadow-sm text-orange-600'
                            return (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => {
                            if (viewMode === 'PERSONAL') { setFilterTipoPersonal(tipo); setFilterProveedorP("") }
                            else { setFilterTipoMaquinaria(tipo); setFilterProveedorM("") }
                        }}
                                    className={`h-7 px-3 text-xs rounded-md font-medium transition-colors ${active ? activeClass : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {tipo.charAt(0) + tipo.slice(1).toLowerCase()}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative flex-1 max-w-xs">
                        <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            value={viewMode === 'PERSONAL' ? timelineSearchP : timelineSearchM}
                            onChange={(e) => viewMode === 'PERSONAL' ? setTimelineSearchP(e.target.value) : setTimelineSearchM(e.target.value)}
                            placeholder={viewMode === 'PERSONAL' ? 'Buscar persona…' : 'Buscar equipo…'}
                            className="pl-8 pr-8 h-8 bg-gray-50/50"
                        />
                        {(viewMode === 'PERSONAL' ? timelineSearchP : timelineSearchM) && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2" onClick={() => viewMode === 'PERSONAL' ? setTimelineSearchP("") : setTimelineSearchM("")} aria-label="Limpiar búsqueda">
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    {viewMode === 'PERSONAL' && filterTipoPersonal === 'EXTERNO' && proveedoresPersonal.length > 0 && (
                        <select
                            value={filterProveedorP}
                            onChange={(e) => setFilterProveedorP(e.target.value)}
                            className="h-8 text-xs border rounded-md px-2 bg-white max-w-[200px]"
                            title="Filtrar por proveedor"
                        >
                            <option value="">Todos los proveedores</option>
                            {proveedoresPersonal.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    )}
                    {viewMode === 'MAQUINARIA' && filterTipoMaquinaria === 'EXTERNO' && proveedoresMaquinaria.length > 0 && (
                        <select
                            value={filterProveedorM}
                            onChange={(e) => setFilterProveedorM(e.target.value)}
                            className="h-8 text-xs border rounded-md px-2 bg-white max-w-[200px]"
                            title="Filtrar por proveedor"
                        >
                            <option value="">Todos los proveedores</option>
                            {proveedoresMaquinaria.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    )}
                    {viewMode === 'PERSONAL' && recursos.cargos.length > 0 && filterTipoPersonal !== 'EXTERNO' && (
                        <select
                            value={filterCargo}
                            onChange={(e) => setFilterCargo(e.target.value)}
                            className="h-8 text-xs border rounded-md px-2 bg-white"
                            title="Filtrar por cargo"
                        >
                            <option value="">Todos los cargos</option>
                            {recursos.cargos.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    )}
                    {viewMode === 'MAQUINARIA' && recursos.categoriasUnicas.length > 0 && filterTipoMaquinaria !== 'EXTERNO' && (
                        <select
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                            className="h-8 text-xs border rounded-md px-2 bg-white"
                            title="Filtrar por categoría"
                        >
                            <option value="">Todas las categorías</option>
                            {recursos.categoriasUnicas.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    )}
                    <Button
                        size="sm"
                        variant={viewMode === 'PERSONAL' ? (onlyOccupiedP ? "default" : "outline") : (onlyOccupiedM ? "default" : "outline")}
                        className={`h-8 gap-1.5 text-xs ${(viewMode === 'PERSONAL' ? onlyOccupiedP : onlyOccupiedM) ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                        onClick={() => viewMode === 'PERSONAL' ? setOnlyOccupiedP((v) => !v) : setOnlyOccupiedM((v) => !v)}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Solo ocupados
                    </Button>
                    {viewMode === 'PERSONAL' && (
                        <Button
                            size="sm"
                            variant={onlyOperario ? "default" : "outline"}
                            className={`h-8 gap-1.5 text-xs ${onlyOperario ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            onClick={() => setOnlyOperario((v) => !v)}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Solo operarios
                        </Button>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                        {viewMode === 'PERSONAL'
                            ? `${personalParaTimeline.length} de ${recursos.personal.length} personas`
                            : `${maquinariaParaTimeline.length} de ${recursos.maquinaria.length} equipos`}
                    </span>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : (
                    <>
                        {viewMode === 'LIST' && (
                            <PlanificacionTable
                                data={filteredTareas}
                                personalMap={personalMap}
                                personalPrimerNombreMap={personalPrimerNombreMap}
                                maquinariaMap={maquinariaMap}
                                maquinariaProveedorMap={maquinariaProveedorMap}
                                informesCounts={informesCounts}
                                weekStart={startObj}
                                weekEnd={endObj}
                                onRowClick={(t, date) => { setSelectedTareaId(t.id); setSelectedDate(date); setDetailsOpen(true) }}
                                onEditFechas={(t) => { setEditFechasId(t.id); setEditFechasOpen(true) }}
                            />
                        )}
                        {viewMode === 'PERSONAL' && (
                            <ResourceTimeline
                                resources={personalParaTimeline}
                                assignments={assignments.filter((a) => a.tipo === 'PERSONAL')}
                                startDate={startObj}
                                endDate={endObj}
                                onDateChange={(s) => setCurrentDate(s)}
                                title="Personal"
                                showHeader={false}
                                festivos={festivos}
                                onTareaClick={(id, date) => { setSelectedTareaId(id); setSelectedDate(date); setDetailsOpen(true) }}
                                onToggleOperario={async (id, value) => {
                                    await toggleOperario(id, value)
                                    setRecursos((prev) => ({
                                        ...prev,
                                        personal: prev.personal.map((p) => p.id === id ? { ...p, is_operario: value } : p),
                                    }))
                                }}
                            />
                        )}
                        {viewMode === 'MAQUINARIA' && (
                            <ResourceTimeline
                                resources={maquinariaParaTimeline}
                                assignments={assignments.filter((a) => a.tipo === 'MAQUINARIA')}
                                startDate={startObj}
                                endDate={endObj}
                                onDateChange={(s) => setCurrentDate(s)}
                                title="Maquinaria"
                                showHeader={false}
                                festivos={festivos}
                                onTareaClick={(id, date) => { setSelectedTareaId(id); setSelectedDate(date); setDetailsOpen(true) }}
                            />
                        )}
                    </>
                )}
            </div>

            <TareaDetailDialog tareaId={selectedTareaId} open={detailsOpen} onOpenChange={setDetailsOpen} personalList={recursos.personal} maquinariaList={recursos.maquinaria} onResourcesChanged={() => setReloadKey((k) => k + 1)} selectedDate={selectedDate} />
            <EditarFechasDialog tareaId={editFechasId} open={editFechasOpen} onOpenChange={setEditFechasOpen} onSaved={() => setReloadKey((k) => k + 1)} />
        </div>
    )
}

export default function PlanificacionPage() {
    return (
        <Suspense fallback={null}>
            <PlanificacionPageInner />
        </Suspense>
    )
}
