'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createInspeccion } from '@/lib/actions/inspecciones'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Save, AlertTriangle, CheckCircle2, Gauge } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import SignatureCanvas from 'react-signature-canvas'
import { ConfigChecklist } from '@/lib/actions/informes-config'

// --- SCHEMA ---
const formSchema = z.object({
    maquinaria_id: z.string().min(1, 'Seleccione una maquinaria'),
    horometro_actual: z.coerce.number().optional(),
    kilometraje_actual: z.coerce.number().optional(),
    nivel_tanque_gasolina: z.coerce.number().min(0).max(100).optional(),
    observaciones: z.string().optional(),
    respuestas: z.record(z.string(), z.object({
        estado: z.enum(['SI', 'NO', 'NO_APLICA']),
        observacion: z.string().optional(),
    }))
})

type FormData = z.infer<typeof formSchema>

interface Section {
    category: string
    items: string[]
}

interface Props {
    maquinarias: any[]
    plantillaId: string
    templateStructure: Section[]
    tareaId?: string
    configChecklist?: ConfigChecklist | null
}

export function DynamicInspectionForm({ maquinarias, plantillaId, templateStructure, tareaId, configChecklist }: Props) {
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [noObsErrors, setNoObsErrors] = useState<string[]>([])
    const sigCanvasRef = useRef<any>(null)
    const router = useRouter()

    const mostrarMedidores = configChecklist?.mostrar_medidores ?? true
    const mostrarObservaciones = configChecklist?.mostrar_observaciones ?? false
    const textoDeclaracion = configChecklist?.texto_declaracion ?? null

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: { respuestas: {} }
    })

    const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = form
    const respuestas = watch('respuestas')

    // Puntaje en tiempo real
    const calcularPuntaje = () => {
        const vals = Object.values(respuestas || {})
        if (vals.length === 0) return null
        const totalItems = templateStructure.reduce((acc, s) => acc + s.items.length, 0)
        const countSi = vals.filter(v => v?.estado === 'SI').length
        const countNa = vals.filter(v => v?.estado === 'NO_APLICA').length
        const denom = totalItems - countNa
        return denom > 0 ? Math.round((countSi / denom) * 100) : null
    }

    const validateStep1 = async () => {
        const fields: (keyof FormData)[] = ['maquinaria_id']
        if (mostrarMedidores) {
            fields.push('horometro_actual', 'kilometraje_actual', 'nivel_tanque_gasolina')
        }
        const isValid = await trigger(fields)
        if (isValid) setStep(2)
    }

    const validateStep2 = () => {
        // Validar que todos los NO tengan observación
        const errores: string[] = []
        for (const section of templateStructure) {
            for (const item of section.items) {
                const key = `${section.category}::${item}`
                const resp = respuestas?.[key]
                if (resp?.estado === 'NO' && !resp?.observacion?.trim()) {
                    errores.push(key)
                }
            }
        }
        if (errores.length > 0) {
            setNoObsErrors(errores)
            toast.error(`${errores.length} ítem(s) marcados como NO requieren observación`)
            return
        }
        setNoObsErrors([])
        setStep(3)
    }

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            let firmaUrl = ''
            if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
                firmaUrl = sigCanvasRef.current.toDataURL()
            }

            const detalles = []
            for (const section of templateStructure) {
                for (const item of section.items) {
                    const key = `${section.category}::${item}`
                    const resp = data.respuestas[key]
                    if (resp) {
                        detalles.push({
                            categoria: section.category,
                            item: item,
                            estado: resp.estado,
                            orden: 1,
                            comentario: resp.observacion,
                        })
                    }
                }
            }

            const res = await createInspeccion({
                maquinaria_id: data.maquinaria_id,
                horometro_actual: mostrarMedidores ? data.horometro_actual : undefined,
                kilometraje_actual: mostrarMedidores ? data.kilometraje_actual : undefined,
                nivel_tanque_gasolina: mostrarMedidores ? data.nivel_tanque_gasolina : undefined,
                observaciones: data.observaciones,
                plantilla_id: plantillaId,
                firma_supervisor_url: firmaUrl,
                tarea_id: tareaId,
            } as any, detalles)

            if (res.success) {
                toast.success('Checklist guardado correctamente')
                router.push('/formatos')
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    const puntaje = calcularPuntaje()

    const renderActionButtons = () => (
        <div className="flex justify-between mt-8">
            {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
            )}
            {step === 1 && (
                <Button type="button" onClick={validateStep1} className="ml-auto bg-orange-600 hover:bg-orange-700">
                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
            {step === 2 && (
                <Button type="button" onClick={validateStep2} className="ml-auto bg-orange-600 hover:bg-orange-700">
                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
            {step === 3 && (
                <Button type="submit" disabled={isSubmitting} className="ml-auto bg-green-600 hover:bg-green-700">
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Guardando...' : 'Finalizar y Guardar'}
                </Button>
            )}
        </div>
    )

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
            {/* Steps Visualizer */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-2">
                    {[1, 2, 3].map((n, i) => (
                        <>
                            <span key={n} className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</span>
                            {i < 2 && <div key={`line-${n}`} className={`h-1 w-12 ${step > n ? 'bg-orange-600' : 'bg-gray-200'}`} />}
                        </>
                    ))}
                </div>
            </div>

            {/* STEP 1: CABECERA */}
            {step === 1 && (
                <div className="grid gap-6 bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-orange-600">01.</span> Información General
                    </h3>

                    <div className="space-y-2">
                        <Label>Maquinaria / Vehículo</Label>
                        <Select onValueChange={(val) => setValue('maquinaria_id', val)} defaultValue={watch('maquinaria_id')}>
                            <SelectTrigger className={errors.maquinaria_id ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Seleccione la unidad" />
                            </SelectTrigger>
                            <SelectContent>
                                {maquinarias.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.nombre} - {m.placa || m.codigo_interno}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.maquinaria_id && <span className="text-xs text-red-500">{errors.maquinaria_id.message}</span>}
                    </div>

                    {mostrarMedidores && (
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Horómetro</Label>
                                <Input type="number" step="0.1" placeholder="0.0" {...register('horometro_actual')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Kilometraje (km)</Label>
                                <Input type="number" step="1" placeholder="0" {...register('kilometraje_actual')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Nivel Tanque</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="range" min="0" max="100" className="flex-1" {...register('nivel_tanque_gasolina')} />
                                    <span className="w-12 text-right font-mono text-sm">{watch('nivel_tanque_gasolina') ?? 0}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: CHECKLIST */}
            {step === 2 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 px-1">
                        <span className="text-orange-600">02.</span> Checklist
                    </h3>

                    <Accordion type="single" collapsible className="w-full space-y-2" defaultValue="item-0">
                        {templateStructure.map((section, idx) => (
                            <AccordionItem key={idx} value={`item-${idx}`} className="bg-white border rounded-lg px-4">
                                <AccordionTrigger className="hover:no-underline py-3">
                                    <span className="font-semibold text-left">{section.category}</span>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4 space-y-4">
                                    {section.items.map((item) => {
                                        const key = `respuestas.${section.category}::${item}`
                                        const rawKey = `${section.category}::${item}`
                                        const currentVal = watch((key + '.estado') as any) as string
                                        const hasError = noObsErrors.includes(rawKey)

                                        return (
                                            <div key={item} className={`p-3 rounded-md ${hasError ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <span className="font-medium text-sm w-full md:w-1/2">{item}</span>

                                                    <RadioGroup
                                                        onValueChange={(val) => {
                                                            setValue(key + '.estado' as any, val)
                                                            if (val !== 'NO') {
                                                                setNoObsErrors(prev => prev.filter(k => k !== rawKey))
                                                            }
                                                        }}
                                                        defaultValue={watch(key + '.estado' as any)}
                                                        className="flex gap-2"
                                                    >
                                                        <div className={`flex items-center space-x-1.5 border px-3 py-1.5 rounded-md cursor-pointer transition-colors ${currentVal === 'SI' ? 'bg-green-100 border-green-500' : 'hover:bg-green-50'}`}>
                                                            <RadioGroupItem value="SI" id={`${key}-si`} className="text-green-600" />
                                                            <Label htmlFor={`${key}-si`} className="cursor-pointer text-sm font-medium">SI</Label>
                                                        </div>
                                                        <div className={`flex items-center space-x-1.5 border px-3 py-1.5 rounded-md cursor-pointer transition-colors ${currentVal === 'NO' ? 'bg-red-100 border-red-500' : 'hover:bg-red-50'}`}>
                                                            <RadioGroupItem value="NO" id={`${key}-no`} className="text-red-600" />
                                                            <Label htmlFor={`${key}-no`} className="cursor-pointer text-sm font-medium">NO</Label>
                                                        </div>
                                                        <div className={`flex items-center space-x-1.5 border px-3 py-1.5 rounded-md cursor-pointer transition-colors ${currentVal === 'NO_APLICA' ? 'bg-gray-200 border-gray-400' : 'hover:bg-gray-100'}`}>
                                                            <RadioGroupItem value="NO_APLICA" id={`${key}-na`} />
                                                            <Label htmlFor={`${key}-na`} className="cursor-pointer text-xs">N/A</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </div>

                                                {currentVal === 'NO' && (
                                                    <div className="mt-3 pl-4 border-l-2 border-red-400 animate-in slide-in-from-top-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-red-700 font-medium">Observación *</Label>
                                                            <Input
                                                                placeholder="Describa el hallazgo..."
                                                                className={`bg-white text-sm ${hasError ? 'border-red-500' : ''}`}
                                                                {...register(key + '.observacion' as any)}
                                                                onChange={(e) => {
                                                                    setValue(key + '.observacion' as any, e.target.value)
                                                                    if (e.target.value.trim()) {
                                                                        setNoObsErrors(prev => prev.filter(k => k !== rawKey))
                                                                    }
                                                                }}
                                                            />
                                                            {hasError && <span className="text-xs text-red-600">La observación es requerida al marcar NO</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    {/* Puntaje parcial */}
                    {puntaje !== null && (
                        <div className="flex items-center gap-3 bg-white border rounded-lg px-4 py-3">
                            <span className="text-sm text-muted-foreground">Puntaje parcial:</span>
                            <span className={`text-lg font-bold ${puntaje >= 80 ? 'text-green-600' : puntaje >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {puntaje}%
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: OBSERVACIONES + FIRMA */}
            {step === 3 && (
                <div className="space-y-6">
                    {/* Resumen */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <span className="text-orange-600">03.</span> Conformidad
                        </h3>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {(['SI', 'NO', 'NO_APLICA'] as const).map(estado => {
                                const count = Object.values(respuestas || {}).filter(v => v?.estado === estado).length
                                const labels = { SI: 'Conformes', NO: 'No conformes', NO_APLICA: 'No aplica' }
                                const colors = { SI: 'text-green-600 bg-green-50 border-green-200', NO: 'text-red-600 bg-red-50 border-red-200', NO_APLICA: 'text-gray-500 bg-gray-50 border-gray-200' }
                                return (
                                    <div key={estado} className={`border rounded-lg p-3 text-center ${colors[estado]}`}>
                                        <div className="text-2xl font-bold">{count}</div>
                                        <div className="text-xs">{labels[estado]}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {puntaje !== null && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border mb-4">
                                <span className="text-sm font-medium">Puntaje final</span>
                                <span className={`text-2xl font-bold ${puntaje >= 80 ? 'text-green-600' : puntaje >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {puntaje}%
                                </span>
                            </div>
                        )}

                        {/* Hallazgos NO */}
                        {Object.entries(respuestas || {}).some(([, v]) => v?.estado === 'NO') && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                                <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2 text-sm">
                                    <AlertTriangle className="h-4 w-4" /> Hallazgos — se crearán planes de acción automáticamente
                                </h4>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                    {Object.entries(respuestas)
                                        .filter(([, v]) => v?.estado === 'NO')
                                        .map(([key, val]) => (
                                            <li key={key}>
                                                <span className="font-medium">{key.split('::')[1]}</span>
                                                {val.observacion ? `: ${val.observacion}` : ''}
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}

                        {Object.values(respuestas || {}).every(v => v?.estado !== 'NO') && (
                            <p className="text-sm text-green-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> Sin hallazgos. Todo conforme.
                            </p>
                        )}
                    </div>

                    {/* Observaciones generales */}
                    {mostrarObservaciones && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-2">
                            <Label className="font-medium">Observaciones generales</Label>
                            <Textarea
                                placeholder="Ingrese observaciones adicionales..."
                                rows={3}
                                {...register('observaciones')}
                            />
                        </div>
                    )}

                    {/* Firma */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-3">
                        <Label className="font-medium">Firma del inspector</Label>
                        <div className="border border-gray-300 rounded-md bg-white">
                            <SignatureCanvas
                                ref={sigCanvasRef}
                                canvasProps={{ className: 'w-full h-[160px] rounded-md' }}
                                backgroundColor="#ffffff"
                            />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => sigCanvasRef.current?.clear()} className="text-xs text-muted-foreground">
                            Limpiar firma
                        </Button>
                    </div>

                    {/* Declaración */}
                    {textoDeclaracion && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-blue-800 italic">{textoDeclaracion}</p>
                        </div>
                    )}
                </div>
            )}

            {renderActionButtons()}
        </form>
    )
}
