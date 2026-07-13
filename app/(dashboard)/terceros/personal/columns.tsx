"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TerceroPersonal } from "@/types/terceros"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteTerceroPersonal } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"

export const columns: ColumnDef<TerceroPersonal>[] = [
    {
        accessorKey: "nombres",
        header: "Nombres",
        cell: ({ row }) => `${row.original.nombres} ${row.original.apellidos}`
    },
    {
        accessorKey: "tipo_doc",
        header: "Doc",
        cell: ({ row }) => <Badge variant="outline">{row.original.tipo_doc}</Badge>
    },
    {
        accessorKey: "numero_doc",
        header: "Número Doc",
    },
    {
        accessorKey: "tercero.razon_social",
        header: "Contratista",
        cell: ({ row }) => (row.original as any).tercero?.razon_social || "N/A"
    },
    {
        accessorKey: "cargo",
        header: "Cargo",
    },
    {
        accessorKey: "telefono",
        header: "Teléfono",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const personal = row.original

            const handleDelete = async () => {
                if (confirm("¿Estás seguro de eliminar este personal?")) {
                    const res = await deleteTerceroPersonal(personal.id)
                    if (res.success) {
                        toast.success("Personal eliminado")
                    } else {
                        toast.error(res.message)
                    }
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
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
