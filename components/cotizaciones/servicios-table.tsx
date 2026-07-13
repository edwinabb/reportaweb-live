'use client'

import { useState } from 'react'
import { CotizacionDetalleWithRelations } from '@/types/cotizaciones'
import { removeServicioFromCotizacion, updateCantidadServicio } from '@/lib/actions/cotizaciones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ServiciosTableProps {
    detalles: CotizacionDetalleWithRelations[]
    onUpdate?: () => void
    readonly?: boolean
}

export function ServiciosTable({ detalles, onUpdate, readonly = false }: ServiciosTableProps) {
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const handleRemove = async (detalle_id: string) => {
        if (!confirm('¿Estás seguro de quitar este servicio?')) return

        const result = await removeServicioFromCotizacion(detalle_id)
        if (result.success) {
            toast.success(result.message)
            onUpdate?.()
        } else {
            toast.error(result.message)
        }
    }

    const handleCantidadChange = async (detalle_id: string, newCantidad: number) => {
        if (newCantidad <= 0) {
            toast.error('La cantidad debe ser mayor a 0')
            return
        }

        setUpdatingId(detalle_id)
        const result = await updateCantidadServicio(detalle_id, newCantidad)
        setUpdatingId(null)

        if (result.success) {
            toast.success(result.message)
            onUpdate?.()
        } else {
            toast.error(result.message)
        }
    }

    if (detalles.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No hay servicios agregados a esta cotización
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">Item</TableHead>
                        <TableHead className="w-[100px]">Cantidad</TableHead>
                        <TableHead>Servicio</TableHead>
                        {!readonly && <TableHead className="w-[70px]"></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {detalles.map((detalle, index) => (
                        <TableRow key={detalle.id}>
                            <TableCell className="font-medium text-center">
                                {index + 1}
                            </TableCell>
                            <TableCell>
                                {readonly ? (
                                    <span className="font-medium">{detalle.cantidad}</span>
                                ) : (
                                    <Input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={detalle.cantidad}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value)
                                            if (val && val !== detalle.cantidad) {
                                                handleCantidadChange(detalle.id, val)
                                            }
                                        }}
                                        className="w-20"
                                        disabled={updatingId === detalle.id}
                                    />
                                )}
                            </TableCell>
                            <TableCell>
                                {detalle.servicio ? (
                                    <div>
                                        <div className="font-medium">{detalle.servicio.nombre}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {detalle.servicio.codigo} - {detalle.servicio.tipo_servicio}
                                            {detalle.servicio.toneladas && ` - ${detalle.servicio.toneladas}`}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">Servicio no encontrado</span>
                                )}
                            </TableCell>
                            {!readonly && (
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemove(detalle.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
