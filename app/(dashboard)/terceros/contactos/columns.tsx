"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TerceroContacto } from "@/types/terceros"
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
import { deleteTerceroContacto } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"

export const columns: ColumnDef<TerceroContacto>[] = [
    {
        accessorKey: "tercero.razon_social",
        header: "Empresa",
        cell: ({ row }) => (row.original as any).tercero?.razon_social || "N/A"
    },
    {
        accessorKey: "nombre_completo",
        header: "Nombre Completo",
    },
    {
        accessorKey: "email",
        header: "Correo Electrónico",
    },
    {
        accessorKey: "telefono",
        header: "Teléfono",
    },
    {
        accessorKey: "cargo",
        header: "Cargo",
    },
    {
        accessorKey: "area",
        header: "Área",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const contacto = row.original

            const handleDelete = async () => {
                if (confirm("¿Estás seguro de eliminar este contacto?")) {
                    const res = await deleteTerceroContacto(contacto.id)
                    if (res.success) {
                        toast.success("Contacto eliminado")
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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contacto.nombre_completo)}>
                            Copiar nombre
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
