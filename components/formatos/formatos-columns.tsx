'use client'

import { ColumnDef } from '@tanstack/react-table'
import { InspeccionWithRelations } from '@/types/formatos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, FileText, Eye, Trash2, Copy } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { deleteInspeccion } from '@/lib/actions/inspecciones'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Helper for Badge Colors
const getEstadoColor = (estado: string) => {
    switch (estado) {
        case 'COMPLETADO': return 'bg-green-100 text-green-800 hover:bg-green-100'
        case 'EN_PROCESO': return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        case 'RECHAZADO': return 'bg-red-100 text-red-800 hover:bg-red-100'
        case 'APROBADO': return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
        default: return 'bg-gray-100 text-gray-800'
    }
}

export const columns: ColumnDef<InspeccionWithRelations>[] = [
    {
        accessorKey: 'codigo_interno',
        header: 'Código',
        cell: ({ row }) => <span className="font-medium">{row.getValue('codigo_interno')}</span>
    },
    {
        accessorKey: 'maquinaria',
        header: 'Maquinaria',
        cell: ({ row }) => {
            const maq = row.original.maquinaria
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{maq?.nombre || 'Desconocido'}</span>
                    <span className="text-xs text-muted-foreground">{maq?.marca} {maq?.modelo}</span>
                </div>
            )
        }
    },
    {
        accessorKey: 'horometro_actual',
        header: 'Horómetro',
        cell: ({ row }) => <span>{row.getValue('horometro_actual') ?? '-'} h</span>
    },
    {
        accessorKey: 'fecha_inspeccion',
        header: 'Fecha',
        cell: ({ row }) => {
            const date = new Date(row.getValue('fecha_inspeccion'))
            // Adjust for timezone offset if strictly needed, or just use UTC string slice
            return date.toLocaleDateString('es-PE')
        }
    },
    {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => {
            const estado = row.getValue('estado') as string
            return (
                <Badge className={getEstadoColor(estado)} variant="outline">
                    {estado.replace('_', ' ')}
                </Badge>
            )
        }
    },
    {
        id: 'supervisor',
        header: 'Supervisor',
        cell: ({ row }) => {
            const supervisor = row.original.supervisor
            if (!supervisor) return <span className="text-muted-foreground">-</span>

            return (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={supervisor.avatar_url} />
                        <AvatarFallback>{supervisor.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[120px]" title={supervisor.full_name}>
                        {supervisor.full_name}
                    </span>
                </div>
            )
        }
    },
    {
        id: 'acciones',
        cell: ({ row }) => {
            const inspeccion = row.original
            const router = useRouter()

            const handleDelete = async () => {
                if (!confirm("¿Estás seguro de enviar esta inspección a la papelera?")) return

                const res = await deleteInspeccion(inspeccion.id)
                if (res.success) {
                    toast.success(res.message)
                    router.refresh()
                } else {
                    toast.error(res.message)
                }
            }

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/formatos/${inspeccion.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalles
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.print()}>
                            <FileText className="mr-2 h-4 w-4" />
                            Imprimir PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
]
