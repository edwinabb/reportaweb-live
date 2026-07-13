"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { AlertTriangle, Receipt, Loader2, Upload, FileCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { createFacturaVenta, getValoracionesData, type ValoracionItem } from "@/lib/actions/ventas"
import { uploadFile } from "@/lib/actions/storage"

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    codigoValoracion: string | null
    onDone?: () => void
}

export function RegistrarFacturaVentaDialog({ open, onOpenChange, codigoValoracion, onDone }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [items, setItems] = useState<ValoracionItem[]>([])
    const [pdfUrl, setPdfUrl] = useState<string>('')
    const [codigoFactura, setCodigoFactura] = useState<string>('')
    const [fechaFactura, setFechaFactura] = useState<string>(() => new Date().toISOString().slice(0, 10))
    const [fechaVenc, setFechaVenc] = useState<string>('')
    const [diasPago, setDiasPago] = useState<string>('30')
    const [igvPct, setIgvPct] = useState<string>('18')
    const [detrPct, setDetrPct] = useState<string>('')

    useEffect(() => {
        if (!open || !codigoValoracion) {
            setItems([])
            setPdfUrl('')
            setCodigoFactura('')
            return
        }
        setLoading(true)
        getValoracionesData({ estado: 'VALORADO', limit: 1000 })
            .then((res) => {
                setItems(res.data.filter((x) => x.valoracion_codigo === codigoValoracion))
            })
            .finally(() => setLoading(false))
    }, [open, codigoValoracion])

    const cliente = items[0]?.cliente_nombre || '—'
    const clienteId = (items[0] as any)?.cliente_id as string | undefined
    const moneda = (items[0]?.moneda || 'USD') as 'USD' | 'PEN'
    const subtotal = items.reduce((s, it) => s + it.total_venta, 0)
    const igvNum = Number(igvPct) || 0
    const igvMonto = subtotal * (igvNum / 100)
    const total = subtotal + igvMonto
    const detrNum = Number(detrPct) || 0
    const detrMonto = subtotal * (detrNum / 100)

    const fmt = (n: number) =>
        `${moneda === 'PEN' ? 'S/' : '$'} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Solo se aceptan archivos PDF')
            return
        }
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('bucket', 'cotizaciones')
            fd.append('subfolder', 'facturas-venta')
            const res = await uploadFile(fd)
            if (res.success && res.url) {
                setPdfUrl(res.url)
                toast.success('PDF de factura subido')
            } else {
                toast.error(res.message || 'Error al subir PDF')
            }
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async () => {
        if (!codigoValoracion || items.length === 0) return
        if (!codigoFactura.trim()) { toast.error('El N° de factura es obligatorio'); return }
        if (!fechaFactura) { toast.error('La fecha de factura es obligatoria'); return }
        if (!clienteId) { toast.error('No se pudo determinar el cliente de la valorización'); return }

        setSubmitting(true)
        const res = await createFacturaVenta({
            codigo_valoracion: codigoValoracion,
            codigo_factura: codigoFactura.trim(),
            cliente_id: clienteId,
            fecha_factura: fechaFactura,
            fecha_vencimiento: fechaVenc || null,
            dias_para_pago: Number(diasPago) || null,
            moneda,
            subtotal,
            igv_porcentaje: igvNum,
            igv_monto: igvMonto,
            total,
            detraccion_porcentaje: detrNum || null,
            detraccion_monto_sol: moneda === 'PEN' ? detrMonto : null,
            pdf_factura_url: pdfUrl || null,
        })
        setSubmitting(false)
        if (res.success) {
            toast.success(res.message)
            onOpenChange(false)
            router.refresh()
            onDone?.()
        } else {
            toast.error(res.message)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-orange-600" />
                        Registrar Factura de Venta
                    </DialogTitle>
                    <DialogDescription>
                        Emite la factura al cliente a partir de la valorización <b>{codigoValoracion}</b>.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando valorización…
                    </div>
                ) : items.length === 0 ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>No se encontraron reportes en esta valorización.</AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-md">
                            <div><Label className="text-xs text-gray-500">Cliente</Label><div className="font-semibold text-sm">{cliente}</div></div>
                            <div><Label className="text-xs text-gray-500">Valorización</Label><div className="font-mono text-sm text-orange-600">{codigoValoracion}</div></div>
                            <div><Label className="text-xs text-gray-500">Moneda</Label><div className="font-mono text-sm">{moneda}</div></div>
                            <div><Label className="text-xs text-gray-500">Reportes</Label><div className="text-sm">{items.length}</div></div>
                            <div><Label className="text-xs text-gray-500">Cant. a facturar</Label><div className="text-sm">{items.reduce((s, i) => s + i.cantidad_facturar, 0).toFixed(2)}</div></div>
                            <div><Label className="text-xs text-gray-500">Subtotal</Label><div className="font-medium text-sm">{fmt(subtotal)}</div></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="codigo_factura">N° Factura *</Label>
                                <Input id="codigo_factura" value={codigoFactura} onChange={(e) => setCodigoFactura(e.target.value)} placeholder="F001-000123" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="fecha_factura">Fecha Factura *</Label>
                                <Input id="fecha_factura" type="date" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="dias_pago">Días para Cobro</Label>
                                <Input id="dias_pago" type="number" value={diasPago} onChange={(e) => setDiasPago(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="fecha_venc">Fecha Vencimiento</Label>
                                <Input id="fecha_venc" type="date" value={fechaVenc} onChange={(e) => setFechaVenc(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="igv_pct">% IGV</Label>
                                <Input id="igv_pct" type="number" value={igvPct} onChange={(e) => setIgvPct(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="detr_pct">% Detracción</Label>
                                <Input id="detr_pct" type="number" value={detrPct} onChange={(e) => setDetrPct(e.target.value)} placeholder="Ej: 12" />
                            </div>
                        </div>

                        <div className="border rounded-md p-3">
                            <Label className="text-xs text-gray-500 mb-2 block">PDF Factura (opcional)</Label>
                            {pdfUrl ? (
                                <div className="flex items-center gap-2 text-sm">
                                    <FileCheck className="h-5 w-5 text-green-600" />
                                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-green-700 underline truncate">
                                        {pdfUrl.split('/').pop()}
                                    </a>
                                    <Button variant="ghost" size="sm" onClick={() => setPdfUrl('')} className="ml-auto text-xs">
                                        Cambiar
                                    </Button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 py-6 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 text-sm">
                                    <Upload className="h-4 w-4 text-gray-500" />
                                    <span>{uploading ? 'Subiendo...' : 'Seleccionar PDF'}</span>
                                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
                                </label>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <div className="w-full max-w-xs space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">IGV ({igvNum}%)</span><span>{fmt(igvMonto)}</span></div>
                                {detrNum > 0 && (
                                    <div className="flex justify-between"><span className="text-gray-500">Detracción ({detrNum}%)</span><span className="text-red-600">-{fmt(detrMonto)}</span></div>
                                )}
                                <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                                    <span>Total Factura</span>
                                    <span className="text-orange-700">{fmt(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || loading || items.length === 0 || !codigoFactura.trim()}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando…</> : 'Registrar Factura'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
