'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { getServicios, getTiposPrecio } from '@/lib/actions/servicios'
import { addServicioToCotizacion } from '@/lib/actions/cotizaciones'
import { Servicio, TipoPrecio } from '@/types/cotizaciones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServicioSelectorProps {
    cotizacion_id: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onServicioAdded?: () => void
}

export function ServicioSelector({
    cotizacion_id,
    open,
    onOpenChange,
    onServicioAdded
}: ServicioSelectorProps) {
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [tiposPrecio, setTiposPrecio] = useState<TipoPrecio[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedServicioId, setSelectedServicioId] = useState('')
    const [cantidad, setCantidad] = useState(1)
    const [selectedPrecio, setSelectedPrecio] = useState(1)
    const [loading, setLoading] = useState(false)
    const [loadingServicios, setLoadingServicios] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

    const loadServicios = useCallback(async () => {
        setLoadingServicios(true)
        try {
            const data = await getServicios()
            setServicios(data)
        } catch {
            toast.error('Error al cargar los servicios')
        } finally {
            setLoadingServicios(false)
        }
    }, [])

    useEffect(() => {
        if (open) {
            loadServicios()
            getTiposPrecio().then(setTiposPrecio)
            setCantidad(1)
            setSelectedPrecio(1)
            setSelectedServicioId('')
            setSearchTerm('')
            // Focus search after dialog opens
            setTimeout(() => searchRef.current?.focus(), 100)
        }
    }, [open, loadServicios])

    const filteredServicios = useMemo(() => {
        if (!searchTerm.trim()) return servicios
        const term = searchTerm.toLowerCase()
        return servicios.filter(s =>
            s.nombre.toLowerCase().includes(term) ||
            s.codigo.toLowerCase().includes(term)
        )
    }, [searchTerm, servicios])

    const handleServicioSelect = useCallback((id: string) => {
        setSelectedServicioId(id)
        setSelectedPrecio(1)
    }, [])

    const handleAdd = async () => {
        if (!selectedServicioId) {
            toast.error('Selecciona un servicio')
            return
        }
        if (cantidad <= 0) {
            toast.error('La cantidad debe ser mayor a 0')
            return
        }

        setLoading(true)
        const result = await addServicioToCotizacion(cotizacion_id, selectedServicioId, cantidad, selectedPrecio)
        setLoading(false)

        if (result.success) {
            toast.success(result.message)
            onOpenChange(false)
            onServicioAdded?.()
        } else {
            toast.error(result.message)
        }
    }

    const selectedServicio = servicios.find(s => s.id === selectedServicioId)

    const resolveTipoNombre = (val?: string | null) => {
        if (!val) return val
        const byId = tiposPrecio.find(t => t.id === val)
        return byId ? byId.nombre : val
    }

    const formatPrecio = (valor?: number | null, moneda?: string) => {
        if (!valor) return '-'
        return `${moneda} ${valor.toFixed(2)}`
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Agregar Servicio</DialogTitle>
                    <DialogDescription>
                        Selecciona un servicio del catálogo para agregar a la cotización
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Lista con búsqueda integrada */}
                    <div className="space-y-2">
                        <Label>Servicio *</Label>
                        <div className="rounded-md border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                            {/* Input de búsqueda dentro del contenedor */}
                            <div className="relative border-b">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    ref={searchRef}
                                    placeholder="Buscar por nombre o código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 border-0 rounded-none rounded-t-md shadow-none focus-visible:ring-0"
                                />
                            </div>

                            {/* Lista de resultados */}
                            <div className="max-h-48 overflow-y-auto">
                                {loadingServicios ? (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        Cargando servicios...
                                    </div>
                                ) : filteredServicios.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        {searchTerm ? 'Sin resultados para tu búsqueda' : 'No hay servicios disponibles'}
                                    </div>
                                ) : (
                                    filteredServicios.map((servicio) => (
                                        <button
                                            key={servicio.id}
                                            type="button"
                                            onClick={() => handleServicioSelect(servicio.id)}
                                            className={cn(
                                                'w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors',
                                                selectedServicioId === servicio.id && 'bg-orange-50 hover:bg-orange-50'
                                            )}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium truncate">{servicio.nombre}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {servicio.codigo} · {servicio.tipo_servicio}
                                                </span>
                                            </div>
                                            {selectedServicioId === servicio.id && (
                                                <Check className="h-4 w-4 text-orange-500 shrink-0 ml-2" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detalles y precios del servicio seleccionado */}
                    {selectedServicio && (
                        <div className="space-y-4">
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Tipo:</span>
                                        <span className="ml-2 font-medium">{selectedServicio.tipo_servicio}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Moneda:</span>
                                        <span className="ml-2 font-medium">{selectedServicio.moneda}</span>
                                    </div>
                                    {selectedServicio.toneladas && (
                                        <div>
                                            <span className="text-muted-foreground">Toneladas:</span>
                                            <span className="ml-2 font-medium">{selectedServicio.toneladas}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Seleccionar Tarifa *</Label>
                                <div className="grid gap-2">
                                    {selectedServicio.cantidad_precios >= 1 && (
                                        <div
                                            className={cn(
                                                'flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-slate-50',
                                                selectedPrecio === 1 && 'border-primary bg-primary/5 ring-1 ring-primary'
                                            )}
                                            onClick={() => setSelectedPrecio(1)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-4 h-4 rounded-full border flex items-center justify-center',
                                                    selectedPrecio === 1 ? 'border-primary' : 'border-muted-foreground'
                                                )}>
                                                    {selectedPrecio === 1 && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                                <span className="font-medium">{resolveTipoNombre(selectedServicio.precio_1_tipo) || 'Precio 1'}</span>
                                            </div>
                                            <div className="font-bold">
                                                {formatPrecio(selectedServicio.precio_1_valor, selectedServicio.moneda)}
                                                {selectedServicio.precio_1_campo_adicional && (
                                                    <span className="text-xs font-normal text-muted-foreground ml-1">({selectedServicio.precio_1_campo_adicional}h)</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedServicio.cantidad_precios >= 2 && (
                                        <div
                                            className={cn(
                                                'flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-slate-50',
                                                selectedPrecio === 2 && 'border-primary bg-primary/5 ring-1 ring-primary'
                                            )}
                                            onClick={() => setSelectedPrecio(2)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-4 h-4 rounded-full border flex items-center justify-center',
                                                    selectedPrecio === 2 ? 'border-primary' : 'border-muted-foreground'
                                                )}>
                                                    {selectedPrecio === 2 && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                                <span className="font-medium">{resolveTipoNombre(selectedServicio.precio_2_tipo) || 'Precio 2'}</span>
                                            </div>
                                            <div className="font-bold">
                                                {formatPrecio(selectedServicio.precio_2_valor, selectedServicio.moneda)}
                                                {selectedServicio.precio_2_campo_adicional && (
                                                    <span className="text-xs font-normal text-muted-foreground ml-1">({selectedServicio.precio_2_campo_adicional}h)</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedServicio.cantidad_precios >= 3 && (
                                        <div
                                            className={cn(
                                                'flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-slate-50',
                                                selectedPrecio === 3 && 'border-primary bg-primary/5 ring-1 ring-primary'
                                            )}
                                            onClick={() => setSelectedPrecio(3)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-4 h-4 rounded-full border flex items-center justify-center',
                                                    selectedPrecio === 3 ? 'border-primary' : 'border-muted-foreground'
                                                )}>
                                                    {selectedPrecio === 3 && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                                <span className="font-medium">{resolveTipoNombre(selectedServicio.precio_3_tipo) || 'Precio 3'}</span>
                                            </div>
                                            <div className="font-bold">
                                                {formatPrecio(selectedServicio.precio_3_valor, selectedServicio.moneda)}
                                                {selectedServicio.precio_3_campo_adicional && (
                                                    <span className="text-xs font-normal text-muted-foreground ml-1">({selectedServicio.precio_3_campo_adicional}h)</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedServicio.cantidad_precios >= 2 && (
                                        <div
                                            className={cn(
                                                'flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-slate-50',
                                                selectedPrecio === 0 && 'border-primary bg-primary/5 ring-1 ring-primary'
                                            )}
                                            onClick={() => setSelectedPrecio(0)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-4 h-4 rounded-full border flex items-center justify-center',
                                                    selectedPrecio === 0 ? 'border-primary' : 'border-muted-foreground'
                                                )}>
                                                    {selectedPrecio === 0 && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                                <span className="font-medium">TODOS / SEGÚN TIEMPO</span>
                                            </div>
                                            <div className="font-bold text-sm text-muted-foreground">
                                                (COTIZAR VARIOS PRECIOS)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cantidad */}
                    <div className="space-y-2">
                        <Label htmlFor="cantidad">Cantidad *</Label>
                        <Input
                            id="cantidad"
                            type="number"
                            min="1"
                            step="1"
                            value={cantidad}
                            onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={!selectedServicioId || loading}
                    >
                        {loading ? 'Agregando...' : 'Agregar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
