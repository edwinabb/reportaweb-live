"use client"

import { useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./cotizaciones-columns"
import { CotizacionWithRelations } from "@/types/cotizaciones"
import { CotizacionHeaderActions } from "@/components/cotizaciones/cotizacion-header-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import { exportToExcel } from "@/lib/utils/export-excel"
import type { ColumnFilterOption } from "@/components/ui/column-filter-header"

interface CotizacionesTableProps {
    data: CotizacionWithRelations[]
    estadoCounts?: Record<string, number> | null
}

const ESTADO_OPTIONS: ColumnFilterOption[] = [
    { label: 'Borrador', value: 'BORRADOR' },
    { label: 'Enviada', value: 'ENVIADA' },
    { label: 'Aprobada', value: 'APROBADA' },
    { label: 'Rechazada', value: 'RECHAZADA' },
    { label: 'Vencida', value: 'VENCIDA' },
    { label: 'Aplazada', value: 'APLAZADA' },
]

const toOptions = (values: (string | undefined)[]): ColumnFilterOption[] =>
    Array.from(new Set(values.filter(Boolean) as string[]))
        .sort().map(v => ({ label: v, value: v }))

function KpiCards({
    data,
    estadoCounts,
    onSelect,
}: {
    data: CotizacionWithRelations[]
    estadoCounts?: Record<string, number> | null
    onSelect: (estado: string) => void
}) {
    // `estadoCounts` viene de un COUNT exacto en DB (getCotizacionesEstadoCounts),
    // no truncado por el cap de 1000 filas de `getCotizaciones`. Si no está
    // disponible, se cae al conteo sobre `data` (comportamiento previo) como
    // fallback defensivo — puede subreportar si `data` está truncado.
    const counts = estadoCounts
        ? {
              BORRADOR: estadoCounts.BORRADOR ?? 0,
              ENVIADA_APLAZADA: (estadoCounts.ENVIADA ?? 0) + (estadoCounts.APLAZADA ?? 0),
              RECHAZADA: estadoCounts.RECHAZADA ?? 0,
              APROBADA: estadoCounts.APROBADA ?? 0,
          }
        : {
              BORRADOR: data.filter((c) => c.estado === 'BORRADOR').length,
              ENVIADA_APLAZADA: data.filter((c) => c.estado === 'ENVIADA' || c.estado === 'APLAZADA').length,
              RECHAZADA: data.filter((c) => c.estado === 'RECHAZADA').length,
              APROBADA: data.filter((c) => c.estado === 'APROBADA').length,
          }
    const cards = [
        { key: 'BORRADOR', label: 'En Desarrollo', value: counts.BORRADOR, estado: 'BORRADOR' },
        { key: 'ENVIADA_APLAZADA', label: 'Enviada / Aplazada', value: counts.ENVIADA_APLAZADA, estado: 'ENVIADA' },
        { key: 'RECHAZADA', label: 'Rechazadas', value: counts.RECHAZADA, estado: 'RECHAZADA' },
        { key: 'APROBADA', label: 'Aprobadas', value: counts.APROBADA, estado: 'APROBADA' },
    ]
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
            {cards.map((c) => (
                <Card
                    key={c.key}
                    data-kpi-estado={c.estado}
                    className="cursor-pointer hover:border-orange-400 transition-colors"
                    onClick={() => onSelect(c.estado)}
                >
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">{c.label}</p>
                        <p className="text-2xl font-semibold">{c.value}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export function CotizacionesTable({ data, estadoCounts }: CotizacionesTableProps) {
    const servicioOptions = useMemo(() => toOptions(
        data.flatMap((c) => {
            const detalles = c.detalles as unknown as { servicio: { nombre: string } }[]
            return (detalles ?? []).map(d => d.servicio?.nombre)
        })
    ), [data])

    const proveedorOptions = useMemo(() => toOptions(
        data.flatMap((c) => {
            const original = c as unknown as { ofertas: { proveedor_nombre?: string; proveedor: { razon_social: string } }[] }
            return (original.ofertas ?? []).map(o => o.proveedor?.razon_social || o.proveedor_nombre)
        })
    ), [data])

    const columns = getColumns({ estadoOptions: ESTADO_OPTIONS, servicioOptions, proveedorOptions })

    return (
        <DataTable
            columns={columns}
            data={data}
            searchKey="numero"
            searchPlaceholder="Buscar Código"
            customAction={<CotizacionHeaderActions />}
            toolbarContent={(table) => {
                const handleDownloadExcel = () => {
                    const rows = table.getFilteredRowModel().rows.map((r) => {
                        const c = r.original as CotizacionWithRelations
                        return {
                            'Código': c.numero,
                            'Cliente': c.cliente?.razon_social ?? '-',
                            'Estado': c.estado,
                            'Fecha Solicitud': c.fecha_emision ?? '-',
                            'Moneda': c.moneda,
                        }
                    })
                    if (!exportToExcel('COTIZACIONES', rows)) toast.error('No hay registros para exportar')
                }

                return (
                    <div className="flex flex-col gap-3 w-full">
                        <KpiCards
                            data={data}
                            estadoCounts={estadoCounts}
                            onSelect={(estado) => table.getColumn("estado")?.setFilterValue([estado])}
                        />
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Buscar Cliente"
                                value={(table.getColumn("cliente")?.getFilterValue() as string) ?? ""}
                                onChange={(event) =>
                                    table.getColumn("cliente")?.setFilterValue(event.target.value)
                                }
                                className="h-8 w-[150px] lg:w-[250px]"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadExcel}
                                title="Descargar Excel (lo filtrado)"
                            >
                                <FileText className="h-4 w-4 text-green-600 mr-1" />
                                Descargar Excel
                            </Button>
                        </div>
                    </div>
                )
            }}
        />
    )
}
