'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import SignatureCanvas from 'react-signature-canvas'
import { createInspeccion } from '@/lib/actions/inspecciones'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Save, Camera, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// --- CONSTANTS ---
const CHECKLIST_SECTIONS = [
    {
        category: 'DOCUMENTACIÓN Y SEGURIDAD',
        items: [
            '¿Dispone de dos radios y en buen estado?',
            '¿Dispone de un botiquín equipado y en buen estado?',
            '¿Dispone de una caja de herramientas?',
            '¿Dispone de letreros de izaje?',
            '¿Se dispone de carga de tabla en la cabina?',
            '¿Se dispone de dos extintores instalados y en buenas condiciones?',
            '¿La grúa cuenta con paños absorbentes y/o material contra derrame?',
            '¿Dispone de conos de seguridad?'
        ]
    },
    {
        category: 'CABINA, LUCES Y ACCESO',
        items: [
            '¿El sistema de iluminación está en buenas condiciones?',
            '¿El asiento con su cinturón de seguridad están en buen estado?',
            '¿Funcionan todos los indicadores del tablero de control?',
            '¿El espejo retrovisor está en buen estado?',
            '¿La escalera de acceso a cabina está en condiciones seguras?'
        ]
    },
    {
        category: 'ESTRUCTURA Y SISTEMA DE IZAJE',
        items: [
            '¿Las poleas están en condiciones de operación?',
            '¿La capacidad del gancho está acorde con la capacidad del equipo?',
            '¿La grúa dispone de todos sus contrapesos y se indica la capacidad de cada uno?',
            '¿El gancho se encuentra seguro?',
            '¿El cilindro de levante de la pluma funciona sin ningún problema?',
            '¿Los estabilizadores del equipo funcionan correctamente?',
            '¿El cable del vinche está en buenas condiciones?',
            '¿Está la pluma de la grúa sin ningún daño o señal de golpe?',
            'Si la pluma es telescópica. ¿Se extiende y retrae sin ninguna interferencia?',
            '¿El mecanismo de elevación está operativo?'
        ]
    },
    {
        category: 'MECÁNICA E HIDRÁULICA',
        items: [
            '¿Tiene al menos medio tanque de combustible?',
            '¿El freno de estacionamiento funciona correctamente?',
            '¿El freno de servicio funciona correctamente?',
            '¿El nivel de aceite hidráulico es el adecuado?',
            '¿El nivel de aceite del motor es el adecuado?',
            '¿Las mangueras del circuito hidráulico están en buenas condiciones?',
            '¿Los neumáticos están en buenas condiciones?'
        ]
    }
]

// --- SCHEMA ---
const formSchema = z.object({
    maquinaria_id: z.string().min(1, 'Seleccione una maquinaria'),
    horometro_actual: z.coerce.number().min(0, 'Horómetro inválido'),
    kilometraje_actual: z.coerce.number().min(0, 'Kilometraje inválido'),
    nivel_tanque_gasolina: z.coerce.number().min(0).max(100, 'Max 100%'),
    conductor_id: z.string().optional(), // For now optional or auto-filled
    respuestas: z.record(z.string(), z.object({
        estado: z.enum(['OK', 'FALLA', 'NO_APLICA']),
        comentario: z.string().optional(),
        prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA', 'CRITICA']).optional(),
        // foto handled separately for simplicity in MVP
    }))
})

type FormData = z.infer<typeof formSchema>

interface Props {
    maquinarias: any[] // Replace with specific type
}

