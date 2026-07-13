'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileDown, Pencil, Search } from 'lucide-react'

import type { InformeListItem } from '@/lib/actions/formatos-informes'
import { formatDateInTZ } from '@/lib/utils/tz'
import { NuevoInformeDialog } from '@/components/informes/nuevo-informe-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

type Plantilla = {
    formato_id: string
    version_id: string
    codigo: string
    nombre: string
    etiqueta_version: string | null
}

type Props = {
    informes: InformeListItem[]
    initialEstado: string
    initialQ: string
    plantillas: Plantilla[]
}

const ESTADOS = [
    { value: '', label: 'Todos' },
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'ENVIADO', label: 'Enviado' },
    { value: 'APROBADO', label: 'Aprobado' },
    { value: 'RECHAZADO', label: 'Rechazado' },
    { value: 'CON_COMENTARIOS', label: 'Con comentarios' },
]

export function InformesList({ informes, initialEstado, initialQ, plantillas }: Props) {
    const [estado, setEstado] = React.useState(initialEstado)
    const [search, setSearch] = React.useState(initialQ)

    const filtered = informes.filter(r => {
        if (estado && r.estado !== estado) return false
        if (search) {
            const q = search.toLowerCase()
            const hit =
                (r.codigo_informe ?? '').toLowerCase().includes(q) ||
                r.formato_codigo.toLowerCase().includes(q) ||
                (r.cliente_nombre ?? '').toLowerCase().includes(q) ||
                (r.tarea_codigo ?? '').toLowerCase().includes(q) ||
                r.formato_nombre.toLowerCase().includes(q)
            if (!hit) return false
        }
        return true
    })

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Informes</h1>
                    <p className="text-sm text-muted-foreground">
                        Inspecciones, checklists y reportes llenados — {informes.length} total.
                    </p>
                </div>
                <NuevoInformeDialog plantillas={plantillas} />
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder="Buscar por código, cliente, tarea…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select
                    value={estado || '__all__'}
                    onValueChange={v => setEstado(v === '__all__' ? '' : v)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        {ESTADOS.map(e => (
                            <SelectItem key={e.value || 'all'} value={e.value || '__all__'}>
                                {e.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[210px]">Código</TableHead>
                            <TableHead>Plantilla</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tarea</TableHead>
                            <TableHead>Firmante</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Enviado</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    {informes.length === 0
                                        ? 'Aún no hay informes. Arrancá uno nuevo.'
                                        : 'No hay resultados con estos filtros.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs">
                                        {r.codigo_informe ?? <span className="text-muted-foreground">sin correlativo</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-mono text-xs">{r.formato_codigo}</div>
                                        <div className="text-sm text-muted-foreground truncate max-w-[220px]">
                                            {r.formato_nombre}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{r.cliente_nombre ?? '—'}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.tarea_codigo ?? '—'}</TableCell>
                                    <TableCell className="text-sm">{r.firmante_nombre ?? '—'}</TableCell>
                                    <TableCell><EstadoBadge estado={r.estado} /></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {r.enviado_at ? formatDateInTZ(r.enviado_at, 'America/Lima') : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="inline-flex gap-1">
                                            <Button asChild variant="ghost" size="icon" title="Ver / Editar">
                                                <Link href={`/informes/${r.id}`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            {r.pdf_url && (
                                                <Button asChild variant="ghost" size="icon" title="PDF">
                                                    <a
                                                        href={`/api/informes/${r.id}/pdf`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label="Descargar PDF"
                                                    >
                                                        <FileDown className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function EstadoBadge({ estado }: { estado: string }) {
    const cfg: Record<string, { label: string; className: string }> = {
        BORRADOR: { label: 'Borrador', className: 'bg-gray-500 hover:bg-gray-500' },
        ENVIADO: { label: 'Enviado', className: 'bg-blue-600 hover:bg-blue-600' },
        APROBADO: { label: 'Aprobado', className: 'bg-green-600 hover:bg-green-600' },
        RECHAZADO: { label: 'Rechazado', className: 'bg-red-600 hover:bg-red-600' },
        CON_COMENTARIOS: { label: 'Con comentarios', className: 'bg-amber-600 hover:bg-amber-600' },
    }
    const c = cfg[estado] ?? { label: estado, className: 'bg-gray-500' }
    return <Badge className={c.className}>{c.label}</Badge>
}
