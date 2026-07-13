"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, FileCheck2, Undo2, Receipt, Loader2 } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DataTableViewOptions } from "@/components/ui/data-table-view-options"
import { ValoracionCompraItem, deshacerValorizacionCompra } from "@/lib/actions/compras"
import { ValorizarCompraDialog } from "./valorizar-compra-dialog"
import { RegistrarFacturaCompraDialog } from "./registrar-factura-compra-dialog"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    pageCount: number
}

export function ValoracionesComprasTable<TData, TValue>({
    columns,
    data,
    pageCount,
}: DataTableProps<TData, TValue>) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [valorizarOpen, setValorizarOpen] = React.useState(false)
    const [deshacerOpen, setDeshacerOpen] = React.useState(false)
    const [deshacerPending, setDeshacerPending] = React.useState(false)
    const [deshacerCodigo, setDeshacerCodigo] = React.useState<string | null>(null)
    const [facturarOpen, setFacturarOpen] = React.useState(false)
    const [facturarCodigo, setFacturarCodigo] = React.useState<string | null>(null)

    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: { sorting, columnFilters, columnVisibility, rowSelection },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const handleEstadoFilter = (estado: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (estado && estado !== 'ALL') params.set('estado', estado)
        else params.delete('estado')
        router.push(`${pathname}?${params.toString()}`)
    }

    const currentEstado = searchParams.get('estado') || 'ALL'

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between py-4">
                <div className="flex flex-1 items-center space-x-2">
                    <Input
                        placeholder="Filtrar por proveedor..."
                        value={(table.getColumn("proveedor_nombre")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("proveedor_nombre")?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />

                    <div className="flex items-center space-x-1 border rounded-md p-1 bg-muted/20">
                        {['ALL', 'PENDIENTE', 'VALORADO', 'FACTURADO'].map((st) => (
                            <Button
                                key={st}
                                variant={currentEstado === st ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => handleEstadoFilter(st)}
                                className="text-xs h-7"
                            >
                                {st === 'ALL' ? 'Todos' : st}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {(() => {
                        const selectedRows = table.getFilteredSelectedRowModel().rows
                        const selectedData = selectedRows.map((r) => r.original as ValoracionCompraItem)
                        const allPendientes = selectedData.length > 0 && selectedData.every((d) => d.estado === 'PENDIENTE')
                        const codigosValoracion = new Set(
                            selectedData
                                .filter((d) => d.estado === 'VALORADO' || d.estado === 'FACTURADO')
                                .map((d) => d.valoracion_codigo)
                                .filter(Boolean),
                        )
                        const singleCodigo = codigosValoracion.size === 1 ? Array.from(codigosValoracion)[0] : null
                        const allValorados = selectedData.length > 0 && selectedData.every((d) => d.estado === 'VALORADO')
                        const allFacturados = selectedData.length > 0 && selectedData.every((d) => d.estado === 'FACTURADO')
                        return (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8" disabled={selectedRows.length === 0}>
                                        Acciones Masivas ({selectedRows.length}) <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <DropdownMenuItem
                                        disabled={!allPendientes}
                                        onClick={() => setValorizarOpen(true)}
                                        className="gap-2"
                                    >
                                        <FileCheck2 className="h-4 w-4 text-orange-600" />
                                        Valorizar Compra
                                        {!allPendientes && selectedRows.length > 0 && (
                                            <span className="text-[10px] text-gray-400 ml-auto">solo PENDIENTE</span>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        disabled={!singleCodigo || !allValorados}
                                        onClick={() => {
                                            if (singleCodigo) { setDeshacerCodigo(singleCodigo); setDeshacerOpen(true) }
                                        }}
                                        className="gap-2 text-red-600 focus:text-red-600"
                                    >
                                        <Undo2 className="h-4 w-4" />
                                        Deshacer Valorización
                                        {(!singleCodigo || !allValorados) && selectedRows.length > 0 && (
                                            <span className="text-[10px] text-gray-400 ml-auto">
                                                {allFacturados ? 'facturada' : '1 valoriz. VALORADO'}
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        disabled={!singleCodigo || !allValorados}
                                        onClick={() => {
                                            if (singleCodigo) { setFacturarCodigo(singleCodigo); setFacturarOpen(true) }
                                        }}
                                        className="gap-2"
                                    >
                                        <Receipt className="h-4 w-4 text-green-600" />
                                        Registrar Factura del Proveedor
                                        {(!singleCodigo || !allValorados) && selectedRows.length > 0 && (
                                            <span className="text-[10px] text-gray-400 ml-auto">1 valoriz. VALORADO</span>
                                        )}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )
                    })()}
                    <DataTableViewOptions table={table} />
                </div>
            </div>

            <ValorizarCompraDialog
                open={valorizarOpen}
                onOpenChange={setValorizarOpen}
                reporteIds={table
                    .getFilteredSelectedRowModel()
                    .rows.map((r) => (r.original as ValoracionCompraItem).id)
                    .filter(Boolean)}
                onDone={() => { table.resetRowSelection() }}
            />

            <RegistrarFacturaCompraDialog
                open={facturarOpen}
                onOpenChange={setFacturarOpen}
                codigoValoracion={facturarCodigo}
                onDone={() => { table.resetRowSelection() }}
            />

            <AlertDialog open={deshacerOpen} onOpenChange={setDeshacerOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Deshacer valorización {deshacerCodigo}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Los reportes incluidos volverán al estado <strong>PENDIENTE</strong> y se borrarán las filas de la valorización.
                            Si alguno ya fue facturado, la operación se abortará.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deshacerPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deshacerPending || !deshacerCodigo}
                            onClick={async (e) => {
                                e.preventDefault()
                                if (!deshacerCodigo) return
                                setDeshacerPending(true)
                                const res = await deshacerValorizacionCompra(deshacerCodigo)
                                setDeshacerPending(false)
                                if (res.success) {
                                    toast.success(res.message)
                                    setDeshacerOpen(false)
                                    setDeshacerCodigo(null)
                                    table.resetRowSelection()
                                    router.refresh()
                                } else {
                                    toast.error(res.message)
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deshacerPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deshaciendo…</> : 'Deshacer valorización'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">No hay resultados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <div className="text-xs text-muted-foreground p-2 text-center md:hidden">
                    Desliza horizontalmente para ver más columnas
                </div>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
                </div>
                <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
                </div>
            </div>
        </div>
    )
}
