"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./cotizaciones-columns"
import { CotizacionWithRelations } from "@/types/cotizaciones"
import { CotizacionHeaderActions } from "@/components/cotizaciones/cotizacion-header-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import { exportToExcel } from "@/lib/utils/export-excel"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface CotizacionesTableProps {
    data: CotizacionWithRelations[]
}

function KpiCards({ data, onSelect }: { data: CotizacionWithRelations[]; onSelect: (estado: string) => void }) {
    const counts = {
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

export function CotizacionesTable({ data }: CotizacionesTableProps) {
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
                            onSelect={(estado) => table.getColumn("estado")?.setFilterValue(estado)}
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
                            <Select
                                value={(table.getColumn("estado")?.getFilterValue() as string) ?? "ALL"}
                                onValueChange={(value) =>
                                    table.getColumn("estado")?.setFilterValue(value === "ALL" ? "" : value)
                                }
                            >
                                <SelectTrigger className="h-8 w-[150px]">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos los Estados</SelectItem>
                                    <SelectItem value="BORRADOR">Borrador</SelectItem>
                                    <SelectItem value="ENVIADA">Enviada</SelectItem>
                                    <SelectItem value="APROBADA">Aprobada</SelectItem>
                                    <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                                    <SelectItem value="VENCIDA">Vencida</SelectItem>
                                    <SelectItem value="APLAZADA">Aplazada</SelectItem>
                                </SelectContent>
                            </Select>
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
