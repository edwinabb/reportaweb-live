'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Search, X, MapPin, Calendar, Building2 } from 'lucide-react'

import { startInforme, searchTareasPorCodigo, type TareaResumen } from '@/lib/actions/formatos-informes'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

type Plantilla = {
    formato_id: string
    version_id: string
    codigo: string
    nombre: string
    etiqueta_version: string | null
}

type Props = {
    plantillas: Plantilla[]
    defaultFormatoId?: string
    defaultTareaId?: string
}

export function NuevoInformeForm({ plantillas, defaultFormatoId, defaultTareaId }: Props) {
    const router = useRouter()
    const [formatoId, setFormatoId] = React.useState(defaultFormatoId ?? '')
    const [submitting, setSubmitting] = React.useState(false)

    // Tarea search
    const [tareaQuery, setTareaQuery] = React.useState('')
    const [tareaResults, setTareaResults] = React.useState<TareaResumen[]>([])
    const [tareaSeleccionada, setTareaSeleccionada] = React.useState<TareaResumen | null>(null)
    const [searching, setSearching] = React.useState(false)
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

    const handleTareaSearch = (q: string) => {
        setTareaQuery(q)
        setTareaSeleccionada(null)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!q.trim()) { setTareaResults([]); return }
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            const res = await searchTareasPorCodigo(q)
            setTareaResults(res)
            setSearching(false)
        }, 350)
    }

    const seleccionarTarea = (t: TareaResumen) => {
        setTareaSeleccionada(t)
        setTareaQuery(t.codigo ?? t.titulo)
        setTareaResults([])
    }

    const limpiarTarea = () => {
        setTareaSeleccionada(null)
        setTareaQuery('')
        setTareaResults([])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formatoId) {
            toast.error('Seleccioná una plantilla')
            return
        }
        setSubmitting(true)
        const res = await startInforme({
            formato_id: formatoId,
            tarea_id: tareaSeleccionada?.id ?? null,
        })
        setSubmitting(false)
        if (res.success) {
            router.push(`/informes/${res.id}`)
        } else {
            toast.error(res.error)
        }
    }

    const formatFecha = (s: string | null) =>
        s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : null

    return (
        <Card className="p-6 max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Plantilla */}
                <div className="space-y-2">
                    <Label htmlFor="formato">Plantilla</Label>
                    {plantillas.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md">
                            No hay plantillas publicadas. Andá a <a href="/formatos" className="underline">Formatos → Plantillas</a> y publicá una versión.
                        </div>
                    ) : (
                        <Select value={formatoId} onValueChange={setFormatoId}>
                            <SelectTrigger id="formato">
                                <SelectValue placeholder="Seleccioná una plantilla…" />
                            </SelectTrigger>
                            <SelectContent>
                                {plantillas.map(p => (
                                    <SelectItem key={p.formato_id} value={p.formato_id}>
                                        <span className="font-mono text-xs mr-2">{p.codigo}</span>
                                        {p.nombre}
                                        {p.etiqueta_version && (
                                            <span className="text-muted-foreground ml-2 text-xs">· {p.etiqueta_version}</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Tarea search */}
                <div className="space-y-2">
                    <Label htmlFor="tarea">Tarea (opcional)</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="tarea"
                            value={tareaQuery}
                            onChange={e => handleTareaSearch(e.target.value)}
                            placeholder="Buscar por código de tarea…"
                            className="pl-9 pr-9"
                            autoComplete="off"
                        />
                        {(tareaQuery || tareaSeleccionada) && (
                            <button
                                type="button"
                                onClick={limpiarTarea}
                                title="Limpiar tarea"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Resultados */}
                    {(searching || tareaResults.length > 0) && !tareaSeleccionada && (
                        <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                            {searching ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
                                </div>
                            ) : tareaResults.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                            ) : (
                                <ul>
                                    {tareaResults.map(t => (
                                        <li key={t.id}>
                                            <button
                                                type="button"
                                                onClick={() => seleccionarTarea(t)}
                                                className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors border-b last:border-0"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                                                        {t.codigo}
                                                    </span>
                                                    <span className="text-sm truncate">{t.titulo}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    {t.cliente?.razon_social && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" />
                                                            {t.cliente.razon_social}
                                                        </span>
                                                    )}
                                                    {t.sitio?.nombre && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {t.sitio.nombre}
                                                        </span>
                                                    )}
                                                    {(t.fecha_inicio || t.fecha_fin) && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatFecha(t.fecha_inicio)}
                                                            {t.fecha_fin && ` → ${formatFecha(t.fecha_fin)}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Tarea seleccionada */}
                    {tareaSeleccionada && (
                        <div className="border border-orange-200 bg-orange-50 rounded-md px-3 py-2.5 text-sm space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-orange-700 bg-white border border-orange-200 rounded px-1.5 py-0.5">
                                    {tareaSeleccionada.codigo}
                                </span>
                                <span className="font-medium">{tareaSeleccionada.titulo}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {tareaSeleccionada.cliente?.razon_social && (
                                    <span className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {tareaSeleccionada.cliente.razon_social}
                                    </span>
                                )}
                                {tareaSeleccionada.sitio?.nombre && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {tareaSeleccionada.sitio.nombre}
                                    </span>
                                )}
                                {(tareaSeleccionada.fecha_inicio || tareaSeleccionada.fecha_fin) && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatFecha(tareaSeleccionada.fecha_inicio)}
                                        {tareaSeleccionada.fecha_fin && ` → ${formatFecha(tareaSeleccionada.fecha_fin)}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        Al vincular una tarea se autocompletan cliente, sitio y cotización. También podés crear el informe desde el detalle de tarea → tab "Informes".
                    </p>
                </div>

                <div className="pt-1">
                    <Button
                        type="submit"
                        disabled={submitting || !formatoId}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {submitting ? 'Creando…' : 'Crear informe y llenar'}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
