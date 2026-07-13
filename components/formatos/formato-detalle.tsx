'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Copy, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'

import type { PlantillaDetalle } from '@/lib/actions/formatos'
import { clonarVersion } from '@/lib/actions/formatos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

type Props = {
    formato: PlantillaDetalle
}

export function FormatoDetalle({ formato }: Props) {
    const router = useRouter()
    const [cloning, setCloning] = React.useState(false)

    const borradorExistente = formato.versiones.find(v => v.estado === 'BORRADOR')
    const versionPublicada = formato.versiones.find(v => v.estado === 'PUBLICADA')

    const handleClone = async (versionId: string) => {
        setCloning(true)
        const res = await clonarVersion(versionId)
        setCloning(false)
        if (res.success) {
            toast.success('Nueva versión BORRADOR creada')
            router.push(`/formatos/${formato.id}/versiones/${res.nuevaVersionId}`)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground font-mono">{formato.codigo}</div>
                        <h1 className="text-2xl font-semibold tracking-tight">{formato.nombre}</h1>
                        {formato.descripcion && (
                            <p className="text-sm text-muted-foreground mt-1">{formato.descripcion}</p>
                        )}
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold">Versiones</h2>
                        <p className="text-sm text-muted-foreground">
                            Una versión publicada no se puede editar — cloná para crear una nueva.
                        </p>
                    </div>
                    {!borradorExistente && versionPublicada && (
                        <Button
                            onClick={() => handleClone(versionPublicada.id)}
                            disabled={cloning}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {cloning ? 'Clonando…' : `Nueva versión desde ${versionPublicada.etiqueta_version ?? ''}`}
                        </Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">#</TableHead>
                            <TableHead>Etiqueta</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Preguntas</TableHead>
                            <TableHead>Publicada</TableHead>
                            <TableHead className="w-[200px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {formato.versiones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Esta plantilla aún no tiene versiones.
                                </TableCell>
                            </TableRow>
                        ) : (
                            formato.versiones.map(v => (
                                <TableRow key={v.id}>
                                    <TableCell className="font-mono text-sm">{v.numero_version}</TableCell>
                                    <TableCell className="font-mono">{v.etiqueta_version ?? '—'}</TableCell>
                                    <TableCell>
                                        <EstadoBadge estado={v.estado} />
                                    </TableCell>
                                    <TableCell className="text-right">{v.total_preguntas}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {v.publicado_at
                                            ? new Date(v.publicado_at).toLocaleDateString('es-PE')
                                            : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="inline-flex gap-2">
                                            {v.estado === 'BORRADOR' ? (
                                                <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700">
                                                    <Link href={`/formatos/${formato.id}/versiones/${v.id}`}>
                                                        <Edit className="mr-1 h-3.5 w-3.5" /> Editar
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/formatos/${formato.id}/versiones/${v.id}`}>
                                                        <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                                                    </Link>
                                                </Button>
                                            )}
                                            {v.estado === 'PUBLICADA' && !borradorExistente && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleClone(v.id)}
                                                    disabled={cloning}
                                                >
                                                    <Copy className="mr-1 h-3.5 w-3.5" /> Clonar
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}

function EstadoBadge({ estado }: { estado: 'BORRADOR' | 'PUBLICADA' | 'ARCHIVADA' }) {
    if (estado === 'PUBLICADA') return <Badge className="bg-green-600 hover:bg-green-600">Publicada</Badge>
    if (estado === 'BORRADOR') return <Badge variant="secondary">Borrador</Badge>
    return <Badge variant="outline" className="text-muted-foreground">Archivada</Badge>
}
