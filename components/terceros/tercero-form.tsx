"use client"

import { useActionState, useEffect, useState, startTransition } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createTercero, updateTercero } from "@/lib/actions/terceros"
import {
    getRubros,
    getPaises,
    getDepartamentos,
    getProvincias,
    getDistritos,
    createCatalogo
} from "@/lib/actions/catalogos"
import { ActionCatalogoDialog } from "@/components/common/action-catalogo-dialog"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from '@/utils/supabase/client'
import { Tercero } from "@/types/terceros"
import { TerceroContactosManager } from "./tercero-contactos-manager"
import { TerceroSitiosManager } from "./tercero-sitios-manager"
import { TerceroPersonalManager } from "./tercero-personal-manager"
import { SearchableSelect } from "@/components/ui/searchable-select"

// Rubro y formato de RUC son estrictos SOLO en creación: terceros legacy
// (alta rápida con DNI, migrados sin rubro) no deben quedar bloqueados al editar
// otros campos (mismo criterio que sitios, DUDA-TER-008).
const buildFormSchema = (isEdit: boolean) => z.object({
    id: z.string().optional(),
    tipo: z.enum(["cliente", "proveedor", "ambos"]),
    razon_social: z.string().min(2, "Razón social requerida"),
    ruc: z.string().min(1, "Código tributario requerido"),
    rubro_id: isEdit ? z.string().optional() : z.string().min(1, "Rubro es requerido"),
    pais_id: z.string().optional(),
    ubigeo_codigo: z.string().optional(),
    direccion: z.string().optional(),
    // Keep old fields for metadata but they'll be secondary
    ubicacion_ciudad: z.string().optional(),
    ubicacion_departamento: z.string().optional(),
    // Helper fields for UI
    dept: z.string().optional(),
    prov: z.string().optional(),
}).superRefine((data, ctx) => {
    if (isEdit) return
    // Validación de RUC según país (DUDA-TER-013):
    // PE → exactamente 11 dígitos; otros países → código tributario genérico 6-20 alfanumérico
    const pais = data.pais_id || "PE"
    if (pais === "PE") {
        if (!/^\d{11}$/.test(data.ruc)) {
            ctx.addIssue({ code: "custom", path: ["ruc"], message: "RUC inválido (11 dígitos)" })
        }
    } else if (!/^[A-Za-z0-9]{6,20}$/.test(data.ruc)) {
        ctx.addIssue({ code: "custom", path: ["ruc"], message: "Código tributario inválido (6 a 20 caracteres alfanuméricos)" })
    }
})

type TerceroFormValues = z.infer<ReturnType<typeof buildFormSchema>>

interface TerceroFormProps {
    initialData?: Tercero
    isEdit?: boolean
}

