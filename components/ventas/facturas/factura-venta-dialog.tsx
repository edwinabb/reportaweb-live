"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Pencil, Save, X, FileText, ExternalLink, Receipt, AlertCircle, CircleDollarSign, Landmark, Undo2, Trash2 } from "lucide-react"
import {
    getFacturaVentaById,
    updateFacturaVenta,
    getBancosActivos,
    getCobrosByFactura,
    registrarCobroVenta,
    deshacerCobroVenta,
    registrarDetraccion,
    deshacerFacturaVenta,
    type FacturaVentaItem,
    type UpdateFacturaVentaPayload,
    type BancoItem,
    type CobroVentaItem,
} from "@/lib/actions/ventas"

interface Props {
    facturaId: string | null
    open: boolean
    onOpenChange: (v: boolean) => void
    initialEdit?: boolean
}

export function FacturaVentaDialog({ facturaId, open, onOpenChange, initialEdit = false }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [factura, setFactura] = useState<FacturaVentaItem | null>(null)
    const [editMode, setEditMode] = useState(initialEdit)
    const [form, setForm] = useState<UpdateFacturaVentaPayload>({})

    // F.6/F.7/F.8 state
    const [cobros, setCobros] = useState<CobroVentaItem[]>([])
    const [bancos, setBancos] = useState<BancoItem[]>([])
    const [cobroDialogOpen, setCobroDialogOpen] = useState(false)
    const [detraccionDialogOpen, setDetraccionDialogOpen] = useState(false)
    const [deshacerOpen, setDeshacerOpen] = useState(false)
    const [deshacerPending, setDeshacerPending] = useState(false)

    const reloadFactura = async (id: string) => {
        const [f, cs, bs] = await Promise.all([
            getFacturaVentaById(id),
            getCobrosByFactura(id),
            getBancosActivos(),
        ])
        setFactura(f)
        setCobros(cs)
        setBancos(bs)
        if (f) {
            setForm({
                codigo_factura: f.codigo_factura,
                fecha_factura: f.fecha_factura,
                fecha_vencimiento: f.fecha_vencimiento,
                dias_para_pago: f.dias_para_pago,
                pdf_factura_url: f.pdf_factura_url,
                detraccion_numero_constancia: f.detraccion_numero_constancia,
                detraccion_fecha_pago: f.detraccion_fecha_pago,
                detraccion_a_cargo_de: f.detraccion_a_cargo_de,
            })
        }
    }

    useEffect(() => {
        if (!open || !facturaId) {
            setFactura(null)
            setForm({})
            setCobros([])
            return
        }
        setLoading(true)
        setEditMode(initialEdit)
        reloadFactura(facturaId).finally(() => setLoading(false))
    }, [open, facturaId, initialEdit])

    const handleSave = async () => {
        if (!facturaId) return
        setSaving(true)
        const res = await updateFacturaVenta(facturaId, form)
        setSaving(false)
        if (res.success) {
            toast.success(res.message)
            setEditMode(false)
            router.refresh()
            await reloadFactura(facturaId)
        } else {
            toast.error(res.message)
        }
    }

    const fmtDate = (iso: string | null | undefined) => {
        if (!iso) return '—'
        try { return format(new Date(iso), 'dd MMM yyyy', { locale: es }) }
        catch { return iso }
    }
    const fmtMoney = (v: number | null | undefined, currency: 'USD' | 'PEN' = 'USD') => {
        if (v == null) return '—'
        const s = currency === 'USD' ? '$' : 'S/'
        return `${s} ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <DialogTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-orange-600" />
                                {editMode ? 'Editar Factura' : 'Detalle de Factura'}
                                {factura?.codigo_factura && (
                                    <span className="font-mono text-gray-500 text-base font-normal">· {factura.codigo_factura}</span>
                                )}
                            </DialogTitle>
                            <DialogDescription>
                                {factura?.cliente_nombre ?? 'Cargando…'}{factura?.cliente_ruc ? ` · RUC ${factura.cliente_ruc}` : ''}
                            </DialogDescription>
                        </div>
                        {!editMode && factura && (
                            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditMode(true)}>
                                <Pencil className="h-3.5 w-3.5" /> Editar
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {loading || !factura ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Estados */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            {factura.estado && <Badge variant="outline" className="bg-gray-50">Estado: {factura.estado}</Badge>}
                            {factura.estado_pago && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pago: {factura.estado_pago}</Badge>}
                            {factura.codigo_valoracion && (
                                <a href={`/api/valorizaciones/${encodeURIComponent(factura.codigo_valoracion)}/pdf`} target="_blank" rel="noreferrer">
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1 cursor-pointer hover:bg-orange-100">
                                        <ExternalLink className="h-3 w-3" /> Valorización {factura.codigo_valoracion}
                                    </Badge>
                                </a>
                            )}
                        </div>

                        {/* Datos principales */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="N° Factura" editable={editMode}
                                value={factura.codigo_factura}
                                formValue={form.codigo_factura ?? ''}
                                onChange={(v) => setForm((f) => ({ ...f, codigo_factura: v }))}
                            />
                            <Field label="Fecha factura" editable={editMode} type="date"
                                value={factura.fecha_factura}
                                displayValue={fmtDate(factura.fecha_factura)}
                                formValue={form.fecha_factura ?? ''}
                                onChange={(v) => setForm((f) => ({ ...f, fecha_factura: v }))}
                            />
                            <Field label="Vencimiento" editable={editMode} type="date"
                                value={factura.fecha_vencimiento}
                                displayValue={fmtDate(factura.fecha_vencimiento)}
                                formValue={form.fecha_vencimiento ?? ''}
                                onChange={(v) => setForm((f) => ({ ...f, fecha_vencimiento: v }))}
                            />
                            <Field label="Días para pago" editable={editMode} type="number"
                                value={factura.dias_para_pago?.toString() ?? null}
                                formValue={form.dias_para_pago?.toString() ?? ''}
                                onChange={(v) => setForm((f) => ({ ...f, dias_para_pago: v ? Number(v) : null }))}
                            />
                            <Field label="PDF cliente (URL)" editable={editMode}
                                value={factura.pdf_factura_url}
                                displayValue={factura.pdf_factura_url ? 'Cargado' : '—'}
                                formValue={form.pdf_factura_url ?? ''}
                                onChange={(v) => setForm((f) => ({ ...f, pdf_factura_url: v }))}
                                placeholder="https://..."
                                extra={factura.pdf_factura_url && !editMode ? (
                                    <a href={factura.pdf_factura_url} target="_blank" rel="noreferrer">
                                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                                            <FileText className="h-3.5 w-3.5" /> Abrir PDF
                                        </Button>
                                    </a>
                                ) : null}
                            />
                        </div>

                        <Separator />

                        {/* Montos */}
                        <div>
                            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Montos</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <Readonly label="Subtotal" value={fmtMoney(factura.subtotal)} />
                                <Readonly label={`IGV ${factura.igv_porcentaje ?? 18}%`} value={fmtMoney(factura.igv_monto)} />
                                <Readonly label="Total USD" value={fmtMoney(factura.total_usd)} strong />
                                <Readonly label="Total S/" value={fmtMoney(factura.monto_a_cobrar_soles, 'PEN')} />
                                <Readonly label="Cobrado" value={fmtMoney(factura.monto_pagado_factura)} className="text-green-700" />
                                <Readonly label="Pendiente USD" value={fmtMoney(factura.pendiente_por_cobrar_usd)} className="text-orange-600 font-medium" />
                                <Readonly label="Pendiente S/" value={fmtMoney(factura.pendiente_por_cobrar_sol, 'PEN')} className="text-orange-600" />
                            </div>
                        </div>

                        <Separator />

                        {/* Detracción */}
                        <div>
                            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Detracción</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Readonly label={`Monto S/ (${factura.detraccion_porcentaje ?? '—'}%)`}
                                    value={fmtMoney(factura.detraccion_monto_sol, 'PEN')} />
                                <Field label="A cargo de" editable={editMode}
                                    value={factura.detraccion_a_cargo_de}
                                    formValue={form.detraccion_a_cargo_de ?? ''}
                                    onChange={(v) => setForm((f) => ({ ...f, detraccion_a_cargo_de: v }))}
                                    placeholder="CLIENTE / EMPRESA"
                                />
                                <Field label="N° Constancia" editable={editMode}
                                    value={factura.detraccion_numero_constancia}
                                    formValue={form.detraccion_numero_constancia ?? ''}
                                    onChange={(v) => setForm((f) => ({ ...f, detraccion_numero_constancia: v }))}
                                />
                                <Field label="Fecha pago detracción" editable={editMode} type="date"
                                    value={factura.detraccion_fecha_pago}
                                    displayValue={fmtDate(factura.detraccion_fecha_pago)}
                                    formValue={form.detraccion_fecha_pago ?? ''}
                                    onChange={(v) => setForm((f) => ({ ...f, detraccion_fecha_pago: v }))}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Cobros (F.6) */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-2">
                                    <CircleDollarSign className="h-3.5 w-3.5 text-green-600" />
                                    Cobros registrados ({cobros.length})
                                </h4>
                                {factura.estado !== 'DESHABILITADA' && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setCobroDialogOpen(true)}>
                                        <CircleDollarSign className="h-3.5 w-3.5 text-green-600" />
                                        Nuevo cobro
                                    </Button>
                                )}
                            </div>
                            {cobros.length === 0 ? (
                                <div className="text-xs italic text-gray-400 border border-dashed rounded p-3 bg-white text-center">
                                    No hay cobros registrados hasta la fecha.
                                </div>
                            ) : (
                                <div className="border rounded-md bg-white overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50/60">
                                            <tr>
                                                <th className="text-left p-2">Fecha</th>
                                                <th className="text-left p-2">Tipo</th>
                                                <th className="text-left p-2">Banco</th>
                                                <th className="text-right p-2">Monto</th>
                                                <th className="text-left p-2">Comentarios</th>
                                                <th className="w-[40px]"><span className="sr-only">Acciones</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cobros.map((c) => (
                                                <tr key={c.id} className="border-t">
                                                    <td className="p-2">{fmtDate(c.fecha_cobro)}</td>
                                                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.tipo}</Badge></td>
                                                    <td className="p-2">{c.banco_nombre ?? '—'}</td>
                                                    <td className="p-2 text-right font-medium text-green-700">{fmtMoney(c.monto, c.moneda as 'USD' | 'PEN')}</td>
                                                    <td className="p-2 text-gray-600 truncate max-w-[150px]" title={c.comentarios ?? ''}>{c.comentarios ?? '—'}</td>
                                                    <td className="p-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-red-500"
                                                            onClick={async () => {
                                                                if (!confirm(`¿Anular cobro de ${fmtMoney(c.monto, c.moneda as 'USD' | 'PEN')}?`)) return
                                                                const res = await deshacerCobroVenta(c.id)
                                                                if (res.success) {
                                                                    toast.success(res.message)
                                                                    if (facturaId) await reloadFactura(facturaId)
                                                                    router.refresh()
                                                                } else toast.error(res.message)
                                                            }}
                                                            title="Anular cobro"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* CTAs de acciones (F.7 registrar detracción + F.8 deshacer) */}
                        {factura.estado !== 'DESHABILITADA' && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDetraccionDialogOpen(true)}>
                                    <Landmark className="h-3.5 w-3.5" />
                                    Registrar detracción
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto" onClick={() => setDeshacerOpen(true)}>
                                    <Undo2 className="h-3.5 w-3.5" />
                                    Deshacer factura
                                </Button>
                            </div>
                        )}
                        {factura.estado === 'DESHABILITADA' && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>Esta factura fue deshabilitada. La valorización asociada volvió a estado <strong>VALORADO</strong> y puede refacturarse.</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Dialog Nuevo Cobro (F.6) */}
                <NuevoCobroDialog
                    open={cobroDialogOpen}
                    onOpenChange={setCobroDialogOpen}
                    factura={factura}
                    bancos={bancos}
                    onDone={async () => {
                        if (facturaId) await reloadFactura(facturaId)
                        router.refresh()
                    }}
                />

                {/* Dialog Registrar Detracción (F.7) */}
                <DetraccionDialog
                    open={detraccionDialogOpen}
                    onOpenChange={setDetraccionDialogOpen}
                    factura={factura}
                    onDone={async () => {
                        if (facturaId) await reloadFactura(facturaId)
                        router.refresh()
                    }}
                />

                {/* AlertDialog Deshacer Factura (F.8) */}
                <AlertDialog open={deshacerOpen} onOpenChange={setDeshacerOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Deshacer factura {factura?.codigo_factura ?? ''}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                La factura se marcará como deshabilitada. Los cobros registrados se anularán (soft-delete) y los reportes vinculados vuelven a estado <strong>VALORADO</strong>, permitiendo refacturar la valorización.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deshacerPending}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={deshacerPending}
                                onClick={async (e) => {
                                    e.preventDefault()
                                    if (!facturaId) return
                                    setDeshacerPending(true)
                                    const res = await deshacerFacturaVenta(facturaId)
                                    setDeshacerPending(false)
                                    if (res.success) {
                                        toast.success(res.message)
                                        setDeshacerOpen(false)
                                        if (facturaId) await reloadFactura(facturaId)
                                        router.refresh()
                                    } else toast.error(res.message)
                                }}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {deshacerPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Deshaciendo…</> : 'Deshacer factura'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <DialogFooter>
                    {editMode ? (
                        <>
                            <Button variant="outline" onClick={() => { setEditMode(false); if (factura) setForm({
                                codigo_factura: factura.codigo_factura,
                                fecha_factura: factura.fecha_factura,
                                fecha_vencimiento: factura.fecha_vencimiento,
                                dias_para_pago: factura.dias_para_pago,
                                pdf_factura_url: factura.pdf_factura_url,
                                detraccion_numero_constancia: factura.detraccion_numero_constancia,
                                detraccion_fecha_pago: factura.detraccion_fecha_pago,
                                detraccion_a_cargo_de: factura.detraccion_a_cargo_de,
                            })}} disabled={saving}>
                                <X className="h-4 w-4 mr-1.5" /> Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Guardando…</> : <><Save className="h-4 w-4 mr-1.5" />Guardar</>}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function Field({
    label, editable, value, displayValue, formValue, onChange, type = 'text', placeholder, extra,
}: {
    label: string
    editable: boolean
    value: string | null | undefined
    displayValue?: string
    formValue: string
    onChange: (v: string) => void
    type?: string
    placeholder?: string
    extra?: React.ReactNode
}) {
    return (
        <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-gray-500">{label}</Label>
            {editable ? (
                <Input
                    type={type}
                    value={formValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="h-8"
                />
            ) : (
                <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                    <span className={value ? '' : 'text-gray-400'}>{displayValue ?? value ?? '—'}</span>
                    {extra}
                </div>
            )}
        </div>
    )
}

function Readonly({ label, value, className, strong }: { label: string; value: string; className?: string; strong?: boolean }) {
    return (
        <div className="space-y-0.5">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
            <div className={`text-sm ${strong ? 'font-bold' : 'font-medium'} ${className ?? 'text-gray-800'}`}>{value}</div>
        </div>
    )
}

// ------------------------------------------------------------
// NuevoCobroDialog (F.6) — sub-dialog embebido
// ------------------------------------------------------------

function NuevoCobroDialog({
    open, onOpenChange, factura, bancos, onDone,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    factura: FacturaVentaItem | null
    bancos: BancoItem[]
    onDone: () => Promise<void>
}) {
    const [saving, setSaving] = useState(false)
    const [tipo, setTipo] = useState('TRANSFERENCIA')
    const [monto, setMonto] = useState('')
    const [moneda, setMoneda] = useState<'USD' | 'PEN'>('USD')
    const [fechaCobro, setFechaCobro] = useState(() => new Date().toISOString().slice(0, 10))
    const [bancoId, setBancoId] = useState<string>('')
    const [comentarios, setComentarios] = useState('')

    useEffect(() => {
        if (open) {
            setTipo('TRANSFERENCIA')
            setMonto(factura?.pendiente_por_cobrar_usd?.toFixed(2) ?? '')
            setMoneda('USD')
            setFechaCobro(new Date().toISOString().slice(0, 10))
            setBancoId('')
            setComentarios('')
        }
    }, [open, factura?.pendiente_por_cobrar_usd])

    const handleSave = async () => {
        if (!factura) return
        const n = Number(monto)
        if (!(n > 0)) { toast.error('Monto inválido'); return }
        setSaving(true)
        const res = await registrarCobroVenta({
            factura_venta_id: factura.id,
            tipo,
            monto: n,
            moneda,
            fecha_cobro: fechaCobro,
            banco_id: bancoId || null,
            comentarios: comentarios || null,
        })
        setSaving(false)
        if (res.success) {
            toast.success(res.message)
            onOpenChange(false)
            await onDone()
        } else toast.error(res.message)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CircleDollarSign className="h-5 w-5 text-green-600" /> Registrar cobro
                    </DialogTitle>
                    <DialogDescription>
                        Factura <span className="font-mono">{factura?.codigo_factura ?? '—'}</span> · Pendiente USD <span className="font-bold text-orange-600">$ {factura?.pendiente_por_cobrar_usd?.toFixed(2) ?? '—'}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={tipo} onValueChange={setTipo}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                <SelectItem value="DEPOSITO">Depósito</SelectItem>
                                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                                <SelectItem value="OTRO">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Fecha cobro</Label>
                        <Input type="date" value={fechaCobro} onChange={(e) => setFechaCobro(e.target.value)} className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Monto</Label>
                        <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Moneda</Label>
                        <Select value={moneda} onValueChange={(v) => setMoneda(v as 'USD' | 'PEN')}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="PEN">PEN (S/)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Banco</Label>
                        <Select value={bancoId} onValueChange={setBancoId}>
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder={bancos.length === 0 ? 'No hay bancos — configurá en /settings' : 'Seleccionar banco'} />
                            </SelectTrigger>
                            <SelectContent>
                                {bancos.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                        {b.nombre}{b.numero_cuenta ? ` · ${b.numero_cuenta}` : ''}{b.moneda ? ` (${b.moneda})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Comentarios</Label>
                        <Textarea value={comentarios} onChange={(e) => setComentarios(e.target.value)} rows={2} placeholder="Opcional" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Guardando…</> : 'Registrar cobro'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ------------------------------------------------------------
// DetraccionDialog (F.7)
// ------------------------------------------------------------

function DetraccionDialog({
    open, onOpenChange, factura, onDone,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    factura: FacturaVentaItem | null
    onDone: () => Promise<void>
}) {
    const [saving, setSaving] = useState(false)
    const [porcentaje, setPorcentaje] = useState('10')
    const [montoSol, setMontoSol] = useState('')
    const [aCargoDe, setACargoDe] = useState<'CLIENTE' | 'EMPRESA'>('CLIENTE')
    const [constancia, setConstancia] = useState('')
    const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10))

    useEffect(() => {
        if (open && factura) {
            setPorcentaje(factura.detraccion_porcentaje?.toString() ?? '10')
            setMontoSol(factura.detraccion_monto_sol?.toFixed(2) ?? '')
            setACargoDe((factura.detraccion_a_cargo_de as 'CLIENTE' | 'EMPRESA') ?? 'CLIENTE')
            setConstancia(factura.detraccion_numero_constancia ?? '')
            setFechaPago(factura.detraccion_fecha_pago ?? new Date().toISOString().slice(0, 10))
        }
    }, [open, factura])

    const handleSave = async () => {
        if (!factura) return
        const pct = Number(porcentaje)
        const monto = Number(montoSol)
        if (!(pct >= 0) || !(monto >= 0)) { toast.error('Valores inválidos'); return }
        if (!constancia.trim()) { toast.error('Número de constancia obligatorio'); return }
        setSaving(true)
        const res = await registrarDetraccion({
            factura_venta_id: factura.id,
            porcentaje: pct,
            monto_sol: monto,
            a_cargo_de: aCargoDe,
            numero_constancia: constancia.trim(),
            fecha_pago: fechaPago,
        })
        setSaving(false)
        if (res.success) {
            toast.success(res.message)
            onOpenChange(false)
            await onDone()
        } else toast.error(res.message)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-orange-600" /> Registro de detracción
                    </DialogTitle>
                    <DialogDescription>
                        Factura <span className="font-mono">{factura?.codigo_factura ?? '—'}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">% Detracción</Label>
                        <Input type="number" step="0.01" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Monto S/</Label>
                        <Input type="number" step="0.01" value={montoSol} onChange={(e) => setMontoSol(e.target.value)} className="h-8" />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label className="text-xs">A cargo de</Label>
                        <Select value={aCargoDe} onValueChange={(v) => setACargoDe(v as 'CLIENTE' | 'EMPRESA')}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CLIENTE">Cliente</SelectItem>
                                <SelectItem value="EMPRESA">Empresa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label className="text-xs">N° Constancia</Label>
                        <Input value={constancia} onChange={(e) => setConstancia(e.target.value)} className="h-8" placeholder="Nº emitido por SUNAT" />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Fecha pago detracción</Label>
                        <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="h-8" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Guardando…</> : 'Registrar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
