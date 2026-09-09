"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./cotizaciones-columns"
import { CotizacionWithRelations } from "@/types/cotizaciones"
import { CotizacionHeaderActions } from "@/components/cotizaciones/cotizacion-header-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
                    <>
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
                    </>
                )
            }}
        />
    )
}
