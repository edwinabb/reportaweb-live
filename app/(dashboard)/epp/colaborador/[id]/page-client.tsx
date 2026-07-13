'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createDevolucionEpp, createReemplazoEpp } from '@/lib/actions/epp'

type StockItem = {
    id: string
    cantidad: number
    fecha_vencimiento: string
    estado_vigencia: string
    catalogo: { id: string; epp_nombre: string | null; tipo: string | null; dias_renovacion: number | null } | null
    entrega: { id: string; fecha_entrega: string; colaborador_id: string } | null
}
type Movimiento = {
    id: string
    tipo: string
    fecha: string
    cantidad: number
    observacion: string | null
    catalogo: { id: string; epp_nombre: string | null } | null
}

type Modal = null | { mode: 'DEVOLUCION' | 'REEMPLAZO'; item: StockItem }

function estadoBadge(estado: string, vencimiento: string) {
    const dias = differenceInDays(new Date(vencimiento), new Date())
    if (dias < 0) return { label: 'Vencido', cls: 'bg-red-100 text-red-800 border-red-200' }
    if (dias <= 15) return { label: `Vence en ${dias}d`, cls: 'bg-orange-100 text-orange-800 border-orange-200' }
    if (dias <= 30) return { label: `Vence en ${dias}d`, cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    return { label: 'Vigente', cls: 'bg-green-100 text-green-800 border-green-200' }
}

export function StockColaboradorClient({ stock, movimientos }: { stock: StockItem[]; movimientos: Movimiento[] }) {
    const router = useRouter()
    const [modal, setModal] = useState<Modal>(null)
    const [, startTransition] = useTransition()

    const handleSubmitModal = async (payload: { fecha: string; observacion?: string; cantidad?: number; fecha_vencimiento?: string }) => {
        if (!modal) return
        let res
        if (modal.mode === 'DEVOLUCION') {
            res = await createDevolucionEpp({ item_id: modal.item.id, fecha: payload.fecha, observacion: payload.observacion })
        } else {
            res = await createReemplazoEpp({
                item_origen_id: modal.item.id,
                fecha: payload.fecha,
                cantidad: payload.cantidad!,
                fecha_vencimiento: payload.fecha_vencimiento!,
                observacion: payload.observacion,
            })
        }
        if (res.success) {
            toast.success(res.message)
            setModal(null)
            startTransition(() => router.refresh())
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-base">EPP activos</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>EPP</TableHead>
                                <TableHead>Cant.</TableHead>
                                <TableHead>Entregado</TableHead>
                                <TableHead>Vence</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                                        Sin EPP activos.
                                    </TableCell>
                                </TableRow>
                            ) : stock.map((it) => {
                                const est = estadoBadge(it.estado_vigencia, it.fecha_vencimiento)
                                return (
                                    <TableRow key={it.id}>
                                        <TableCell className="font-medium">{it.catalogo?.epp_nombre || '—'}</TableCell>
                                        <TableCell>{it.cantidad}</TableCell>
                                        <TableCell>{it.entrega?.fecha_entrega ? format(new Date(it.entrega.fecha_entrega), 'dd MMM yyyy', { locale: es }) : '—'}</TableCell>
                                        <TableCell>{format(new Date(it.fecha_vencimiento), 'dd MMM yyyy', { locale: es })}</TableCell>
                                        <TableCell><Badge variant="outline" className={est.cls}>{est.label}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'DEVOLUCION', item: it })}>Devolver</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'REEMPLAZO', item: it })}>Reemplazar</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">Historial de movimientos</CardTitle></CardHeader>
                <CardContent>
                    {movimientos.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">Sin movimientos.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>EPP</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Cant.</TableHead>
                                    <TableHead>Observación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movimientos.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell>{format(new Date(m.fecha), 'dd MMM yyyy', { locale: es })}</TableCell>
                                        <TableCell>{m.catalogo?.epp_nombre || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {m.tipo === 'ENTREGA' ? 'Entrega' : m.tipo === 'DEVOLUCION' ? 'Devolución' : 'Reemplazo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{m.cantidad}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{m.observacion || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {modal && (
                <MovimientoDialog
                    mode={modal.mode}
                    item={modal.item}
                    onCancel={() => setModal(null)}
                    onSubmit={handleSubmitModal}
                />
            )}
        </div>
    )
}

function MovimientoDialog({ mode, item, onCancel, onSubmit }: {
    mode: 'DEVOLUCION' | 'REEMPLAZO'
    item: StockItem
    onCancel: () => void
    onSubmit: (p: { fecha: string; observacion?: string; cantidad?: number; fecha_vencimiento?: string }) => Promise<void>
}) {
    const today = new Date().toISOString().slice(0, 10)
    const [fecha, setFecha] = useState(today)
    const [observacion, setObservacion] = useState(mode === 'REEMPLAZO' ? 'Reemplazo por vencimiento' : 'Devolución')
    const [cantidad, setCantidad] = useState(item.cantidad)
    const [fechaVencimiento, setFechaVencimiento] = useState(() => {
        if (mode === 'REEMPLAZO' && item.catalogo?.dias_renovacion) {
            const d = new Date(today)
            d.setDate(d.getDate() + item.catalogo.dias_renovacion)
            return d.toISOString().slice(0, 10)
        }
        return ''
    })
    const [submitting, setSubmitting] = useState(false)

    const handle = async () => {
        setSubmitting(true)
        try {
            if (mode === 'DEVOLUCION') {
                await onSubmit({ fecha, observacion })
            } else {
                await onSubmit({ fecha, observacion, cantidad, fecha_vencimiento: fechaVencimiento })
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={true} onOpenChange={(o) => { if (!o) onCancel() }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'DEVOLUCION' ? 'Registrar devolución' : 'Registrar reemplazo'} — {item.catalogo?.epp_nombre}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                    </div>

                    {mode === 'REEMPLAZO' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cantidad del nuevo</Label>
                                <Input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Vence</Label>
                                <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Observación</Label>
                        <Textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
                    <Button onClick={handle} disabled={submitting}>
                        {submitting ? 'Guardando…' : 'Confirmar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
