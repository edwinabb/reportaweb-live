"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Maquinaria } from "@/types/maquinaria"
import { Badge } from "@/components/ui/badge"
import { ColumnFilterHeader, ColumnFilterOption } from "@/components/ui/column-filter-header"
import { MaquinariaActions } from "@/components/maquinaria/maquinaria-actions"

interface ColumnFilterOptions {
    categoriaOptions: ColumnFilterOption[]
    marcaOptions: ColumnFilterOption[]
    modeloOptions: ColumnFilterOption[]
    propiedadOptions: ColumnFilterOption[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const includesFilter = (row: any, id: string, value: string[]) => {
    if (!value || value.length === 0) return true
    return value.includes(String(row.getValue(id) ?? ''))
}

export const getColumns = (isTrash = false, filters: ColumnFilterOptions): ColumnDef<Maquinaria>[] => [
    {
        accessorKey: "nombre",
        header: "Equipo",
    },
    {
        accessorKey: "codigo_interno",
        header: "Código",
    },
    {
        accessorKey: "categoria",
        header: ({ column }) => (
            <ColumnFilterHeader
                title="Categoría"
                options={filters.categoriaOptions}
                selected={(column.getFilterValue() as string[]) ?? []}
                onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
            />
        ),
        filterFn: includesFilter,
    },
    {
        accessorKey: "marca",
        header: ({ column }) => (
            <ColumnFilterHeader
                title="Marca"
                options={filters.marcaOptions}
                selected={(column.getFilterValue() as string[]) ?? []}
                onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
            />
        ),
        filterFn: includesFilter,
    },
    {
        accessorFn: (row) => row.modelo || row.modelo_ref?.modelo || "",
        id: "modelo",
        header: ({ column }) => (
            <ColumnFilterHeader
                title="Modelo"
                options={filters.modeloOptions}
                selected={(column.getFilterValue() as string[]) ?? []}
                onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
            />
        ),
        filterFn: includesFilter,
    },
    {
        accessorKey: "placa",
        header: "Placa",
    },
    {
        accessorKey: "propietario",
        header: ({ column }) => (
            <ColumnFilterHeader
                title="Propiedad"
                options={filters.propiedadOptions}
                selected={(column.getFilterValue() as string[]) ?? []}
                onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
            />
        ),
        cell: ({ row }) => {
            const prop = row.getValue("propietario") as string
            return <Badge variant={prop === 'propio' ? 'default' : 'secondary'}>{prop}</Badge>
        },
        filterFn: includesFilter,
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
