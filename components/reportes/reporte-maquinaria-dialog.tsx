'use client'

import * as React from 'react'
import { Loader2, X, Building2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReporteMaquinariaForm } from './reporte-maquinaria-form'
import { getMaquinarias } from '@/lib/actions/maquinarias'
import { getProfiles } from '@/lib/actions/users'
import { getConfigInformeMaquinaria } from '@/lib/actions/informes-config'
import { getReporteMaquinariaById } from '@/lib/actions/reportes'
import { SeleccionarTareaDialog } from '@/components/shared/seleccionar-tarea-dialog'
import type { TareaConRecursos } from '@/lib/actions/tareas'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    reporteId?: string
    onSuccess: () => void
}

export function ReporteMaquinariaDialog({ open, onOpenChange, reporteId, onSuccess }: Props) {
    const [loading, setLoading] = React.useState(false)
    const [maquinariaList, setMaquinariaList] = React.useState<any[]>([])
    const [personalList, setPersonalList] = React.useState<any[]>([])
    const [config, setConfig] = React.useState<any>(null)
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
                const [maq, perfiles, cfg] = await Promise.all([
                    getMaquinarias(),
                    getProfiles(),
                    getConfigInformeMaquinaria(),
                ])
                setMaquinariaList(maq.map((m: any) => ({ id: m.id, nombre: m.nombre, codigo_interno: m.codigo_interno })))
                setPersonalList(perfiles.map((p: any) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name })))
                setConfig(cfg)

                if (reporteId) {
                    const r = await getReporteMaquinariaById(reporteId)
                    if (r) {
                        setResolvedTareaId(r.tarea_id ?? '')
                        setInitialData({
                            maquinaria_id: r.maquinaria_id ?? '',
                            operador_id: r.operador_id ?? '',
                            rigger1_id: r.rigger1_id ?? '',
                            rigger2_id: r.rigger2_id ?? '',
                            fecha_reporte: r.fecha_reporte ?? '',
                            tipo_uso: r.tipo_uso ?? 'OPERACION',
                            horas_alquiler: r.horas_alquiler != null ? String(r.horas_alquiler) : '',
                            jornada1_inicio: r.jornada1_inicio ? r.jornada1_inicio.substring(11, 16) : '',
                            jornada1_fin: r.jornada1_fin ? r.jornada1_fin.substring(11, 16) : '',
                            jornada2_inicio: r.jornada2_inicio ? r.jornada2_inicio.substring(11, 16) : '',
                            jornada2_fin: r.jornada2_fin ? r.jornada2_fin.substring(11, 16) : '',
                            jornada3_inicio: r.jornada3_inicio ? r.jornada3_inicio.substring(11, 16) : '',
                            jornada3_fin: r.jornada3_fin ? r.jornada3_fin.substring(11, 16) : '',
                            total_horas: r.total_horas != null ? String(r.total_horas) : '0',
                            horas_recorrido: r.horas_recorrido != null ? String(r.horas_recorrido) : '0',
                            tipo_recorrido: r.tipo_recorrido ?? 'NO_APLICA',
                            tonelaje_solicitado: r.tonelaje_solicitado != null ? String(r.tonelaje_solicitado) : '',
                            salida_autorizada_por: r.salida_autorizada_por ?? '',
                            nombre_cliente_firmante: r.nombre_cliente_firmante ?? '',
                            cargo_cliente_firmante: r.cargo_cliente_firmante ?? '',
                            trabajo_realizado: r.trabajo_realizado ?? '',
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

    const handleSuccess = async (id: string) => {
        onOpenChange(false)
        onSuccess()
        if (id) {
            fetch(`/api/reportes-maquinaria/${id}/pdf`).catch(() => {/* fire-and-forget */})
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{reporteId ? 'Editar reporte de maquinaria' : 'Nuevo reporte de maquinaria'}</DialogTitle>
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
                        <ReporteMaquinariaForm
                            tareaId={resolvedTareaId}
                            maquinariaList={maquinariaList}
                            personalList={personalList}
                            config={config}
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
                title="Seleccionar tarea — R. Maquinaria"
            />
        </>
    )
}
