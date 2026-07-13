'use client'

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { saveGlobalPDFConfig } from '@/lib/actions/cotizaciones-config'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown, Save, Loader2 } from "lucide-react"
import { ImageUpload } from "@/components/common/image-upload"

// Define schema based on NEW DB fields
const configSchema = z.object({
    id: z.string().optional(),

    // Updated Fields
    introduccion: z.string().optional(),
    terminos_condiciones: z.string().optional(), // Was texto_notas_precios
    texto_aceptacion: z.string().optional(),
    forma_pago1: z.string().optional(),
    forma_pago2: z.string().optional(),

    despedida: z.string().optional(),
    mostrar_firma: z.boolean(),
    firma_autorizado_url: z.string().optional(), // Renamed from firma_autorizada_usuario_id
    imagen_firma: z.string().optional().nullable(), // Renamed from firma_imagen_url
    imagen_banco: z.string().optional(), // Renamed from imagen_banco_url
})

type ConfigFormValues = z.infer<typeof configSchema>

interface CotizacionGlobalConfigFormProps {
    globalConfig?: any
    users?: any[]
}

function getFormattedDate() {
    return new Date().toISOString().split('T')[0] // yyyy-mm-dd
}

function sanitizeName(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function CotizacionGlobalConfigForm({ globalConfig, users = [] }: CotizacionGlobalConfigFormProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [isOpen, setIsOpen] = useState(true)

    const form = useForm<ConfigFormValues>({
        resolver: zodResolver(configSchema),
        defaultValues: {
            id: globalConfig?.id,
            introduccion: globalConfig?.introduccion || globalConfig?.texto_introduccion || "",
            terminos_condiciones: globalConfig?.terminos_condiciones || globalConfig?.texto_notas_precios || "",
            texto_aceptacion: globalConfig?.texto_aceptacion || globalConfig?.pie_pagina || "", // Map from pie_pagina if migrating
            forma_pago1: globalConfig?.forma_pago1 || "",
            forma_pago2: globalConfig?.forma_pago2 || "",

            despedida: globalConfig?.despedida || "",
            mostrar_firma: globalConfig?.mostrar_firma ?? true,
            firma_autorizado_url: globalConfig?.firma_autorizado_url || globalConfig?.firma_autorizada_usuario_id || "",
            imagen_firma: globalConfig?.imagen_firma || globalConfig?.firma_imagen_url || "",
            imagen_banco: globalConfig?.imagen_banco || globalConfig?.imagen_banco_url || "",
        },
    })

    const selectedUserId = useWatch({ control: form.control, name: 'firma_autorizado_url' })

    const getSafeUserName = () => {
        if (!selectedUserId) return 'unknown'
        const user = users.find(u => u.id === selectedUserId)
        return user ? sanitizeName(user.full_name || user.email || 'user') : 'user'
    }

    async function onSubmit(data: ConfigFormValues) {
        setIsSaving(true)
        try {
            const result = await saveGlobalPDFConfig(data)
            if (result.success) {
                toast.success("Configuración guardada correctamente")
            } else {
                toast.error(result.message || "Error al guardar la configuración")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsSaving(false)
        }
    }

    const today = getFormattedDate()
    const signatureFilename = `firma_${getSafeUserName()}_${today}`
    const bankFilename = `banco_${today}`

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2 border rounded-lg p-4 shadow-sm bg-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                    <h3 className="text-lg font-medium">Diseño y Textos del PDF (Global)</h3>
                </div>
            </div>

            <CollapsibleContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">

                        {/* SECCION: INTRODUCCION (SIN NUMERO) */}
                        <div className="space-y-4 border p-4 rounded bg-gray-50/50">
                            <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">Introducción</h4>
                            <div className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="introduccion"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Introducción Cotización</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ej: Estimados Sres..." value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* SECCION: TABLA DE PRECIOS (PLACEHOLDER) */}
                        <div className="space-y-4 border p-4 rounded bg-gray-50/50">
                            <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">TABLA DE PRECIOS</h4>
                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-muted-foreground">
                                <span className="text-sm">Sección de configuración para la Tabla de Precios</span>
                            </div>

                            {/* MOVED: TERMINOS Y CONDICIONES (Notas de precios) */}
                            <FormField
                                control={form.control}
                                name="terminos_condiciones"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Términos y condiciones</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej: Descripción del requerimiento..." value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* SECCION 1: ACEPTACION DE LA OFERTA */}
                        <div className="space-y-4 border p-4 rounded bg-gray-50/50">
                            <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">1. Aceptación de la Oferta</h4>
                            <FormField
                                control={form.control}
                                name="texto_aceptacion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Texto de Aceptación</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} className="h-24" placeholder="Términos para la aceptación..." value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* SECCION 2: FORMA DE PAGO & BANCOS */}
                        <div className="space-y-4 border p-4 rounded bg-gray-50/50">
                            <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">2. Forma de Pago & Bancos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="forma_pago1"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Condiciones de Pago 1</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Ej: Contado, 50% anticipo..."
                                                    className="min-h-[80px]"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="forma_pago2"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Condiciones de Pago 2</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Información adicional de pagos..."
                                                    className="min-h-[80px]"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="mt-4">
                                <FormField
                                    control={form.control}
                                    name="imagen_banco"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Imagen Cuentas Bancarias (Opcional)</FormLabel>
                                            <FormControl>
                                                <ImageUpload
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                    bucket="cotizaciones"
                                                    subfolder="banco"
                                                    customFilename={bankFilename}
                                                    label="Subir imagen de bancos"
                                                    className="w-full max-w-[500px]"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Se guardará en el bucket cotizaciones / [tenant] / banco
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* SECCION 3: MATRIZ DE RESPONSABILIDADES */}
                        <div className="space-y-4 border p-4 rounded bg-gray-50/50">
                            <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">3. Matriz de Responsabilidades</h4>
                            <span className="text-sm">Sección de configuración para la Matriz de Responsabilidades</span>
                        </div>

                        {/* SECCION: DESPEDIDA & FIRMA (SIN NUMERO) */}
                        <div className="space-y-4 border p-4 rounded bg-gray-50/50">
                            <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">Despedida & Firma</h4>
                            <FormField
                                control={form.control}
                                name="despedida"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Despedida</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Atentamente," value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="firma_autorizado_url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Usuario Autorizado Firma</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar usuario..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {users.map((user) => (
                                                        <SelectItem key={user.id} value={user.id}>
                                                            {user.full_name || user.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Usuario que aparece como autorizado en el PDF.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="imagen_firma"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Firma Autorizada (Imagen)</FormLabel>
                                            <FormControl>
                                                <ImageUpload
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                    bucket="cotizaciones"
                                                    subfolder="firma"
                                                    customFilename={signatureFilename}
                                                    label="Subir firma"
                                                    circle={false}
                                                    className="w-full max-w-[250px]"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Se guardará en el bucket cotizaciones / [tenant] / firma
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="mostrar_firma"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white h-fit mt-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Mostrar Firma</FormLabel>
                                            <FormDescription>
                                                Activar para mostrar la firma en el PDF
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* BOTON GUARDAR - Moved to bottom */}
                        <div className="flex justify-end pt-4">
                            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cambios
                            </Button>
                        </div>

                    </form>
                </Form>
            </CollapsibleContent>
        </Collapsible>
    )
}
