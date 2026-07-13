"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TerceroSitio } from "@/types/terceros"
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
import { deleteTerceroSitio } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"

export const columns: ColumnDef<TerceroSitio>[] = [
    {
        accessorKey: "codigo",
        header: "Código",
        cell: ({ row }) => <span className="font-mono font-bold">{row.getValue("codigo")}</span>
    },
    {
        accessorKey: "nombre",
        header: "Nombre Sitio",
    },
    {
        accessorKey: "tercero.razon_social",
        header: "Tercero Asociado",
        cell: ({ row }) => (row.original as any).tercero?.razon_social || "N/A"
    },
    {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => <Badge variant="secondary">{row.getValue("tipo")}</Badge>
    },
    {
        accessorKey: "direccion",
        header: "Dirección",
    },
    {
        accessorKey: "ciudad",
        header: "Ciudad",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const sitio = row.original

            const handleDelete = async () => {
                if (confirm("¿Estás seguro de eliminar este sitio?")) {
                    const res = await deleteTerceroSitio(sitio.id)
                    if (res.success) {
                        toast.success("Sitio eliminado")
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
