'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    SECCIONES_SOPORTE, SECCION_LABELS,
    type TicketSoporte, type TicketEstado, type SeccionSoporte, type TicketCriticidad,
} from '@/lib/soporte-shared'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const PAGE_SIZE = 20

const CRITICIDAD_BADGE: Record<TicketCriticidad, string> = {
    ALTA:  'bg-red-100    text-red-700    border-red-200',
    MEDIA: 'bg-orange-100 text-orange-700 border-orange-200',
    BAJA:  'bg-blue-100   text-blue-700   border-blue-200',
}

const ESTADO_BADGE: Record<TicketEstado, string> = {
    ABIERTO:     'bg-gray-100    text-gray-700    border-gray-200',
    EN_PROGRESO: 'bg-blue-100    text-blue-700    border-blue-200',
    CERRADO:     'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const ESTADO_LABELS: Record<TicketEstado, string> = {
    ABIERTO:     'Abierto',
    EN_PROGRESO: 'En progreso',
    CERRADO:     'Cerrado',
}

type Props = {
    tickets:          TicketSoporte[]
    total:            number
    currentPage:      number
    currentEstado?:   TicketEstado
    currentSeccion?:  SeccionSoporte
    currentCriticidad?: TicketCriticidad
}

export function TicketsList({
    tickets, total, currentPage,
    currentEstado, currentSeccion, currentCriticidad,
}: Props) {
    const router      = useRouter()
    const searchParams = useSearchParams()

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const buildUrl = (updates: Record<string, string | undefined>) => {
        const p = new URLSearchParams(searchParams.toString())
        for (const [k, v] of Object.entries(updates)) {
            if (v) p.set(k, v); else p.delete(k)
        }
        p.delete('page') // reset page on filter change
        return `/soporte?${p.toString()}`
    }

    const goPage = (page: number) => {
        const p = new URLSearchParams(searchParams.toString())
        p.set('page', String(page))
        router.push(`/soporte?${p.toString()}`)
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-lg font-semibold">Tickets de Soporte</h1>
                    <p className="text-sm text-muted-foreground">
                        {total} {total === 1 ? 'ticket' : 'tickets'} en total
                    </p>
                </div>
                <Button asChild className="bg-orange-600 hover:bg-orange-700">
                    <Link href="/soporte/nuevo">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Ticket
                    </Link>
                </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
                <Select
                    value={currentEstado ?? 'todos'}
                    onValueChange={v => router.push(buildUrl({ estado: v === 'todos' ? undefined : v }))}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos los estados</SelectItem>
                        <SelectItem value="ABIERTO">Abierto</SelectItem>
                        <SelectItem value="EN_PROGRESO">En progreso</SelectItem>
                        <SelectItem value="CERRADO">Cerrado</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={currentSeccion ?? 'todas'}
                    onValueChange={v => router.push(buildUrl({ seccion: v === 'todas' ? undefined : v }))}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Sección" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas las secciones</SelectItem>
                        {SECCIONES_SOPORTE.map(s => (
                            <SelectItem key={s} value={s}>{SECCION_LABELS[s]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={currentCriticidad ?? 'todas'}
                    onValueChange={v => router.push(buildUrl({ criticidad: v === 'todas' ? undefined : v }))}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Criticidad" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Toda criticidad</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="MEDIA">Media</SelectItem>
                        <SelectItem value="BAJA">Baja</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tabla */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[70px]">#</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-[140px]">Sección</TableHead>
                            <TableHead className="w-[100px]">Criticidad</TableHead>
                            <TableHead className="w-[110px]">Estado</TableHead>
                            <TableHead className="w-[130px]">Fecha</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                                    No hay tickets con los filtros seleccionados.
                                </TableCell>
                            </TableRow>
                        ) : tickets.map(t => (
                            <TableRow
                                key={t.id}
                                className="cursor-pointer hover:bg-muted/40"
                                onClick={() => router.push(`/soporte/${t.id}`)}
                            >
                                <TableCell className="font-mono text-sm font-medium">
                                    #{String(t.numero).padStart(4, '0')}
                                </TableCell>
                                <TableCell>
                                    <div className="max-w-[320px] truncate text-sm">{t.descripcion}</div>
                                    {t.reporter_nombre && (
                                        <div className="text-xs text-muted-foreground">{t.reporter_nombre}</div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs">{SECCION_LABELS[t.seccion] ?? t.seccion}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={CRITICIDAD_BADGE[t.criticidad]}>
                                        {t.criticidad}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={ESTADO_BADGE[t.estado]}>
                                        {ESTADO_LABELS[t.estado]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {format(new Date(t.created_at), 'dd MMM yyyy', { locale: es })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline" size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => goPage(currentPage - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline" size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => goPage(currentPage + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
