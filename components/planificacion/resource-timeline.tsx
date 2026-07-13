"use client"

import { useMemo, useTransition } from "react"
import { format, eachDayOfInterval, isSameDay, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Festivo } from "@/lib/actions/festivos"

interface Assignment {
    resourceId: string
    tipo: 'PERSONAL' | 'MAQUINARIA'
    date: string // YYYY-MM-DD
    tarea: {
        id: string
        titulo: string
        sitio: string
        codigo: string
        cliente?: string
        horario?: string
    }
}

interface Resource {
    id: string
    nombre: string
    avatar?: string | null
    codigo?: string
    proveedor_nombre?: string | null
    is_operario?: boolean
}

interface Props {
    resources: Resource[]
    assignments: Assignment[]
    startDate: Date
    endDate: Date
    onDateChange?: (start: Date, end: Date) => void
    onTareaClick?: (tareaId: string, date: string) => void
    onToggleOperario?: (id: string, value: boolean) => Promise<void>
    title: string
    showHeader?: boolean
    festivos?: Festivo[]
}

export function ResourceTimeline({ resources, assignments, startDate, endDate, onDateChange, onTareaClick, onToggleOperario, title, showHeader = true, festivos = [] }: Props) {
    const [isPending, startTransition] = useTransition()
    const festivosMap = useMemo(
        () => new Map(festivos.map((f) => [f.fecha, f.descripcion ?? 'Festivo'])),
        [festivos],
    )
    const days = useMemo(() => {
        try {
            return eachDayOfInterval({ start: startDate, end: endDate })
        } catch (e) {
            return []
        }
    }, [startDate, endDate])

    const handlePrev = () => {
        if (onDateChange) {
            onDateChange(addDays(startDate, -7), addDays(endDate, -7))
        }
    }

    const handleNext = () => {
        if (onDateChange) {
            onDateChange(addDays(startDate, 7), addDays(endDate, 7))
        }
    }

    return (
        <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
            {showHeader && (
                <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold text-sm">
                            {format(startDate, 'd MMMM', { locale: es })} - {format(endDate, 'd MMMM, yyyy', { locale: es })}
                        </span>
                        <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <h3 className="font-bold text-gray-700 uppercase">{title}</h3>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="p-2 text-left w-[200px] border-b border-r bg-gray-50/50 sticky left-0 z-10">Recurso</th>
                            {days.map(day => {
                                const dayStr = format(day, 'yyyy-MM-dd')
                                const esDomingo = day.getDay() === 0
                                const festivoDesc = festivosMap.get(dayStr)
                                const esFestivo = !!festivoDesc
                                const esHoy = isSameDay(day, new Date())
                                const esEspecial = esDomingo || esFestivo

                                return (
                                    <th
                                        key={day.toISOString()}
                                        className={cn(
                                            "p-2 border-b min-w-[100px] text-center",
                                            esEspecial ? "bg-amber-50" : "bg-gray-50/50"
                                        )}
                                        title={festivoDesc ?? (esDomingo ? 'Domingo' : undefined)}
                                    >
                                        <div className="flex flex-col items-center">
                                            <span className={cn(
                                                "text-xs uppercase",
                                                esEspecial ? "text-amber-600 font-medium" : "text-gray-500"
                                            )}>
                                                {format(day, 'EEE', { locale: es })}
                                            </span>
                                            <span className={cn(
                                                "font-bold h-6 w-6 flex items-center justify-center rounded-full text-sm",
                                                esHoy ? "bg-orange-500 text-white" :
                                                esFestivo ? "bg-amber-400 text-white" :
                                                esDomingo ? "text-amber-600" : ""
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            {esFestivo && (
                                                <span className="text-[9px] text-amber-600 max-w-[90px] truncate leading-tight mt-0.5" title={festivoDesc}>
                                                    {festivoDesc}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {resources.map(resource => (
                            <tr key={resource.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="p-2 border-b border-r sticky left-0 bg-white z-10 w-[200px] max-w-[200px]">
                                    <div className="flex flex-col">
                                        <span className="font-medium truncate" title={resource.nombre}>{resource.nombre}</span>
                                        {resource.codigo && <span className="text-xs text-gray-400">{resource.codigo}</span>}
                                        {resource.proveedor_nombre && (
                                            <span className="text-[10px] text-orange-500 uppercase tracking-wide truncate">{resource.proveedor_nombre}</span>
                                        )}
                                        {onToggleOperario && (
                                            <label className="flex items-center gap-1 mt-0.5 cursor-pointer select-none w-fit">
                                                <input
                                                    type="checkbox"
                                                    checked={resource.is_operario ?? false}
                                                    disabled={isPending}
                                                    onChange={(e) => {
                                                        startTransition(() => {
                                                            onToggleOperario(resource.id, e.target.checked)
                                                        })
                                                    }}
                                                    className="h-3 w-3 accent-orange-600"
                                                />
                                                <span className="text-[10px] text-gray-400">Operario</span>
                                            </label>
                                        )}
                                    </div>
                                </td>
                                {days.map(day => {
                                    const dayString = format(day, 'yyyy-MM-dd')
                                    const asigs = assignments.filter(a => a.resourceId === resource.id && a.date.startsWith(dayString))
                                    const esCeldaEspecial = day.getDay() === 0 || festivosMap.has(dayString)

                                    return (
                                        <td key={`${resource.id}-${dayString}`} className={cn("p-1 border-b border-l text-xs min-h-[60px]", esCeldaEspecial && "bg-amber-50/40")}>
                                            {asigs.length > 0 ? (
                                                <div className="flex flex-col gap-0.5 h-full">
                                                    {asigs.map((asig, idx) => (
                                                        <div
                                                            key={`${asig.tarea.id}-${idx}`}
                                                            className="bg-orange-100 border border-orange-200 text-orange-800 p-1 rounded-sm overflow-hidden flex flex-col justify-center leading-tight hover:bg-orange-200 hover:shadow-md transition-all cursor-pointer flex-1 min-h-[52px]"
                                                            title={`${asig.tarea.codigo} · ${asig.tarea.titulo}`}
                                                            onClick={() => onTareaClick?.(asig.tarea.id, dayString)}
                                                        >
                                                            <span className="font-bold text-[10px]">{asig.tarea.codigo}</span>
                                                            <span className="truncate text-[10px] font-medium">{asig.tarea.titulo}</span>
                                                            {asig.tarea.horario && <span className="text-[9px] text-orange-600">{asig.tarea.horario}</span>}
                                                            {asig.tarea.cliente && <span className="truncate text-[9px] text-orange-500">{asig.tarea.cliente}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-full w-full min-h-[60px]"></div>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
