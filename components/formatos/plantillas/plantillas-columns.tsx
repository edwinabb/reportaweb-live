"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Plantilla } from "@/types/formatos"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { deletePlantilla } from "@/lib/actions/plantillas"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export const columns: ColumnDef<Plantilla>[] = [
    {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => <span className="font-medium">{row.getValue("nombre")}</span>
    },
    {
        accessorKey: "descripcion",
        header: "Descripción",
    },
    {
        accessorKey: "estructura",
        header: "Secciones",
        cell: ({ row }) => {
            const estructura = row.original.estructura
            return <span>{estructura?.length || 0} Secciones</span>
        }
    },
    {
        accessorKey: "is_active",
        header: "Estado",
        cell: ({ row }) => (
            <span className={`px-2 py-1 rounded-full text-xs ${row.original.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {row.original.is_active ? 'Activo' : 'Inactivo'}
            </span>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const plantilla = row.original
            const router = useRouter()

            const handleDelete = async () => {
                const res = await deletePlantilla(plantilla.id)
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
                            <Link href={`/formatos/plantillas/${plantilla.id}`} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/formatos/nuevo/${plantilla.id}`} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> Previsualizar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600 cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" /> Desactivar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
