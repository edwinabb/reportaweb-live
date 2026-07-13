'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createNotificacionReceptor } from '@/lib/actions/notificaciones'

const TIPOS = [
    { value: 'DOCUMENTOS_MAQUINARIA_VENCIDOS', label: 'Maquinaria — Documentos Vencidos' },
    { value: 'DOCUMENTOS_PERSONAL_VENCIDOS',   label: 'Personal — Documentos Vencidos' },
]

const DIAS = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sábado' },
]

export function AddReceptorDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        tipo_correo: 'DOCUMENTOS_MAQUINARIA_VENCIDOS',
        email: '',
        nombre: '',
        frecuencia: 'DIARIA',
        dia_semana: '1',
    })
    const [error, setError] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        startTransition(async () => {
            const res = await createNotificacionReceptor({
                tipo_correo: form.tipo_correo,
                email: form.email,
                nombre: form.nombre,
                frecuencia: form.frecuencia,
                dia_semana: form.frecuencia === 'SEMANAL' ? Number(form.dia_semana) : null,
            })
            if (!res.success) {
                setError(res.message ?? 'Error al guardar')
                return
            }
            setOpen(false)
            setForm({ tipo_correo: 'DOCUMENTOS_MAQUINARIA_VENCIDOS', email: '', nombre: '', frecuencia: 'DIARIA', dia_semana: '1' })
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Agregar Receptor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo Receptor de Notificaciones</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <Label>Tipo de Notificación</Label>
                        <Select value={form.tipo_correo} onValueChange={v => setForm(f => ({ ...f, tipo_correo: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Nombre (para el saludo)</Label>
                        <Input
                            placeholder="JUAN"
                            value={form.nombre}
                            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <Label>Email</Label>
                        <Input
                            type="email"
                            placeholder="juan@empresa.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <Label>Frecuencia</Label>
                        <Select value={form.frecuencia} onValueChange={v => setForm(f => ({ ...f, frecuencia: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DIARIA">Diaria</SelectItem>
                                <SelectItem value="SEMANAL">Semanal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {form.frecuencia === 'SEMANAL' && (
                        <div>
                            <Label>Día de la semana</Label>
                            <Select value={form.dia_semana} onValueChange={v => setForm(f => ({ ...f, dia_semana: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {DIAS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
