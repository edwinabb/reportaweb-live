'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createEntregaEpp } from '@/lib/actions/epp'

type Colaborador = {
    id: string
    first_name: string | null
    last_name: string | null
    dni: string | null
    cargo: string | null
}
type CatalogoItem = {
    id: string
    epp_nombre: string | null
    tipo: string | null
    dias_renovacion: number | null
}
type ItemRow = {
    key: string
    catalogo_id: string
    cantidad: number
    fecha_vencimiento: string
}

function addDaysISO(baseISO: string, days: number): string {
    const d = new Date(baseISO)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
}

function colabLabel(c: Colaborador) {
    return [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Sin nombre'
}

export function EntregaForm({ colaboradores, catalogo }: { colaboradores: Colaborador[]; catalogo: CatalogoItem[] }) {
    const router = useRouter()

    const today = new Date().toISOString().slice(0, 10)
    const [colaboradorId, setColaboradorId] = useState('')
    const [fechaEntrega, setFechaEntrega] = useState(today)
    const [observaciones, setObservaciones] = useState('')
    const [items, setItems] = useState<ItemRow[]>([])
    const [saving, setSaving] = useState(false)

    const colaborador = useMemo(() => colaboradores.find((c) => c.id === colaboradorId), [colaboradorId, colaboradores])

    const addRow = () => {
        setItems((prev) => [...prev, { key: crypto.randomUUID(), catalogo_id: '', cantidad: 1, fecha_vencimiento: '' }])
    }

    const updateRow = (key: string, patch: Partial<ItemRow>) => {
        setItems((prev) =>
            prev.map((r) => {
                if (r.key !== key) return r
                const next = { ...r, ...patch }
                // Si cambió catálogo o fecha_entrega, recomputamos vencimiento si el usuario no la tocó manualmente
                if (patch.catalogo_id !== undefined) {
                    const cat = catalogo.find((c) => c.id === patch.catalogo_id)
                    if (cat?.dias_renovacion && fechaEntrega) {
                        next.fecha_vencimiento = addDaysISO(fechaEntrega, cat.dias_renovacion)
                    }
                }
                return next
            }),
        )
    }

    const removeRow = (key: string) => setItems((prev) => prev.filter((r) => r.key !== key))

    const handleFechaEntregaChange = (v: string) => {
        setFechaEntrega(v)
        // Recomputar fechas de vencimiento de todos los items que matcheen un catálogo con vida útil
        setItems((prev) =>
            prev.map((r) => {
                const cat = catalogo.find((c) => c.id === r.catalogo_id)
                if (cat?.dias_renovacion && v) {
                    return { ...r, fecha_vencimiento: addDaysISO(v, cat.dias_renovacion) }
                }
                return r
            }),
        )
    }

    const submit = async () => {
        if (!colaboradorId) { toast.error('Seleccioná un colaborador'); return }
        if (!fechaEntrega) { toast.error('Ingresá fecha de entrega'); return }
        if (items.length === 0) { toast.error('Agregá al menos un EPP'); return }
        const invalid = items.find((r) => !r.catalogo_id || r.cantidad <= 0 || !r.fecha_vencimiento)
        if (invalid) { toast.error('Completá catálogo, cantidad y vencimiento en todas las filas'); return }

        setSaving(true)
        const res = await createEntregaEpp({
            colaborador_id: colaboradorId,
            fecha_entrega: fechaEntrega,
            observaciones: observaciones || null,
            items: items.map((r) => ({
                catalogo_id: r.catalogo_id,
                cantidad: r.cantidad,
                fecha_vencimiento: r.fecha_vencimiento,
            })),
        })
        setSaving(false)

        if (res.success) {
            toast.success(res.message)
            router.push(`/epp/colaborador/${colaboradorId}`)
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Colaborador</Label>
                            <Select value={colaboradorId} onValueChange={setColaboradorId}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar colaborador…" /></SelectTrigger>
                                <SelectContent>
                                    {colaboradores.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {colabLabel(c)} {c.dni ? `· DNI ${c.dni}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {colaborador && (
                                <p className="text-xs text-muted-foreground">
                                    {colaborador.cargo ? `Cargo: ${colaborador.cargo}` : 'Sin cargo asignado'} · {colaborador.dni ? `DNI ${colaborador.dni}` : 'Sin DNI'}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Fecha de entrega</Label>
                            <Input type="date" value={fechaEntrega} onChange={(e) => handleFechaEntregaChange(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">EPP entregados</h3>
                            <p className="text-xs text-muted-foreground">Seleccioná del catálogo. La fecha de vencimiento se calcula automáticamente según la vida útil.</p>
                        </div>
                        <Button type="button" onClick={addRow} size="sm" variant="secondary">
                            <Plus className="h-4 w-4 mr-1" /> Agregar item
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">EPP</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Vence</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                        Sin items. Click en "Agregar item".
                                    </TableCell>
                                </TableRow>
                            ) : items.map((r) => {
                                const cat = catalogo.find((c) => c.id === r.catalogo_id)
                                return (
                                    <TableRow key={r.key}>
                                        <TableCell>
                                            <Select value={r.catalogo_id} onValueChange={(v) => updateRow(r.key, { catalogo_id: v })}>
                                                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                                                <SelectContent>
                                                    {catalogo.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.epp_nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {cat ? <Badge variant="outline">{cat.tipo === 'EE' ? 'EE' : 'EPP'}</Badge> : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="w-20"
                                                value={r.cantidad}
                                                onChange={(e) => updateRow(r.key, { cantidad: Number(e.target.value) || 0 })}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="date"
                                                className="w-40"
                                                value={r.fecha_vencimiento}
                                                onChange={(e) => updateRow(r.key, { fecha_vencimiento: e.target.value })}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button type="button" size="sm" variant="ghost" onClick={() => removeRow(r.key)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 space-y-2">
                    <Label>Observaciones (opcional)</Label>
                    <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar entrega
                </Button>
            </div>
        </div>
    )
}
