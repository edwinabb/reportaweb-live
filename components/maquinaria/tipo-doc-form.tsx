"use client"

import { useState } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createMaquinariaTipo, updateMaquinariaTipo } from "@/lib/actions/maquinaria-types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const initialState = { message: "", success: false }

export type TipoDocInitial = {
    id: string
    nombre: string
    aplica_a: string
    categoria: string
    dias_alerta: number | null
    es_obligatorio: boolean | null
    categoria_equipo: string | null
    modelo_id: string | null
}

interface TipoDocFormProps {
    categories?: string[]
    models?: { id: string, modelo: string, marca: string }[]
    initial?: TipoDocInitial
    onSuccess?: () => void
}

export function TipoDocForm({ categories = [], models = [], initial, onSuccess }: TipoDocFormProps) {
    const router = useRouter()
    const isEdit = Boolean(initial)
    const [categoria, setCategoria] = useState(initial?.categoria || "sin_vencimiento")
    const [aplicaA, setAplicaA] = useState(initial?.aplica_a || "todos")

    const handleSubmit = async (prevState: { message: string; success: boolean }, formData: FormData) => {
        const result = isEdit
            ? await updateMaquinariaTipo(initial!.id, prevState, formData)
            : await createMaquinariaTipo(prevState, formData)
        if (result.success) {
            toast.success(isEdit ? "Tipo actualizado" : "Tipo creado")
            onSuccess?.()
            router.refresh()
        } else {
            toast.error(result.message)
        }
        return { message: result.message || '', success: Boolean(result.success) }
    }

    const [state, formAction, isPending] = useActionState(handleSubmit, initialState)

    const requiresVencimiento = categoria === 'seguro' || categoria === 'con_vencimiento'

    return (
        <form action={formAction} className="space-y-4 max-w-md p-4 border rounded-lg bg-background">
            <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input name="nombre" id="nombre" placeholder="Ej. SOAT" required defaultValue={initial?.nombre} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select name="categoria" value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="seguro">Seguro (Tiene Vencimiento)</SelectItem>
                        <SelectItem value="con_vencimiento">Documento con Vencimiento</SelectItem>
                        <SelectItem value="sin_vencimiento">Documento sin vencimiento</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="aplica_a">Aplica a</Label>
                <Select name="aplica_a" value={aplicaA} onValueChange={setAplicaA}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="vehiculo">Solo Vehículos</SelectItem>
                        <SelectItem value="maquinaria">Solo Maquinaria</SelectItem>
                        <SelectItem value="categoria">Por Categoría</SelectItem>
                        <SelectItem value="modelo">Por Modelo</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {aplicaA === 'categoria' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="categoria_equipo">Seleccionar Categoría</Label>
                    <Select name="categoria_equipo" defaultValue={initial?.categoria_equipo ?? undefined}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Categoría de Equipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {aplicaA === 'modelo' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="modelo_id">Seleccionar Modelo</Label>
                    <Select name="modelo_id" defaultValue={initial?.modelo_id ?? undefined}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Modelo" />
                        </SelectTrigger>
                        <SelectContent>
                            {models.map((mod) => (
                                <SelectItem key={mod.id} value={mod.id}>
                                    {mod.marca} - {mod.modelo}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="flex items-center space-x-2">
                <Checkbox id="es_obligatorio" name="es_obligatorio" defaultChecked={initial?.es_obligatorio ?? false} />
                <Label htmlFor="es_obligatorio">Es Obligatorio</Label>
            </div>

            {requiresVencimiento && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="dias_alerta">Días de Alerta (antes del vencimiento)</Label>
                    <Input
                        type="number"
                        name="dias_alerta"
                        id="dias_alerta"
                        defaultValue={initial?.dias_alerta ?? 30}
                        min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                        Se enviarán alertas estos días antes de que venza.
                    </p>
                </div>
            )}

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isPending}>
                {isPending ? (isEdit ? "Guardando…" : "Agregando…") : (isEdit ? "Guardar cambios" : "Agregar Tipo")}
            </Button>

            {state?.message && !state.success && (
                <p className="text-sm text-red-500">{state.message}</p>
            )}
        </form>
    )
}
