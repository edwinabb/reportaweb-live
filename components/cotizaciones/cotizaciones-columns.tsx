"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CotizacionWithRelations } from "@/types/cotizaciones"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { CotizacionActions } from "@/components/cotizaciones/cotizacion-actions"
import Link from "next/link"

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}


const getEstadoColor = (estado: string) => {
    switch (estado) {
        case 'BORRADOR':
            return 'bg-gray-100 text-gray-800 border-gray-200'
        case 'ENVIADA':
            return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'APROBADA':
            return 'bg-green-100 text-green-800 border-green-200'
        case 'RECHAZADA':
            return 'bg-red-100 text-red-800 border-red-200'
        case 'VENCIDA':
            return 'bg-orange-100 text-orange-800 border-orange-200'
        case 'APLAZADA':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200'
    }
}

export const columns: ColumnDef<CotizacionWithRelations>[] = [
    {
        accessorKey: "numero",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="CÓDIGO" />
        ),
        cell: ({ row }) => {
            const pdfUrl = (row.original as unknown as { pdf_url?: string | null }).pdf_url
            if (pdfUrl) {
                return (
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline text-blue-600"
                    >
                        {row.getValue("numero")}
                    </a>
                )
            }
            return (
                <Link
                    href={`/cotizaciones/${row.original.id}`}
                    className="font-medium hover:underline text-blue-600"
                >
                    {row.getValue("numero")}
                </Link>
            )
        }
    },
    {
        accessorKey: "fecha_emision",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="FECHA DE SOLICITUD" />
        ),
        cell: ({ row }) => formatDate(row.getValue("fecha_emision"))
    },
    {
        accessorKey: "estado",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ESTADO" />
        ),
        cell: ({ row }) => (
            <Badge variant="outline" className={getEstadoColor(row.getValue("estado"))}>
                {row.getValue("estado")}
            </Badge>
        )
    },
    {
        accessorKey: "fecha_envio",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="FECHA DE ENVÍO" />
        ),
        cell: ({ row }) => row.original.fecha_envio ? formatDate(row.original.fecha_envio) : '-'
    },
    {
        id: "cliente",
        accessorKey: "cliente.razon_social",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="CLIENTE / LUGAR" />
        ),
        cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm leading-tight">{row.original.cliente?.razon_social || 'Sin cliente'}</span>
                <span className="text-xs text-muted-foreground leading-tight">{row.original.sitio?.nombre || '—'}</span>
            </div>
        )
    },
    {
        id: "servicio",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="SERVICIO" />
        ),
        cell: ({ row }) => {
            const detalles = row.original.detalles as unknown as { cantidad: number; servicio: { nombre: string } }[]
            if (!detalles || detalles.length === 0) return '-'
            
            const count = detalles.length
            const firstService = detalles[0]?.servicio?.nombre || 'Servicio'
            
            return (
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full border border-orange-500 text-[10px] text-orange-600 font-bold shrink-0">
                        {count}
                    </span>
                    <span className="truncate max-w-[150px]" title={firstService}>
                        {firstService}
                    </span>
                </div>
            )
        }
    },
    {
        accessorKey: "fecha_aprobacion",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="RESPUESTA DEL CLIENTE" />
        ),
        cell: ({ row }) => row.original.fecha_aprobacion ? formatDate(row.original.fecha_aprobacion) : '-'
    },
    {
        id: "proveedor",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="PROVEEDOR" />
        ),
        cell: ({ row }) => {
            const original = row.original as unknown as { ofertas: { proveedor_nombre?: string; proveedor: { razon_social: string } }[] }
            const ofertas = original.ofertas
            if (!ofertas || ofertas.length === 0) return '-'
            
            // Show the first provider found in offers
            const provider = ofertas[0]?.proveedor?.razon_social || ofertas[0]?.proveedor_nombre || '-'
            return <span className="truncate max-w-[120px]" title={provider}>{provider}</span>
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <CotizacionActions cotizacion={row.original} />,
    },
]
