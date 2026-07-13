"use client"

import { GenericCatalogTable } from "@/components/settings/generic-catalog-table"
import { Badge } from "@/components/ui/badge"
import { ColumnDef } from "@tanstack/react-table"
import { DocumentTypeDialogTrigger } from "@/app/(dashboard)/settings/users/document-type-trigger"

interface UserDocsTableProps {
    data: any[]
    deleteAction: (id: string) => Promise<{ success: boolean; message?: string }>
    restoreAction: (id: string) => Promise<{ success: boolean; message?: string }>
}

export function UserDocsTable({ data, deleteAction, restoreAction }: UserDocsTableProps) {
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "nombre",
            header: "Nombre",
            cell: ({ row }) => <span className="font-bold">{row.getValue("nombre")}</span>
        },
        {
            accessorKey: "category",
            header: "Categoría",
            cell: ({ row }) => {
                const cat = row.getValue("category") as string
                return <Badge variant="secondary" className="capitalize">{cat?.replace('_', ' ') || 'General'}</Badge>
            }
        },
        {
            accessorKey: "expiration_alert_days",
            header: "Días Alerta",
            cell: ({ row }) => {
                const days = row.getValue("expiration_alert_days") as number
                return days ? <span>{days} días</span> : <span className="text-muted-foreground text-xs">N/A</span>
            }
        }
    ]

    return (
        <GenericCatalogTable
            itemName="Tipo de Documento"
            data={data}
            columns={columns}
            deleteAction={deleteAction}
            restoreAction={restoreAction}
            customCreateTrigger={<DocumentTypeDialogTrigger />}
        />
    )
}
