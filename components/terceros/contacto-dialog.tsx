'use client'

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { createTerceroContacto, updateTerceroContacto } from "@/lib/actions/terceros-modules"
import { TerceroContacto } from "@/types/terceros"
import { ActionCatalogoDialog } from "@/components/common/action-catalogo-dialog"
import { getContactosCargos, getContactosAreas, createContactoCargo, createContactoArea } from "@/lib/actions/catalogos"

// Solo se necesitan id + razón social (compatible con Tercero[] completo)
type TerceroSelect = { id: string; razon_social: string }

// Cargo es requerido SOLO en creación: contactos legacy/migrados vienen sin
// cargo y su edición no debe quedar bloqueada (mismo criterio que DUDA-TER-008).
const buildFormSchema = (isEdit: boolean) => z.object({
    id: z.string().optional(),
    tercero_id: z.string().min(1, "Seleccionar tercero es requerido"),
    nombre_completo: z.string().min(1, "Nombre es requerido"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    telefono: z.string().optional(),
    cargo: isEdit ? z.string().optional() : z.string().min(1, "Cargo es requerido"),
    area: z.string().optional(),
})

type ContactoFormValues = z.infer<ReturnType<typeof buildFormSchema>>

interface ContactoDialogProps {
    terceros: TerceroSelect[]
    defaultTerceroId?: string
    contactoToEdit?: TerceroContacto
    trigger?: React.ReactNode
    onSuccess?: (newId?: string) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ContactoDialog({ terceros, defaultTerceroId, contactoToEdit, trigger, onSuccess, open: constrainedOpen, onOpenChange }: ContactoDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [cargos, setCargos] = useState<{ id: string, nombre: string }[]>([])
    const [areas, setAreas] = useState<{ id: string, nombre: string }[]>([])

    const isControlled = typeof constrainedOpen !== "undefined"
    const open = isControlled ? constrainedOpen : internalOpen
    const setOpen = isControlled ? onOpenChange : setInternalOpen

    const isEdit = !!contactoToEdit
    const formSchema = useMemo(() => buildFormSchema(isEdit), [isEdit])

    const form = useForm<ContactoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: "",
            tercero_id: "",
            nombre_completo: "",
            email: "",
            telefono: "",
            cargo: "",
            area: "",
        },
    })

    useEffect(() => {
        if (open) {
            getContactosCargos().then(setCargos)
            getContactosAreas().then(setAreas)
        }
    }, [open])

    useEffect(() => {
        if (contactoToEdit && open) {
            form.reset({
                id: contactoToEdit.id,
                tercero_id: contactoToEdit.tercero_id,
                nombre_completo: contactoToEdit.nombre_completo,
                email: contactoToEdit.email || "",
                telefono: contactoToEdit.telefono || "",
                cargo: contactoToEdit.cargo || "",
                area: contactoToEdit.area || "",
            })
        } else if (!contactoToEdit && open) {
            form.reset({
                id: "",
                tercero_id: defaultTerceroId ?? "",
                nombre_completo: "",
                email: "",
                telefono: "",
                cargo: "",
                area: "",
            })
        }
    }, [contactoToEdit, open, form, defaultTerceroId])

    const sortedTerceros = useMemo(() => {
        const selected = terceros.find(t => t.id === defaultTerceroId)
        const rest = terceros
            .filter(t => t.id !== defaultTerceroId)
            .sort((a, b) => a.razon_social.localeCompare(b.razon_social, 'es'))
        return selected ? [selected, ...rest] : rest
    }, [terceros, defaultTerceroId])

    const isSubmitting = form.formState.isSubmitting

    async function onSubmit(values: ContactoFormValues) {
        const formData = new FormData()
        // Ensure values are uppercase where appropriate
        const processedValues = {
            ...values,
            nombre_completo: values.nombre_completo.toUpperCase(),
            email: values.email?.toUpperCase() || "", // Emails often kept lowercase, but user said "todas las opciones de texto"
            cargo: values.cargo?.toUpperCase() || "",
            area: values.area?.toUpperCase() || ""
        }

        Object.entries(processedValues).forEach(([key, value]) => {
            if (value) formData.append(key, value)
        })

        // Doble escritura: además del texto legacy, la FK al catálogo (DUDA-TER-005)
        const cargoId = cargos.find(c => c.nombre.toUpperCase() === processedValues.cargo)?.id
        const areaId = areas.find(a => a.nombre.toUpperCase() === processedValues.area)?.id
        if (cargoId) formData.append('cargo_id', cargoId)
        if (areaId) formData.append('area_id', areaId)

        const action = isEdit ? updateTerceroContacto : createTerceroContacto
        const result = await action(null, formData)

        if (result.success) {
            toast.success(isEdit ? "Contacto actualizado" : "Contacto creado")
            if (setOpen) setOpen(false)
            if (!isEdit) form.reset()
            if (onSuccess) onSuccess((result as any).id)
        } else {
            toast.error(result.message || "Error al procesar")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Contacto" : "Agregar Contacto"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Modifica los datos del contacto." : "Ingrese los datos del nuevo contacto asociado a un tercero."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="tercero_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Empresa *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar empresa" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {sortedTerceros.map((t) => (
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nombre_completo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre completo *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ingresa el nombre completo"
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
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo electrónico *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ingresa el email"
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
                                name="telefono"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono</FormLabel>
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
                                                createAction={createContactoCargo}
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
                                name="area"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Área de la Empresa</FormLabel>
                                        <div className="flex gap-2">
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Selecciona el área" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {areas.map((a) => (
                                                        <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <ActionCatalogoDialog
                                                label="Área"
                                                createAction={createContactoArea}
                                                onItemCreated={(newItem) => {
                                                    setAreas([...areas, newItem])
                                                    form.setValue("area", newItem.nombre)
                                                }}
                                            />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen && setOpen(false)}>
                                Cerrar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-orange-400 hover:bg-orange-500 text-white">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEdit ? "Actualizar" : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
