'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ChevronRight, Search } from 'lucide-react'

import type { InspeccionWithRelations } from '@/types/formatos'
import { Input } from '@/components/ui/input'
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

const ESTADO_META: Record<string, { label: string; cls: string }> = {
    COMPLETADO: { label: 'Completado',  cls: 'bg-green-50 text-green-700 border-green-200' },
    EN_PROCESO: { label: 'En proceso',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    APROBADO:   { label: 'Aprobado',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    RECHAZADO:  { label: 'Rechazado',   cls: 'bg-red-50 text-red-700 border-red-200' },
    PENDIENTE:  { label: 'Borrador',    cls: 'bg-slate-50 text-slate-500 border-slate-300' },
    CANCELADO:  { label: 'Cancelado',   cls: 'bg-red-50 text-red-600 border-red-200' },
}

interface Props {
    inspecciones: InspeccionWithRelations[]
    maquinarias: any[]
}

export function InspeccionesList({ inspecciones, maquinarias }: Props) {
    const [search, setSearch] = useState('')
    const [maquinariaFilter, setMaquinariaFilter] = useState('all')
    const [estadoFilter, setEstadoFilter] = useState('all')

    const filtered = useMemo(() => {
        return inspecciones.filter(i => {
            const maq = i.maquinaria as any
            const q = search.trim().toLowerCase()

            if (maquinariaFilter !== 'all' && i.maquinaria_id !== maquinariaFilter) return false
            if (estadoFilter !== 'all' && i.estado !== estadoFilter) return false
            if (q) {
                const searchIn = [
                    i.codigo_interno,
                    maq?.nombre,
                    maq?.codigo_interno,
                    (i.supervisor as any)?.full_name,
                ].filter(Boolean).join(' ').toLowerCase()
                if (!searchIn.includes(q)) return false
            }
            return true
        })
    }, [inspecciones, search, maquinariaFilter, estadoFilter])

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código, equipo o inspector..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={maquinariaFilter} onValueChange={setMaquinariaFilter}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Todos los equipos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los equipos</SelectItem>
                        {maquinarias.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                                {m.nombre} {m.codigo_interno ? `(${m.codigo_interno})` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="COMPLETADO">Completado</SelectItem>
                        <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                        <SelectItem value="APROBADO">Aprobado</SelectItem>
                        <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tabla */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40">
                            <TableHead className="w-[130px]">Código</TableHead>
                            <TableHead>Equipo</TableHead>
                            <TableHead className="hidden md:table-cell">Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="hidden sm:table-cell text-center w-[80px]">Puntaje</TableHead>
                            <TableHead className="hidden lg:table-cell">Inspector</TableHead>
                            <TableHead className="w-[40px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                                    No se encontraron inspecciones
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(insp => {
                                const maq = insp.maquinaria as any
                                const est = ESTADO_META[insp.estado ?? ''] ?? { label: insp.estado ?? '—', cls: '' }
                                const puntaje = insp.puntaje ?? null
                                const puntajeColor = puntaje == null
                                    ? 'text-muted-foreground'
                                    : puntaje >= 80 ? 'text-green-600 font-semibold'
                                    : puntaje >= 60 ? 'text-amber-600 font-semibold'
                                    : 'text-red-600 font-semibold'
                                const fecha = insp.fecha_inspeccion
                                    ? new Date(insp.fecha_inspeccion + 'T00:00:00').toLocaleDateString('es-PE', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    })
                                    : '—'
                                const supervisor = (insp.supervisor as any)?.full_name ?? '—'

                                return (
                                    <TableRow key={insp.id} className="hover:bg-muted/30 cursor-pointer group">
                                        <TableCell>
                                            <Link href={`/inspecciones/${insp.id}`} className="block w-full h-full">
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {insp.codigo_interno ?? insp.id.slice(0, 8)}
                                                </span>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/inspecciones/${insp.id}`} className="block">
                                                <div className="font-medium text-sm">{maq?.nombre ?? '—'}</div>
                                                {maq?.codigo_interno && (
                                                    <div className="text-xs text-muted-foreground font-mono">{maq.codigo_interno}</div>
                                                )}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                            <Link href={`/inspecciones/${insp.id}`} className="block">{fecha}</Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/inspecciones/${insp.id}`} className="block">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className={`text-xs ${est.cls}`}>
                                                        {est.label}
                                                    </Badge>
                                                    {insp.tiene_fallas && (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                    )}
                                                    {!insp.tiene_fallas && insp.estado === 'COMPLETADO' && (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                                    )}
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-center">
                                            <Link href={`/inspecciones/${insp.id}`} className="block">
                                                <span className={`text-sm ${puntajeColor}`}>
                                                    {puntaje != null ? `${puntaje}%` : '—'}
                                                </span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                            <Link href={`/inspecciones/${insp.id}`} className="block">{supervisor}</Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/inspecciones/${insp.id}`} className="block">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <p className="text-xs text-muted-foreground text-right">
                {filtered.length} de {inspecciones.length} inspecciones
            </p>
        </div>
    )
}