export function TerceroForm({ initialData, isEdit = false }: TerceroFormProps) {
    const router = useRouter()

    // Catalogs State
    const [rubros, setRubros] = useState<{ id: string, nombre: string }[]>([])
    const [paises, setPaises] = useState<{ id: string, nombre: string }[]>([])
    const [departamentos, setDepartamentos] = useState<string[]>([])
    const [provincias, setProvincias] = useState<string[]>([])
    const [distritos, setDistritos] = useState<{ codigo: string, distrito: string }[]>([])

    // Image Previews
    const initialLogo = (initialData as any)?.logo_url ? `${(initialData as any).logo_url}?t=${Date.now()}` : null
    const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string>("")
    const supabase = createClient()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setLogoPreview(url)

            // Client-side Upload
            try {
                setUploadingLogo(true)
                const socialName = form.getValues('razon_social') || "undefined"
                const cleanName = socialName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                const fileExt = file.name.split('.').pop()
                const filePath = `${cleanName}/logo/${cleanName}-logo-${dateStr}.${fileExt}`

                console.log("Uploading to path:", filePath)

                const { error } = await supabase.storage
                    .from('tercero')
                    .upload(filePath, file, { upsert: true })

                if (error) {
                    console.error("Supabase Storage Error:", error)
                    throw error
                }

                const { data: { publicUrl } } = supabase.storage.from('tercero').getPublicUrl(filePath)
                console.log("Public URL:", publicUrl)
                setUploadedLogoUrl(publicUrl)
                toast.success("Logo subido temporalmente (guardar para confirmar)")
            } catch (err) {
                console.error("Error uploading logo:", err)
                toast.error("Error al subir el logo. Intente de nuevo.")
            } finally {
                setUploadingLogo(false)
            }
        }
    }

    // Tabs for Edit Mode
    const [activeTab, setActiveTab] = useState("general")

    const action = isEdit ? updateTercero : createTercero

    const submitAction = async (prevState: any, formData: FormData) => {
        if (isEdit && initialData) {
            formData.append('id', initialData.id)
        }
        console.log('Form Submit - Logo:', formData.get('logo'))
        const result = await action(prevState, formData)
        if (result.success) {
            toast.success(isEdit ? "Tercero actualizado" : "Tercero creado correctamente")
            router.push("/terceros")
        } else {
            toast.error(result.message)
        }
        return result
    }

    const [state, formAction, isPending] = useActionState(submitAction, {
        message: "",
        success: false
    })

    // Valida con zod (react-hook-form) ANTES de despachar la server action.
    // Con action={formAction} a secas, la validación del resolver nunca corre.
    const handleValidatedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formEl = e.currentTarget
        form.handleSubmit(() => {
            startTransition(() => formAction(new FormData(formEl)))
        })()
    }

    const form = useForm<TerceroFormValues>({
        resolver: zodResolver(buildFormSchema(isEdit)),
        defaultValues: {
            tipo: (initialData?.tipo as any) || "cliente",
            razon_social: initialData?.razon_social || "",
            ruc: initialData?.ruc || "",
            rubro_id: initialData?.rubro_id || "",
            pais_id: initialData?.pais_id || "PE",
            ubigeo_codigo: initialData?.ubigeo_codigo || "",
            direccion: initialData?.direccion || "",
            ubicacion_ciudad: initialData?.ubicacion_ciudad || "",
            ubicacion_departamento: initialData?.ubicacion_departamento || initialData?.ubigeo?.departamento || "",
            // Helpers
            dept: initialData?.ubigeo?.departamento || "",
            prov: initialData?.ubigeo?.provincia || "",
        },
    })

    const watchPais = form.watch("pais_id")
    const watchDept = form.watch("dept")
    const watchProv = form.watch("prov")
    const watchDist = form.watch("ubigeo_codigo") // This is the ID/Codigo, we might need name for hidden input?

    // Load Initial Catalogs
    useEffect(() => {
        const loadInit = async () => {
            const [r, p, d] = await Promise.all([getRubros(), getPaises(), getDepartamentos()])
            setRubros(r)
            setPaises(p)
            setDepartamentos(d)
        }
        loadInit()
    }, [])

    // Initialize cascade if editing
    useEffect(() => {
        if (initialData?.ubigeo?.departamento) {
            getProvincias(initialData.ubigeo.departamento).then(setProvincias)
        }
        if (initialData?.ubigeo?.departamento && initialData?.ubigeo?.provincia) {
            getDistritos(initialData.ubigeo.departamento, initialData.ubigeo.provincia).then(setDistritos)
        }
    }, [initialData])

    // Cascading geographical selections - Load lists without clearing values on mount
    useEffect(() => {
        if (watchDept) {
            getProvincias(watchDept).then(setProvincias)
        } else {
            setProvincias([])
        }
    }, [watchDept])

    useEffect(() => {
        if (watchDept && watchProv) {
            getDistritos(watchDept, watchProv).then(setDistritos)
        } else {
            setDistritos([])
        }
    }, [watchProv, watchDept])

    const FormContent = () => (
        <div className="space-y-6">
            <div className="flex justify-center mb-6 gap-6">
                <div className="flex flex-col items-center gap-4">
                    <FormLabel>Logo</FormLabel>
                    <div className="relative w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/10">
                        {logoPreview ? (
                            <Image src={logoPreview} alt="Logo" width={96} height={96} className="w-full h-full object-contain" unoptimized />
                        ) : (
                            <span className="text-muted-foreground text-xs text-center p-2">Sin Logo</span>
                        )}
                        <input
                            type="file"
                            name="logo"
                            id="logo-upload"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground">Click para subir</span>
                </div>

                <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                        <FormItem className="w-1/2">
                            <FormLabel>Tipo de Tercero <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} name="tipo">
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="cliente">Cliente</SelectItem>
                                    <SelectItem value="proveedor">Proveedor</SelectItem>
                                    <SelectItem value="ambos">Ambos (Cliente y Proveedor)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Hidden inputs to ensure values are sent to server action */}
            <input type="hidden" name="uploaded_logo_url" value={uploadedLogoUrl} />
            <input type="hidden" name="ubicacion_departamento" value={watchDept || ""} />
            <input type="hidden" name="ubicacion_provincia" value={watchProv || ""} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <FormField
                    control={form.control}
                    name="razon_social"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Razón Social <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="Nombre de la empresa" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="ruc"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Número de RUC / Registro <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: 20123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="rubro_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rubro de Negocio <span className="text-red-500">*</span></FormLabel>
                            <div className="flex gap-2">
                                <input type="hidden" name="rubro_id" value={field.value || ''} />
                                <SearchableSelect
                                    options={rubros.map(r => ({ value: r.id, label: r.nombre }))}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Seleccionar rubro"
                                    searchPlaceholder="Buscar rubro..."
                                    className="flex-1"
                                />
                                <ActionCatalogoDialog
                                    label="Rubro"
                                    createAction={(nombre: string) => createCatalogo('rubros', nombre)}
                                    onItemCreated={(newItem: { id: string, nombre: string }) => {
                                        setRubros([...rubros, newItem])
                                        form.setValue("rubro_id", newItem.id)
                                    }}
                                />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dirección Fiscal / Principal</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Av. Principal 123" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground">Ubicación Geográfica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                        control={form.control}
                        name="pais_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>País</FormLabel>
                                <input type="hidden" name="pais_id" value={field.value || ''} />
                                <SearchableSelect
                                    options={paises.map(p => ({ value: p.id, label: p.nombre.toUpperCase() }))}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="País"
                                    searchPlaceholder="Buscar país..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {watchPais === "PE" ? (
                        <>
                            <FormField
                                control={form.control}
                                name="dept"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamento</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val)
                                                // User interactions trigger clears
                                                form.setValue("prov", "")
                                                form.setValue("ubigeo_codigo", "")
                                                setProvincias([])
                                                setDistritos([])
                                                getProvincias(val).then(setProvincias)
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Dept." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departamentos.map(d => (
                                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="prov"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provincia</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val)
                                                form.setValue("ubigeo_codigo", "")
                                                setDistritos([])
                                                getDistritos(watchDept!, val).then(setDistritos)
                                            }}
                                            defaultValue={field.value}
                                            disabled={!watchDept}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Prov." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {provincias.map(p => (
                                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ubigeo_codigo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Distrito / Ciudad</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} name="ubigeo_codigo" disabled={!watchProv}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Distrito" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {distritos.map(d => (
                                                    <SelectItem key={d.codigo} value={d.codigo}>{d.distrito}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    ) : (
                        <FormField
                            control={form.control}
                            name="ubicacion_ciudad"
                            render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                    <FormLabel>Ciudad / Localidad</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre de la ciudad" {...field} name="ubicacion_ciudad" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="px-8">
                    {isPending ? "Guardando..." : (isEdit ? "Actualizar Tercero" : "Crear Tercero")}
                </Button>
            </div>
        </div>
    )

    return (
        <Form {...form}>
            {isEdit ? (
                <div className="space-y-6">
                    <div className="flex border-b">
                        <button
                            type="button"
                            onClick={() => setActiveTab("general")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "general"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Información General
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("contactos")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "contactos"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Contactos
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("sitios")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "sitios"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Sitios
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("personal")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "personal"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Personal
                        </button>
                    </div>

                    {activeTab === "general" && (
                        <form onSubmit={handleValidatedSubmit}>
                            <FormContent />
                        </form>
                    )}
                    {activeTab === "contactos" && initialData?.id && (
                        <div className="p-4 border rounded-md min-h-[200px]">
                            <TerceroContactosManager terceroId={initialData.id} />
                        </div>
                    )}
                    {activeTab === "sitios" && initialData?.id && (
                        <div className="p-4 border rounded-md min-h-[200px]">
                            <TerceroSitiosManager terceroId={initialData.id} />
                        </div>
                    )}
                    {activeTab === "personal" && initialData?.id && (
                        <div className="p-4 border rounded-md min-h-[200px]">
                            <TerceroPersonalManager terceroId={initialData.id} />
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleValidatedSubmit}>
                    <FormContent />
                </form>
            )}
        </Form>
    )
}
