'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { type EntregaConItems, responderObservacionItem } from '@/lib/actions/epp'

const CONF_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    PENDIENTE: { label: 'Pendiente app', icon: <Clock className="h-3 w-3" />, cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    PARCIAL:   { label: 'Parcial — requiere atención', icon: <AlertTriangle className="h-3 w-3" />, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    COMPLETO:  { label: 'Completo', icon: <CheckCircle className="h-3 w-3" />, cls: 'bg-green-50 text-green-700 border-green-200' },
}

const ITEM_ESTADO_META: Record<string, { label: string; cls: string }> = {
    PENDIENTE_CONFIRMACION: { label: 'Pendiente',    cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    CONFIRMADO:             { label: 'Confirmado',   cls: 'bg-green-50 text-green-700 border-green-200' },
    OBSERVADO:              { label: 'Observado',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    RESUELTO:               { label: 'Resuelto',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    ANULADO:                { label: 'Anulado',      cls: 'bg-red-50 text-red-700 border-red-200' },
}

type Props = { entregas: EntregaConItems[] }

export function EntregasColaboradorPanel({ entregas }: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(() => {
        // Auto-expandir entregas PARCIAL
        const s = new Set<string>()
        entregas.forEach(e => { if (e.estado_confirmacion === 'PARCIAL') s.add(e.id) })
        return s
    })

    const toggle = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    if (entregas.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-base">Historial de entregas</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground py-3">Sin entregas registradas.</p>
                </CardContent>
            </Card>
        )
    }

    // Ordenar PARCIAL primero
    const sorted = [...entregas].sort((a, b) => {
        if (a.estado_confirmacion === 'PARCIAL' && b.estado_confirmacion !== 'PARCIAL') return -1
        if (b.estado_confirmacion === 'PARCIAL' && a.estado_confirmacion !== 'PARCIAL') return 1
        return new Date(b.fecha_entrega).getTime() - new Date(a.fecha_entrega).getTime()
    })

    return (
        <Card>
            <CardHeader><CardTitle className="text-base">Historial de entregas ({entregas.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                {sorted.map(entrega => {
                    const conf = entrega.estado_confirmacion ?? 'PENDIENTE'
                    const meta = CONF_META[conf] ?? CONF_META.PENDIENTE
                    const isExpanded = expanded.has(entrega.id)
                    const itemsObservados = entrega.items.filter(i => i.estado_item === 'OBSERVADO')
                    return (
                        <div
                            key={entrega.id}
                            className={`border rounded-lg overflow-hidden ${conf === 'PARCIAL' ? 'border-amber-300' : 'border-border'}`}
                        >
                            <button
                                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 ${conf === 'PARCIAL' ? 'bg-amber-50/60' : 'bg-white'}`}
                                onClick={() => toggle(entrega.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="text-sm font-medium">
                                            {format(new Date(entrega.fecha_entrega), "dd 'de' MMM yyyy", { locale: es })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {entrega.items.length} items
                                            {entrega.fecha_confirmacion_app && (
                                                <> · Confirmado {format(new Date(entrega.fecha_confirmacion_app), "dd MMM yyyy", { locale: es })}</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${meta.cls}`}>
                                        {meta.icon} {meta.label}
                                    </Badge>
                                    {entrega.pdf_url && (
                                        <a
                                            href={entrega.pdf_url}
                                            target="_blank"
                                            rel="noopener"
                                            onClick={e => e.stopPropagation()}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            PDF
                                        </a>
                                    )}
                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-4 pb-4 pt-2 border-t bg-white space-y-3">
                                    {/* Items de la entrega */}
                                    <div className="space-y-2">
                                        {entrega.items.map(item => {
                                            const iMeta = ITEM_ESTADO_META[item.estado_item ?? ''] ?? { label: item.estado_item ?? '—', cls: '' }
                                            return (
                                                <div key={item.id} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-sm">
                                                            <span className="font-medium">{item.catalogo?.epp_nombre ?? '—'}</span>
                                                            <span className="text-muted-foreground ml-2 text-xs">x{item.cantidad}</span>
                                                        </div>
                                                        <Badge variant="outline" className={`text-[10px] ${iMeta.cls}`}>{iMeta.label}</Badge>
                                                    </div>
                                                    {item.estado_item === 'OBSERVADO' && (
                                                        <ObservacionPanel item={item} entregaId={entrega.id} />
                                                    )}
                                                    {item.respuesta_admin && item.estado_item !== 'OBSERVADO' && (
                                                        <div className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1">
                                                            <span className="font-medium">Respuesta admin:</span> {item.respuesta_admin}
                                                            {item.decision_admin && <span className="ml-1 text-muted-foreground">({item.decision_admin})</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {itemsObservados.length > 0 && (
                                        <div className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {itemsObservados.length} item{itemsObservados.length > 1 ? 's' : ''} requiere{itemsObservados.length > 1 ? 'n' : ''} respuesta
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}

function ObservacionPanel({ item, entregaId }: {
    item: EntregaConItems['items'][0]
    entregaId: string
}) {
    const router = useRouter()
    const [, startTransition] = useTransition()
    const [decision, setDecision] = useState<'REENVIAR' | 'ANULAR' | 'RESOLVER_OFFLINE' | ''>('')
    const [respuesta, setRespuesta] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!decision) { toast.error('Seleccioná una decisión'); return }
        if (!respuesta.trim()) { toast.error('Ingresá una respuesta al operario'); return }
        setSubmitting(true)
        const res = await responderObservacionItem({
            item_id: item.id,
            respuesta_admin: respuesta,
            decision_admin: decision as 'REENVIAR' | 'ANULAR' | 'RESOLVER_OFFLINE',
        })
        setSubmitting(false)
        if (res.success) {
            toast.success(res.message)
            startTransition(() => router.refresh())
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="mt-1 ml-2 pl-2 border-l-2 border-amber-300 space-y-2">
            {item.motivo_observacion && (
                <div className="text-xs">
                    <span className="text-muted-foreground">Motivo operario:</span>{' '}
                    <span className="text-amber-800">{item.motivo_observacion}</span>
                </div>
            )}
            {item.nota_operario && (
                <div className="text-xs">
                    <span className="text-muted-foreground">Nota operario:</span>{' '}
                    <span>{item.nota_operario}</span>
                </div>
            )}
            <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs">Respuesta al operario</Label>
                    <Textarea
                        value={respuesta}
                        onChange={e => setRespuesta(e.target.value)}
                        placeholder="Indicá la acción tomada o instrucción para el operario..."
                        rows={2}
                        className="text-xs"
                    />
                </div>
                <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs">Decisión</Label>
                        <Select value={decision} onValueChange={v => setDecision(v as any)}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="REENVIAR">Reenviar EPP al operario</SelectItem>
                                <SelectItem value="RESOLVER_OFFLINE">Resolver offline</SelectItem>
                                <SelectItem value="ANULAR">Anular item</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        size="sm"
                        disabled={submitting || !decision || !respuesta.trim()}
                        onClick={handleSubmit}
                        className="h-8 bg-orange-600 hover:bg-orange-700"
                    >
                        {submitting ? 'Guardando…' : 'Guardar'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
