'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FileDown, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ReportePersonalDialog } from './reporte-personal-dialog'

type Reporte = {
    id: string; fecha_reporte: string | null; id_documento_interno: string | null
    total_horas: number | null; gasto_total: number | null; pdf_url: string | null; tipo_personal: string | null
    jornada1_inicio: string | null
    tarea: { codigo: string; titulo: string } | null
    personal: { first_name: string; last_name: string } | null
    tercero_personal: { nombres: string; apellidos: string; cargo: string | null } | null
}

function esBorrador(r: Reporte): boolean {
    if (r.pdf_url) return false
    const tienePersona = r.personal != null || r.tercero_personal != null
    return !tienePersona || r.jornada1_inicio == null
}

export function ReportesPersonalSection({ reportes }: { reportes: Reporte[] }) {
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
                    <h1 className="text-xl font-bold">Reportes de Personal</h1>
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
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Documento</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Personal</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarea</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Horas</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gasto Total</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportes.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No hay reportes.</td></tr>
                        )}
                        {reportes.map(r => {
                            const nombre = r.tipo_personal === 'EXTERNO' && r.tercero_personal
                                ? `${r.tercero_personal.nombres} ${r.tercero_personal.apellidos}`
                                : r.personal ? `${r.personal.first_name} ${r.personal.last_name}` : '—'
                            return (
                                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs">{r.fecha_reporte}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.id_documento_interno || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{nombre}</div>
                                        {r.tipo_personal === 'EXTERNO' && r.tercero_personal?.cargo && (
                                            <div className="text-xs text-muted-foreground">{r.tercero_personal.cargo}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {r.tarea ? <div><Badge variant="outline" className="font-mono text-xs">{r.tarea.codigo}</Badge><div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{r.tarea.titulo}</div></div> : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">{r.total_horas ? `${r.total_horas}h` : '—'}</td>
                                    <td className="px-4 py-3 text-right">{r.gasto_total ? `S/ ${Number(r.gasto_total).toFixed(2)}` : '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            {esBorrador(r) && (
                                                <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">Borrador</Badge>
                                            )}
                                            {r.pdf_url && (
                                                <Link href={`/api/reportes-personal/${r.id}/pdf`} target="_blank"
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
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ReportePersonalDialog open={dialogOpen} onOpenChange={setDialogOpen} reporteId={editId} onSuccess={onSuccess} />
        </>
    )
}
