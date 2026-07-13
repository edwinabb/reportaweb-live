'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogFooter } from '@/components/ui/dialog'
import { PhotoUploadField } from '@/components/ui/photo-upload-field'
import { createReporteCombustible, updateReporteCombustible, uploadReportePhoto } from '@/lib/actions/reportes'

const TIPOS = ['DIESEL', 'GASOLINA_90', 'GASOLINA_84', 'GAS']

const schema = z.object({
    fecha_reporte: z.string().min(1, 'Fecha requerida'),
    maquinaria_id: z.string().min(1, 'Equipo requerido'),
    tipo_combustible: z.string().min(1, 'Tipo requerido'),
    galones: z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Galones requeridos'),
    precio_unitario: z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Precio requerido'),
    proveedor_grifo: z.string().optional(),
    horometro_actual: z.string().optional(),
    kilometraje_actual: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
type MaquinariaOption = { id: string; nombre?: string | null; codigo_interno?: string | null }

interface Props {
    tareaId: string
    maquinariaList: MaquinariaOption[]
    reporteId?: string
    initialData?: Partial<FormValues & { foto_tablero_url?: string; foto_surtidor_url?: string; foto_voucher_url?: string }>
    onSuccess: (id: string) => void
    onCancel: () => void
}

export function ReporteCombustibleForm({ tareaId, maquinariaList, reporteId, initialData, onSuccess, onCancel }: Props) {
    const [submitting, setSubmitting] = useState(false)
    const [fotoTablero, setFotoTablero] = useState<string | null>(initialData?.foto_tablero_url ?? null)
    const [fotoSurtidor, setFotoSurtidor] = useState<string | null>(initialData?.foto_surtidor_url ?? null)
    const [fotoVoucher, setFotoVoucher] = useState<string | null>(initialData?.foto_voucher_url ?? null)

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: initialData ?? { fecha_reporte: new Date().toISOString().split('T')[0] },
    })

    const galones = parseFloat(watch('galones') ?? '0') || 0
    const precio = parseFloat(watch('precio_unitario') ?? '0') || 0
    const subtotal = galones * precio
    const igv = subtotal * 0.18
    const total = subtotal + igv

    const maqOptions = maquinariaList.map(m => ({
        value: m.id,
        label: [m.codigo_interno, m.nombre].filter(Boolean).join(' — '),
    }))

    const makeUploadFn = (setter: (url: string | null) => void, campo: string) =>
        async (base64: string, filename: string) => {
            const tenantFolder = `combustible/${campo}`
            const res = await uploadReportePhoto({ base64, filename, bucket: 'reportes-combustible', folder: tenantFolder })
            if (res.success) setter(res.url)
            return res.success ? { success: true as const, url: res.url } : { success: false as const, error: (res as any).error }
        }

    const onSubmit = async (values: FormValues) => {
        setSubmitting(true)
        const payload = {
            tarea_id: tareaId,
            fecha_reporte: values.fecha_reporte,
            maquinaria_id: values.maquinaria_id,
            tipo_combustible: values.tipo_combustible,
            galones: parseFloat(values.galones),
            precio_unitario: parseFloat(values.precio_unitario),
            monto_subtotal: parseFloat(subtotal.toFixed(2)),
            monto_igv: parseFloat(igv.toFixed(2)),
            monto_total: parseFloat(total.toFixed(2)),
            proveedor_grifo: values.proveedor_grifo || null,
            horometro_actual: values.horometro_actual ? parseFloat(values.horometro_actual) : null,
            kilometraje_actual: values.kilometraje_actual ? parseFloat(values.kilometraje_actual) : null,
            foto_tablero_url: fotoTablero,
            foto_surtidor_url: fotoSurtidor,
            foto_voucher_url: fotoVoucher,
        }
        const result = reporteId
            ? await updateReporteCombustible(reporteId, payload)
            : await createReporteCombustible(payload)
        setSubmitting(false)
        if (result.success) {
            toast.success(result.message)
            onSuccess(result.id ?? reporteId ?? '')
        } else {
            toast.error(result.message)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="fecha_reporte">Fecha *</Label>
                    <Input id="fecha_reporte" type="date" {...register('fecha_reporte')} />
                    {errors.fecha_reporte && <p className="text-xs text-destructive">{errors.fecha_reporte.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label>Equipo *</Label>
                    <SearchableSelect options={maqOptions} value={watch('maquinaria_id') ?? ''}
                        onChange={v => setValue('maquinaria_id', v)} placeholder="Seleccionar equipo…"
                        searchPlaceholder="Buscar…" emptyText="Sin resultados" />
                    {errors.maquinaria_id && <p className="text-xs text-destructive">{errors.maquinaria_id.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label>Tipo combustible *</Label>
                    <Select value={watch('tipo_combustible') ?? ''} onValueChange={v => setValue('tipo_combustible', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                        <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                    {errors.tipo_combustible && <p className="text-xs text-destructive">{errors.tipo_combustible.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="galones">Galones *</Label>
                    <Input id="galones" type="number" step="0.01" min="0" {...register('galones')} />
                    {errors.galones && <p className="text-xs text-destructive">{errors.galones.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="precio_unitario">Precio unitario *</Label>
                    <Input id="precio_unitario" type="number" step="0.01" min="0" {...register('precio_unitario')} />
                    {errors.precio_unitario && <p className="text-xs text-destructive">{errors.precio_unitario.message}</p>}
                </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground text-xs">Subtotal</span><p className="font-medium">S/ {subtotal.toFixed(2)}</p></div>
                <div><span className="text-muted-foreground text-xs">IGV (18%)</span><p className="font-medium">S/ {igv.toFixed(2)}</p></div>
                <div><span className="text-muted-foreground text-xs">Total</span><p className="font-semibold text-base">S/ {total.toFixed(2)}</p></div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="proveedor_grifo">Proveedor / Grifo</Label>
                <Input id="proveedor_grifo" {...register('proveedor_grifo')} placeholder="Nombre del grifo" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="horometro_actual">Horómetro actual</Label>
                    <Input id="horometro_actual" type="number" step="0.1" min="0" {...register('horometro_actual')} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="kilometraje_actual">Kilometraje actual</Label>
                    <Input id="kilometraje_actual" type="number" step="1" min="0" {...register('kilometraje_actual')} />
                </div>
            </div>

            {/* Fotos */}
            <div className="space-y-1.5">
                <Label className="text-sm font-medium">Fotos de evidencia</Label>
                <div className="grid grid-cols-3 gap-3">
                    <PhotoUploadField
                        label="Tablero / Horómetro"
                        value={fotoTablero}
                        onChange={setFotoTablero}
                        uploadFn={makeUploadFn(setFotoTablero, 'tablero')}
                        disabled={submitting}
                    />
                    <PhotoUploadField
                        label="Surtidor"
                        value={fotoSurtidor}
                        onChange={setFotoSurtidor}
                        uploadFn={makeUploadFn(setFotoSurtidor, 'surtidor')}
                        disabled={submitting}
                    />
                    <PhotoUploadField
                        label="Voucher / Factura"
                        value={fotoVoucher}
                        onChange={setFotoVoucher}
                        uploadFn={makeUploadFn(setFotoVoucher, 'voucher')}
                        disabled={submitting}
                    />
                </div>
            </div>

            <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? 'Guardando…' : reporteId ? 'Guardar cambios' : 'Crear reporte'}
                </Button>
            </DialogFooter>
        </form>
    )
}
