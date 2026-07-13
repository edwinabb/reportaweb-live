'use client'

import * as React from 'react'
import { Building2, Calendar, MapPin, Users, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { searchTareasConFiltros, type TareaConRecursos } from '@/lib/actions/tareas'
import { getTercerosForSelect } from '@/lib/actions/terceros'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (tarea: TareaConRecursos) => void
    title?: string
}

export function SeleccionarTareaDialog({ open, onOpenChange, onSelect, title = 'Seleccionar tarea' }: Props) {
    const [clientes, setClientes] = React.useState<{ value: string; label: string }[]>([])
    const [clienteId, setClienteId] = React.useState('')
    const [fecha, setFecha] = React.useState('')
    const [tareas, setTareas] = React.useState<TareaConRecursos[]>([])
    const [loading, setLoading] = React.useState(false)

    const fetchTareas = React.useCallback(async (cId: string, f: string) => {
        setLoading(true)
        const result = await searchTareasConFiltros(cId || null, f || null)
        setTareas(result)
        setLoading(false)
    }, [])

    React.useEffect(() => {
        if (!open) return
        getTercerosForSelect().then(data =>
            setClientes(data.map(c => ({ value: c.id, label: c.razon_social })))
        )
        fetchTareas('', '')
    }, [open, fetchTareas])

    const handleClienteChange = (val: string) => {
        setClienteId(val)
        fetchTareas(val, fecha)
    }

    const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFecha(e.target.value)
        fetchTareas(clienteId, e.target.value)
    }

    const handleSelect = (tarea: TareaConRecursos) => {
        onSelect(tarea)
        onOpenChange(false)
    }

    const reset = () => { setClienteId(''); setFecha(''); setTareas([]) }

    const fmt = (s: string | null) =>
        s ? new Date(s + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : null

    return (
        <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset() }}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="flex gap-3 pt-1">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs">Cliente</Label>
                        <SearchableSelect
                            options={clientes}
                            value={clienteId}
                            onChange={handleClienteChange}
                            placeholder="Todos los clientes"
                            searchPlaceholder="Buscar cliente…"
                            emptyText="Sin resultados"
                        />
                    </div>
                    <div className="w-44 space-y-1">
                        <Label className="text-xs">Fecha</Label>
                        <Input type="date" value={fecha} onChange={handleFechaChange} className="h-9" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md mt-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando tareas…
                        </div>
                    ) : tareas.length === 0 ? (
                        <p className="text-center py-12 text-muted-foreground text-sm">
                            No hay tareas con esos filtros.
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {tareas.map(t => {
                                const personal = t.recursos
                                    .filter(r => r.tipo_recurso === 'PERSONAL' && r.personal)
                                    .map(r => `${r.personal!.first_name ?? ''} ${r.personal!.last_name ?? ''}`.trim())
                                const maquinas = t.recursos
                                    .filter(r => r.tipo_recurso === 'MAQUINARIA' && r.maquinaria)
                                    .map(r => r.maquinaria!.codigo_interno ?? r.maquinaria!.nombre ?? '')
                                const recursos = [...personal, ...maquinas]
                                return (
                                    <li key={t.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(t)}
                                            className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                                                    {t.codigo}
                                                </span>
                                                <span className="text-sm font-medium truncate">{t.titulo}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                                                {t.cliente?.razon_social && (
                                                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{t.cliente.razon_social}</span>
                                                )}
                                                {t.sitio?.nombre && (
                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.sitio.nombre}</span>
                                                )}
                                                {(t.fecha_inicio || t.fecha_fin) && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {fmt(t.fecha_inicio)}{t.fecha_fin && ` → ${fmt(t.fecha_fin)}`}
                                                    </span>
                                                )}
                                                {recursos.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />{recursos.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
