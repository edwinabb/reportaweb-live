"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Pencil, Save, X, FileText, Receipt, AlertCircle, CircleDollarSign, Landmark, Undo2, Trash2 } from "lucide-react"
import {
    getFacturaCompraById, updateFacturaCompra,
    getPagosByFacturaCompra, registrarPagoCompra, deshacerPagoCompra,
    registrarDetraccionCompra, deshacerFacturaCompra,
    type FacturaCompraItem, type UpdateFacturaCompraPayload,
    type PagoCompraItem,
} from "@/lib/actions/compras"
import { getBancosActivos, type BancoItem } from "@/lib/actions/ventas"

interface Props {
    facturaId: string | null
    open: boolean
    onOpenChange: (v: boolean) => void
    initialEdit?: boolean
}

function fmtMoney(v: number | null | undefined, currency: 'USD' | 'PEN' = 'USD') {
    if (v == null) return '—'
    const sign = currency === 'USD' ? '$' : 'S/'
    return `${sign} ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null) {
    if (!iso) return '—'
    try { return format(new Date(iso), 'dd MMM yy', { locale: es }) } catch { return iso }
}

export function FacturaCompraDialog({ facturaId, open, onOpenChange, initialEdit = false }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [factura, setFactura] = useState<FacturaCompraItem | null>(null)
    const [editMode, setEditMode] = useState(initialEdit)
    const [form, setForm] = useState<UpdateFacturaCompraPayload>({})
    const [pagos, setPagos] = useState<PagoCompraItem[]>([])
    const [bancos, setBancos] = useState<BancoItem[]>([])

    const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
    const [detraccionDialogOpen, setDetraccionDialogOpen] = useState(false)
    const [deshacerOpen, setDeshacerOpen] = useState(false)
    const [deshacerPending, setDeshacerPending] = useState(false)

    // Pago form state
    const [pagoTipo, setPagoTipo] = useState<string>('TRANSFERENCIA')
    const [pagoMonto, setPagoMonto] = useState<string>('')
    const [pagoMoneda, setPagoMoneda] = useState<'USD' | 'PEN'>('USD')
    const [pagoFecha, setPagoFecha] = useState<string>(() => new Date().toISOString().slice(0, 10))
    const [pagoBanco, setPagoBanco] = useState<string>('')
    const [pagoComentarios, setPagoComentarios] = useState<string>('')
    const [pagoSaving, setPagoSaving] = useState(false)

    // Detracción form state
    const [detPorcentaje, setDetPorcentaje] = useState<string>('10')
    const [detMonto, setDetMonto] = useState<string>('')
    const [detPagaPor, setDetPagaPor] = useState<'EMPRESA' | 'PROVEEDOR'>('EMPRESA')
    const [detConstancia, setDetConstancia] = useState<string>('')
    const [detFechaPago, setDetFechaPago] = useState<string>(() => new Date().toISOString().slice(0, 10))
    const [detSaving, setDetSaving] = useState(false)

    const reload = async (id: string) => {
        const [f, ps, bs] = await Promise.all([
            getFacturaCompraById(id),
            getPagosByFacturaCompra(id),
            getBancosActivos(),
        ])
        setFactura(f)
        setPagos(ps)
        setBancos(bs)
        if (f) {
            setForm({
                codigo_factura: f.codigo_factura,
                fecha_factura: f.fecha_factura,
                fecha_vencimiento: f.fecha_vencimiento,
                dias_para_pago: f.dias_para_pago,
                pdf_factura_url: f.pdf_factura_url,
                detraccion_constancia: f.detraccion_constancia,
                detraccion_fecha_pago: f.detraccion_fecha_pago,
                detraccion_paga_por: f.detraccion_paga_por,
            })
        }
    }

    useEffect(() => {
        if (!open || !facturaId) {
            setFactura(null); setForm({}); setPagos([]); return
        }
        setLoading(true)
        setEditMode(initialEdit)
        reload(facturaId).finally(() => setLoading(false))
    }, [open, facturaId, initialEdit])

    const handleSave = async () => {
        if (!facturaId) return
        setSaving(true)
        const res = await updateFacturaCompra(facturaId, form)
        setSaving(false)
        if (res.success) {
            toast.success(res.message)
            setEditMode(false)
            await reload(facturaId)
            router.refresh()
        } else toast.error(res.message)
    }

    const handleRegistrarPago = async () => {
        if (!facturaId) return
        const monto = Number(pagoMonto)
        if (!(monto > 0)) { toast.error('Monto inválido'); return }
        setPagoSaving(true)
        const res = await registrarPagoCompra({
            factura_compra_id: facturaId,
            tipo_pago: pagoTipo,
            monto,
            moneda: pagoMoneda,
            fecha_pago: pagoFecha,
            banco: pagoBanco || null,
            comentarios: pagoComentarios || null,
        })
        setPagoSaving(false)
        if (res.success) {
            toast.success(res.message)
            setPagoDialogOpen(false)
            setPagoMonto('')
            setPagoComentarios('')
            await reload(facturaId)
            router.refresh()
        } else toast.error(res.message)
    }

    const handleDeshacerPago = async (pagoId: string) => {
        const res = await deshacerPagoCompra(pagoId)
        if (res.success) {
            toast.success(res.message)
            if (facturaId) await reload(facturaId)
            router.refresh()
        } else toast.error(res.message)
    }

    const handleRegistrarDetraccion = async () => {
        if (!facturaId) return
        const monto = Number(detMonto)
        if (!(monto > 0)) { toast.error('Monto inválido'); return }
        if (!detConstancia.trim()) { toast.error('Constancia obligatoria'); return }
        setDetSaving(true)
        const res = await registrarDetraccionCompra({
            factura_compra_id: facturaId,
            porcentaje: Number(detPorcentaje) || 0,
            monto_sol: monto,
            paga_por: detPagaPor,
            constancia: Number(detConstancia),
            fecha_pago: detFechaPago,
            monto_pagado_soles: monto,
        })
        setDetSaving(false)
        if (res.success) {
            toast.success(res.message)
            setDetraccionDialogOpen(false)
            await reload(facturaId)
            router.refresh()
        } else toast.error(res.message)
    }

    const handleDeshacerFactura = async () => {
        if (!facturaId) return
        setDeshacerPending(true)
        const res = await deshacerFacturaCompra(facturaId)
        setDeshacerPending(false)
        if (res.success) {
            toast.success(res.message)
            setDeshacerOpen(false)
            onOpenChange(false)
            router.refresh()
        } else toast.error(res.message)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-green-600" />
                            Factura Compra {factura?.codigo_factura ?? ''}
                        </DialogTitle>
                        <DialogDescription>Proveedor: {factura?.proveedor_nombre ?? '—'}</DialogDescription>
                    </DialogHeader>

                    {loading || !factura ? (
                        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Sección DATOS */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-700">Datos factura</h3>
                                    {!editMode ? (
                                        <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="h-7">
                                            <Pencil className="h-3 w-3 mr-1" /> Editar
                                        </Button>
                                    ) : (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="h-7" onClick={() => { setEditMode(false); setForm({ ...factura }) }}>
                                                <X className="h-3 w-3 mr-1" /> Cancelar
                                            </Button>
                                            <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
                                                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Guardando…</> : <><Save className="h-3 w-3 mr-1" />Guardar</>}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <Label className="text-xs text-gray-500">N° Factura Proveedor</Label>
                                        {editMode ? (
                                            <Input value={form.codigo_factura ?? ''} onChange={(e) => setForm({ ...form, codigo_factura: e.target.value })} className="h-8" />
                                        ) : <div className="font-mono font-semibold">{factura.codigo_factura ?? '—'}</div>}
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Fecha Factura</Label>
                                        {editMode ? (
                                            <Input type="date" value={form.fecha_factura ?? ''} onChange={(e) => setForm({ ...form, fecha_factura: e.target.value })} className="h-8" />
                                        ) : <div>{fmtDate(factura.fecha_factura)}</div>}
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Vencimiento</Label>
                                        {editMode ? (
                                            <Input type="date" value={form.fecha_vencimiento ?? ''} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} className="h-8" />
                                        ) : <div>{fmtDate(factura.fecha_vencimiento)}</div>}
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Días pago</Label>
                                        {editMode ? (
                                            <Input type="number" value={form.dias_para_pago ?? ''} onChange={(e) => setForm({ ...form, dias_para_pago: Number(e.target.value) })} className="h-8" />
                                        ) : <div>{factura.dias_para_pago ?? '—'}</div>}
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Valorización</Label>
                                        <div className="font-mono text-orange-600">{factura.codigo_valoracion ?? '—'}</div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">URL PDF Proveedor</Label>
                                        {editMode ? (
                                            <Input value={form.pdf_factura_url ?? ''} onChange={(e) => setForm({ ...form, pdf_factura_url: e.target.value })} className="h-8" />
                                        ) : factura.pdf_factura_url ? (
                                            <a href={factura.pdf_factura_url} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate block">Ver PDF</a>
                                        ) : <span className="text-gray-400">—</span>}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Sección MONTOS */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Montos</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div><span className="text-xs text-gray-500">Subtotal</span><div>{fmtMoney(factura.subtotal)}</div></div>
                                    <div><span className="text-xs text-gray-500">IGV ({factura.igv_porcentaje}%)</span><div>{fmtMoney(factura.igv_monto)}</div></div>
                                    <div><span className="text-xs text-gray-500">Total USD</span><div className="font-bold">{fmtMoney(factura.total_usd)}</div></div>
                                    <div><span className="text-xs text-gray-500">Pagado</span><div className="text-green-700">{fmtMoney(factura.monto_pagado_usd)}</div></div>
                                    <div><span className="text-xs text-gray-500">Pendiente USD</span><div className="text-orange-600 font-medium">{fmtMoney(factura.pendiente_por_cobrar_usd)}</div></div>
                                    <div><span className="text-xs text-gray-500">Estado pago</span><Badge variant="outline">{factura.estado_pago ?? '—'}</Badge></div>
                                </div>
                            </div>

                            <Separator />

                            {/* Sección PAGOS */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-700">Pagos al proveedor</h3>
                                    <Button variant="outline" size="sm" className="h-7" onClick={() => setPagoDialogOpen(true)}>
                                        <CircleDollarSign className="h-3 w-3 mr-1" /> Nuevo pago
                                    </Button>
                                </div>
                                {pagos.length === 0 ? (
                                    <div className="text-sm text-gray-400 py-3 text-center border rounded-md">Sin pagos registrados.</div>
                                ) : (
                                    <div className="border rounded-md divide-y bg-white">
                                        {pagos.map((p) => (
                                            <div key={p.id} className="flex items-center gap-3 p-2 text-xs">
                                                <Badge variant="outline" className="font-mono text-[10px]">{p.tipo_pago}</Badge>
                                                <div>{fmtDate(p.fecha_pago)}</div>
                                                <div className="font-semibold">
                                                    {p.moneda === 'USD' ? fmtMoney(p.monto_usd) : fmtMoney(p.monto_sol, 'PEN')}
                                                </div>
                                                {p.banco && <div className="text-gray-500"><Landmark className="h-3 w-3 inline mr-1" />{p.banco}</div>}
                                                {p.comentarios && <div className="text-gray-500 truncate flex-1" title={p.comentarios}>{p.comentarios}</div>}
                                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-red-600" onClick={() => handleDeshacerPago(p.id)} title="Anular pago">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Sección DETRACCIÓN */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-700">Detracción retenida al proveedor</h3>
                                    <Button variant="outline" size="sm" className="h-7" onClick={() => setDetraccionDialogOpen(true)}>
                                        <AlertCircle className="h-3 w-3 mr-1" /> Registrar
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div><span className="text-xs text-gray-500">% Detracción</span><div>{factura.detraccion_porcentaje ?? '—'}</div></div>
                                    <div><span className="text-xs text-gray-500">Monto S/</span><div>{fmtMoney(factura.detraccion_soles, 'PEN')}</div></div>
                                    <div><span className="text-xs text-gray-500">Paga por</span><div>{factura.detraccion_paga_por ?? '—'}</div></div>
                                    <div><span className="text-xs text-gray-500">N° Constancia</span><div className="font-mono">{factura.detraccion_constancia ?? '—'}</div></div>
                                    <div><span className="text-xs text-gray-500">Fecha Pago</span><div>{fmtDate(factura.detraccion_fecha_pago)}</div></div>
                                    <div><span className="text-xs text-gray-500">Monto Pagado S/</span><div>{fmtMoney(factura.detraccion_pago_monto_soles, 'PEN')}</div></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex items-center justify-between">
                        <Button variant="destructive" size="sm" onClick={() => setDeshacerOpen(true)} disabled={!factura}>
                            <Undo2 className="h-3 w-3 mr-1" /> Deshacer factura
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Nuevo Pago */}
            <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar Pago al Proveedor</DialogTitle>
                        <DialogDescription>Pagos parciales permitidos. El pendiente se recalcula automáticamente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Tipo</Label>
                            <Select value={pagoTipo} onValueChange={setPagoTipo}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Monto</Label>
                                <Input type="number" step="0.01" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className="h-9" />
                            </div>
                            <div>
                                <Label className="text-xs">Moneda</Label>
                                <Select value={pagoMoneda} onValueChange={(v) => setPagoMoneda(v as 'USD' | 'PEN')}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="PEN">PEN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Fecha</Label>
                            <Input type="date" value={pagoFecha} onChange={(e) => setPagoFecha(e.target.value)} className="h-9" />
                        </div>
                        <div>
                            <Label className="text-xs">Banco</Label>
                            <Select value={pagoBanco} onValueChange={setPagoBanco}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar banco" /></SelectTrigger>
                                <SelectContent>
                                    {bancos.map((b) => <SelectItem key={b.id} value={b.nombre}>{b.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Comentarios</Label>
                            <Textarea value={pagoComentarios} onChange={(e) => setPagoComentarios(e.target.value)} rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPagoDialogOpen(false)} disabled={pagoSaving}>Cancelar</Button>
                        <Button onClick={handleRegistrarPago} disabled={pagoSaving} className="bg-green-600 hover:bg-green-700">
                            {pagoSaving ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Guardando…</> : 'Registrar pago'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Detracción */}
            <Dialog open={detraccionDialogOpen} onOpenChange={setDetraccionDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detracción retenida al proveedor</DialogTitle>
                        <DialogDescription>La empresa retiene la detracción y la paga al SUNAT.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">% Detracción</Label>
                                <Input type="number" step="0.01" value={detPorcentaje} onChange={(e) => setDetPorcentaje(e.target.value)} className="h-9" />
                            </div>
                            <div>
                                <Label className="text-xs">Monto S/</Label>
                                <Input type="number" step="0.01" value={detMonto} onChange={(e) => setDetMonto(e.target.value)} className="h-9" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Paga</Label>
                            <Select value={detPagaPor} onValueChange={(v) => setDetPagaPor(v as 'EMPRESA' | 'PROVEEDOR')}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EMPRESA">Empresa (normal)</SelectItem>
                                    <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">N° Constancia *</Label>
                            <Input type="number" value={detConstancia} onChange={(e) => setDetConstancia(e.target.value)} className="h-9" />
                        </div>
                        <div>
                            <Label className="text-xs">Fecha Pago</Label>
                            <Input type="date" value={detFechaPago} onChange={(e) => setDetFechaPago(e.target.value)} className="h-9" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetraccionDialogOpen(false)} disabled={detSaving}>Cancelar</Button>
                        <Button onClick={handleRegistrarDetraccion} disabled={detSaving} className="bg-orange-600 hover:bg-orange-700">
                            {detSaving ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Guardando…</> : 'Registrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deshacer factura */}
            <AlertDialog open={deshacerOpen} onOpenChange={setDeshacerOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Deshacer factura {factura?.codigo_factura}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            La factura se deshabilita, los pagos se eliminan y los reportes vuelven a estado VALORADO (disponibles para re-facturar).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deshacerPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeshacerFactura() }} disabled={deshacerPending} className="bg-red-600 hover:bg-red-700">
                            {deshacerPending ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Deshaciendo…</> : 'Deshacer factura'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
