'use client'

import { ColumnDef } from "@tanstack/react-table"
import { MaquinariaModelo } from "@/types/maquinaria"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<MaquinariaModelo>[] = [
    {
        accessorKey: "tipo_equipo",
        header: "Equipo",
    },
    {
        accessorKey: "marca",
        header: "Fabricante",
    },
    {
        accessorKey: "modelo",
        header: "Modelo",
    },
    {
        accessorKey: "capacidad",
        header: "Capacidad",
    },
    {
        accessorKey: "is_active",
        header: "Estado",
        cell: ({ row }) => {
            const active = row.original.is_active
            return (
                <Badge variant={active ? "default" : "destructive"}>
                    {active ? "Activo" : "Inactivo"}
                </Badge>
            )
        },
    },
]
