'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Form = {
    epp_nombre: string
    tipo: 'EPP' | 'EE'
    dias_renovacion: number
    nivel_riesgo?: string | null
}

interface Props {
    open: boolean
    onOpenChange: (o: boolean) => void
    initial?: Form
    onSubmit: (data: Form) => Promise<void> | void
}

export function CatalogoEppDialog({ open, onOpenChange, initial, onSubmit }: Props) {
    const [form, setForm] = useState<Form>(initial ?? { epp_nombre: '', tipo: 'EPP', dias_renovacion: 180, nivel_riesgo: '' })
    const [submitting, setSubmitting] = useState(false)

    const handleSave = async () => {
        if (!form.epp_nombre.trim()) return
        if (form.dias_renovacion <= 0) return
        setSubmitting(true)
        try {
            await onSubmit({
                epp_nombre: form.epp_nombre.trim(),
                tipo: form.tipo,
                dias_renovacion: form.dias_renovacion,
                nivel_riesgo: form.nivel_riesgo?.trim() || null,
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{initial ? 'Editar EPP' : 'Agregar EPP al catálogo'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                            value={form.epp_nombre}
                            onChange={(e) => setForm({ ...form, epp_nombre: e.target.value })}
                            placeholder="Ej. Guantes de cuero"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as 'EPP' | 'EE' })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EPP">EPP</SelectItem>
                                    <SelectItem value="EE">Equipo de emergencia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vida útil (días)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.dias_renovacion}
                                onChange={(e) => setForm({ ...form, dias_renovacion: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nivel de riesgo (opcional)</Label>
                        <Input
                            value={form.nivel_riesgo || ''}
                            onChange={(e) => setForm({ ...form, nivel_riesgo: e.target.value })}
                            placeholder="Ej. Alto, Medio, Bajo"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={submitting || !form.epp_nombre.trim() || form.dias_renovacion <= 0}>
                        {submitting ? 'Guardando…' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
