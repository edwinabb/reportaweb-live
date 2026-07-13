'use client'

import { useState } from 'react'
import { TasaCambio } from '@/types/cotizaciones'
import { deleteTasaCambio, restoreTasaCambio } from '@/lib/actions/tasas-cambio'
import { TasaCambioForm } from './tasa-cambio-form'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TasaCambioListProps {
    tasas: TasaCambio[]
    showInactive?: boolean
}

export function TasaCambioList({ tasas, showInactive = false }: TasaCambioListProps) {
    const [editingTasa, setEditingTasa] = useState<TasaCambio | undefined>()
    const [formOpen, setFormOpen] = useState(false)

    const handleEdit = (tasa: TasaCambio) => {
        setEditingTasa(tasa)
        setFormOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta tasa de cambio?')) return

        const result = await deleteTasaCambio(id)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    const handleRestore = async (id: string) => {
        const result = await restoreTasaCambio(id)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    const handleFormClose = () => {
        setFormOpen(false)
        setEditingTasa(undefined)
    }

    const isVigente = (fecha: string) => {
        const today = new Date().toISOString().split('T')[0]
        return fecha <= today
    }

    const formatTasa = (tasa: number) => {
        return tasa.toFixed(4)
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha Vigencia</TableHead>
                            <TableHead>Moneda Origen</TableHead>
                            <TableHead>Moneda Destino</TableHead>
                            <TableHead className="text-right">Tasa</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No hay tasas de cambio registradas
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasas.map((tasa) => (
                                <TableRow key={tasa.id}>
                                    <TableCell>
                                        {format(new Date(tasa.fecha_vigencia), 'dd/MM/yyyy', {
                                            locale: es,
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{tasa.moneda_origen}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{tasa.moneda_destino}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatTasa(tasa.tasa)}
                                    </TableCell>
                                    <TableCell>
                                        {isVigente(tasa.fecha_vigencia) ? (
                                            <Badge variant="default">Vigente</Badge>
                                        ) : (
                                            <Badge variant="secondary">Futura</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {tasa.is_active ? (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => handleEdit(tasa)}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(tasa.id)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleRestore(tasa.id)}
                                                    >
                                                        <RotateCcw className="mr-2 h-4 w-4" />
                                                        Restaurar
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <TasaCambioForm
                tasa={editingTasa}
                open={formOpen}
                onOpenChange={handleFormClose}
            />
        </>
    )
}
