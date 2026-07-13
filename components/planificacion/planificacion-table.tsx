"use client"

import { useMemo } from "react"
import { TareaWithRelations, TareaFechaWithRecursos } from "@/types/planificacion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { User, Truck, CalendarCog, FileText } from "lucide-react"
import type { InformesCount } from "@/lib/actions/planificacion"

function resumenFechas(fechas: TareaFechaWithRecursos[]): string {
    if (!fechas || fechas.length === 0) return 'Sin fecha'
    if (fechas.length > 1) return `${fechas.length} intervalos`

    const f = fechas[0]
    if (f.fecha_inicio && f.fecha_fin) {
        const inicio = parseISO(f.fecha_inicio)
        const fin = parseISO(f.fecha_fin)
        if (f.fecha_inicio === f.fecha_fin) return format(inicio, "d LLL", { locale: es })
        return `${format(inicio, 'd LLL', { locale: es })} — ${format(fin, 'd LLL', { locale: es })}`
    }
    if (f.fechas_multiples && f.fechas_multiples.length > 0) {
        return `${f.fechas_multiples.length} días`
    }
    return 'Sin fecha'
}

function todosLosRecursos(tarea: TareaWithRelations) {
    return (tarea.fechas || []).flatMap((f) => f.recursos || [])
}

/** Earliest fecha_inicio across all intervalos — used for grouping/sorting. */
function fechaInicioMin(tarea: TareaWithRelations): string | null {
    let best: string | null = null
    for (const f of tarea.fechas || []) {
        const candidates: string[] = []
        if (f.fecha_inicio) candidates.push(f.fecha_inicio)
        if (f.fechas_multiples && f.fechas_multiples.length > 0) candidates.push(...f.fechas_multiples)
        for (const c of candidates) {
            if (best === null || c < best) best = c
        }
    }
    return best
}

function formatGroupDate(iso: string): string {
    const d = parseISO(iso)
    if (!isValid(d)) return iso
    return format(d, "EEEE d 'de' MMMM, yyyy", { locale: es }).replace(/^./, (c) => c.toUpperCase())
}

interface Props {
    data: TareaWithRelations[]
    personalMap?: Map<string, string>
    personalPrimerNombreMap?: Map<string, string>
    maquinariaMap?: Map<string, string>
    maquinariaProveedorMap?: Map<string, string>
    informesCounts?: Record<string, Record<string, InformesCount>>
    weekStart?: Date
    weekEnd?: Date
    onRowClick?: (tarea: TareaWithRelations, date: string) => void
    onEditFechas?: (tarea: TareaWithRelations) => void
}

const COL_COUNT = 9 // horario, tarea+desc, personal, maquinaria, informes, cliente+cotiz, sitio, autor, acciones

function formatHora(hora: string | null | undefined): string | null {
    if (!hora) return null
    const [h, m] = hora.split(':').map(Number)
    if (isNaN(h)) return null
    const period = h < 12 ? 'am' : 'pm'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return m ? `${h12}:${String(m).padStart(2, '0')} ${period}` : `${h12} ${period}`
}

