'use client'

import { useEffect, useState, useActionState, useRef } from 'react'
import { createServicio, updateServicio, getTiposPrecio } from '@/lib/actions/servicios'
import { Servicio, TipoPrecio } from '@/types/cotizaciones'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2, Upload } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface ServicioFormProps {
    servicio?: Servicio
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function ServicioForm({ servicio, open, onOpenChange, onSuccess }: ServicioFormProps) {
    const isEditing = !!servicio
    const [tiposPrecio, setTiposPrecio] = useState<TipoPrecio[]>([])
    const [cantidadPrecios, setCantidadPrecios] = useState(servicio?.cantidad_precios || 1)

    // Tipos de precio seleccionados
    const [precio1Tipo, setPrecio1Tipo] = useState(servicio?.precio_1_tipo || '')
    const [precio2Tipo, setPrecio2Tipo] = useState(servicio?.precio_2_tipo || '')
    const [precio3Tipo, setPrecio3Tipo] = useState(servicio?.precio_3_tipo || '')

    // State for Image Upload
    const [imagePreview, setImagePreview] = useState<string | null>(servicio?.imagen_url || null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(servicio?.imagen_url || '')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const [state, formAction, isPending] = useActionState(
        isEditing ? updateServicio : createServicio,
        { message: '', success: false }
    )

    // Reset state when opening/closing or switching service
    useEffect(() => {
        if (open) {
            getTiposPrecio().then(setTiposPrecio)
            if (servicio) {
                setCantidadPrecios(servicio.cantidad_precios)
                setPrecio1Tipo(servicio.precio_1_tipo || '')
                setPrecio2Tipo(servicio.precio_2_tipo || '')
                setPrecio3Tipo(servicio.precio_3_tipo || '')
                setImagePreview(servicio.imagen_url || null)
                setUploadedImageUrl(servicio.imagen_url || '')
            } else {
                // Reset for new
                setCantidadPrecios(1)
                setPrecio1Tipo('')
                setPrecio2Tipo('')
                setPrecio3Tipo('')
                setImagePreview(null)
                setUploadedImageUrl('')
            }
        }
    }, [open, servicio])

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message)
            onOpenChange(false)
            if (onSuccess) onSuccess()
            // Important: We don't manually reset 'state' here because it persists until next action,
            // but the parent 'key' reset strategy or clean mount is safer.
            // Currently, rely on the fact that if success, we close.
        } else if (state?.message && !state?.success) {
            toast.error(state.message)
        }
    }, [state, onOpenChange, onSuccess])

    const getTipoPrecio = (id: string) => {
        return tiposPrecio.find(t => t.id === id)
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploadingImage(true)

            // 1. Compress Image (Client-side 50% quality approximation via Canvas)
            const compressedFile = await compressImage(file, 0.5)

            // 2. Prepare Path
            // /nombre-servicio (clean) / foto / nombre-servicio (clean) - YYYYMMDD
            // We need the service name. Since we might not have it in state (input field), 
            // we can try to grab it using DOM or just ask user? 
            // Better: Use a generic temp name or ask user to fill name first?
            // User requested strict path. We need "Nombre del Servicio".
            // Let's grab it from the input if possible, or use 'undefined' if empty.
            const nameInput = document.getElementById('nombre') as HTMLInputElement
            const rawName = nameInput?.value || 'servicio-sin-nombre'
            const cleanName = rawName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
            const fileExt = file.name.split('.').pop() || 'jpg'
            const filePath = `${cleanName}/foto/${cleanName}-${dateStr}.${fileExt}`

            // 3. Upload to Supabase 'servicios' bucket
            const { error: uploadError } = await supabase.storage
                .from('servicios')
                .upload(filePath, compressedFile, { upsert: true })

            if (uploadError) throw uploadError

            // 4. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('servicios')
                .getPublicUrl(filePath)

            setUploadedImageUrl(publicUrl)
            setImagePreview(publicUrl)
            toast.success('Imagen subida correctamente')

        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error uploading image:', error)
            toast.error('Error al subir imagen: ' + errMsg)
        } finally {
            setUploadingImage(false)
        }
    }

    const compressImage = (file: File, quality: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    if (!ctx) {
                        reject(new Error('Canvas context not available'))
                        return
                    }
                    canvas.width = img.width
                    canvas.height = img.height
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob)
                            else reject(new Error('Compression failed'))
                        },
                        file.type,
                        quality
                    )
                }
                img.onerror = (err) => reject(err)
            }
            reader.onerror = (err) => reject(err)
        })
    }

    const handleRemoveImage = () => {
        setUploadedImageUrl('')
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Modifica los datos del servicio'
                                : 'Ingresa los datos del nuevo servicio'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {isEditing && (
                            <input type="hidden" name="id" value={servicio.id} />
                        )}

                        {/* Fila 1: Código y Tipo */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código (único) *</Label>
                                <Input
                                    id="codigo"
                                    name="codigo"
                                    placeholder="servicio"
                                    defaultValue={servicio?.codigo}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tipo_servicio">Tipo de Servicio *</Label>
                                <div className="flex gap-2">
                                    <Select
                                        name="tipo_servicio"
                                        defaultValue={servicio?.tipo_servicio || 'ALQUILER'}
                                        required
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALQUILER">ALQUILER</SelectItem>
                                            <SelectItem value="SERVICIO">SERVICIO</SelectItem>
                                            <SelectItem value="PRODUCTO">PRODUCTO</SelectItem>
                                            <SelectItem value="APOYO LOGISTICO">APOYO LOGISTICO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {/* Placeholder for Quick Add functionality later if needed, 
                                        user mentioned '+' for Service Type but it's an enum usually? 
                                        If user wants dynamic types, we need a catalog dialog. 
                                        For now, sticking to enum but acknowledged request. 
                                    */}
                                </div>
                            </div>
                        </div>

                        {/* Fila 2: Nombre */}
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre del Servicio *</Label>
                            <Input
                                id="nombre"
                                name="nombre"
                                placeholder="Alquiler de Excavadora"
                                defaultValue={servicio?.nombre}
                                required
                            />
                        </div>

                        {/* Fila 3: Toneladas, Moneda, Cantidad Precios */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="toneladas">Toneladas</Label>
                                <Input
                                    id="toneladas"
                                    name="toneladas"
                                    placeholder="2"
                                    defaultValue={servicio?.toneladas ?? undefined}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="moneda">Moneda *</Label>
                                <Select
                                    name="moneda"
                                    defaultValue={servicio?.moneda || 'PEN'}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PEN">PEN</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cantidad_precios">Cantidad Precios *</Label>
                                <Select
                                    name="cantidad_precios"
                                    value={cantidadPrecios.toString()}
                                    onValueChange={(v) => setCantidadPrecios(parseInt(v))}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Imagen Upload */}
                        <div className="space-y-2">
                            <Label>Imagen</Label>
                            <input type="hidden" name="imagen_url" value={uploadedImageUrl} />

                            <div className="flex items-start gap-4">
                                <div className="relative w-40 h-32 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/10 group">
                                    {imagePreview ? (
                                        <>
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={handleRemoveImage}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-2">
                                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                                            <span className="text-xs text-muted-foreground">Click para subir</span>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        title="Seleccionar imagen del servicio"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleImageChange}
                                        disabled={uploadingImage}
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground flex-1">
                                    <p>Sube una imagen para el servicio.</p>
                                    <p>Se comprimirá automáticamente al 50%.</p>
                                    {uploadingImage && <p className="text-blue-500 font-medium">Subiendo imagen...</p>}
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-4">Precios</h3>

                            {/* PRECIO 1 */}
                            {cantidadPrecios >= 1 && (
                                <div className="space-y-3 mb-4 p-4 border rounded-lg bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">PRECIO 1 *</Label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2 col-span-1">
                                            <Label htmlFor="precio_1_tipo">Tipo</Label>
                                            <Select
                                                key={tiposPrecio.length}
                                                name="precio_1_tipo"
                                                value={precio1Tipo}
                                                onValueChange={setPrecio1Tipo}
                                                required
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tiposPrecio.map((tipo) => (
                                                        <SelectItem key={tipo.id} value={tipo.id}>
                                                            {tipo.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label htmlFor="precio_1_valor">Valor</Label>
                                            <Input
                                                id="precio_1_valor"
                                                name="precio_1_valor"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                defaultValue={servicio?.precio_1_valor ?? undefined}
                                                required
                                            />
                                        </div>
                                        {getTipoPrecio(precio1Tipo)?.requiere_campo_adicional && (
                                            <div className="space-y-2 col-span-1">
                                                <Label htmlFor="precio_1_campo_adicional">
                                                    {getTipoPrecio(precio1Tipo)?.nombre_campo_adicional || 'C. Adic'}
                                                </Label>
                                                <Input
                                                    id="precio_1_campo_adicional"
                                                    name="precio_1_campo_adicional"
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={servicio?.precio_1_campo_adicional ?? undefined}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PRECIO 2 */}
                            {cantidadPrecios >= 2 && (
                                <div className="space-y-3 mb-4 p-4 border rounded-lg bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">PRECIO 2 *</Label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2 col-span-1">
                                            <Label htmlFor="precio_2_tipo">Tipo</Label>
                                            <Select
                                                key={tiposPrecio.length}
                                                name="precio_2_tipo"
                                                value={precio2Tipo}
                                                onValueChange={setPrecio2Tipo}
                                                required
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tiposPrecio.map((tipo) => (
                                                        <SelectItem key={tipo.id} value={tipo.id}>
                                                            {tipo.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label htmlFor="precio_2_valor">Valor</Label>
                                            <Input
                                                id="precio_2_valor"
                                                name="precio_2_valor"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                defaultValue={servicio?.precio_2_valor ?? undefined}
                                                required
                                            />
                                        </div>
                                        {getTipoPrecio(precio2Tipo)?.requiere_campo_adicional && (
                                            <div className="space-y-2 col-span-1">
                                                <Label htmlFor="precio_2_campo_adicional">
                                                    {getTipoPrecio(precio2Tipo)?.nombre_campo_adicional || 'C. Adic'}
                                                </Label>
                                                <Input
                                                    id="precio_2_campo_adicional"
                                                    name="precio_2_campo_adicional"
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={servicio?.precio_2_campo_adicional ?? undefined}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PRECIO 3 */}
                            {cantidadPrecios >= 3 && (
                                <div className="space-y-3 mb-4 p-4 border rounded-lg bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">PRECIO 3 *</Label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2 col-span-1">
                                            <Label htmlFor="precio_3_tipo">Tipo</Label>
                                            <Select
                                                key={tiposPrecio.length}
                                                name="precio_3_tipo"
                                                value={precio3Tipo}
                                                onValueChange={setPrecio3Tipo}
                                                required
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tiposPrecio.map((tipo) => (
                                                        <SelectItem key={tipo.id} value={tipo.id}>
                                                            {tipo.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label htmlFor="precio_3_valor">Valor</Label>
                                            <Input
                                                id="precio_3_valor"
                                                name="precio_3_valor"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                defaultValue={servicio?.precio_3_valor ?? undefined}
                                            />
                                        </div>
                                        {getTipoPrecio(precio3Tipo)?.requiere_campo_adicional && (
                                            <div className="space-y-2 col-span-1">
                                                <Label htmlFor="precio_3_campo_adicional">
                                                    {getTipoPrecio(precio3Tipo)?.nombre_campo_adicional || 'C. Adic'}
                                                </Label>
                                                <Input
                                                    id="precio_3_campo_adicional"
                                                    name="precio_3_campo_adicional"
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={servicio?.precio_3_campo_adicional ?? undefined}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending || uploadingImage}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending || uploadingImage}>
                            {isPending ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
