"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm, type DefaultValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DialogFooter } from "@/components/ui/dialog"
import { PhotoUploadField } from "@/components/ui/photo-upload-field"
import { createReporteMaquinaria, updateReporteMaquinaria, uploadReportePhoto } from "@/lib/actions/reportes"
import type { ConfigInformeMaquinaria } from "@/lib/actions/informes-config"
import { duracionJornada, detectarSolapamientos, type Jornada } from "@/lib/utils/calcular-horas"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"

const schema = z.object({
    maquinaria_id: z.string().min(1, "Seleccione máquina"),
    operador_id: z.string().min(1, "Seleccione operador"),
    rigger1_id: z.string().optional(),
    rigger2_id: z.string().optional(),
    fecha_reporte: z.string().min(1, "Fecha requerida"),

    tipo_uso: z.string().optional(),
    horas_alquiler: z.string().optional(),

    jornada1_inicio: z.string().optional(),
    jornada1_fin: z.string().optional(),
    jornada2_inicio: z.string().optional(),
    jornada2_fin: z.string().optional(),
    jornada3_inicio: z.string().optional(),
    jornada3_fin: z.string().optional(),

    total_horas: z.string().refine((v) => !isNaN(Number(v)), "Debe ser número"),
    horas_recorrido: z.string().optional(),
    tipo_recorrido: z.string().optional(),
    tonelaje_solicitado: z.string().optional(),

    salida_autorizada_por: z.string().optional(),

    nombre_cliente_firmante: z.string().optional(),
    cargo_cliente_firmante: z.string().optional(),

    trabajo_realizado: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type MaquinariaOption = { id: string; nombre?: string | null; codigo?: string | null; codigo_interno?: string | null; serie?: string | null; placa?: string | null }
type PersonalOption = { id: string; first_name?: string | null; last_name?: string | null }

type MaquinariaInsert = {
    tarea_id: string
    maquinaria_id: string
    operador_id: string
    fecha_reporte: string
    tipo_uso?: string
    horas_alquiler?: number | null
    total_horas: number
    trabajo_realizado?: string
    jornada1_inicio: string | null
    jornada1_fin: string | null
    jornada2_inicio?: string | null
    jornada2_fin?: string | null
    jornada3_inicio?: string | null
    jornada3_fin?: string | null
    rigger1_id?: string | null
    rigger2_id?: string | null
    tipo_recorrido?: string | null
    horas_recorrido?: number | null
    tonelaje_solicitado?: number | null
    salida_autorizada_por?: string | null
    nombre_cliente_firmante?: string | null
    cargo_cliente_firmante?: string | null
}

interface Props {
    tareaId: string
    maquinariaList: MaquinariaOption[]
    personalList: PersonalOption[]
    config: ConfigInformeMaquinaria | null
    reporteId?: string
    initialData?: DefaultValues<FormValues> & { foto_actividad_url?: string | null; foto_reporte_escrito_url?: string | null }
    onSuccess: (id: string) => void
    onCancel: () => void
}

export function ReporteMaquinariaForm({ tareaId, maquinariaList, personalList, config, reporteId, initialData, onSuccess, onCancel }: Props) {
    const [submitting, setSubmitting] = useState(false)
    const [jornadasSolapadas, setJornadasSolapadas] = useState(false)
    const [fotoActividad, setFotoActividad] = useState<string | null>(initialData?.foto_actividad_url ?? null)
    const [fotoReporte, setFotoReporte] = useState<string | null>(initialData?.foto_reporte_escrito_url ?? null)

    const makeUploadFn = (campo: string) =>
        async (base64: string, filename: string) => {
            const res = await uploadReportePhoto({ base64, filename, bucket: 'reporte-maquinaria', folder: `fotos/${campo}` })
            return res.success ? { success: true as const, url: res.url } : { success: false as const, error: (res as any).error }
        }

    const flags = useMemo(() => ({

        turnos: Math.max(1, Math.min(3, config?.cantidad_turnos ?? 1)) as 1 | 2 | 3,
        riggers: Math.max(0, Math.min(2, config?.cantidad_riggers ?? 0)) as 0 | 1 | 2,
        tonelaje: config?.incluye_tonelaje_placa ?? false,
        recorrido: config?.incluye_tipo_recorrido ?? false,
        salida: config?.incluye_salida_autorizada ?? false,
        firmaCliente: config?.incluye_firma_cliente ?? false,
    }), [config])

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: initialData ?? {
            maquinaria_id: "",
            operador_id: "",
            rigger1_id: "",
            rigger2_id: "",
            tipo_uso: "OPERACION",
            horas_alquiler: "",
            fecha_reporte: new Date().toISOString().split('T')[0],
            jornada1_inicio: "08:00",
            jornada1_fin: "17:00",
            jornada2_inicio: "",
            jornada2_fin: "",
            jornada3_inicio: "",
            jornada3_fin: "",
            total_horas: "8",
            horas_recorrido: "0",
            tipo_recorrido: "NO_APLICA",
            tonelaje_solicitado: "",
            salida_autorizada_por: "",
            nombre_cliente_firmante: "",
            cargo_cliente_firmante: "",
            trabajo_realizado: ""
        }
    })

    // Auto-calcula total_horas = suma jornadas + horas_recorrido
    const j1i = form.watch('jornada1_inicio')
    const j1f = form.watch('jornada1_fin')
    const j2i = form.watch('jornada2_inicio')
    const j2f = form.watch('jornada2_fin')
    const j3i = form.watch('jornada3_inicio')
    const j3f = form.watch('jornada3_fin')
    const horasRecorrido = form.watch('horas_recorrido')
    const tipoRecorrido = form.watch('tipo_recorrido')

    useEffect(() => {
        const jornadas: Jornada[] = []
        if (j1i && j1f) jornadas.push({ inicio: j1i, fin: j1f })
        if (flags.turnos >= 2 && j2i && j2f) jornadas.push({ inicio: j2i, fin: j2f })
        if (flags.turnos >= 3 && j3i && j3f) jornadas.push({ inicio: j3i, fin: j3f })

        const solapan = jornadas.length > 1 && detectarSolapamientos(jornadas)
        setJornadasSolapadas(solapan)
        if (solapan) return

        const totalJornadas = jornadas.reduce((s, j) => s + duracionJornada(j), 0)
        const recorrido = flags.recorrido && tipoRecorrido !== 'NO_APLICA'
            ? Math.max(0, Number(horasRecorrido) || 0)
            : 0
        form.setValue('total_horas', String(Math.round((totalJornadas + recorrido) * 100) / 100), { shouldDirty: false })
    }, [j1i, j1f, j2i, j2f, j3i, j3f, horasRecorrido, tipoRecorrido, flags])

    const onSubmit = async (data: FormValues) => {
        if (jornadasSolapadas) {
            toast.error("Las jornadas se solapan — corregí los horarios antes de guardar")
            return
        }
        setSubmitting(true)
        try {
            const getDateTime = (t?: string) => t ? `${data.fecha_reporte}T${t}:00` : null
            const numOpt = (v?: string) => v === '' || v == null ? null : Number(v)

            const tipoUso = data.tipo_uso || 'OPERACION'
            const payload: MaquinariaInsert = {
                tarea_id: tareaId,
                maquinaria_id: data.maquinaria_id,
                operador_id: data.operador_id,
                fecha_reporte: data.fecha_reporte,
                tipo_uso: tipoUso,
                jornada1_inicio: getDateTime(data.jornada1_inicio),
                jornada1_fin: getDateTime(data.jornada1_fin),
                total_horas: Number(data.total_horas),
                trabajo_realizado: data.trabajo_realizado,
            }
            if (tipoUso === 'ALQUILER' && data.horas_alquiler) {
                payload.horas_alquiler = numOpt(data.horas_alquiler)
            }

            if (flags.turnos >= 2) {
                payload.jornada2_inicio = getDateTime(data.jornada2_inicio)
                payload.jornada2_fin = getDateTime(data.jornada2_fin)
            }
            if (flags.turnos >= 3) {
                payload.jornada3_inicio = getDateTime(data.jornada3_inicio)
                payload.jornada3_fin = getDateTime(data.jornada3_fin)
            }
            if (flags.riggers >= 1 && data.rigger1_id) payload.rigger1_id = data.rigger1_id
            if (flags.riggers >= 2 && data.rigger2_id) payload.rigger2_id = data.rigger2_id
            if (flags.recorrido) {
                payload.tipo_recorrido = data.tipo_recorrido ?? null
                payload.horas_recorrido = numOpt(data.horas_recorrido)
            }
            if (flags.tonelaje) payload.tonelaje_solicitado = numOpt(data.tonelaje_solicitado)
            if (flags.salida) payload.salida_autorizada_por = data.salida_autorizada_por || null
            if (flags.firmaCliente) {
                payload.nombre_cliente_firmante = data.nombre_cliente_firmante || null
                payload.cargo_cliente_firmante = data.cargo_cliente_firmante || null
            }

            // Attach photos
            const payloadWithPhotos = {
                ...payload,
                foto_actividad_url: fotoActividad ?? null,
                foto_reporte_escrito_url: fotoReporte ?? null,
            }
            const res = reporteId
                ? await updateReporteMaquinaria(reporteId, { ...payloadWithPhotos, tarea_id: undefined })
                : await createReporteMaquinaria(payloadWithPhotos)
            if (res.success) {
                toast.success(res.message)
                onSuccess(res.id ?? reporteId ?? '')
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar")
        } finally {
            setSubmitting(false)
        }
    }

    if (!config) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                No se encontró la configuración de reporte de maquinaria. Definila en{' '}
                <a href="/settings/informes" className="underline">Configuración › Informes</a>.
            </div>
        )
    }

    const maquinariaLabel = (m: MaquinariaOption) => [m.nombre, m.codigo_interno || m.codigo || m.serie].filter(Boolean).join(' - ')
    const personalLabel = (p: PersonalOption) => `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    const tipoUsoWatch = form.watch('tipo_uso')

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="text-xs text-muted-foreground">
                Formato {config.codigo_formato} {config.version_formato} ({config.fecha_formato})
            </div>

            {/* Tipo de uso */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tipo de uso</Label>
                    <Select
                        defaultValue="OPERACION"
                        onValueChange={(val) => form.setValue('tipo_uso', val)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OPERACION">Operación propia</SelectItem>
                            <SelectItem value="ALQUILER">Alquiler / Subcontrato</SelectItem>
                            <SelectItem value="ESPERA">Espera / Standby</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {tipoUsoWatch === 'ALQUILER' && (
                    <div className="space-y-2">
                        <Label>Horas de alquiler facturables</Label>
                        <Input type="number" step="0.5" placeholder="Mín. facturable" {...form.register('horas_alquiler')} />
                        <p className="text-xs text-muted-foreground">Puede diferir de las horas operadas si hay mínimo de facturación.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Maquinaria</Label>
                    <SearchableSelect
                        options={maquinariaList.map(m => ({ value: m.id, label: maquinariaLabel(m) }))}
                        value={form.watch('maquinaria_id') || ''}
                        onChange={(val) => form.setValue('maquinaria_id', val)}
                        placeholder="Seleccionar..."
                        searchPlaceholder="Buscar maquinaria..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Operador</Label>
                    <SearchableSelect
                        options={personalList.map(p => ({ value: p.id, label: personalLabel(p) }))}
                        value={form.watch('operador_id') || ''}
                        onChange={(val) => form.setValue('operador_id', val)}
                        placeholder="Seleccionar..."
                        searchPlaceholder="Buscar personal..."
                    />
                </div>
            </div>

            {flags.riggers > 0 && (
                <div className={`grid gap-4 ${flags.riggers === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="space-y-2">
                        <Label>Rigger 1</Label>
                        <SearchableSelect
                            options={personalList.map(p => ({ value: p.id, label: personalLabel(p) }))}
                            value={form.watch('rigger1_id') || ''}
                            onChange={(val) => form.setValue('rigger1_id', val)}
                            placeholder="Seleccionar..."
                            searchPlaceholder="Buscar personal..."
                        />
                    </div>
                    {flags.riggers === 2 && (
                        <div className="space-y-2">
                            <Label>Rigger 2</Label>
                            <SearchableSelect
                                options={personalList.map(p => ({ value: p.id, label: personalLabel(p) }))}
                                value={form.watch('rigger2_id') || ''}
                                onChange={(val) => form.setValue('rigger2_id', val)}
                                placeholder="Seleccionar..."
                                searchPlaceholder="Buscar personal..."
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Fecha Reporte</Label>
                    <Input type="date" {...form.register('fecha_reporte')} />
                </div>
                {flags.tonelaje && (
                    <div className="space-y-2">
                        <Label>Tonelaje solicitado (t)</Label>
                        <Input type="number" step="0.1" {...form.register('tonelaje_solicitado')} />
                    </div>
                )}
            </div>

            <div className="border rounded p-3 bg-gray-50 space-y-3">
                <Label className="font-semibold text-gray-600">Jornadas ({flags.turnos})</Label>
                <div className={`grid gap-4 ${flags.turnos === 3 ? 'grid-cols-3' : flags.turnos === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="space-y-1">
                        <Label className="text-xs">Jornada 1</Label>
                        <div className="flex gap-2">
                            <Input type="time" {...form.register('jornada1_inicio')} />
                            <Input type="time" {...form.register('jornada1_fin')} />
                        </div>
                    </div>
                    {flags.turnos >= 2 && (
                        <div className="space-y-1">
                            <Label className="text-xs">Jornada 2</Label>
                            <div className="flex gap-2">
                                <Input type="time" {...form.register('jornada2_inicio')} />
                                <Input type="time" {...form.register('jornada2_fin')} />
                            </div>
                        </div>
                    )}
                    {flags.turnos >= 3 && (
                        <div className="space-y-1">
                            <Label className="text-xs">Jornada 3</Label>
                            <div className="flex gap-2">
                                <Input type="time" {...form.register('jornada3_inicio')} />
                                <Input type="time" {...form.register('jornada3_fin')} />
                            </div>
                        </div>
                    )}
                </div>

                {jornadasSolapadas && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Las jornadas se solapan — revisá los horarios. Las horas no se pueden calcular correctamente.
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Total horas</Label>
                        <Input
                            type="number"
                            step="0.01"
                            readOnly
                            tabIndex={-1}
                            className="bg-gray-100 cursor-default text-gray-700 font-medium"
                            {...form.register('total_horas')}
                        />
                    </div>
                    {flags.recorrido && (
                        <>
                            <div className="space-y-1">
                                <Label className="text-xs">Tipo recorrido</Label>
                                <Select onValueChange={(val) => form.setValue('tipo_recorrido', val)} defaultValue="NO_APLICA">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NO_APLICA">No aplica</SelectItem>
                                        <SelectItem value="SOLO_IDA">Solo ida</SelectItem>
                                        <SelectItem value="IDA_VUELTA">Ida y vuelta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Horas recorrido</Label>
                                <Input type="number" step="0.5" {...form.register('horas_recorrido')} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {flags.salida && (
                <div className="space-y-2">
                    <Label>Salida autorizada por</Label>
                    <Input {...form.register('salida_autorizada_por')} placeholder="Nombre del supervisor" />
                </div>
            )}

            {flags.firmaCliente && (
                <div className="border rounded p-3 bg-gray-50 space-y-3">
                    <Label className="font-semibold text-gray-600">Firma del cliente</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Nombre</Label>
                            <Input {...form.register('nombre_cliente_firmante')} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Cargo</Label>
                            <Input {...form.register('cargo_cliente_firmante')} />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">La firma en canvas se captura en la app móvil.</p>
                </div>
            )}

            <div className="space-y-2">
                <Label>Trabajo Realizado</Label>
                <Textarea {...form.register('trabajo_realizado')} placeholder="Descripción..." />
            </div>

            {/* Fotos de evidencia */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">Fotos de evidencia</Label>
                <div className="grid grid-cols-2 gap-3">
                    <PhotoUploadField
                        label="Foto de actividad"
                        value={fotoActividad}
                        onChange={setFotoActividad}
                        uploadFn={makeUploadFn('actividad')}
                        disabled={submitting}
                    />
                    <PhotoUploadField
                        label="Foto reporte escrito"
                        value={fotoReporte}
                        onChange={setFotoReporte}
                        uploadFn={makeUploadFn('reporte-escrito')}
                        disabled={submitting}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
                <Button type="submit" disabled={submitting || jornadasSolapadas}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Parte
                </Button>
            </DialogFooter>
        </form>
    )
}
