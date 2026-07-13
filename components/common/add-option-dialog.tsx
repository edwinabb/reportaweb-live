'use client'

import { useState, useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// We will need a server action for this. Let's assume it's passed as prop or imported?
// Better to pass the action wrapper or have a specific action for it.
// User mentioned: addOptionValue action.

interface AddOptionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    category: string // e.g. 'FORMAS_PAGO'
    createAction: (category: string, value: string) => Promise<{ success: boolean; message: string; value?: string }>
    onOptionCreated?: (newValue: string) => void
}

export function AddOptionDialog({
    open,
    onOpenChange,
    title,
    category,
    createAction,
    onOptionCreated
}: AddOptionDialogProps) {
    const [value, setValue] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!value.trim()) return

        setLoading(true)
        try {
            const result = await createAction(category, value.trim())
            if (result.success) {
                toast.success(result.message)
                onOpenChange(false)
                setValue('')
                if (onOptionCreated) onOptionCreated(value.trim())
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('Error al crear opción')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Agregue una nueva opción a la lista.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="value">Nombre / Valor *</Label>
                        <Input
                            id="value"
                            required
                            placeholder="Ej. Contado, 30 Días, etc."
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!value.trim() || loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
