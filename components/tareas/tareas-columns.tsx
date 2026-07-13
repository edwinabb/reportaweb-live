"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
// import { DataTableRowActions } from "@/components/ui/data-table-row-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Define the shape of our data (must match what we return from getTareas)
export type Tarea = {
    id: string
    titulo: string
    descripcion?: string
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
    fecha_vencimiento?: string
    cliente?: {
        id: string
        razon_social: string
    }
    cotizacion?: {
        id: string
        numero: string
    }
}

export const columns: ColumnDef<Tarea>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "titulo",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Título" />
        ),
        cell: ({ row }) => {
            return (
                <div className="flex space-x-2">
                    <span className="max-w-[500px] truncate font-medium">
                        {row.getValue("titulo")}
                    </span>
                </div>
            )
        },
    },
    {
        accessorKey: "estado",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => {
            const estado = row.getValue("estado") as string

            let variant: "default" | "secondary" | "destructive" | "outline" = "default"
            if (estado === 'PENDIENTE') variant = "outline"
            if (estado === 'EN_PROCESO') variant = "secondary"
            if (estado === 'COMPLETADA') variant = "default"
            if (estado === 'CANCELADA') variant = "destructive"

            return (
                <Badge variant={variant}>
                    {estado.replace('_', ' ')}
                </Badge>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "prioridad",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Prioridad" />
        ),
        cell: ({ row }) => {
            const prioridad = row.getValue("prioridad") as string

            let colorClass = ""
            if (prioridad === 'ALTA') colorClass = "text-red-500 font-bold"
            if (prioridad === 'MEDIA') colorClass = "text-orange-500"
            if (prioridad === 'BAJA') colorClass = "text-blue-500"

            return (
                <div className={`flex items-center ${colorClass}`}>
                    <span>{prioridad}</span>
                </div>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        id: "cliente",
        accessorFn: (row) => row.cliente?.razon_social,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Cliente" />
        ),
        cell: ({ row }) => {
            return (
                <div className="flex flex-col">
                    <span>{row.original.cliente?.razon_social || '-'}</span>
                    {row.original.cotizacion && (
                        <span className="text-xs text-muted-foreground">CT: {row.original.cotizacion.numero}</span>
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "fecha_vencimiento",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Vencimiento" />
        ),
        cell: ({ row }) => {
            const fecha = row.getValue("fecha_vencimiento") as string
            if (!fecha) return null

            return (
                <div className="flex w-[100px] items-center">
                    <span>{format(new Date(fecha), "dd/MM/yyyy", { locale: es })}</span>
                </div>
            )
        },
    },
    // We'll need to create DataTableRowActions or remove it if not available yet.
    // For now I'll comment it out or implement a basic one.
    /*
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
    */
]
