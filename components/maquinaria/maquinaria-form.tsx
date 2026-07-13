"use client"

import { useActionState, useState, useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createMaquinaria, updateMaquinaria } from "@/lib/actions/maquinarias"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
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
import { Tercero } from "@/types/terceros"
import { Maquinaria, MaquinariaModelo } from "@/types/maquinaria"
import { ModelCreationDialog } from "./model-creation-dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import imageCompression from 'browser-image-compression';
import Image from "next/image"

interface ActionResult {
    message: string
    success?: boolean
}

const formSchema = z.object({
    id: z.string().optional(),
    nombre: z.string().min(2, "Nombre requerido"),
    codigo_interno: z.string().optional(),
    modelo_id: z.string().min(1, "Modelo requerido"), // The normalized ID
    categoria: z.string().optional(), // Read-only display
    marca: z.string().optional(),     // Read-only display
    modelo: z.string().optional(),    // Read-only display
    placa: z.string().optional(),
    capacidad: z.string().optional(),
    anio_fabricacion: z.coerce.number().optional(),
    propietario: z.enum(["propio", "tercero"]),
    proveedor_id: z.string().optional(),
})

interface MaquinariaFormProps {
    proveedores: Tercero[]
    modelos: MaquinariaModelo[]
    initialData?: Maquinaria
    isEdit?: boolean
}

