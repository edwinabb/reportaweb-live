'use client'

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, X } from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { createTerceroSitio, updateTerceroSitio } from "@/lib/actions/terceros-modules"
import { getSitiosTipos, createSitioTipo } from "@/lib/actions/catalogos"
import { TerceroSitio } from "@/types/terceros"

type TerceroSelect = { id: string; razon_social: string }
import { ActionCatalogoDialog } from "@/components/common/action-catalogo-dialog"

const formSchema = z.object({
    id: z.string().optional(),
    codigo: z.string().min(1, "Código es requerido"),
    nombre: z.string().min(1, "Nombre es requerido"),
    tercero_ids: z.array(z.string()).min(1, "Selecciona al menos un tercero"),
    tipo: z.string().min(1, "Tipo es requerido"),
    direccion: z.string().optional(),
    ciudad: z.string().optional(),
})

interface SitioDialogProps {
    terceros: TerceroSelect[]
    sitioToEdit?: TerceroSitio
    trigger?: React.ReactNode
    onSuccess?: (newNombre?: string) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    defaultTerceroId?: string
}

export function SitioDialog({ terceros, sitioToEdit, trigger, onSuccess, open: constrainedOpen, onOpenChange, defaultTerceroId }: SitioDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = typeof constrainedOpen !== "undefined"
    const open = isControlled ? constrainedOpen : internalOpen
    const setOpen = isControlled ? onOpenChange : setInternalOpen

    // ... rest of component
    const [sitiosTipos, setSitiosTipos] = useState<any[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: "",
            codigo: "",
            nombre: "",
            tercero_ids: [],
            tipo: "",
            direccion: "",
            ciudad: "",
        },
    })

    useEffect(() => {
        if (open) {
            // Load sitios tipos
            getSitiosTipos().then(setSitiosTipos)

            if (sitioToEdit) {
                form.reset({
                    id: sitioToEdit.id,
                    codigo: sitioToEdit.codigo || "",
                    nombre: sitioToEdit.nombre,
                    tercero_ids: sitioToEdit.tercero_ids || sitioToEdit.terceros?.map(t => t.id) || [],
                    tipo: sitioToEdit.tipo || "",
                    direccion: sitioToEdit.direccion || "",
                    ciudad: sitioToEdit.ciudad || "",
                })
            } else {
                form.reset({
                    id: "",
                    codigo: "",
                    nombre: "",
                    tercero_ids: defaultTerceroId ? [defaultTerceroId] : [],
                    tipo: "",
                    direccion: "",
                    ciudad: "",
                })
            }
        }
    }, [sitioToEdit, open, form, defaultTerceroId])

    const sortedTerceros = useMemo(() => {
        const selected = terceros.find(t => t.id === defaultTerceroId)
        const rest = terceros
            .filter(t => t.id !== defaultTerceroId)
            .sort((a, b) => a.razon_social.localeCompare(b.razon_social, 'es'))
        return selected ? [selected, ...rest] : rest
    }, [terceros, defaultTerceroId])

    const isSubmitting = form.formState.isSubmitting
    const isEdit = !!sitioToEdit

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData()
        formData.append('id', values.id || '')
        formData.append('codigo', values.codigo)
        formData.append('nombre', values.nombre)
        const terceroIds = (defaultTerceroId && !values.tercero_ids.includes(defaultTerceroId))
            ? [...values.tercero_ids, defaultTerceroId]
            : values.tercero_ids
        formData.append('tercero_ids', terceroIds.join(','))
        formData.append('tipo', values.tipo)
        formData.append('direccion', values.direccion || '')
        formData.append('ciudad', values.ciudad || '')

        const action = isEdit ? updateTerceroSitio : createTerceroSitio
        const result = await action(null, formData)

        if (result.success) {
            toast.success(isEdit ? "Sitio actualizado" : "Sitio creado")
            if (setOpen) setOpen(false)
            if (!isEdit) form.reset()
            if (onSuccess) onSuccess((result as any).nombre)
        } else {
            toast.error(result.message || "Error al procesar")
        }
    }

    const handleTipoCreated = (newTipo: any) => {
        setSitiosTipos(prev => [...prev, newTipo])
        form.setValue('tipo', newTipo.id)
    }

    const selectedTerceros = form.watch('tercero_ids')

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Sitio
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "EDITAR SITIO" : "AGREGAR SITIO"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="tercero_ids"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Tercero(s) asociado(s) *</FormLabel>
                                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                                        {sortedTerceros.map((tercero) => (
                                            <FormField
                                                key={tercero.id}
                                                control={form.control}
                                                name="tercero_ids"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2 space-y-0 mb-2">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(tercero.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...field.value, tercero.id])
                                                                        : field.onChange(field.value?.filter((id) => id !== tercero.id))
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">
                                                            {tercero.razon_social}
                                                        </FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="codigo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ingresa el código" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="nombre"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ingresa el nombre"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="tipo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo *</FormLabel>
                                    <div className="flex gap-2">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona el tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {sitiosTipos.map((tipo) => (
                                                    <SelectItem key={tipo.id} value={tipo.id}>
                                                        {tipo.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <ActionCatalogoDialog
                                            label="Tipo de Sitio"
                                            createAction={createSitioTipo}
                                            onItemCreated={handleTipoCreated}
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
                                    <FormLabel>Dirección</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ingresa la dirección"
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
                            name="ciudad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ciudad</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ingresa la ciudad"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
