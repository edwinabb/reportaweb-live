"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, getDay } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DialogFooter } from "@/components/ui/dialog"
import { createReportePersonal, updateReportePersonal, uploadReportePhoto } from "@/lib/actions/reportes"
import { PhotoUploadField } from "@/components/ui/photo-upload-field"
import { getFestivosForTenant, type Festivo } from "@/lib/actions/festivos"
import { calcularHoras, detectarSolapamientos, type Jornada } from "@/lib/utils/calcular-horas"
import type { ConfigInformePersonal } from "@/lib/actions/informes-config"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const schema = z.object({
    personal_id: z.string().optional(),
    tercero_personal_id: z.string().optional(),
    fecha_reporte: z.string().min(1, "Fecha requerida"),

    jornada1_inicio: z.string().optional(),
    jornada1_fin: z.string().optional(),
    jornada2_inicio: z.string().optional(),
    jornada2_fin: z.string().optional(),
    jornada3_inicio: z.string().optional(),
    jornada3_fin: z.string().optional(),

    total_horas: z.string().refine((v) => !isNaN(Number(v)), "Debe ser número"),
    horas_extras: z.string().optional(),
    horas_extras_extraordinarias: z.string().optional(),
    horas_dominicales: z.string().optional(),

    tiene_descanso_compensatorio: z.boolean().optional(),
    fecha_descanso_compensatorio: z.string().optional(),

    gasto_desayuno: z.string().optional(),
    gasto_almuerzo: z.string().optional(),
    gasto_cena: z.string().optional(),
    gasto_movilidad: z.string().optional(),

    trabajo_realizado: z.string().optional(),
})

type PersonalOption = { id: string; first_name?: string | null; last_name?: string | null }
type TerceroPersonalOption = {
    id: string
    nombres: string
    apellidos?: string | null
    cargo?: string | null
    tercero?: { id: string; razon_social: string } | null
}

interface Props {
    tareaId: string
    personalList: PersonalOption[]
    terceroPersonalList: TerceroPersonalOption[]
    config: ConfigInformePersonal | null
    reporteId?: string
    initialData?: Partial<FormValues> & { foto_trabajo_url?: string | null }
    onSuccess: (id: string) => void
    onCancel: () => void
}

type FormValues = z.infer<typeof schema>

