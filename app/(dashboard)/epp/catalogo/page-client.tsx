'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { createCatalogoEpp, updateCatalogoEpp, toggleCatalogoEppActive } from '@/lib/actions/epp'
import { CatalogoEppDialog } from './catalogo-epp-dialog'
import { ColumnFilterHeader } from '@/components/ui/column-filter-header'
import { exportToExcel } from '@/lib/utils/export-excel'

type Row = {
    id: string
    codigo?: string | null
    epp_nombre: string | null
    tipo: string | null
    dias_renovacion: number | null
    nivel_riesgo: string | null
    is_active: boolean | null
}

export function CatalogoEppClient({ initialData }: { initialData: Row[] }) {
    const router = useRouter()
    const [filter, setFilter] = useState('')
    const [tipoFilter, setTipoFilter] = useState<string[]>([])
    const [editing, setEditing] = useState<Row | null>(null)
    const [creating, setCreating] = useState(false)
    const [, startTransition] = useTransition()

    const filtered = initialData.filter((r) =>
        (!filter || (r.epp_nombre || '').toLowerCase().includes(filter.toLowerCase())) &&
        (tipoFilter.length === 0 || tipoFilter.includes(r.tipo || '')),
    )

    const handleExcel = () => {
        const rows = filtered.map((r) => ({
            'Código': r.codigo || '—',
            'Nombre': r.epp_nombre || '',
            'Tipo': r.tipo === 'EE' ? 'Equipo de emergencia' : 'EPP',
            'Vida útil (días)': r.dias_renovacion ?? '',
            'Nivel riesgo': r.nivel_riesgo || '—',
            'Activo': r.is_active ? 'Sí' : 'No',
        }))
        exportToExcel('CATALOGO EPP', rows)
    }

    const handleToggle = async (row: Row, next: boolean) => {
        const res = await toggleCatalogoEppActive(row.id, next)
        if (res.success) {
            toast.success(res.message)
            startTransition(() => router.refresh())
        } else {
            toast.error(res.message)
        }
    }

    const handleSubmit = async (data: { epp_nombre: string; tipo: 'EPP' | 'EE'; dias_renovacion: number; nivel_riesgo?: string | null }) => {
        const res = editing
            ? await updateCatalogoEpp(editing.id, data)
            : await createCatalogoEpp(data)
        if (res.success) {
            toast.success(res.message)
            setEditing(null)
            setCreating(false)
            startTransition(() => router.refresh())
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <Input
                    placeholder="Buscar EPP por nombre…"
                    className="max-w-sm"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <Button variant="outline" title="Descargar Excel (lo filtrado)" onClick={handleExcel}>
                    <FileText className="h-4 w-4 text-green-600" />
                </Button>
                <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Agregar EPP
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>
                                <ColumnFilterHeader
                                    title="Tipo"
                                    options={[
                                        { label: 'EPP', value: 'EPP' },
                                        { label: 'Equipo de emergencia', value: 'EE' },
                                    ]}
                                    selected={tipoFilter}
                                    onChange={setTipoFilter}
                                />
                            </TableHead>
                            <TableHead>Vida útil</TableHead>
                            <TableHead>Nivel riesgo</TableHead>
                            <TableHead>Activo</TableHead>
                            <TableHead className="w-[80px] text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    {initialData.length === 0 ? 'Sin EPPs registrados. Agregá el primero.' : 'Sin coincidencias.'}
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="text-xs text-muted-foreground">{row.codigo || '—'}</TableCell>
                                <TableCell className="font-medium">{row.epp_nombre}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{row.tipo === 'EE' ? 'Equipo emergencia' : 'EPP'}</Badge>
                                </TableCell>
                                <TableCell>{row.dias_renovacion ? `${row.dias_renovacion} días` : '—'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{row.nivel_riesgo || '—'}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={!!row.is_active}
                                        onCheckedChange={(v) => handleToggle(row, v)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {(creating || editing) && (
                <CatalogoEppDialog
                    open={true}
                    onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}
                    initial={editing ? {
                        epp_nombre: editing.epp_nombre || '',
                        tipo: (editing.tipo as 'EPP' | 'EE') || 'EPP',
                        dias_renovacion: editing.dias_renovacion || 180,
                        nivel_riesgo: editing.nivel_riesgo || '',
                    } : undefined}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    )
}
