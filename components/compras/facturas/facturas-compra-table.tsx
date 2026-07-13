"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { FileText, Search, X, Eye, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { FacturaCompraItem } from "@/lib/actions/compras"
import { FacturaCompraDialog } from "./factura-compra-dialog"

interface Props {
    data: FacturaCompraItem[]
    total: number
    kpis: { total_facturado_usd: number; total_pagado_usd: number; total_pendiente_usd: number }
}

const ESTADOS_PAGO = ['ALL', 'PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA']

function fmtMoney(v: number | null | undefined, currency: 'USD' | 'PEN' = 'USD') {
    if (v == null) return '—'
    const sign = currency === 'USD' ? '$' : 'S/'
    return `${sign} ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null) {
    if (!iso) return '—'
    try { return format(new Date(iso), 'dd MMM yy', { locale: es }) } catch { return iso }
}

function estadoPagoBadge(estado: string | null) {
    if (!estado) return <Badge variant="outline" className="text-[10px]">—</Badge>
    const color =
        estado === 'PAGADA' ? 'bg-green-100 text-green-700 border-green-200' :
        estado === 'PARCIAL' ? 'bg-amber-100 text-amber-700 border-amber-200' :
        estado === 'VENCIDA' ? 'bg-red-100 text-red-700 border-red-200' :
        'bg-gray-100 text-gray-700 border-gray-200'
    return <Badge variant="outline" className={`text-[10px] ${color}`}>{estado}</Badge>
}

export function FacturasCompraTable({ data, total, kpis }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchInput, setSearchInput] = React.useState(searchParams.get('search') ?? '')
    const [detailId, setDetailId] = React.useState<string | null>(null)
    const [editMode, setEditMode] = React.useState(false)

    const currentEstado = searchParams.get('estado') || 'ALL'

    const pushParam = (k: string, v: string | null) => {
        const p = new URLSearchParams(searchParams.toString())
        if (v == null || v === '' || v === 'ALL') p.delete(k)
        else p.set(k, v)
        router.push(`${pathname}?${p.toString()}`)
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Total facturado</div>
                        <div className="text-2xl font-bold text-gray-800 mt-1">{fmtMoney(kpis.total_facturado_usd)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Total pagado</div>
                        <div className="text-2xl font-bold text-green-700 mt-1">{fmtMoney(kpis.total_pagado_usd)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Pendiente de pago</div>
                        <div className="text-2xl font-bold text-orange-600 mt-1">{fmtMoney(kpis.total_pendiente_usd)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') pushParam('search', searchInput || null) }}
                        onBlur={() => { if (searchInput !== (searchParams.get('search') ?? '')) pushParam('search', searchInput || null) }}
                        placeholder="Buscar por N° factura…"
                        className="pl-8 pr-8 h-9 bg-gray-50/50"
                    />
                    {searchInput && (
                        <Button
                            variant="ghost" size="icon" className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2"
                            onClick={() => { setSearchInput(''); pushParam('search', null) }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-1 bg-muted/20 border rounded-md p-1">
                    {ESTADOS_PAGO.map((st) => (
                        <Button key={st} variant={currentEstado === st ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => pushParam('estado', st)}>
                            {st === 'ALL' ? 'Todos' : st}
                        </Button>
                    ))}
                </div>
                <span className="text-xs text-gray-400 ml-auto">{data.length} de {total} facturas</span>
            </div>

            <div className="rounded-md border bg-white overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50/60">
                        <TableRow>
                            <TableHead className="text-xs">N° Factura Prov</TableHead>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Vencimiento</TableHead>
                            <TableHead className="text-xs">Proveedor</TableHead>
                            <TableHead className="text-xs">RUC</TableHead>
                            <TableHead className="text-xs text-right">Subtotal</TableHead>
                            <TableHead className="text-xs text-right">IGV</TableHead>
                            <TableHead className="text-xs text-right">Total USD</TableHead>
                            <TableHead className="text-xs text-right">Detracción S/</TableHead>
                            <TableHead className="text-xs text-right">Pagado USD</TableHead>
                            <TableHead className="text-xs text-right">Pendiente USD</TableHead>
                            <TableHead className="text-xs">Estado</TableHead>
                            <TableHead className="text-xs w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="h-24 text-center text-sm text-gray-500">
                                    No hay facturas para los filtros actuales.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((f) => (
                                <TableRow key={f.id} className="hover:bg-gray-50/40">
                                    <TableCell className="font-mono text-xs font-semibold">{f.codigo_factura ?? '—'}</TableCell>
                                    <TableCell className="text-xs">{fmtDate(f.fecha_factura)}</TableCell>
                                    <TableCell className="text-xs">{fmtDate(f.fecha_vencimiento)}</TableCell>
                                    <TableCell className="text-xs font-medium max-w-[180px] truncate" title={f.proveedor_nombre ?? ''}>
                                        {f.proveedor_nombre ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{f.proveedor_ruc ?? '—'}</TableCell>
                                    <TableCell className="text-xs text-right">{fmtMoney(f.subtotal)}</TableCell>
                                    <TableCell className="text-xs text-right">{fmtMoney(f.igv_monto)}</TableCell>
                                    <TableCell className="text-xs text-right font-bold">{fmtMoney(f.total_usd)}</TableCell>
                                    <TableCell className="text-xs text-right">{fmtMoney(f.detraccion_soles, 'PEN')}</TableCell>
                                    <TableCell className="text-xs text-right text-green-700">{fmtMoney(f.monto_pagado_usd)}</TableCell>
                                    <TableCell className="text-xs text-right text-orange-600 font-medium">{fmtMoney(f.pendiente_por_cobrar_usd)}</TableCell>
                                    <TableCell>{estadoPagoBadge(f.estado_pago)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-0.5">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDetailId(f.id); setEditMode(false) }} title="Ver">
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDetailId(f.id); setEditMode(true) }} title="Editar">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {f.pdf_factura_url ? (
                                                <a href={f.pdf_factura_url} target="_blank" rel="noreferrer" title="PDF proveedor">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600">
                                                        <FileText className="h-3.5 w-3.5" />
                                                    </Button>
                                                </a>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300" disabled title="Sin PDF">
                                                    <FileText className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <FacturaCompraDialog
                facturaId={detailId}
                open={!!detailId}
                onOpenChange={(v) => { if (!v) { setDetailId(null); setEditMode(false) } }}
                initialEdit={editMode}
            />
        </div>
    )
}