export function ChecklistGruasForm({ maquinarias }: Props) {
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const sigCanvasRef = useRef<any>(null)
    const router = useRouter()

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            respuestas: {}
        }
    })

    const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = form
    const respuestas = watch('respuestas')

    // Helper to check if step 1 is valid
    const validateStep1 = async () => {
        const isValid = await trigger(['maquinaria_id', 'horometro_actual', 'kilometraje_actual', 'nivel_tanque_gasolina'])
        if (isValid) setStep(2)
    }

    const validateStep2 = () => {
        // Enforce all items answered? For MVP, maybe not strict "all" but encouraged.
        // Let's enforce at least 5 answers just to be safe, or just Proceed.
        setStep(3)
    }

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            // Get Signature
            let firmaUrl = ''
            if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
                // In real app, upload this base64 to Storage and get URL.
                // For MVP, we might store base64 string directly if small, OR skip upload logic and just save placeholder,
                // BUT user wants signature. Assuming storage logic is separate.
                // I'll simulate or use the dataURL if the backend accepts text (which it does).
                // WARNING: Base64 in DB text field is bad practice but works for MVP demo.
                // The schema `firma_supervisor_url` expects a URL.
                // I will save the dataURL for now.
                firmaUrl = sigCanvasRef.current.toDataURL()
            }

            // Transform Respuestas to Array
            const detalles = []
            for (const section of CHECKLIST_SECTIONS) {
                for (const item of section.items) {
                    const key = `${section.category}::${item}`
                    const resp = data.respuestas[key]
                    if (resp) {
                        detalles.push({
                            categoria: section.category,
                            item: item,
                            estado: resp.estado,
                            orden: 1, // Todo
                            prioridad: resp.estado === 'FALLA' ? (resp.prioridad || 'MEDIA') : undefined,
                            comentario: resp.comentario
                        })
                    }
                }
            }

            const res = await createInspeccion({
                maquinaria_id: data.maquinaria_id,
                horometro_actual: data.horometro_actual,
                kilometraje_actual: data.kilometraje_actual,
                nivel_tanque_gasolina: data.nivel_tanque_gasolina,
                firma_supervisor_url: firmaUrl,
                estado: detalles.some(d => d.estado === 'FALLA') ? 'EN_PROCESO' : 'COMPLETADO' // Simple logic
            }, detalles)

            if (res.success) {
                toast.success('Informe creado correctamente')
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

    // -- RENDER HELPERS --
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto pb-20">

            {/* Steps Indicator */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-2">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>1</span>
                    <div className={`h-1 w-12 ${step >= 2 ? 'bg-orange-600' : 'bg-gray-200'}`} />
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>2</span>
                    <div className={`h-1 w-12 ${step >= 3 ? 'bg-orange-600' : 'bg-gray-200'}`} />
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>3</span>
                </div>
            </div>

            {/* STEP 1: CABECERA */}
            {step === 1 && (
                <div className="grid gap-6 bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-orange-600">01.</span> Información General
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
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

                        <div className="space-y-2">
                            <Label>Horómetro Actual</Label>
                            <Input type="number" step="0.1" {...register('horometro_actual')} />
                            {errors.horometro_actual && <span className="text-xs text-red-500">{errors.horometro_actual.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label>Kilometraje Actual (km)</Label>
                            <Input type="number" step="1" {...register('kilometraje_actual')} />
                            {errors.kilometraje_actual && <span className="text-xs text-red-500">{errors.kilometraje_actual.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label>Nivel Tanque (%)</Label>
                            <div className="flex items-center gap-2">
                                <Input type="range" min="0" max="100" className="flex-1" {...register('nivel_tanque_gasolina')} />
                                <span className="w-12 text-right font-mono">{watch('nivel_tanque_gasolina')}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: CHECKLIST */}
            {step === 2 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 px-1">
                        <span className="text-orange-600">02.</span> Inspección por Puntos
                    </h3>

                    <Accordion type="single" collapsible className="w-full space-y-2" defaultValue="item-0">
                        {CHECKLIST_SECTIONS.map((section, idx) => (
                            <AccordionItem key={idx} value={`item-${idx}`} className="bg-white border rounded-lg px-4">
                                <AccordionTrigger className="hover:no-underline py-3">
                                    <span className="font-semibold">{section.category}</span>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4 space-y-4">
                                    {section.items.map((item) => {
                                        const key = `respuestas.${section.category}::${item}`
                                        const errorKey = `${section.category}::${item}`
                                        const currentVal = watch((key + '.estado') as any) as string

                                        return (
                                            <div key={item} className="p-3 bg-gray-50 rounded-md">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <span className="font-medium text-sm">{item}</span>

                                                    <RadioGroup
                                                        onValueChange={(val) => {
                                                            // @ts-ignore
                                                            setValue(key + '.estado', val)
                                                        }}
                                                        // @ts-ignore
                                                        defaultValue={watch(key + '.estado')}
                                                        className="flex gap-2"
                                                    >
                                                        <div className={`flex items-center space-x-1 border px-3 py-1.5 rounded-md cursor-pointer hover:bg-green-50 ${currentVal === 'OK' ? 'bg-green-100 border-green-500' : ''}`}>
                                                            <RadioGroupItem value="OK" id={`${key}-ok`} className="text-green-600" />
                                                            <Label htmlFor={`${key}-ok`} className="cursor-pointer text-sm">OK</Label>
                                                        </div>
                                                        <div className={`flex items-center space-x-1 border px-3 py-1.5 rounded-md cursor-pointer hover:bg-red-50 ${currentVal === 'FALLA' ? 'bg-red-100 border-red-500' : ''}`}>
                                                            <RadioGroupItem value="FALLA" id={`${key}-falla`} className="text-red-600" />
                                                            <Label htmlFor={`${key}-falla`} className="cursor-pointer text-sm">Falla</Label>
                                                        </div>
                                                        <div className={`flex items-center space-x-1 border px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 ${currentVal === 'NO_APLICA' ? 'bg-gray-200 border-gray-400' : ''}`}>
                                                            <RadioGroupItem value="NO_APLICA" id={`${key}-na`} />
                                                            <Label htmlFor={`${key}-na`} className="cursor-pointer text-xs">N/A</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </div>

                                                {/* Logic Conditional: Si es FALLA */}
                                                {currentVal === 'FALLA' && (
                                                    <div className="mt-3 pl-4 border-l-2 border-red-400 animate-in slide-in-from-top-2">
                                                        <div className="grid gap-3">
                                                            <Input
                                                                placeholder="Describa la falla..."
                                                                className="bg-white"
                                                                // @ts-ignore
                                                                {...register(key + '.comentario')}
                                                            />
                                                            <div className="flex gap-2">
                                                                <Select onValueChange={(v) => setValue(key + '.prioridad' as any, v)}>
                                                                    <SelectTrigger className="w-[140px]">
                                                                        <SelectValue placeholder="Prioridad" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="BAJA">Baja</SelectItem>
                                                                        <SelectItem value="MEDIA">Media</SelectItem>
                                                                        <SelectItem value="ALTA">Alta</SelectItem>
                                                                        <SelectItem value="CRITICA">Crítica</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button type="button" variant="outline" size="icon">
                                                                    <Camera className="h-4 w-4 text-gray-500" />
                                                                </Button>
                                                            </div>
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
                </div>
            )}

            {/* STEP 3: FIRMA & RESUMEN */}
            {step === 3 && (
                <div className="grid gap-6 bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-orange-600">03.</span> Conformidad
                    </h3>

                    {/* Resumen de Fallas */}
                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                        <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" /> Resumen de Hallazgos
                        </h4>
                        {Object.entries(respuestas).filter(([_, val]) => val?.estado === 'FALLA').length === 0 ? (
                            <p className="text-sm text-green-700 flex items-center">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                No se reportaron fallas. La unidad está operativa.
                            </p>
                        ) : (
                            <ul className="list-disc list-inside text-sm text-gray-700">
                                {Object.entries(respuestas)
                                    .filter(([_, val]) => val?.estado === 'FALLA')
                                    .map(([key, val]) => (
                                        <li key={key}>
                                            <span className="font-semibold">{key.split('::')[1]}:</span> {val.comentario || 'Sin comentario'} ({val.prioridad})
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Firma del Inspector / Conductor</Label>
                        <div className="border border-gray-300 rounded-md bg-white">
                            <SignatureCanvas
                                ref={sigCanvasRef}
                                canvasProps={{
                                    className: 'w-full h-[200px] rounded-md'
                                }}
                                backgroundColor="#ffffff"
                            />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => sigCanvasRef.current?.clear()} className="text-xs text-muted-foreground">
                            Limpiar Firma
                        </Button>
                    </div>
                </div>
            )}

            {renderActionButtons()}
        </form>
    )
}
