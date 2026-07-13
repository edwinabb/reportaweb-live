'use client'

import { useState } from 'react'
import { createTarea } from '@/lib/actions/tareas'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Creando...' : 'Crear Tarea'}
        </Button>
    )
}

export function TareaDialog() {
    const [open, setOpen] = useState(false)

    async function clientAction(formData: FormData) {
        const result = await createTarea(null, formData)
        if (result.success) {
            toast.success(result.message)
            setOpen(false)
        } else {
            toast.error(result.message)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Tarea
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Nueva Tarea</DialogTitle>
                    <DialogDescription>
                        Ingresa los detalles de la tarea.
                    </DialogDescription>
                </DialogHeader>
                <form action={clientAction} className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="titulo">Título</Label>
                        <Input id="titulo" name="titulo" required placeholder="Ej: Revisar contrato" />
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="prioridad">Prioridad</Label>
                        <Select name="prioridad" defaultValue="MEDIA">
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona prioridad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALTA">Alta</SelectItem>
                                <SelectItem value="MEDIA">Media</SelectItem>
                                <SelectItem value="BAJA">Baja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="fecha_vencimiento">Vencimiento</Label>
                        <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" />
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea id="descripcion" name="descripcion" placeholder="Detalles adicionales..." />
                    </div>

                    <DialogFooter>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
