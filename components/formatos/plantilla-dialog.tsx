'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createFormato, updateFormato, type PlantillaListItem } from '@/lib/actions/formatos'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: 'create' | 'edit'
    plantilla?: PlantillaListItem | null
}

export function PlantillaDialog({ open, onOpenChange, mode, plantilla }: Props) {
    const router = useRouter()
    const [codigo, setCodigo] = React.useState('')
    const [nombre, setNombre] = React.useState('')
    const [descripcion, setDescripcion] = React.useState('')
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        if (open && mode === 'edit' && plantilla) {
            setCodigo(plantilla.codigo)
            setNombre(plantilla.nombre)
            setDescripcion(plantilla.descripcion ?? '')
        } else if (open && mode === 'create') {
            setCodigo('')
            setNombre('')
            setDescripcion('')
        }
    }, [open, mode, plantilla])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!codigo.trim() || !nombre.trim()) {
            toast.error('Código y nombre son requeridos')
            return
        }

        setSaving(true)
        if (mode === 'create') {
            const res = await createFormato({ codigo, nombre, descripcion })
            setSaving(false)
            if (res.success) {
                toast.success('Plantilla creada. Editá la versión V.01 para agregar preguntas.')
                onOpenChange(false)
                router.push(`/formatos/${res.id}`)
            } else {
                toast.error(res.error)
            }
        } else if (plantilla) {
            const res = await updateFormato(plantilla.id, { codigo, nombre, descripcion })
            setSaving(false)
            if (res.success) {
                toast.success('Plantilla actualizada')
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error(res.error)
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Nueva plantilla' : 'Editar plantilla'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Después de crear la plantilla vas a poder agregar sus preguntas en la versión V.01.'
                            : 'Editá el código, nombre o descripción. Las preguntas se editan en la versión.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="codigo">Código</Label>
                        <Input
                            id="codigo"
                            value={codigo}
                            onChange={e => setCodigo(e.target.value.toUpperCase())}
                            placeholder="Ej: INF-10676"
                            disabled={saving}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Se usará para armar el correlativo de cada informe: <code>{codigo || 'INF-XXXX'}-2026-000001</code>
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input
                            id="nombre"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej: Formato de Inspección de Grúas"
                            disabled={saving}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="descripcion">Descripción (opcional)</Label>
                        <Textarea
                            id="descripcion"
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            rows={3}
                            disabled={saving}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                            {saving ? 'Guardando…' : mode === 'create' ? 'Crear plantilla' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
