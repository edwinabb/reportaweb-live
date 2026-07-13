"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { ValoracionItem } from "@/lib/actions/ventas"
import { ValoracionRowActions } from "./valoracion-row-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export const columns: ColumnDef<ValoracionItem>[] = [
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
        accessorKey: "id_reporte",
        header: "Informe",
        cell: ({ row }) => {
            const id = row.getValue("id_reporte") as string
            // Example link: /maquinarias/documentos/[id] or just the PDF endpoint
            return (
                <a
                    href={row.original.pdf_reporte}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-orange-600 underline decoration-orange-600 underline-offset-4 hover:text-orange-700"
                >
                    {id}
                </a>
            )
        },
    },
    {
        accessorKey: "fecha_reporte",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Fecha
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => format(new Date(row.getValue("fecha_reporte")), "dd-MMM-yy", { locale: es }),
    },
    {
        accessorKey: "dia_semana",
        header: "Día",
    },
    {
        accessorKey: "cliente_nombre",
        header: "Cliente",
        cell: ({ row }) => <div className="font-semibold">{row.getValue("cliente_nombre")}</div>
    },
    {
        accessorKey: "lugar",
        header: "Lugar",
        cell: ({ row }) => <div className="max-w-[150px] truncate" title={row.getValue("lugar")}>{row.getValue("lugar")}</div>
    },
    {
        accessorKey: "descripcion",
        header: "Descripción",
        cell: ({ row }) => <div className="max-w-[200px] truncate" title={row.getValue("descripcion")}>{row.getValue("descripcion")}</div>
    },
    {
        accessorKey: "maquinaria",
        header: "Maquinaria",
        cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("maquinaria")}</div>
    },
    {
        accessorKey: "cotizacion_numero",
        header: "Cotización",
        cell: ({ row }) => (
            <a
                href={row.original.pdf_cotizacion || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-orange-600 underline decoration-orange-600 underline-offset-4"
            >
                {row.getValue("cotizacion_numero")}
            </a>
        )
    },
    {
        accessorKey: "horas_recorrido",
        header: "Hrs Recc",
        cell: ({ row }) => row.getValue("horas_recorrido") || "-",
    },
    {
        accessorKey: "jornada",
        header: "Jornada",
        cell: ({ row }) => <div className="text-xs whitespace-nowrap">{row.getValue("jornada")}</div>
    },
    {
        accessorKey: "horas_trabajo",
        header: "Hrs Trab",
        cell: ({ row }) => <div className="text-center font-medium">{Number(row.getValue("horas_trabajo")).toFixed(2)}</div>
    },
    {
        accessorKey: "horas_minima",
        header: "Hrs Min",
        cell: ({ row }) => <div className="text-center text-muted-foreground">{Number(row.getValue("horas_minima")).toFixed(2)}</div>
    },
    {
        accessorKey: "cantidad_facturar",
        header: "Cant Fact",
        cell: ({ row }) => <div className="text-center font-bold">{Number(row.getValue("cantidad_facturar")).toFixed(2)}</div>
    },
    {
        accessorKey: "moneda",
        header: "Moneda",
        cell: ({ row }) => <div className="text-xs text-center">{row.getValue("moneda")}</div>
    },
    {
        accessorKey: "precio_venta",
        header: "Precio Unit",
        cell: ({ row }) => <div className="text-right">{Number(row.getValue("precio_venta")).toFixed(2)}</div>
    },
    {
        accessorKey: "total_venta",
        header: "Total",
        cell: ({ row }) => <div className="text-right font-bold">{Number(row.getValue("total_venta")).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    },
    {
        accessorKey: "valoracion_codigo",
        header: "Valoración",
        cell: ({ row }) => {
            const val = row.getValue("valoracion_codigo") as string;
            if (!val) return <span className="text-muted-foreground text-xs">N/A</span>;
            const url = row.original.pdf_valoracion;
            if (!url) return <span className="font-mono text-xs text-muted-foreground">{val}</span>;
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-600 underline decoration-orange-600 underline-offset-4 font-mono text-xs"
                    title="Ver PDF de la valorización"
                >
                    {val}
                </a>
            )
        }
    },
    {
        accessorKey: "factura_codigo",
        header: "Factura",
        cell: ({ row }) => {
            const fac = row.getValue("factura_codigo") as string;
            if (!fac) return <span className="text-muted-foreground text-xs">N/A</span>;
            const url = row.original.pdf_factura;
            if (!url) return <span className="font-mono text-xs text-muted-foreground">{fac}</span>;
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-600 underline decoration-orange-600 underline-offset-4 font-mono text-xs"
                    title="Ver PDF de la factura"
                >
                    {fac}
                </a>
            )
        }
    },
    {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => {
            const estado = row.getValue("estado") as string
            let color = "bg-slate-500"
            let label = estado
            if (estado === "PENDIENTE") {
                color = "bg-orange-500 hover:bg-orange-600"
                label = "P"
            } else if (estado === 'VALORADO') {
                color = "bg-yellow-500 hover:bg-yellow-600"
                label = "V"
            } else if (estado === 'FACTURADO') {
                color = "bg-green-500 hover:bg-green-600"
                label = "F"
            }
            return <Badge className={`${color} text-white w-8 h-8 flex items-center justify-center rounded-full p-0`}>{label}</Badge>
        },
    },
    {
        id: "actions",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => <ValoracionRowActions row={row.original} />,
        enableSorting: false,
        enableHiding: false,
    },
]
