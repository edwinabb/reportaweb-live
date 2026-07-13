"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    createTerceroSitio,
    updateTerceroSitio,
    deleteTerceroSitio,
    getTerceroSitios
} from "@/lib/actions/terceros-modules"
import { TerceroSitio } from "@/types/terceros"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ActionCatalogoDialog } from "@/components/common/action-catalogo-dialog"
import { getSitiosTipos, createSitioTipo } from "@/lib/actions/catalogos"
import dynamic from 'next/dynamic'

interface TerceroSitiosManagerProps {
    terceroId: string
}

export function TerceroSitiosManager({ terceroId }: TerceroSitiosManagerProps) {
    const [sitios, setSitios] = useState<TerceroSitio[]>([])
    const [sitiosTipos, setSitiosTipos] = useState<{ id: string, nombre: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSitio, setEditingSitio] = useState<TerceroSitio | null>(null)

    const [lat, setLat] = useState<number>(0)
    const [lng, setLng] = useState<number>(0)

    const MapPicker = dynamic(() => import('@/components/common/map-picker'), {
        ssr: false,
        loading: () => <p>Cargando mapa...</p>
    })

    const loadSitios = async () => {
        setIsLoading(true)
        const [data, tipos] = await Promise.all([
            getTerceroSitios(true, terceroId),
            getSitiosTipos()
        ])
        setSitios(data as any)
        setSitiosTipos(tipos)
        setIsLoading(false)
    }

    useEffect(() => {
        if (terceroId) {
            loadSitios()
        }
    }, [terceroId])

    const handleCreate = async (formData: FormData) => {
        // Link this site to the current tercero
        formData.append("tercero_ids", terceroId)
        const result = await createTerceroSitio(null, formData)
        if (result.success) {
            toast.success("Sitio creado")
            setIsDialogOpen(false)
            loadSitios()
        } else {
            toast.error(result.message)
        }
    }

    const handleUpdate = async (formData: FormData) => {
        if (editingSitio) {
            formData.append("id", editingSitio.id)
            // Ensure relationship is preserved or updated needed
            formData.append("tercero_ids", terceroId)
            const result = await updateTerceroSitio(null, formData)
            if (result.success) {
                toast.success("Sitio actualizado")
                setIsDialogOpen(false)
                setEditingSitio(null)
                loadSitios()
            } else {
                toast.error(result.message)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este sitio?")) {
            const result = await deleteTerceroSitio(id)
            if (result.success) {
                toast.success("Sitio eliminado")
                loadSitios()
            } else {
                toast.error(result.message)
            }
        }
    }

    const openCreate = () => {
        setEditingSitio(null)
        setLat(-12.0464) // Default Lima
        setLng(-77.0428)
        setIsDialogOpen(true)
    }

    const openEdit = (sitio: TerceroSitio) => {
        setEditingSitio(sitio)
        setLat(sitio.latitud ? Number(sitio.latitud) : -12.0464)
        setLng(sitio.longitud ? Number(sitio.longitud) : -77.0428)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Lista de Sitios</h3>
                <Button onClick={openCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Sitio
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : sitios.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-muted/10 text-muted-foreground">
                    No hay sitios registrados.
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead>Ciudad</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sitios.map((sitio) => (
                                <TableRow key={sitio.id}>
                                    <TableCell className="font-medium">{sitio.nombre}</TableCell>
                                    <TableCell>{sitio.codigo || "-"}</TableCell>
                                    <TableCell>{sitio.tipo || "-"}</TableCell>
                                    <TableCell>{sitio.direccion || "-"}</TableCell>
                                    <TableCell>{sitio.ciudad || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(sitio)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(sitio.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingSitio ? "Editar Sitio" : "Nuevo Sitio"}</DialogTitle>
                    </DialogHeader>
                    <form action={editingSitio ? handleUpdate : handleCreate} className="space-y-4">
                        <Input type="hidden" name="latitud" value={lat} />
                        <Input type="hidden" name="longitud" value={lng} />

                        <div className="grid gap-2">
                            <Label htmlFor="nombre">Nombre del Sitio *</Label>
                            <Input
                                id="nombre"
                                name="nombre"
                                defaultValue={editingSitio?.nombre}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="codigo">Código</Label>
                                <Input
                                    id="codigo"
                                    name="codigo"
                                    defaultValue={editingSitio?.codigo}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tipo">Tipo</Label>
                                <div className="flex gap-2">
                                    <Select name="tipo" defaultValue={editingSitio?.tipo_id || (sitiosTipos.length > 0 ? sitiosTipos[0].id : "")}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccionar tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sitiosTipos.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <ActionCatalogoDialog
                                        label="Tipo Sitio"
                                        createAction={createSitioTipo}
                                        onItemCreated={(newItem: { id: string, nombre: string }) => {
                                            setSitiosTipos([...sitiosTipos, newItem])
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="direccion">Dirección</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="direccion"
                                        name="direccion"
                                        defaultValue={editingSitio?.direccion}
                                        placeholder="Av. Ejemplo 123"
                                        className="h-9"
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 shrink-0"
                                        onClick={async () => {
                                            // Get values using direct DOM access or state? 
                                            // Since we use uncontrolled inputs (defaultValue), we grab from DOM or use refs?
                                            // Easiest is to change to controlled inputs or use document.getElementById since inside Dialog.
                                            // Let's use getElementById
                                            const dir = (document.getElementById('direccion') as HTMLInputElement)?.value
                                            const ciu = (document.getElementById('ciudad') as HTMLInputElement)?.value

                                            if (!dir) {
                                                toast.error("Ingrese una dirección para buscar")
                                                return
                                            }

                                            const query = `${dir}, ${ciu || ''}, Peru`
                                            toast.info("Buscando coordenadas...")

                                            try {
                                                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
                                                const data = await res.json()

                                                if (data && data.length > 0) {
                                                    const newLat = parseFloat(data[0].lat)
                                                    const newLng = parseFloat(data[0].lon)
                                                    setLat(newLat)
                                                    setLng(newLng)
                                                    toast.success("Ubicación encontrada")
                                                } else {
                                                    toast.error("No se encontraron resultados")
                                                }
                                            } catch (e) {
                                                toast.error("Error al buscar ubicación")
                                            }
                                        }}
                                        title="Buscar coordenadas"
                                    >
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ciudad">Ciudad / Distrito</Label>
                                <Input
                                    id="ciudad"
                                    name="ciudad"
                                    defaultValue={editingSitio?.ciudad}
                                    placeholder="Distrito, Ciudad"
                                    className="h-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Ubicación (Georreferencia)</Label>
                            <div className="border rounded-md overflow-hidden">
                                <MapPicker
                                    lat={lat}
                                    lng={lng}
                                    onChange={(l, g) => {
                                        setLat(l)
                                        setLng(g)
                                    }}
                                />
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Lat: {lat.toFixed(6)}</span>
                                <span>Lng: {lng.toFixed(6)}</span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
