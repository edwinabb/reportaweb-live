'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

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

interface ActionCatalogoDialogProps {
    label: string
    createAction: (nombre: string) => Promise<{ success: boolean; message?: string; item?: any }>
    onItemCreated?: (newItem: { id: string, nombre: string }) => void
}

export function ActionCatalogoDialog({ label, createAction, onItemCreated }: ActionCatalogoDialogProps) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    async function handleSave() {
        if (!value.trim()) return

        setIsLoading(true)
        const res = await createAction(value)
        setIsLoading(false)

        if (res.success) {
            toast.success(`${label} agregado correctamente`)
            setOpen(false)
            setValue("")
            if (onItemCreated && res.item) {
                onItemCreated(res.item)
            }
        } else {
            toast.error(res.message || "Error al crear elemento")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="outline" type="button" className="shrink-0 bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-600 rounded-full h-10 w-10">
                    <Plus className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Agregar {label}</DialogTitle>
                    <DialogDescription>
                        Agrega un nuevo {label.toLowerCase()} al catálogo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nombre
                        </Label>
                        <Input
                            id="name"
                            value={value}
                            onChange={(e) => setValue(e.target.value.toUpperCase())}
                            className="col-span-3"
                            placeholder={`Ej. ${label === 'Cargo' ? 'SUPERVISOR' : 'VENTAS'}`}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isLoading} className="bg-orange-400 hover:bg-orange-500 text-white">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
