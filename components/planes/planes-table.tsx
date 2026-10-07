'use client'

import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
} from '@tanstack/react-table'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { NuevoPlanDialog } from './nuevo-plan-dialog'
import { getColumns } from './planes-columns'
import { exportToExcel } from '@/lib/utils/export-excel'
import { formatDateInTZ } from '@/lib/utils/tz'
import type { PlanAccion } from '@/types/formatos'
import type { ColumnFilterOption } from '@/components/ui/column-filter-header'

interface DataTableProps {
    data: PlanAccion[]
    estadoOptions: ColumnFilterOption[]
    prioridadOptions: ColumnFilterOption[]
}

export function PlanesTable({
    data,
    estadoOptions,
    prioridadOptions,
}: DataTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    const columns = useMemo(
        () => getColumns({ estadoOptions, prioridadOptions }),
        [estadoOptions, prioridadOptions],
    )

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    })

    const handleDownloadExcel = () => {
        const rows = table.getFilteredRowModel().rows.map((r) => {
            const p = r.original
            return {
                'Código': p.codigo ?? '-',
                'Problema / Hallazgo': p.titulo || p.descripcion_problema || p.pregunta_ref?.titulo || '-',
                'Cantidad': p.cantidad ?? '-',
                'Cliente': p.cliente?.razon_social ?? '-',
                'Maquinaria': p.maquinaria?.nombre ?? '-',
                'Prioridad': p.prioridad ?? '-',
                'Estado': p.estado ?? '-',
                'Fecha Límite': p.fecha_limite ? formatDateInTZ(p.fecha_limite + 'T12:00:00', 'America/Lima') : '-',
            }
        })
        exportToExcel('PLANES DE ACCION', rows)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between py-4">
                <Input
                    placeholder="Buscar en problema / hallazgo..."
                    value={(table.getColumn('problema')?.getFilterValue() as string) ?? ''}
                    onChange={(event) =>
                        table.getColumn('problema')?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadExcel}
                        title="Descargar Excel (lo filtrado)"
                    >
                        <FileText className="h-4 w-4 text-green-600 mr-1" />
                        Descargar Excel
                    </Button>
                    <NuevoPlanDialog />
                </div>
            </div>
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No hay planes de acción pendientes.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Siguiente
                </Button>
            </div>
        </div>
    )
}
