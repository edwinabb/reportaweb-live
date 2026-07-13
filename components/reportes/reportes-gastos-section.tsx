'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ReporteCombustibleDialog } from './reporte-combustible-dialog'

type Reporte = {
    id: string; fecha_reporte: string | null; galones: number | null
    tipo_combustible: string | null; monto_total: number | null; pdf_url: string | null
    tarea: { codigo: string; titulo: string } | null
    maquinaria: { nombre: string; codigo_interno: string } | null
}

export function ReportesGastosSection({ reportes }: { reportes: Reporte[] }) {
    const router = useRouter()
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [editId, setEditId] = React.useState<string>()

    const openNuevo = () => { setEditId(undefined); setDialogOpen(true) }
    const openEdit = (id: string) => { setEditId(id); setDialogOpen(true) }
    const onSuccess = () => router.refresh()

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Reportes de Gastos</h1>
                    <p className="text-sm text-muted-foreground">{reportes.length} registros</p>
                </div>
                <Button onClick={openNuevo} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo reporte
                </Button>
            </div>

            <div className="rounded-lg border bg-background overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Equipo</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Combustible</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarea</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Galones</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportes.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No hay reportes.</td></tr>
                        )}
                        {reportes.map(r => (
                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs">{r.fecha_reporte}</td>
                                <td className="px-4 py-3">
                                    {r.maquinaria ? <div><div className="font-medium">{r.maquinaria.nombre}</div><div className="text-xs text-muted-foreground">{r.maquinaria.codigo_interno}</div></div> : '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {r.tipo_combustible ? <Badge variant="secondary" className="text-xs">{r.tipo_combustible}</Badge> : '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {r.tarea ? <div><Badge variant="outline" className="font-mono text-xs">{r.tarea.codigo}</Badge><div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{r.tarea.titulo}</div></div> : '—'}
                                </td>
                                <td className="px-4 py-3 text-right">{r.galones ? `${r.galones} gal` : '—'}</td>
                                <td className="px-4 py-3 text-right font-medium">{r.monto_total ? `S/ ${Number(r.monto_total).toFixed(2)}` : '—'}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        {r.pdf_url && (
                                            <Link href={`/api/reportes-combustible/${r.id}/pdf`} target="_blank"
                                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                                <FileDown className="h-3.5 w-3.5" />PDF
                                            </Link>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(r.id)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ReporteCombustibleDialog open={dialogOpen} onOpenChange={setDialogOpen} reporteId={editId} onSuccess={onSuccess} />
        </>
    )
}
