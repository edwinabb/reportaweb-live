'use client'

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Search } from "lucide-react"
import dynamic from 'next/dynamic'

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

const MapPicker = dynamic(() => import('@/components/common/map-picker'), {
    ssr: false,
    loading: () => <p>Cargando mapa...</p>
})

const DEFAULT_LAT = -12.0464 // Lima
const DEFAULT_LNG = -77.0428

// Código y Tipo son requeridos SOLO en creación: 1.689 sitios migrados vienen
// sin esos datos y su edición no debe quedar bloqueada (DUDA-TER-008).
const buildFormSchema = (isEdit: boolean) => z.object({
    id: z.string().optional(),
    codigo: z.string().optional(),
    nombre: z.string().min(1, "Nombre es requerido"),
    tercero_ids: z.array(z.string()).min(1, "Selecciona al menos un tercero"),
    tipo: z.string().optional(),
    direccion: z.string().optional(),
    ciudad: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!isEdit) {
        if (!data.codigo) ctx.addIssue({ code: "custom", path: ["codigo"], message: "Código es requerido" })
        if (!data.tipo) ctx.addIssue({ code: "custom", path: ["tipo"], message: "Tipo es requerido" })
    }
})

type SitioFormValues = z.infer<ReturnType<typeof buildFormSchema>>

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sitiosTipos, setSitiosTipos] = useState<any[]>([])
    // Coordenadas: null = sin georreferencia (no se escribe en BD si el usuario no la fija)
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [geocoding, setGeocoding] = useState(false)

    const isEdit = !!sitioToEdit
    const formSchema = useMemo(() => buildFormSchema(isEdit), [isEdit])

    const form = useForm<SitioFormValues>({
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
                    // La columna real es terceros_sitios.tipo (uuid FK a sitios_tipo);
                    // getTerceroSitios expone tipo_id = uuid y tipo = nombre joineado
                    tipo: sitioToEdit.tipo_id || "",
                    direccion: sitioToEdit.direccion || "",
                    ciudad: sitioToEdit.ciudad || "",
                })
                setCoords(
                    sitioToEdit.latitud != null && sitioToEdit.longitud != null
                        ? { lat: Number(sitioToEdit.latitud), lng: Number(sitioToEdit.longitud) }
                        : null
                )
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
                setCoords(null)
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

    const handleGeocode = async () => {
        const dir = form.getValues('direccion')
        const ciu = form.getValues('ciudad')

        if (!dir) {
            toast.error("Ingrese una dirección para buscar")
            return
        }

        const query = `${dir}, ${ciu || ''}, Peru`
        setGeocoding(true)
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
            const data = await res.json()

            if (data && data.length > 0) {
                setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
                toast.success("Ubicación encontrada")
            } else {
                toast.error("No se encontraron resultados")
            }
        } catch {
            toast.error("Error al buscar ubicación")
        } finally {
            setGeocoding(false)
        }
    }

    async function onSubmit(values: SitioFormValues) {
        const formData = new FormData()
        formData.append('id', values.id || '')
        formData.append('codigo', values.codigo || '')
        formData.append('nombre', values.nombre)
        const terceroIds = (defaultTerceroId && !values.tercero_ids.includes(defaultTerceroId))
            ? [...values.tercero_ids, defaultTerceroId]
            : values.tercero_ids
        formData.append('tercero_ids', terceroIds.join(','))
        formData.append('tipo', values.tipo || '')
        formData.append('direccion', values.direccion || '')
        formData.append('ciudad', values.ciudad || '')
        if (coords) {
            formData.append('latitud', String(coords.lat))
            formData.append('longitud', String(coords.lng))
        }

        const action = isEdit ? updateTerceroSitio : createTerceroSitio
        const result = await action(null, formData)

        if (result.success) {
            toast.success(isEdit ? "Sitio actualizado" : "Sitio creado")
            if (setOpen) setOpen(false)
            if (!isEdit) form.reset()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (onSuccess) onSuccess((result as any).nombre)
        } else {
            toast.error(result.message || "Error al procesar")
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTipoCreated = (newTipo: any) => {
        setSitiosTipos(prev => [...prev, newTipo])
        form.setValue('tipo', newTipo.id)
    }

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
                                        <FormLabel>Código {!isEdit && '*'}</FormLabel>
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
                                    <FormLabel>Tipo {!isEdit && '*'}</FormLabel>
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="direccion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dirección</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input
                                                    placeholder="Ingresa la dirección"
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                />
                                            </FormControl>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="shrink-0"
                                                onClick={handleGeocode}
                                                disabled={geocoding}
                                                title="Buscar coordenadas"
                                            >
                                                {geocoding
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <Search className="h-4 w-4" />}
                                            </Button>
                                        </div>
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
                        </div>

                        <div className="space-y-2">
                            <FormLabel>Ubicación (Georreferencia)</FormLabel>
                            <div className="border rounded-md overflow-hidden">
                                <MapPicker
                                    lat={coords?.lat ?? DEFAULT_LAT}
                                    lng={coords?.lng ?? DEFAULT_LNG}
                                    onChange={(lat, lng) => setCoords({ lat, lng })}
                                />
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                                {coords ? (
                                    <>
                                        <span>Lat: {coords.lat.toFixed(6)}</span>
                                        <span>Lng: {coords.lng.toFixed(6)}</span>
                                    </>
                                ) : (
                                    <span>Sin georreferencia (haz click en el mapa o busca la dirección)</span>
                                )}
                            </div>
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
