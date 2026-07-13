'use client'

import * as React from 'react'
import { Loader2, X, Building2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReporteCombustibleForm } from './reporte-combustible-form'
import { getMaquinarias } from '@/lib/actions/maquinarias'
import { getReporteCombustibleById } from '@/lib/actions/reportes'
import { SeleccionarTareaDialog } from '@/components/shared/seleccionar-tarea-dialog'
import type { TareaConRecursos } from '@/lib/actions/tareas'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    reporteId?: string
    onSuccess: () => void
}

export function ReporteCombustibleDialog({ open, onOpenChange, reporteId, onSuccess }: Props) {
    const [loading, setLoading] = React.useState(false)
    const [maquinariaList, setMaquinariaList] = React.useState<any[]>([])
    const [initialData, setInitialData] = React.useState<any>(undefined)
    const [resolvedTareaId, setResolvedTareaId] = React.useState('')
    const [tarea, setTarea] = React.useState<TareaConRecursos | null>(null)
    const [selectTareaOpen, setSelectTareaOpen] = React.useState(false)

    React.useEffect(() => {
        if (!open) return
        setLoading(true)
        setResolvedTareaId('')
        setTarea(null)
        ;(async () => {
            try {
                const maq = await getMaquinarias()
                setMaquinariaList(maq.map((m: any) => ({ id: m.id, nombre: m.nombre, codigo_interno: m.codigo_interno })))
                if (reporteId) {
                    const r = await getReporteCombustibleById(reporteId)
                    if (r) {
                        setResolvedTareaId(r.tarea_id ?? '')
                        setInitialData({
                            fecha_reporte: r.fecha_reporte ?? '',
                            maquinaria_id: r.maquinaria_id ?? '',
                            tipo_combustible: r.tipo_combustible ?? '',
                            galones: r.galones != null ? String(r.galones) : '',
                            precio_unitario: r.precio_unitario != null ? String(r.precio_unitario) : '',
                            proveedor_grifo: r.proveedor_grifo ?? '',
                            horometro_actual: r.horometro_actual != null ? String(r.horometro_actual) : '',
                            kilometraje_actual: r.kilometraje_actual != null ? String(r.kilometraje_actual) : '',
                            foto_tablero_url: r.foto_tablero_url ?? '',
                            foto_surtidor_url: r.foto_surtidor_url ?? '',
                            foto_voucher_url: r.foto_voucher_url ?? '',
                        })
                    }
                } else {
                    setInitialData(undefined)
                }
            } finally {
                setLoading(false)
            }
        })()
    }, [open, reporteId])

    const handleTareaSelect = (t: TareaConRecursos) => {
        setTarea(t)
        setResolvedTareaId(t.id)
    }

    const handleSuccess = () => { onOpenChange(false); onSuccess() }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{reporteId ? 'Editar reporte de combustible' : 'Nuevo reporte de combustible'}</DialogTitle>
                    </DialogHeader>

                    {!reporteId && (
                        <div className="space-y-1.5 pb-1">
                            <p className="text-sm font-medium">Tarea</p>
                            {tarea ? (
                                <div className="border border-orange-200 bg-orange-50 rounded-md px-3 py-2.5 text-sm space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-mono text-xs font-semibold text-orange-700 bg-white border border-orange-200 rounded px-1.5 py-0.5 shrink-0">{tarea.codigo}</span>
                                            <span className="font-medium truncate">{tarea.titulo}</span>
                                        </div>
                                        <button type="button" onClick={() => { setTarea(null); setResolvedTareaId('') }}
                                            className="text-muted-foreground hover:text-foreground shrink-0">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {tarea.cliente?.razon_social && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />{tarea.cliente.razon_social}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground"
                                    onClick={() => setSelectTareaOpen(true)}>
                                    Buscar y seleccionar tarea…
                                </Button>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
                        </div>
                    ) : resolvedTareaId ? (
                        <ReporteCombustibleForm
                            tareaId={resolvedTareaId}
                            maquinariaList={maquinariaList}
                            reporteId={reporteId}
                            initialData={initialData}
                            onSuccess={handleSuccess}
                            onCancel={() => onOpenChange(false)}
                        />
                    ) : reporteId ? (
                        <p className="py-8 text-center text-muted-foreground text-sm">No se pudo cargar la tarea.</p>
                    ) : (
                        <p className="py-4 text-center text-muted-foreground text-sm">Seleccioná una tarea para continuar.</p>
                    )}
                </DialogContent>
            </Dialog>

            <SeleccionarTareaDialog
                open={selectTareaOpen}
                onOpenChange={setSelectTareaOpen}
                onSelect={handleTareaSelect}
                title="Seleccionar tarea — R. Gastos"
            />
        </>
    )
}
