"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { AlertTriangle, FileCheck2, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import {
    getValorizacionPreview,
    valorizarReportes,
    type ValorizacionPreview,
} from "@/lib/actions/ventas"

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    reporteIds: string[]
    onDone?: (codigo: string) => void
}

export function ValorizarVentaDialog({ open, onOpenChange, reporteIds, onDone }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [preview, setPreview] = useState<ValorizacionPreview | null>(null)
    const [fecha, setFecha] = useState<string>(() => new Date().toISOString().slice(0, 10))

    useEffect(() => {
        if (!open || reporteIds.length === 0) {
            setPreview(null)
            return
        }
        setLoading(true)
        getValorizacionPreview(reporteIds)
            .then(setPreview)
            .finally(() => setLoading(false))
    }, [open, reporteIds])

    const hasBlockers = (preview?.warnings.length ?? 0) > 0

    const handleSubmit = async () => {
        if (!preview || hasBlockers) return
        setSubmitting(true)
        const res = await valorizarReportes(reporteIds, fecha)
        setSubmitting(false)
        if (res.success && res.codigo) {
            toast.success(res.message)
            onOpenChange(false)
            router.refresh()
            onDone?.(res.codigo)
        } else {
            toast.error(res.message)
        }
    }

    const fmt = (n: number, currency: string) =>
        `${currency === 'PEN' ? 'S/' : '$'} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileCheck2 className="h-5 w-5 text-orange-600" />
                        Valorizar Venta
                    </DialogTitle>
                    <DialogDescription>
                        Agrupa {reporteIds.length} reporte(s) en una valorización con código consecutivo.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Calculando preview…
                    </div>
                ) : !preview || preview.items.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                        No se encontraron reportes válidos.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">N° Valorización</Label>
                                <div className="font-mono font-semibold text-orange-600">{preview.codigo_next_preview}</div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Cliente</Label>
                                <div className="text-sm font-medium truncate" title={preview.cliente_nombre ?? ''}>
                                    {preview.cliente_nombre ?? '—'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Moneda</Label>
                                <Badge variant="outline" className="font-mono">{preview.moneda}</Badge>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="fecha" className="text-xs text-gray-500">Fecha valorización</Label>
                                <Input
                                    id="fecha"
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="h-8"
                                />
                            </div>
                        </div>

                        {preview.warnings.length > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="border rounded-md bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/60">
                                        <TableHead className="text-xs">Informe</TableHead>
                                        <TableHead className="text-xs">Fecha</TableHead>
                                        <TableHead className="text-xs">Maquinaria</TableHead>
                                        <TableHead className="text-xs text-right">Cantidad</TableHead>
                                        <TableHead className="text-xs text-right">Precio</TableHead>
                                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.items.map((it) => (
                                        <TableRow key={it.reporte_id}>
                                            <TableCell className="font-mono text-xs">{it.informe ?? '—'}</TableCell>
                                            <TableCell className="text-xs">
                                                {it.fecha ? format(new Date(it.fecha), 'dd MMM yy', { locale: es }) : '—'}
                                            </TableCell>
                                            <TableCell className="text-xs truncate max-w-[200px]">{it.maquinaria ?? '—'}</TableCell>
                                            <TableCell className="text-right text-xs">{it.cant_fact.toFixed(2)}</TableCell>
                                            <TableCell className="text-right text-xs">{it.precio_unit.toFixed(2)}</TableCell>
                                            <TableCell className="text-right text-xs font-medium">{it.total.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end">
                            <div className="w-full max-w-xs space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{fmt(preview.subtotal, preview.moneda)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">IGV ({preview.igv_pct}%)</span><span>{fmt(preview.igv_monto, preview.moneda)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Detracción ({preview.detraccion_pct}%)</span><span>{fmt(preview.detraccion_monto, preview.moneda)}</span></div>
                                <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                                    <span>Total a facturar</span>
                                    <span className="text-orange-600">{fmt(preview.total_facturar, preview.moneda)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || loading || hasBlockers || !preview || preview.items.length === 0}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando…</> : 'Crear Valorización'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
