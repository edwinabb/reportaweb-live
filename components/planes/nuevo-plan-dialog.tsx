'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createPlanAccion } from '@/lib/actions/planes'
import { useRouter } from 'next/navigation'

export function NuevoPlanDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [titulo, setTitulo] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [prioridad, setPrioridad] = useState<'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!titulo.trim()) {
            toast.error('El título es requerido')
            return
        }
        startTransition(async () => {
            const res = await createPlanAccion({
                titulo: titulo.trim(),
                descripcion_problema: descripcion.trim() || null,
                prioridad,
            })
            if (res.success) {
                toast.success('Plan de acción creado')
                setOpen(false)
                setTitulo('')
                setDescripcion('')
                setPrioridad('MEDIA')
                router.refresh()
            } else {
                toast.error('Error al crear el plan')
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Nuevo Plan de Acción</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="titulo">Título / Hallazgo *</Label>
                        <Input
                            id="titulo"
                            placeholder="Describe el problema o hallazgo"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                            id="descripcion"
                            placeholder="Detalle adicional del problema (opcional)"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={3}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select
                            value={prioridad}
                            onValueChange={(v) => setPrioridad(v as typeof prioridad)}
                            disabled={isPending}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CRITICA">Crítica</SelectItem>
                                <SelectItem value="ALTA">Alta</SelectItem>
                                <SelectItem value="MEDIA">Media</SelectItem>
                                <SelectItem value="BAJA">Baja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Plan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
