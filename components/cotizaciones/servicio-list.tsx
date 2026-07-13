'use client'

import { useState } from 'react'
import { Servicio } from '@/types/cotizaciones'
import { deleteServicio, restoreServicio } from '@/lib/actions/servicios'
import { ServicioForm } from './servicio-form'
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

interface ServicioListProps {
    servicios: Servicio[]
    showInactive?: boolean
}

export function ServicioList({ servicios, showInactive = false }: ServicioListProps) {
    const [editingServicio, setEditingServicio] = useState<Servicio | undefined>()
    const [formOpen, setFormOpen] = useState(false)

    const handleEdit = (servicio: Servicio) => {
        setEditingServicio(servicio)
        setFormOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return

        const result = await deleteServicio(id)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    const handleRestore = async (id: string) => {
        const result = await restoreServicio(id)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    const handleFormClose = () => {
        setFormOpen(false)
        setEditingServicio(undefined)
    }

    const formatPrecio = (valor?: number, moneda?: string) => {
        if (!valor) return '-'
        return `${moneda} ${valor.toFixed(2)}`
    }

    const getCategoriaColor = (categoria: string) => {
        switch (categoria) {
            case 'ALQUILER':
                return 'bg-blue-100 text-blue-800'
            case 'SERVICIO':
                return 'bg-green-100 text-green-800'
            case 'PRODUCTO':
                return 'bg-purple-100 text-purple-800'
            case 'APOYO LOGISTICO':
                return 'bg-orange-100 text-orange-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const renderPrecio = (servicio: Servicio, numero: 1 | 2 | 3) => {
        let tipo, valor, campoAdicional

        if (numero === 1) {
            tipo = servicio.precio_1_tipo
            valor = servicio.precio_1_valor
            campoAdicional = servicio.precio_1_campo_adicional
        } else if (numero === 2) {
            tipo = servicio.precio_2_tipo
            valor = servicio.precio_2_valor
            campoAdicional = servicio.precio_2_campo_adicional
        } else {
            tipo = servicio.precio_3_tipo
            valor = servicio.precio_3_valor
            campoAdicional = servicio.precio_3_campo_adicional
        }

        if (!tipo || !valor) return <span className="text-muted-foreground">-</span>

        return (
            <div className="text-sm">
                <div className="font-medium">{tipo}</div>
                <div className="text-muted-foreground">
                    {formatPrecio(valor, servicio.moneda)}
                    {campoAdicional && (
                        <span className="ml-1">({campoAdicional}h)</span>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Toneladas</TableHead>
                            <TableHead>Precio 1</TableHead>
                            <TableHead>Precio 2</TableHead>
                            <TableHead>Precio 3</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {servicios.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                    No hay servicios registrados
                                </TableCell>
                            </TableRow>
                        ) : (
                            servicios.map((servicio) => (
                                <TableRow key={servicio.id}>
                                    <TableCell className="font-medium">
                                        {servicio.codigo}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{servicio.nombre}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {servicio.moneda}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={getCategoriaColor(servicio.tipo_servicio)}
                                        >
                                            {servicio.tipo_servicio}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {servicio.toneladas || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {renderPrecio(servicio, 1)}
                                    </TableCell>
                                    <TableCell>
                                        {servicio.cantidad_precios >= 2 ? renderPrecio(servicio, 2) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {servicio.cantidad_precios >= 3 ? renderPrecio(servicio, 3) : (
                                            <span className="text-muted-foreground">-</span>
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
                                                {servicio.is_active ? (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => handleEdit(servicio)}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(servicio.id)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleRestore(servicio.id)}
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

            <ServicioForm
                key={formOpen ? `open-${editingServicio?.id || 'new'}` : 'closed'}
                servicio={editingServicio}
                open={formOpen}
                onOpenChange={handleFormClose}
            />
        </>
    )
}
