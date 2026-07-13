
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Profile } from "@/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { UserActions } from "@/components/users/user-actions"

export const columns: ColumnDef<Profile>[] = [
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
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "doc_number",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Nro. Documento" />
        ),
    },
    {
        accessorKey: "email",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Email" />
        ),
    },
    {
        accessorKey: "first_name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Nombre" />
        ),
        cell: ({ row }) => {
            const u = row.original
            const name = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '—'
            return <span>{name}</span>
        }
    },
    {
        accessorKey: "role",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Rol" />
        ),
        cell: ({ row }) => {
            const role = row.getValue("role") as string
            return (
                <Badge variant="outline" className="capitalize">
                    {role?.replace('_', ' ') || 'N/A'}
                </Badge>
            )
        },
    },
    {
        accessorKey: "is_active",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => {
            const isActive = row.getValue("is_active") as boolean
            return (
                <Badge variant={isActive ? "default" : "destructive"}>
                    {isActive ? "Activo" : "Inactivo"}
                </Badge>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <UserActions user={row.original} />,
    },
]
