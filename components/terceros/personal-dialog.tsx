'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTerceroPersonal, updateTerceroPersonal } from "@/lib/actions/terceros-modules"
import { Tercero, TerceroPersonal } from "@/types/terceros"
import { ImageUpload } from "@/components/common/image-upload"
import { ActionCatalogoDialog } from "@/components/common/action-catalogo-dialog"
import { getPersonalCargos, createPersonalCargo } from "@/lib/actions/catalogos"

const formSchema = z.object({
    id: z.string().optional(),
    nombres: z.string().min(1, "Nombre es requerido"),
    apellidos: z.string().min(1, "Apellido es requerido"),
    pais_nacionalidad: z.string().min(1, "País es requerido"),
    tipo_doc: z.string().min(1, "Tipo Doc es requerido"),
    numero_doc: z.string().min(1, "No. Doc es requerido"),
    cargo: z.string().min(1, "Cargo es requerido"),
    tercero_id: z.string().min(1, "Contratista es requerido"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    telefono: z.string().optional(),
    firma_url: z.string().optional(),
    foto_url: z.string().optional(),
    pin: z.string().optional(),
})

interface PersonalDialogProps {
    terceros: Tercero[]
    personalToEdit?: TerceroPersonal
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function PersonalDialog({ terceros, personalToEdit, trigger, onSuccess }: PersonalDialogProps) {
    const [open, setOpen] = useState(false)
    const [cargos, setCargos] = useState<{ id: string, nombre: string }[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: "",
            nombres: "",
            apellidos: "",
            pais_nacionalidad: "Peru",
            tipo_doc: "DNI",
            numero_doc: "",
            cargo: "",
            tercero_id: "",
            email: "",
            telefono: "",
            firma_url: "",
            foto_url: "",
            pin: "",
        },
    })

    useEffect(() => {
        if (open) {
            getPersonalCargos().then(setCargos)
        }
    }, [open])

    useEffect(() => {
        if (personalToEdit && open) {
            form.reset({
                id: personalToEdit.id,
                nombres: personalToEdit.nombres,
                apellidos: personalToEdit.apellidos,
                pais_nacionalidad: personalToEdit.pais_nacionalidad || "Peru",
                tipo_doc: personalToEdit.tipo_doc || "DNI",
                numero_doc: personalToEdit.numero_doc || "",
                cargo: personalToEdit.cargo || "",
                tercero_id: personalToEdit.tercero_id,
                email: personalToEdit.email || "",
                telefono: personalToEdit.telefono || "",
                firma_url: personalToEdit.firma_url || "",
                foto_url: personalToEdit.foto_url || "",
                pin: personalToEdit.pin || "",
            })
        } else if (!personalToEdit && open) {
            form.reset({
                id: "",
                nombres: "",
                apellidos: "",
                pais_nacionalidad: "Peru",
                tipo_doc: "DNI",
                numero_doc: "",
                cargo: "",
                tercero_id: "",
                email: "",
                telefono: "",
                firma_url: "",
                foto_url: "",
                pin: "",
            })
        }
    }, [personalToEdit, open, form])

    const isSubmitting = form.formState.isSubmitting
    const isEdit = !!personalToEdit

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData()
        Object.entries(values).forEach(([key, value]) => {
            if (value) formData.append(key, value)
        })

        const action = isEdit ? updateTerceroPersonal : createTerceroPersonal
        const result = await action(null, formData)

        if (result.success) {
            toast.success(isEdit ? "Personal actualizado" : "Personal creado")
            setOpen(false)
            if (!isEdit) form.reset()
            if (onSuccess) onSuccess()
        } else {
            toast.error(result.message || "Error al procesar")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Personal
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "EDITAR PERSONAL" : "CREAR PERSONAL DE CONTRATISTA"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex justify-center py-2">
                            <FormField
                                control={form.control}
                                name="foto_url"
                                render={({ field }) => (
                                    <ImageUpload
                                        value={field.value}
                                        onChange={field.onChange}
                                        circle
                                        bucket="terceros"
                                    />
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nombres"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombres *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ingresa los nombres"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="apellidos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Apellidos *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ingresa los apellidos"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="pais_nacionalidad"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>País de Nacionalidad *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona pais" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Peru">Peru</SelectItem>
                                                <SelectItem value="Colombia">Colombia</SelectItem>
                                                <SelectItem value="Chile">Chile</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tipo_doc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Documento *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="DNI">DNI</SelectItem>
                                                <SelectItem value="CE">CE</SelectItem>
                                                <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="numero_doc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>No. de documento *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ingresa tu No. de doc"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="cargo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cargo *</FormLabel>
                                        <div className="flex gap-2">
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Selecciona el cargo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {cargos.map((c) => (
                                                        <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <ActionCatalogoDialog
                                                label="Cargo"
                                                createAction={createPersonalCargo}
                                                onItemCreated={(newItem) => {
                                                    setCargos([...cargos, newItem])
                                                    form.setValue("cargo", newItem.nombre)
                                                }}
                                            />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tercero_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contratista *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona contratista" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {terceros.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.razon_social}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo electrónico *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ingresa el correo"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="telefono"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número de celular (WhatsApp) *</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center">
                                                <span className="mr-2 text-sm text-muted-foreground">🇵🇪</span>
                                                <Input placeholder="912 345 678" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="pin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>PIN de acceso APP</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="PIN numérico (gestionado desde APP)"
                                            type="text"
                                            maxLength={10}
                                            {...field}
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">Dato privado — los usuarios lo gestionan desde la APP</p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormLabel>Firma electrónica</FormLabel>
                            <div className="max-w-[200px]">
                                <FormField
                                    control={form.control}
                                    name="firma_url"
                                    render={({ field }) => (
                                        <ImageUpload
                                            value={field.value}
                                            onChange={field.onChange}
                                            label=""
                                            bucket="terceros"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cerrar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-orange-400 hover:bg-orange-500 text-white">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEdit ? "Actualizar" : "Crear"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
