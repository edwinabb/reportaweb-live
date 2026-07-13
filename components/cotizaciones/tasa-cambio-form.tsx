'use client'

import { useEffect, useActionState } from 'react'
import { createTasaCambio, updateTasaCambio } from '@/lib/actions/tasas-cambio'
import { TasaCambio } from '@/types/cotizaciones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface TasaCambioFormProps {
    tasa?: TasaCambio
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function TasaCambioForm({ tasa, open, onOpenChange, onSuccess }: TasaCambioFormProps) {
    const isEditing = !!tasa

    const [state, formAction] = useActionState(
        isEditing ? updateTasaCambio : createTasaCambio,
        { message: '' }
    )

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message)
            onOpenChange(false)
            if (onSuccess) onSuccess()
        } else if (state?.message && !state?.success) {
            toast.error(state.message)
        }
    }, [state, onOpenChange, onSuccess])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Editar Tasa de Cambio' : 'Nueva Tasa de Cambio'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Modifica los datos de la tasa de cambio'
                                : 'Ingresa los datos de la nueva tasa de cambio'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {isEditing && (
                            <input type="hidden" name="id" value={tasa.id} />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="moneda_origen">Moneda Origen</Label>
                                <Select
                                    name="moneda_origen"
                                    defaultValue={tasa?.moneda_origen || 'USD'}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                                        <SelectItem value="PEN">PEN - Sol Peruano</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="moneda_destino">Moneda Destino</Label>
                                <Select
                                    name="moneda_destino"
                                    defaultValue={tasa?.moneda_destino || 'PEN'}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                                        <SelectItem value="PEN">PEN - Sol Peruano</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tasa">Tasa de Cambio</Label>
                            <Input
                                id="tasa"
                                name="tasa"
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                placeholder="3.7500"
                                defaultValue={tasa?.tasa}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Ingresa la tasa con hasta 4 decimales
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fecha_vigencia">Fecha de Vigencia</Label>
                            <Input
                                id="fecha_vigencia"
                                name="fecha_vigencia"
                                type="date"
                                defaultValue={
                                    tasa?.fecha_vigencia ||
                                    new Date().toISOString().split('T')[0]
                                }
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Fecha desde la cual esta tasa es válida
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {isEditing ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
