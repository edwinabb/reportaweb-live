"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { getTareaById, updateTareaIntervals } from "@/lib/actions/planificacion"
import type { TareaWithRelations } from "@/types/planificacion"

interface Props {
    tareaId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSaved?: () => void
}

/**
 * Dialog de edición de fechas de una tarea.
 *
 * v1: carga el primer intervalo (si existen varios, los colapsa) y permite
 * cambiar las fechas preservando los mismos recursos. Fechas consecutivas se
 * guardan como fecha_inicio+fecha_fin; salteadas como fechas_multiples.
 *
 * Los recursos asignados a intervalos adicionales (si había >1) se pierden
 * en esta versión — se muestra un warning. Extensión futura: editor por
 * intervalo con tabs.
 */
export function EditarFechasDialog({ tareaId, open, onOpenChange, onSaved }: Props) {
    const [tarea, setTarea] = useState<TareaWithRelations | null>(null)
    const [selected, setSelected] = useState<Date[]>([])
    const [notas, setNotas] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!open || !tareaId) return
        setIsLoading(true)
        getTareaById(tareaId).then((t) => {
            setTarea(t)
            if (t && t.fechas && t.fechas.length > 0) {
                const primer = t.fechas[0]
                const dates: Date[] = []
                if (primer.fechas_multiples && primer.fechas_multiples.length > 0) {
                    dates.push(...primer.fechas_multiples.map((s) => new Date(s)))
                } else if (primer.fecha_inicio && primer.fecha_fin) {
                    const start = new Date(primer.fecha_inicio)
                    const end = new Date(primer.fecha_fin)
                    const cursor = new Date(start)
                    while (cursor <= end) {
                        dates.push(new Date(cursor))
                        cursor.setDate(cursor.getDate() + 1)
                    }
                }
                setSelected(dates)
                setNotas(primer.notas || "")
            } else {
                setSelected([])
                setNotas("")
            }
            setIsLoading(false)
        })
    }, [open, tareaId])

    const handleSave = async () => {
        if (!tareaId || !tarea) return
        if (selected.length === 0) {
            toast.error("Selecciona al menos una fecha")
            return
        }

        const ordenadas = [...selected].sort((a, b) => a.getTime() - b.getTime())
        const fechasStr = ordenadas.map((d) => format(d, "yyyy-MM-dd"))

        const isConsecutive =
            ordenadas.length <= 1 ||
            ordenadas.every((d, i) => {
                if (i === 0) return true
                return Math.round((d.getTime() - ordenadas[i - 1].getTime()) / 86_400_000) === 1
            })

        // Preservamos los recursos del primer intervalo.
        const primer = tarea.fechas?.[0]
        const recursos = (primer?.recursos || []).map((r) => ({
            tipo_recurso: r.tipo_recurso,
            recurso_id: (r.tipo_recurso === 'PERSONAL' ? r.personal_id : r.maquinaria_id) as string,
            recurso_externo_nombre: r.recurso_externo_nombre,
            proveedor_id: r.proveedor_id,
        }))

        const intervalo = isConsecutive
            ? { fecha_inicio: fechasStr[0], fecha_fin: fechasStr[fechasStr.length - 1], notas: notas || null, recursos }
            : { fechas_multiples: fechasStr, notas: notas || null, recursos }

        setIsSaving(true)
        const res = await updateTareaIntervals(tareaId, [intervalo])
        setIsSaving(false)

        if (res.success) {
            toast.success("Fechas actualizadas")
            onOpenChange(false)
            onSaved?.()
        } else {
            toast.error(res.message)
        }
    }

    const varianIntervalos = tarea && tarea.fechas && tarea.fechas.length > 1

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar fechas</DialogTitle>
                    <DialogDescription>
                        {tarea ? `${tarea.codigo || ''} — ${tarea.titulo}` : 'Cargando...'}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-6 text-sm text-gray-500 text-center">Cargando...</div>
                ) : (
                    <div className="space-y-4">
                        {varianIntervalos && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                                Esta tarea tiene {tarea!.fechas!.length} intervalos. Al guardar, se
                                colapsan en uno solo con los recursos del primero.
                            </div>
                        )}

                        <div>
                            <Label className="text-sm">Fechas programadas</Label>
                            <Calendar
                                mode="multiple"
                                selected={selected}
                                onSelect={(dates) => setSelected(dates || [])}
                                locale={es}
                                className="rounded-md border mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                {selected.length > 0
                                    ? `${selected.length} día${selected.length > 1 ? 's' : ''} seleccionado${selected.length > 1 ? 's' : ''}`
                                    : 'Selecciona los días'}
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="notas" className="text-sm">Notas (opcional)</Label>
                            <Textarea
                                id="notas"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="Notas sobre el intervalo..."
                                rows={2}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading || isSaving || selected.length === 0}>
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
