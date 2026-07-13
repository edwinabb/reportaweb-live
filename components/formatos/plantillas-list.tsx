'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, FileText, ClipboardList } from 'lucide-react'

import type { PlantillaListItem } from '@/lib/actions/formatos'
import { deactivateFormato } from '@/lib/actions/formatos'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

import { PlantillaDialog } from './plantilla-dialog'

type Props = {
    plantillas: PlantillaListItem[]
}

export function PlantillasList({ plantillas }: Props) {
    const [search, setSearch] = React.useState('')
    const [createOpen, setCreateOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<PlantillaListItem | null>(null)
    const [toDelete, setToDelete] = React.useState<PlantillaListItem | null>(null)
    const [deleting, setDeleting] = React.useState(false)

    const filtered = plantillas.filter(p => {
        const q = search.trim().toLowerCase()
        if (!q) return true
        return (
            p.codigo.toLowerCase().includes(q) ||
            p.nombre.toLowerCase().includes(q) ||
            (p.descripcion ?? '').toLowerCase().includes(q)
        )
    })

    const handleDelete = async () => {
        if (!toDelete) return
        setDeleting(true)
        const res = await deactivateFormato(toDelete.id)
        setDeleting(false)
        if (res.success) {
            toast.success('Plantilla desactivada')
            setToDelete(null)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Plantillas de Formatos</h1>
                    <p className="text-sm text-muted-foreground">
                        Formularios que se usan para llenar informes de inspección, checklists y reportes.
                    </p>
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva plantilla
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Input
                    placeholder="Buscar por código, nombre o descripción..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="max-w-md"
                />
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[140px]">Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-[120px]">Versión</TableHead>
                            <TableHead className="w-[100px] text-right">Informes</TableHead>
                            <TableHead className="w-[140px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    {plantillas.length === 0
                                        ? 'Aún no hay plantillas. Creá la primera con "Nueva plantilla".'
                                        : 'No hay resultados para tu búsqueda.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium font-mono text-sm">{p.codigo}</TableCell>
                                    <TableCell>{p.nombre}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate">
                                        {p.descripcion ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        {p.version_actual_etiqueta ? (
                                            <Badge variant="secondary" className="font-mono">
                                                {p.version_actual_etiqueta}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">sin publicar</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">{p.total_informes}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="inline-flex gap-1">
                                            {p.version_actual_etiqueta && (
                                                <Button asChild variant="ghost" size="icon" title="Llenar informe">
                                                    <Link href={`/informes/nuevo?formato_id=${p.id}`}>
                                                        <ClipboardList className="h-4 w-4 text-orange-600" />
                                                    </Link>
                                                </Button>
                                            )}
                                            <Button asChild variant="ghost" size="icon" title="Ver / editar">
                                                <Link href={`/formatos/${p.id}`}>
                                                    <FileText className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Editar metadata"
                                                onClick={() => setEditing(p)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Desactivar"
                                                onClick={() => setToDelete(p)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <PlantillaDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                mode="create"
            />
            <PlantillaDialog
                open={editing !== null}
                onOpenChange={o => !o && setEditing(null)}
                mode="edit"
                plantilla={editing}
            />

            <AlertDialog open={toDelete !== null} onOpenChange={o => !o && setToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desactivar plantilla?</AlertDialogTitle>
                        <AlertDialogDescription>
                            La plantilla <strong>{toDelete?.codigo}</strong> será desactivada. Los informes
                            existentes se mantienen; no se podrán crear nuevos informes con esta plantilla.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={e => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            disabled={deleting}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {deleting ? 'Desactivando…' : 'Desactivar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