export function PlanificacionTable({ data, personalMap, personalPrimerNombreMap, maquinariaMap, maquinariaProveedorMap, informesCounts, weekStart, weekEnd, onRowClick, onEditFechas }: Props) {
    const sorted = useMemo(
        () => [...data].sort((a, b) => {
            const fa = fechaInicioMin(a) ?? '9999'
            const fb = fechaInicioMin(b) ?? '9999'
            return fa.localeCompare(fb)
        }),
        [data],
    )

    // Genera filas agrupadas: muestra los 7 días Dom-Sáb siempre.
    // Una tarea aparece bajo CADA día de la semana que cae dentro de su rango (no solo el primer día).
    const rows = useMemo(() => {
        type Row =
            | { kind: 'group'; date: string }
            | { kind: 'tarea'; tarea: TareaWithRelations; groupDate: string }
            | { kind: 'empty'; date: string }

        const out: Row[] = []

        if (weekStart && weekEnd) {
            // Construir lista de strings de días de la semana (UTC para consistencia con DB)
            const weekDayStrs: string[] = []
            const cursor = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()))
            const endStr = weekEnd.toISOString().slice(0, 10)
            while (true) {
                const dayStr = cursor.toISOString().slice(0, 10)
                weekDayStrs.push(dayStr)
                if (dayStr === endStr) break
                cursor.setUTCDate(cursor.getUTCDate() + 1)
            }

            // Para cada tarea, determinar en qué días de la semana está activa
            const tasksByDay = new Map<string, TareaWithRelations[]>()
            for (const d of weekDayStrs) tasksByDay.set(d, [])

            for (const t of sorted) {
                const placedDays = new Set<string>()
                for (const f of t.fechas || []) {
                    for (const dayStr of weekDayStrs) {
                        if (placedDays.has(dayStr)) continue
                        let overlaps = false
                        if (f.fechas_multiples && f.fechas_multiples.length > 0) {
                            overlaps = f.fechas_multiples.includes(dayStr)
                        } else if (f.fecha_inicio && f.fecha_fin) {
                            overlaps = dayStr >= f.fecha_inicio && dayStr <= f.fecha_fin
                        }
                        if (overlaps) {
                            tasksByDay.get(dayStr)!.push(t)
                            placedDays.add(dayStr)
                        }
                    }
                }
            }

            for (const dayStr of weekDayStrs) {
                out.push({ kind: 'group', date: dayStr })
                const dayTasks = tasksByDay.get(dayStr) ?? []
                if (dayTasks.length === 0) {
                    out.push({ kind: 'empty', date: dayStr })
                } else {
                    for (const t of dayTasks) out.push({ kind: 'tarea', tarea: t, groupDate: dayStr })
                }
            }
        } else {
            // Fallback sin semana: agrupar por fechaInicioMin
            let lastDate: string | null | undefined
            for (const t of sorted) {
                const d = fechaInicioMin(t)
                if (d !== lastDate) { out.push({ kind: 'group', date: d ?? 'sin-fecha' }); lastDate = d }
                out.push({ kind: 'tarea', tarea: t, groupDate: d ?? '' })
            }
        }

        return out
    }, [sorted, weekStart, weekEnd])

    const renderPersonal = (tarea: TareaWithRelations) => {
        // Preferir nombres pre-computados de la MV (ya resueltos desde profiles)
        if (tarea.personal_nombres && tarea.personal_nombres.length > 0) {
            return (
                <div className="flex flex-wrap gap-1">
                    {tarea.personal_nombres.map((nombre) => (
                        <Badge
                            key={nombre}
                            variant="outline"
                            className="text-xs font-normal gap-1 px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-700"
                        >
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{nombre}</span>
                        </Badge>
                    ))}
                </div>
            )
        }

        // Fallback: lookup desde personalMap (rutas sin MV)
        const personal = todosLosRecursos(tarea).filter((a) => a.tipo_recurso === 'PERSONAL')
        if (personal.length === 0) return <span className="text-xs text-gray-300 italic">Sin asignar</span>

        const seen = new Set<string>()
        const items: Array<{ key: string; label: string; externo: boolean }> = []
        for (const p of personal) {
            const pid = (p as { personal_id?: string | null }).personal_id
            const externoNombre = (p as { recurso_externo_nombre?: string | null }).recurso_externo_nombre
            const esExterno = Boolean(externoNombre) || Boolean((p as { proveedor_id?: string | null }).proveedor_id)
            if (pid) {
                if (seen.has(`i:${pid}`)) continue
                seen.add(`i:${pid}`)
                const nombre = personalPrimerNombreMap?.get(pid) ?? personalMap?.get(pid) ?? externoNombre
                items.push({ key: pid, label: nombre ?? `(${pid.slice(0, 5)}…)`, externo: esExterno })
            } else if (externoNombre) {
                const k = `e:${externoNombre}`
                if (seen.has(k)) continue
                seen.add(k)
                items.push({ key: k, label: externoNombre, externo: true })
            }
        }
        if (items.length === 0) return <span className="text-xs text-gray-300 italic">Sin asignar</span>

        return (
            <div className="flex flex-wrap gap-1">
                {items.map((it) => (
                    <Badge
                        key={it.key}
                        variant="outline"
                        className={`text-xs font-normal gap-1 px-1.5 py-0 ${it.externo ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}
                    >
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[140px]">{it.label}</span>
                    </Badge>
                ))}
            </div>
        )
    }

    const renderMaquinaria = (tarea: TareaWithRelations) => {
        const maq = todosLosRecursos(tarea).filter((a) => a.tipo_recurso === 'MAQUINARIA')
        if (maq.length === 0) return <span className="text-xs text-gray-300 italic">Sin asignar</span>

        const seen = new Set<string>()
        const items: Array<{ key: string; label: string; proveedor: string | null; externo: boolean }> = []
        for (const m of maq) {
            const mid = (m as { maquinaria_id?: string | null }).maquinaria_id
            const externoNombre = (m as { recurso_externo_nombre?: string | null }).recurso_externo_nombre
            if (mid) {
                if (seen.has(`i:${mid}`)) continue
                seen.add(`i:${mid}`)
                const nombre = maquinariaMap?.get(mid)
                const proveedor = maquinariaProveedorMap?.get(mid) ?? null
                items.push({ key: mid, label: nombre ?? `(${mid.slice(0, 5)}…)`, proveedor, externo: false })
            } else if (externoNombre) {
                const k = `e:${externoNombre}`
                if (seen.has(k)) continue
                seen.add(k)
                items.push({ key: k, label: externoNombre, proveedor: null, externo: true })
            }
        }
        if (items.length === 0) return <span className="text-xs text-gray-300 italic">Sin asignar</span>

        return (
            <div className="flex flex-wrap gap-1">
                {items.map((it) => (
                    <div key={it.key} className="flex flex-col gap-0">
                        <Badge
                            variant="outline"
                            className={`text-xs font-normal gap-1 px-1.5 py-0 ${it.externo ? 'border-red-200 bg-red-50 text-red-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}
                        >
                            <Truck className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{it.label}</span>
                        </Badge>
                        {it.proveedor && (
                            <span className="text-[10px] text-gray-400 pl-0.5 truncate max-w-[160px]">{it.proveedor}</span>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="rounded-md border bg-white shadow-sm">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500 w-28">Horario</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500">Tarea</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500">Personal</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500">Maquinaria</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500 w-28">Informes</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500">Cliente / Cotización</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500 w-32">Sitio</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500 w-28">Autor</TableHead>
                        <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-gray-500"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((r, idx) => {
                        if (r.kind === 'group') {
                            return (
                                <TableRow key={`group-${idx}`} className="bg-orange-50/60 hover:bg-orange-50/60">
                                    <TableCell colSpan={COL_COUNT} className="py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-700">
                                        {r.date && r.date !== 'sin-fecha' ? formatGroupDate(r.date) : 'Sin fecha definida'}
                                    </TableCell>
                                </TableRow>
                            )
                        }
                        if (r.kind === 'empty') {
                            return (
                                <TableRow key={`empty-${idx}`} className="hover:bg-transparent">
                                    <TableCell colSpan={COL_COUNT} className="py-2.5 text-xs text-gray-300 italic pl-4">
                                        Sin tareas planificadas
                                    </TableCell>
                                </TableRow>
                            )
                        }
                        const t = r.tarea
                        const groupDate = r.groupDate
                        const prioridadColor = t.prioridad === 'ALTA'
                            ? 'text-red-600 bg-red-100'
                            : t.prioridad === 'MEDIA'
                                ? 'text-yellow-600 bg-yellow-100'
                                : 'text-green-600 bg-green-100'

                        // cotizacion_cod viene pre-computado de la MV; fallback al objeto cotizacion
                        const cotizRef = t.cotizacion_cod
                            || (t.cotizacion?.numero ? `${t.cotizacion.numero}${t.cotizacion.anio ? `/${t.cotizacion.anio}` : ''}` : null)

                        // autor_nombre viene pre-computado de la MV; fallback al mapa de personal
                        const autorNombre = t.autor_nombre ?? (t.created_by ? (personalMap?.get(t.created_by) ?? null) : null)

                        return (
                            <TableRow
                                key={`${idx}-${t.id}`}
                                className="hover:bg-gray-50/50 cursor-pointer"
                                onClick={() => onRowClick?.(t, groupDate)}
                            >
                                <TableCell className="py-3">
                                    <div className="flex flex-col gap-0.5">
                                        {(t.hora_inicio || t.hora_fin) && (
                                            <span className="text-xs font-semibold text-orange-600">
                                                {[formatHora(t.hora_inicio), formatHora(t.hora_fin)].filter(Boolean).join(' - ')}
                                            </span>
                                        )}
                                        <span className="text-sm font-medium text-gray-700 capitalize">
                                            {resumenFechas(t.fechas)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-orange-600 truncate max-w-[200px]">{t.titulo}</span>
                                            {t.prioridad && (
                                                <Badge className={`text-[10px] px-1 py-0 h-4 border-0 shrink-0 ${prioridadColor}`}>{t.prioridad}</Badge>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">{t.codigo || 'S/C'}</span>
                                        {t.descripcion && (
                                            <span className="text-xs text-gray-500 line-clamp-1 max-w-[220px]">{t.descripcion}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-3">{renderPersonal(t)}</TableCell>
                                <TableCell className="py-3">{renderMaquinaria(t)}</TableCell>
                                <TableCell className="py-3">
                                    {(() => {
                                        const c = informesCounts?.[t.id]?.[groupDate]
                                        const total = (c?.maquinaria ?? 0) + (c?.personal ?? 0) + (c?.inspecciones ?? 0)
                                        if (!c || total === 0) return <span className="text-xs text-gray-300 italic">—</span>
                                        return (
                                            <div className="flex flex-col gap-0.5">
                                                {c.maquinaria > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-orange-600">
                                                        <Truck className="h-3 w-3 shrink-0" /> {c.maquinaria} maq.
                                                    </span>
                                                )}
                                                {c.personal > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                                                        <User className="h-3 w-3 shrink-0" /> {c.personal} pers.
                                                    </span>
                                                )}
                                                {c.inspecciones > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
                                                        <FileText className="h-3 w-3 shrink-0" /> {c.inspecciones} insp.
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </TableCell>
                                <TableCell className="py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm text-gray-700 truncate max-w-[180px]">{t.cliente_nombre || '—'}</span>
                                        {cotizRef && (
                                            <span className="text-xs text-blue-500 font-mono">{cotizRef}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-3">
                                    <span className="text-xs text-gray-600 line-clamp-2">{t.sitio || '—'}</span>
                                </TableCell>
                                <TableCell className="py-3">
                                    <span className="text-xs text-gray-500 truncate max-w-[100px] block">{autorNombre || '—'}</span>
                                </TableCell>
                                <TableCell className="py-3">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1 text-xs text-gray-600 hover:text-orange-600"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEditFechas?.(t)
                                        }}
                                    >
                                        <CalendarCog className="h-3 w-3" /> Editar fechas
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