export function MaquinariaForm({ proveedores, modelos: initialModelos, initialData, isEdit = false }: MaquinariaFormProps) {
    const router = useRouter()
    const [availableModels, setAvailableModels] = useState<MaquinariaModelo[]>(initialModelos || [])

    // Select action based on mode
    const action = isEdit ? updateMaquinaria : createMaquinaria

    const submitAction = async (_prevState: ActionResult, formData: FormData) => {
        if (isEdit && initialData) {
            formData.append('id', initialData.id)
        }
        const result = await action(_prevState, formData)
        if (result.success) {
            toast.success(isEdit ? "Equipo actualizado" : "Equipo creado correctamente")
            router.push("/maquinarias")
        } else {
            toast.error(result.message)
        }
        return result
    }

    const [, formAction, isPending] = useActionState(submitAction, {
        message: "",
        success: false
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            nombre: initialData?.nombre || "",
            codigo_interno: initialData?.codigo_interno || "",
            modelo_id: initialData?.modelo_id || "",
            // Legacy/Display fields fallback
            categoria: initialData?.categoria || "",
            marca: initialData?.marca || "",
            modelo: initialData?.modelo || "",

            placa: initialData?.placa || "",
            capacidad: initialData?.capacidad || "",
            anio_fabricacion: initialData?.anio_fabricacion,
            propietario: initialData?.propietario || "propio",
            proveedor_id: initialData?.proveedor_id || "",
        },
    })

    const selectedPropietario = useWatch({
        control: form.control,
        name: "propietario",
    })
    const selectedModeloId = useWatch({
        control: form.control,
        name: "modelo_id",
    })


    const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.foto_url || null)
    const [compressedFile, setCompressedFile] = useState<File | null>(null)

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Create preview immediately
        setPhotoPreview(URL.createObjectURL(file))

        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.5
        };

        try {
            const compressed = await imageCompression(file, options);
            setCompressedFile(compressed);
            toast.success("Imagen comprimida y lista");
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar la imagen");
        }
    };

    // ... handle submit ...

    // ... useEffects ...

    // ... UI ...

    // Floating block removed

    // Wrap form action to append file
    const handleSubmit = (formData: FormData) => {
        if (compressedFile) {
            formData.append('foto', compressedFile, compressedFile.name);
        }
        formAction(formData);
    }

    useEffect(() => {
        if (selectedModeloId) {
            const modelFunc = availableModels.find(m => m.id === selectedModeloId)
            if (modelFunc) {
                // Only overwrite if it's not the initial load or if user actively changed it?
                // For simplicity, we enforce consistency with the model.
                form.setValue("categoria", modelFunc.tipo_equipo)
                form.setValue("marca", modelFunc.marca)
                // We keep the logic to not overwrite existing manual overrides if needed, but here we sync.
                // form.setValue("modelo", modelFunc.modelo) // This is the string field

                // Capacidad is an override, but we can set default if empty
                if (!form.getValues("capacidad")) {
                    form.setValue("capacidad", modelFunc.capacidad || "")
                }
            }
        }
    }, [selectedModeloId, availableModels, form])

    // Specific effect to handle legacy data: if modelo_id is empty but we have a model name, try to find it
    useEffect(() => {
        if (!initialData?.id) return; // Only on edit
        const currentId = form.getValues("modelo_id");
        if (!currentId && initialData.modelo) {
            const legacyModel = initialData.modelo.trim().toLowerCase();
            const match = availableModels.find(m => m.modelo.trim().toLowerCase() === legacyModel);
            if (match) {
                form.setValue("modelo_id", match.id);
            }
        }
    }, [initialData, availableModels, form]);

    const handleModelCreated = (newModel: MaquinariaModelo) => {
        setAvailableModels(prev => [...prev, newModel]) // Add to list
        form.setValue("modelo_id", newModel.id) // Select it
    }

    return (
        <Form {...form}>
            <form action={handleSubmit} className="space-y-6">
                {/* ROW 1: Nombre & Código */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre del Equipo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Excavadora CAT 320" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="codigo_interno"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Código Interno</FormLabel>
                                <FormControl>
                                    <Input placeholder="EXC-001" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* ROW 2: Modelo, Categoría, Marca */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    {/* Modelo with Button */}
                    <div className="relative">
                        <FormField
                            control={form.control}
                            name="modelo_id"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Modelo</FormLabel>
                                    <input type="hidden" name="modelo_id" value={field.value || ''} />
                                    <SearchableSelect
                                        options={availableModels.map(m => ({ value: m.id, label: `${m.modelo} (${m.marca})` }))}
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        placeholder="Seleccionar Modelo"
                                        searchPlaceholder="Buscar modelo..."
                                        className="pr-12"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="absolute right-0 top-5">
                            <ModelCreationDialog onModelCreated={handleModelCreated} />
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="categoria"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoría (Equipo) - <i>Auto</i></FormLabel>
                                <FormControl>
                                    <Input placeholder="Se llena al seleccionar modelo..." {...field} readOnly className="bg-muted text-muted-foreground" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="marca"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Marca - <i>Auto</i></FormLabel>
                                <FormControl>
                                    <Input placeholder="Se llena al seleccionar modelo..." {...field} readOnly className="bg-muted text-muted-foreground" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* ROW 3: Placa, Capacidad, Año */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="placa"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Placa / Serie</FormLabel>
                                <FormControl>
                                    <Input placeholder="ABC-123" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="capacidad"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Capacidad</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. 10 Toneladas" {...field} />
                                </FormControl>
                                <FormDescription className="text-xs">Se sugiere la del modelo, pero puede editarse.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="anio_fabricacion"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Año</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="2023" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>


                <div className="bg-muted/30 p-4 rounded-lg border border-dashed grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 items-center">
                    <div>
                        <FormLabel className="text-base font-semibold">Foto del Equipo</FormLabel>
                        <p className="text-sm text-muted-foreground mb-4 italic">Se comprimirá automáticamente al 50%.</p>
                        <FormControl>
                            <Input type="file" accept="image/*" onChange={handleImageChange} className="bg-background" />
                        </FormControl>
                    </div>
                    {photoPreview ? (
                        <div className="w-48 h-32 border rounded-md bg-white flex items-center justify-center p-2 relative shadow-sm">
                            <Image
                                src={photoPreview}
                                alt="Vista previa"
                                fill
                                className="object-contain rounded"
                                unoptimized // Since it's a blob URL or external URL
                            />
                        </div>
                    ) : (
                        <div className="w-48 h-32 border rounded-md bg-muted flex items-center justify-center p-2 text-muted-foreground text-sm border-dashed">
                            Sin Foto
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
                    <FormField
                        control={form.control}
                        name="propietario"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Propiedad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} name="propietario">
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="propio">Propio</SelectItem>
                                        <SelectItem value="tercero">Tercero (Alquilado)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {selectedPropietario === 'tercero' && (
                        <FormField
                            control={form.control}
                            name="proveedor_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor</FormLabel>
                                    <input type="hidden" name="proveedor_id" value={field.value || ''} />
                                    <SearchableSelect
                                        options={proveedores.map(p => ({ value: p.id, label: p.razon_social || '' }))}
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        placeholder="Seleccionar Proveedor"
                                        searchPlaceholder="Buscar proveedor..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Guardando..." : (isEdit ? "Guardar Equipo" : "Guardar Equipo")}
                    </Button>
                </div>
            </form>
        </Form >
    )
}

