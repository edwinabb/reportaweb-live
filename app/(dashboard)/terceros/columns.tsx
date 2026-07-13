"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Tercero } from "@/types/terceros"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { TerceroActions } from "@/components/terceros/tercero-actions"

export const columns: ColumnDef<Tercero>[] = [
    {
        accessorKey: "logo_url",
        header: "Logo",
        cell: ({ row }) => {
            const logo = row.getValue("logo_url") as string
            if (!logo) return <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-xs">Sin</div>
            // Path relativo → construir URL pública de Supabase Storage (bucket 'tercero')
            const src = logo.startsWith('http')
                ? logo
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tercero/${logo}`
            return <img src={src} alt="Logo" className="w-10 h-10 object-contain rounded-md border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        }
    },
    {
        accessorKey: "razon_social",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Razón Social" />
        ),
    },
    {
        accessorKey: "ruc",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ID Tributario" />
        ),
    },
    {
        accessorKey: "rubro_id",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Rubro" />
        ),
        cell: ({ row }) => row.original.rubros?.nombre || row.getValue("rubro_id") || "N/A"
    },
    {
        accessorKey: "pais_id",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="País" />
        ),
        cell: ({ row }) => row.original.paises?.nombre.toUpperCase() || row.getValue("pais_id") || "N/A"
    },
    {
        accessorKey: "tipo",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Tipo" />
        ),
        cell: ({ row }) => {
            const tipo = row.getValue("tipo") as string
            return (
                <Badge variant="secondary" className="uppercase">
                    {tipo === 'ambos' ? 'CL/PR' : tipo.substring(0, 2)}
                </Badge>
            )
        },
    },
    {
        accessorKey: "estado",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => <Badge variant="outline">{row.getValue("estado")}</Badge>
    },
    {
        accessorKey: "direccion",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Dirección" />
        ),
        cell: ({ row }) => <div className="max-w-[150px] truncate">{row.getValue("direccion")}</div>
    },
    {
        id: "ubicacion",
        header: "Ubicación",
        cell: ({ row }) => {
            const u = row.original.ubigeo
            if (u) return `${u.distrito}, ${u.departamento}`
            return row.original.ubicacion_ciudad || "N/A"
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <TerceroActions tercero={row.original} />,
    },
]
