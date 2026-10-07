'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { exportToExcel } from '@/lib/utils/export-excel'

type Entrega = {
    id: string
    fecha_entrega: string
    estado: string | null
    pdf_url: string | null
    created_at: string
    colaborador: { id: string; first_name: string | null; last_name: string | null } | { id: string; first_name: string | null; last_name: string | null }[] | null
    items_count: { count: number }[] | null
}

function getColaborador(entrega: Entrega) {
    const c = entrega.colaborador
    if (!c) return null
    return Array.isArray(c) ? (c[0] ?? null) : c
}

const ESTADO_META: Record<string, string> = {
    ACTIVO: 'bg-green-100 text-green-800 border-green-200',
    BORRADOR: 'bg-gray-100 text-gray-700 border-gray-200',
    ANULADO: 'bg-red-100 text-red-800 border-red-200',
}

function getItemsCount(entrega: Entrega): number {
    return entrega.items_count?.[0]?.count ?? 0
}

function getColaboradorNombre(entrega: Entrega): string {
    const c = getColaborador(entrega)
    return [c?.first_name, c?.last_name].filter(Boolean).join(' ') || '—'
}

export function EntregaListadoClient({ entregas }: { entregas: Entrega[] }) {
    const [filter, setFilter] = useState('')

    const filtered = useMemo(
        () =>
            entregas.filter((e) =>
                !filter || getColaboradorNombre(e).toLowerCase().includes(filter.toLowerCase()),
            ),
        [entregas, filter],
    )

    const handleExcel = () => {
        const rows = filtered.map((e) => ({
            'Colaborador': getColaboradorNombre(e),
            'Fecha Entrega': e.fecha_entrega ? format(new Date(e.fecha_entrega), 'dd/MM/yyyy') : '',
            'Ítems': getItemsCount(e),
            'Estado': e.estado || '',
        }))
        exportToExcel('ENTREGAS EPP', rows)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <Input
                    placeholder="Buscar por colaborador…"
                    className="max-w-sm"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <Button variant="outline" title="Descargar Excel (lo filtrado)" onClick={handleExcel}>
                    <FileText className="h-4 w-4 text-green-600" />
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Fecha de entrega</TableHead>
                            <TableHead>Ítems</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>PDF</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    {entregas.length === 0 ? 'Sin entregas registradas.' : 'Sin coincidencias.'}
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((e) => (
                            <TableRow key={e.id}>
                                <TableCell className="font-medium">
                                    {getColaborador(e)?.id ? (
                                        <Link href={`/epp/colaborador/${getColaborador(e)!.id}`} className="hover:underline text-orange-600">
                                            {getColaboradorNombre(e)}
                                        </Link>
                                    ) : getColaboradorNombre(e)}
                                </TableCell>
                                <TableCell>
                                    {e.fecha_entrega ? format(new Date(e.fecha_entrega), 'dd MMM yyyy', { locale: es }) : '—'}
                                </TableCell>
                                <TableCell>{getItemsCount(e)}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={ESTADO_META[e.estado || ''] || ''}>
                                        {e.estado || '—'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {e.pdf_url ? (
                                        <a
                                            href={e.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                        >
                                            Ver PDF <ExternalLink className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
