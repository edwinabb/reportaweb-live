"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Maquinaria } from "@/types/maquinaria"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { MaquinariaActions } from "@/components/maquinaria/maquinaria-actions"

export const getColumns = (isTrash = false): ColumnDef<Maquinaria>[] => [
    {
        accessorKey: "nombre",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Equipo" />
        ),
    },
    {
        accessorKey: "codigo_interno",
        header: "Código",
    },
    {
        accessorKey: "categoria",
        header: "Categoría",
    },
    {
        accessorKey: "marca",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Marca" />
        ),
    },
    {
        accessorFn: (row) => row.modelo || row.modelo_ref?.modelo || "",
        header: "Modelo",
        id: "modelo",
    },
    {
        accessorKey: "placa",
        header: "Placa",
    },
    {
        accessorKey: "propietario",
        header: "Propiedad",
        cell: ({ row }) => {
            const prop = row.getValue("propietario") as string
            return <Badge variant={prop === 'propio' ? 'default' : 'secondary'}>{prop}</Badge>
        }
    },
    {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => {
            const estado = row.getValue("estado") as string
            // Defaulting badge variants as custom ones might not exist in standard shadcn
            return <Badge variant="outline">{estado}</Badge>
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <MaquinariaActions maquinaria={row.original} isTrash={isTrash} />
    },
]
