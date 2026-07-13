'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createPlanAvance } from '@/lib/actions/planes'
import { useRouter } from 'next/navigation'
import { PlanAccion } from '@/types/formatos'

interface AvanceDialogProps {
    plan: PlanAccion
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AvanceDialog({ plan, open, onOpenChange }: AvanceDialogProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [comentario, setComentario] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!comentario.trim()) {
            toast.error('El comentario es requerido')
            return
        }
        startTransition(async () => {
            const res = await createPlanAvance({
                plan_id: plan.id,
                comentario: comentario.trim(),
            })
            if (res.success) {
                toast.success('Avance registrado')
                onOpenChange(false)
                setComentario('')
                router.refresh()
            } else {
                toast.error(res.message || 'Error al registrar avance')
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Registrar Avance</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {plan.titulo || plan.descripcion_problema || 'Sin título'}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="comentario">Comentario de avance *</Label>
                        <Textarea
                            id="comentario"
                            placeholder="Describe las acciones tomadas y el progreso actual..."
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            rows={4}
                            disabled={isPending}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Avance
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
