"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Truck, HardHat } from "lucide-react"
import { updateRecursosTarea } from "@/lib/actions/planificacion"
import { toast } from "sonner"

type Scope = 'this_day' | 'from_this_day' | 'all_days'

interface PersonalItem {
    id: string
    nombre: string
    avatar?: string | null
}

interface MaquinariaItem {
    id: string
    nombre: string
    codigo: string
}

interface Props {
    tareaId: string
    tipo: 'PERSONAL' | 'MAQUINARIA'
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    contextFecha?: string | null
    personalList: PersonalItem[]
    maquinariaList: MaquinariaItem[]
    currentPersonalIds: string[]
    currentMaquinariaIds: string[]
}

export function EditRecursosDialog({
    tareaId, tipo, open, onOpenChange, onSuccess,
    contextFecha, personalList, maquinariaList,
    currentPersonalIds, currentMaquinariaIds,
}: Props) {
    const initialIds = tipo === 'PERSONAL' ? currentPersonalIds : currentMaquinariaIds
    const [selected, setSelected] = useState<string[]>(initialIds)
    const [scope, setScope] = useState<Scope>(contextFecha ? 'this_day' : 'all_days')
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            setSelected(tipo === 'PERSONAL' ? currentPersonalIds : currentMaquinariaIds)
            setScope(contextFecha ? 'this_day' : 'all_days')
            setSearch("")
        }
    }, [open, tipo, currentPersonalIds, currentMaquinariaIds, contextFecha])

    const list: PersonalItem[] = tipo === 'PERSONAL'
        ? personalList
        : maquinariaList.map((m) => ({ id: m.id, nombre: `${m.codigo} · ${m.nombre}`, avatar: null }))

    const baseList = search
        ? list.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))
        : list

    // Show currently assigned items first so the user can see and deselect them
    const currentIds = tipo === 'PERSONAL' ? currentPersonalIds : currentMaquinariaIds
    const filtered = [
        ...baseList.filter(item => currentIds.includes(item.id)),
        ...baseList.filter(item => !currentIds.includes(item.id)),
    ]

    const toggle = (id: string) => {
        setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await updateRecursosTarea({
                tareaId,
                tipo,
                recursoIds: selected,
                scope,
                fecha: contextFecha ?? undefined,
            })
            if (res.success) {
                toast.success("Recursos actualizados")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(res.message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Editar {tipo === 'PERSONAL' ? 'Personal' : 'Maquinaria'} asignado
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {contextFecha && (
                        <div className="rounded-md border bg-gray-50 p-4 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                ¿Para cuándo aplica el cambio?
                            </p>
                            <RadioGroup
                                value={scope}
                                onValueChange={(v) => setScope(v as Scope)}
                                className="space-y-1.5"
                            >
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="this_day" id="scope-this" />
                                    <Label htmlFor="scope-this" className="text-sm cursor-pointer">
                                        Solo este día <span className="text-gray-400">({contextFecha})</span>
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="from_this_day" id="scope-from" />
                                    <Label htmlFor="scope-from" className="text-sm cursor-pointer">
                                        De este día en adelante
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="all_days" id="scope-all" />
                                    <Label htmlFor="scope-all" className="text-sm cursor-pointer">
                                        Todos los días de la tarea
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    <Input
                        placeholder={tipo === 'PERSONAL' ? 'Buscar personal...' : 'Buscar equipo...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9"
                    />

                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border rounded-md bg-gray-50 p-2">
                        {filtered.length === 0 ? (
                            <p className="text-sm text-gray-400 p-2 text-center">Sin resultados</p>
                        ) : (
                            filtered.map((item, idx) => (<>
                                {idx > 0 && currentIds.includes(filtered[idx - 1].id) && !currentIds.includes(item.id) && (
                                    <div className="flex items-center gap-2 py-1">
                                        <div className="flex-1 border-t border-dashed border-gray-300" />
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Disponibles</span>
                                        <div className="flex-1 border-t border-dashed border-gray-300" />
                                    </div>
                                )}
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 p-3 bg-white rounded-md border shadow-sm cursor-pointer transition-colors ${
                                        selected.includes(item.id)
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'hover:border-orange-200'
                                    }`}
                                    onClick={() => toggle(item.id)}
                                >
                                    <Checkbox
                                        checked={selected.includes(item.id)}
                                        onCheckedChange={() => toggle(item.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div
                                        className="flex items-center justify-center h-7 w-7 rounded-full shrink-0"
                                        style={{ background: tipo === 'PERSONAL' ? 'rgb(219,234,254)' : 'rgb(255,237,213)' }}
                                    >
                                        {tipo === 'PERSONAL' ? (
                                            item.avatar
                                                ? <Image src={item.avatar} width={24} height={24} className="h-full w-full rounded-full object-cover" alt="" />
                                                : <HardHat className="h-3.5 w-3.5 text-blue-700" />
                                        ) : (
                                            <Truck className="h-3.5 w-3.5 text-orange-700" />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium flex-1">{item.nombre}</span>
                                    {currentIds.includes(item.id) && (
                                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Actual</span>
                                    )}
                                </div>
                            </>))
                        )}
                    </div>

                    <p className="text-xs text-gray-400">
                        {selected.length} seleccionado{selected.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {loading ? "Guardando..." : "Guardar cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
