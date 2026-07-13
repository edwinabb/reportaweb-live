'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { CheckCircle, Loader2, Upload } from 'lucide-react'
import { closePlanAccion } from '@/lib/actions/planes'

interface Props {
    planId: string
    planCodigo: string | null
    disabled?: boolean
}

export function ClosePlanDialog({ planId, planCodigo, disabled }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [comentario, setComentario] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!comentario.trim()) {
            toast.error('El comentario de cierre es obligatorio')
            return
        }
        setSubmitting(true)
        const res = await closePlanAccion(planId, { comentario, evidencia: file })
        setSubmitting(false)

        if (res.success) {
            toast.success(res.message)
            setOpen(false)
            setComentario('')
            setFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
            router.refresh()
        } else {
            toast.error(res.message)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={disabled} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Cerrar plan
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Cerrar plan {planCodigo || ''}</DialogTitle>
                        <DialogDescription>
                            Registra la evidencia y comentario de cierre. Este avance queda
                            en el historial y no se puede editar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="comentario">
                                Comentario de cierre <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="comentario"
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                placeholder="Describe qué se hizo para resolver el hallazgo..."
                                rows={4}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="evidencia">Evidencia fotográfica (opcional)</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    id="evidencia"
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                                />
                                {file && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                                        <Upload className="inline h-3 w-3 mr-1" />
                                        {file.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={submitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || !comentario.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cerrando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirmar cierre
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
