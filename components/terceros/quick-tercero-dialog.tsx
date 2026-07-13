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
// import { Textarea } from '@/components/ui/textarea' // Not needed for minimal
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTercero } from '@/lib/actions/terceros'
import { toast } from 'sonner'
// import { Loader2 } from 'lucide-react'

// Minimal types if needed, or better yet, just use form fields
// We need lists for Rubros, Pai­ses if we want them. 
// For now, let's just make RUC and Razon Social mandatory and maybe simple fields.

interface QuickTerceroDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onTerceroCreated?: (newTercero: any) => void
    defaultType?: 'cliente' | 'proveedor' | 'ambos'
    title?: string
}

interface TerceroState {
    message: string
    success?: boolean
    tercero?: any
}

const initialState: TerceroState = {
    message: '',
    success: false,
    tercero: undefined
}

export function QuickTerceroDialog({
    open,
    onOpenChange,
    onTerceroCreated,
    defaultType = 'cliente',
    title
}: QuickTerceroDialogProps) {
    const [state, formAction, isPending] = useActionState(createTercero as any, initialState)

    useEffect(() => {
        if (state.success) {
            toast.success(state.message)
            onOpenChange(false)
            if (onTerceroCreated) onTerceroCreated(state)
        } else if (state.message) {
            toast.error(state.message)
        }
    }, [state])

    const dialogTitle = title || (defaultType.toLowerCase() === 'cliente' ? 'Nuevo Cliente (Rápido)' : 'Nuevo Proveedor (Rápido)')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>
                        Ingrese los datos básicos. Para más detalles, edite el registro después.
                    </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="tipo" value={defaultType} />
                    <input type="hidden" name="pais_id" value="" />
                    <input type="hidden" name="rubro_id" value="" />
                    <input type="hidden" name="ubigeo_codigo" value="" />

                    <div className="space-y-2">
                        <Label htmlFor="ruc">RUC / DNI *</Label>
                        <Input id="ruc" name="ruc" required placeholder="12345678901" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="razon_social">Razón Social *</Label>
                        <Input id="razon_social" name="razon_social" required placeholder="Empresa SAC" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input id="direccion" name="direccion" placeholder="Av. Principal 123" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email (Contacto Principal)</Label>
                        <Input id="email" name="email" type="email" placeholder="contacto@empresa.com" />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
