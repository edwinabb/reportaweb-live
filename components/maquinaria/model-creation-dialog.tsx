"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createMaquinariaModelo } from "@/lib/actions/maquinaria-models"
import { toast } from "sonner"
import { MaquinariaModelo } from "@/types/maquinaria"

interface ModelCreationDialogProps {
    onModelCreated?: (modelo: MaquinariaModelo) => void
    trigger?: React.ReactNode
}

export function ModelCreationDialog({ onModelCreated, trigger }: ModelCreationDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsPending(true)
        const formData = new FormData(e.currentTarget)

        try {
            const res = await createMaquinariaModelo(null, formData)
            if (res.success && res.data) {
                toast.success("Modelo agregado correctamente")
                if (onModelCreated) {
                    onModelCreated(res.data)
                }
                setOpen(false)
            } else {
                toast.error(res.message || "Error al crear modelo")
            }
        } catch (err) {
            toast.error("Error de conexión")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-600 rounded-full h-10 w-10" title="Agregar Modelo" type="button">
                        <Plus className="h-5 w-5" />
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>AGREGAR MODELO...</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tipo_equipo">Equipo (Categoría)</Label>
                        <Input id="tipo_equipo" name="tipo_equipo" placeholder="Ingresa el nuevo equipo" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="marca">Fabricante</Label>
                        <Input id="marca" name="marca" placeholder="Ingresa el nuevo fabricante" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="modelo">Modelo</Label>
                        <Input id="modelo" name="modelo" placeholder="Ingresa el nuevo modelo" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="capacidad">Capacidad (Default)</Label>
                        <Input id="capacidad" name="capacidad" placeholder="Ingresa la capacidad" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cerrar
                        </Button>
                        <Button type="submit" className="bg-orange-400 hover:bg-orange-500 text-white" disabled={isPending}>
                            {isPending ? "Guardando..." : "Guardar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