export function ReportePersonalForm({ tareaId, personalList, terceroPersonalList, config, reporteId, initialData, onSuccess, onCancel }: Props) {
    const [submitting, setSubmitting] = useState(false)
    const [fotoTrabajo, setFotoTrabajo] = useState<string | null>(initialData?.foto_trabajo_url ?? null)
    const [tipoPersonal, setTipoPersonal] = useState<'INTERNO' | 'EXTERNO'>(
        ((initialData as any)?.tipo_personal as 'INTERNO' | 'EXTERNO') ?? 'INTERNO'
    )
    const [jornadasSolapadas, setJornadasSolapadas] = useState(false)
    const [festivos, setFestivos] = useState<Festivo[]>([])
    const [festivosMap, setFestivosMap] = useState<Map<string, string>>(new Map())
    const [calendarOpen, setCalendarOpen] = useState(false)

    const flags = useMemo(() => ({
        turnos: Math.max(1, Math.min(3, config?.cantidad_turnos ?? 2)) as 1 | 2 | 3,
        extras: config?.incluye_horas_extras ?? false,
        extrasExtraord: config?.incluye_horas_extras_extraord ?? false,
        dominicales: config?.incluye_horas_dominicales ?? false,
        gastos: config?.incluye_gastos ?? true,
        firmaCliente: false,
    }), [config])

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: (initialData as FormValues | undefined) ?? {
            personal_id: "",
            tercero_personal_id: "",
            fecha_reporte: new Date().toISOString().split('T')[0],
            jornada1_inicio: "08:00",
            jornada1_fin: "17:00",
            jornada2_inicio: "",
            jornada2_fin: "",
            jornada3_inicio: "",
            jornada3_fin: "",
            total_horas: "8",
            horas_extras: "0",
            horas_extras_extraordinarias: "0",
            horas_dominicales: "0",
            tiene_descanso_compensatorio: false,
            fecha_descanso_compensatorio: "",
            gasto_desayuno: "0",
            gasto_almuerzo: "0",
            gasto_cena: "0",
            gasto_movilidad: "0",
            trabajo_realizado: ""
        }
    })

    // Cargar festivos al montar el componente
    useEffect(() => {
        getFestivosForTenant().then((data) => {
            setFestivos(data)
            setFestivosMap(new Map(data.map((f) => [f.fecha, f.descripcion ?? ''])))
        })
    }, [])

    // Watch de campos para recalculo reactivo
    const j1i = form.watch('jornada1_inicio')
    const j1f = form.watch('jornada1_fin')
    const j2i = form.watch('jornada2_inicio')
    const j2f = form.watch('jornada2_fin')
    const j3i = form.watch('jornada3_inicio')
    const j3f = form.watch('jornada3_fin')
    const fechaReporte = form.watch('fecha_reporte')
    const tieneDescanso = form.watch('tiene_descanso_compensatorio')

    // Detecta si la fecha seleccionada es domingo o festivo
    const esDomingoOFestivo = useMemo(() => {
        if (!fechaReporte) return false
        // Usar T12:00:00 para evitar off-by-one por timezone
        const d = new Date(fechaReporte + 'T12:00:00')
        if (getDay(d) === 0) return true
        return festivosMap.has(fechaReporte)
    }, [fechaReporte, festivosMap])

    const festivoLabel = useMemo(() => {
        if (!fechaReporte) return null
        const d = new Date(fechaReporte + 'T12:00:00')
        if (getDay(d) === 0) return 'Domingo'
        return festivosMap.get(fechaReporte) ?? null
    }, [fechaReporte, festivosMap])

    // Auto-calcula horas cuando cambian jornadas, fecha o descanso
    useEffect(() => {
        const jornadas: Jornada[] = []
        if (j1i && j1f) jornadas.push({ inicio: j1i, fin: j1f })
        if (flags.turnos >= 2 && j2i && j2f) jornadas.push({ inicio: j2i, fin: j2f })
        if (flags.turnos >= 3 && j3i && j3f) jornadas.push({ inicio: j3i, fin: j3f })
        if (jornadas.length === 0) return

        const solapan = detectarSolapamientos(jornadas)
        setJornadasSolapadas(solapan)
        if (solapan) return

        const resultado = calcularHoras(jornadas, esDomingoOFestivo, !!tieneDescanso)
        form.setValue('total_horas', String(resultado.total_raw), { shouldDirty: false })
        if (flags.extras) form.setValue('horas_extras', String(resultado.horas_extras), { shouldDirty: false })
        if (flags.extrasExtraord) form.setValue('horas_extras_extraordinarias', String(resultado.horas_extras_extraordinarias), { shouldDirty: false })
        if (flags.dominicales) form.setValue('horas_dominicales', String(resultado.horas_dominicales), { shouldDirty: false })
    }, [j1i, j1f, j2i, j2f, j3i, j3f, esDomingoOFestivo, tieneDescanso, flags])

    // Modifiers para el Calendar: festivos en ámbar, domingos también
    const festivosDates = useMemo(() =>
        festivos.map((f) => new Date(f.fecha + 'T12:00:00'))
    , [festivos])

    const onSubmit = async (data: FormValues) => {
        if (jornadasSolapadas) {
            toast.error("Las jornadas se solapan — corregí los horarios antes de guardar")
            return
        }
        if (tipoPersonal === 'INTERNO' && !data.personal_id) {
            toast.error("Seleccione un integrante de personal")
            return
        }
        if (tipoPersonal === 'EXTERNO' && !data.tercero_personal_id) {
            toast.error("Seleccione personal del proveedor")
            return
        }

        setSubmitting(true)
        try {
            const getDateTime = (t?: string) => t ? `${data.fecha_reporte}T${t}:00` : null
            const num = (v?: string) => v === '' || v == null ? 0 : Number(v)

            const payload: Record<string, unknown> = {
                tarea_id: tareaId,
                tipo_personal: tipoPersonal,
                fecha_reporte: data.fecha_reporte,
                jornada1_inicio: getDateTime(data.jornada1_inicio),
                jornada1_fin: getDateTime(data.jornada1_fin),
                total_horas: Number(data.total_horas),
                trabajo_realizado: data.trabajo_realizado,
                es_domingo_o_festivo: esDomingoOFestivo,
            }

            if (tipoPersonal === 'INTERNO') {
                payload.personal_id = data.personal_id
            } else {
                // El personal externo ahora es un profile (DUDA-TER-006):
                // se guarda en personal_id; tercero_personal_id queda para filas legacy
                payload.personal_id = data.tercero_personal_id
            }

            if (flags.turnos >= 2) {
                payload.jornada2_inicio = getDateTime(data.jornada2_inicio)
                payload.jornada2_fin = getDateTime(data.jornada2_fin)
            }
            if (flags.turnos >= 3) {
                payload.jornada3_inicio = getDateTime(data.jornada3_inicio)
                payload.jornada3_fin = getDateTime(data.jornada3_fin)
            }
            if (flags.extras) payload.horas_extras = num(data.horas_extras)
            if (flags.extrasExtraord) payload.horas_extras_extraordinarias = num(data.horas_extras_extraordinarias)
            if (flags.dominicales) payload.horas_dominicales = num(data.horas_dominicales)

            if (esDomingoOFestivo) {
                payload.tiene_descanso_compensatorio = !!data.tiene_descanso_compensatorio
                if (data.tiene_descanso_compensatorio && data.fecha_descanso_compensatorio) {
                    payload.fecha_descanso_compensatorio = data.fecha_descanso_compensatorio
                }
            }

            if (flags.gastos) {
                const gDesayuno = num(data.gasto_desayuno)
                const gAlmuerzo = num(data.gasto_almuerzo)
                const gCena = num(data.gasto_cena)
                const gMovilidad = num(data.gasto_movilidad)
                payload.gasto_desayuno = gDesayuno
                payload.gasto_almuerzo = gAlmuerzo
                payload.gasto_cena = gCena
                payload.gasto_movilidad = gMovilidad
                payload.gasto_total = gDesayuno + gAlmuerzo + gCena + gMovilidad
            }
            const payloadWithPhoto = { ...payload, foto_trabajo_url: fotoTrabajo ?? null }
            const res = reporteId
                ? await updateReportePersonal(reporteId, { ...payloadWithPhoto, tarea_id: undefined })
                : await createReportePersonal(payloadWithPhoto)
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
                No se encontró la configuración de reporte de personal. Definila en{' '}
                <a href="/settings/informes" className="underline">Configuración › Informes</a>.
            </div>
        )
    }

    const selectedDate = fechaReporte ? new Date(fechaReporte + 'T12:00:00') : undefined

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="text-xs text-muted-foreground">
                Formato {config.codigo_formato} {config.version_formato} ({config.fecha_formato})
            </div>

            {/* Tipo de personal */}
            <div className="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={tipoPersonal === 'INTERNO' ? 'default' : 'outline'}
                    onClick={() => setTipoPersonal('INTERNO')}
                    className={tipoPersonal === 'INTERNO' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                    Interno
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={tipoPersonal === 'EXTERNO' ? 'default' : 'outline'}
                    onClick={() => setTipoPersonal('EXTERNO')}
                    className={tipoPersonal === 'EXTERNO' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                    Externo (Proveedor)
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{tipoPersonal === 'INTERNO' ? 'Personal' : 'Personal del Proveedor'}</Label>
                    {tipoPersonal === 'INTERNO' ? (
                        personalList.length === 0 ? (
                            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                Esta tarea no tiene personal asignado. Actualizá el plan para agregar recursos.
                            </div>
                        ) : (
                            <SearchableSelect
                                options={personalList.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name || ''}`.trim() }))}
                                value={form.watch('personal_id') || ''}
                                onChange={(val) => form.setValue('personal_id', val)}
                                placeholder="Seleccionar..."
                                searchPlaceholder="Buscar personal..."
                            />
                        )
                    ) : (
                        <SearchableSelect
                            options={terceroPersonalList.map(tp => ({ value: tp.id, label: `${tp.nombres} ${tp.apellidos || ''}${tp.tercero?.razon_social ? ` — ${tp.tercero.razon_social}` : ''}`.trim() }))}
                            value={form.watch('tercero_personal_id') || ''}
                            onChange={(val) => form.setValue('tercero_personal_id', val)}
                            placeholder="Seleccionar proveedor..."
                            searchPlaceholder="Buscar personal..."
                        />
                    )}
                </div>

                {/* Fecha con festivos */}
                <div className="space-y-2">
                    <Label>Fecha Reporte</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !fechaReporte && "text-muted-foreground",
                                    esDomingoOFestivo && "border-amber-400 bg-amber-50 text-amber-800"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate
                                    ? format(selectedDate, "PPP", { locale: es })
                                    : "Seleccionar fecha"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    if (date) {
                                        form.setValue('fecha_reporte', format(date, 'yyyy-MM-dd'))
                                    }
                                    setCalendarOpen(false)
                                }}
                                locale={es}
                                modifiers={{ festivo: festivosDates }}
                                modifiersClassNames={{ festivo: "bg-amber-100 text-amber-800 font-semibold rounded-md" }}
                                initialFocus
                            />
                            {festivosDates.length > 0 && (
                                <div className="px-3 pb-2 text-[10px] text-amber-700 flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                                    Días festivos
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    {/* Banner si es festivo o domingo */}
                    {esDomingoOFestivo && festivoLabel && (
                        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span><strong>{festivoLabel}</strong> — día especial. Se aplican recargos dominicales.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Descanso compensatorio (solo si la fecha es domingo/festivo) */}
            {esDomingoOFestivo && (
                <div className="border border-amber-200 rounded-md p-3 bg-amber-50/50 space-y-3">
                    <div className="flex items-center gap-3">
                        <Checkbox
                            id="tiene_descanso_compensatorio"
                            checked={!!tieneDescanso}
                            onCheckedChange={(checked) => form.setValue('tiene_descanso_compensatorio', !!checked)}
                        />
                        <Label htmlFor="tiene_descanso_compensatorio" className="text-sm cursor-pointer">
                            Tiene descanso compensatorio
                        </Label>
                    </div>
                    {tieneDescanso && (
                        <div className="space-y-1">
                            <Label className="text-xs">Fecha de descanso compensatorio</Label>
                            <Input
                                type="date"
                                {...form.register('fecha_descanso_compensatorio')}
                                className="max-w-xs"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Jornadas + horas calculadas */}
            <div className="border rounded p-3 bg-gray-50 space-y-3">
                <Label className="font-semibold text-gray-600">
                    Jornadas ({flags.turnos})
                </Label>
                <div className={`grid gap-4 ${flags.turnos === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
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

                {/* Horas calculadas — readonly */}
                <div className="grid grid-cols-4 gap-2">
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
                    {flags.extras && (
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">H. extras (25%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                readOnly
                                tabIndex={-1}
                                className="bg-gray-100 cursor-default text-gray-700"
                                {...form.register('horas_extras')}
                            />
                        </div>
                    )}
                    {flags.extrasExtraord && (
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">H. ext. (35%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                readOnly
                                tabIndex={-1}
                                className="bg-gray-100 cursor-default text-gray-700"
                                {...form.register('horas_extras_extraordinarias')}
                            />
                        </div>
                    )}
                    {flags.dominicales && (
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">H. dominicales</Label>
                            <Input
                                type="number"
                                step="0.01"
                                readOnly
                                tabIndex={-1}
                                className="bg-gray-100 cursor-default text-gray-700"
                                {...form.register('horas_dominicales')}
                            />
                        </div>
                    )}
                </div>
                {jornadasSolapadas && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Las jornadas se solapan — revisá los horarios. Las horas no se pueden calcular correctamente.
                    </div>
                )}
                {!jornadasSolapadas && <p className="text-[10px] text-gray-400">Las horas se calculan automáticamente a partir de las jornadas.</p>}
            </div>

            {flags.gastos && (
                <div className="border rounded p-3 bg-gray-50 space-y-3">
                    <Label className="font-semibold text-gray-600">Reembolso de Gastos (S/.)</Label>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Desayuno</Label>
                            <Input type="number" step="0.10" {...form.register('gasto_desayuno')} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Almuerzo</Label>
                            <Input type="number" step="0.10" {...form.register('gasto_almuerzo')} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Cena</Label>
                            <Input type="number" step="0.10" {...form.register('gasto_cena')} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Movilidad</Label>
                            <Input type="number" step="0.10" {...form.register('gasto_movilidad')} />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label>Trabajo Realizado / Observaciones</Label>
                <Textarea {...form.register('trabajo_realizado')} placeholder="Descripción..." />
            </div>

            <PhotoUploadField
                label="Foto del trabajo realizado"
                value={fotoTrabajo}
                onChange={setFotoTrabajo}
                uploadFn={async (base64, filename) => {
                    const res = await uploadReportePhoto({ base64, filename, bucket: 'informes-personal', folder: 'fotos-trabajo' })
                    return res.success ? { success: true as const, url: res.url } : { success: false as const, error: (res as any).error }
                }}
                disabled={submitting}
            />

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Reporte
                </Button>
            </DialogFooter>
        </form>
    )
}
