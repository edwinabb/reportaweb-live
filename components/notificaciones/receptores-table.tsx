'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { deleteNotificacionReceptor, toggleNotificacionReceptor } from '@/lib/actions/notificaciones'
import type { NotificacionReceptor } from '@/lib/actions/notificaciones'

const TIPO_LABELS: Record<string, string> = {
    DOCUMENTOS_MAQUINARIA_VENCIDOS: 'Maquinaria Vencidos',
    DOCUMENTOS_PERSONAL_VENCIDOS: 'Personal Vencidos',
}

const DIA_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function ReceptoresTable({ receptores }: { receptores: NotificacionReceptor[] }) {
    const [isPending, startTransition] = useTransition()

    function handleDelete(id: string) {
        startTransition(async () => {
            await deleteNotificacionReceptor(id)
        })
    }

    function handleToggle(id: string, current: boolean) {
        startTransition(async () => {
            await toggleNotificacionReceptor(id, !current)
        })
    }

    if (receptores.length === 0) {
        return (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                No hay receptores configurados. Agrega uno con el botón de arriba.
            </div>
        )
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo Notificación</TableHead>
                        <TableHead>Frecuencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {receptores.map(r => (
                        <TableRow key={r.id} className={!r.is_active ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">{r.nombre}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                    {TIPO_LABELS[r.tipo_correo] ?? r.tipo_correo}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                                {r.frecuencia === 'SEMANAL' && r.dia_semana !== null
                                    ? `Semanal · ${DIA_LABELS[r.dia_semana]}`
                                    : 'Diaria'}
                            </TableCell>
                            <TableCell>
                                <button
                                    onClick={() => handleToggle(r.id, r.is_active)}
                                    disabled={isPending}
                                    className={`text-xs font-semibold px-2 py-1 rounded ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    {r.is_active ? 'Activo' : 'Inactivo'}
                                </button>
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isPending}
                                    onClick={() => handleDelete(r.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
