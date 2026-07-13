'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CotizacionDetalleWithRelations, OfertaProveedor, Servicio, HistoricalClientQuote, HistoricalSupplierOffer } from '@/types/cotizaciones'
import { Tercero, TerceroContacto } from '@/types/terceros'
import {
    updatePreciosDetalle,
    getOfertasProveedores,
    addOfertaProveedor,
    deleteOfertaProveedor,
    getHistoricalClientQuotes,
    getHistoricalSupplierOffers,
} from '@/lib/actions/cotizaciones'
import { updateServicioPrecioValor } from '@/lib/actions/servicios'
// getTiposPrecio removed — not currently used

import { getTerceroContactos } from '@/lib/actions/terceros-modules'
import { getTerceros } from '@/lib/actions/terceros'
import { addOptionValue } from '@/lib/actions/opciones'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Loader2, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuickTerceroDialog } from '@/components/terceros/quick-tercero-dialog'
import { ContactoDialog } from '@/components/terceros/contacto-dialog'
import { AddOptionDialog } from '@/components/common/add-option-dialog'
import { AddButton } from '@/components/common/add-button'

interface CotizacionPreciosFormProps {
    cotizacion_id: string
    cotizacion_moneda: string
    cliente_id?: string | null
    detalles: CotizacionDetalleWithRelations[]
    onUpdate?: () => void
    readOnly?: boolean
    opcionesFormaPago?: string[]
    opcionesPlazoPago?: string[]
}

export function CotizacionPreciosForm({
    cotizacion_id,
    cotizacion_moneda,
    cliente_id,
    detalles,
    onUpdate,
    readOnly = false,
    opcionesFormaPago = [],
    opcionesPlazoPago = []
}: CotizacionPreciosFormProps) {
    const [ofertas, setOfertas] = useState<OfertaProveedor[]>([])

    // Lists State
    const [proveedoresList, setProveedoresList] = useState<Tercero[]>([])
    const [proveedorSearch, setProveedorSearch] = useState('')
    const [contactosList, setContactosList] = useState<TerceroContacto[]>([])
    const [formasPagoList, setFormasPagoList] = useState<string[]>(opcionesFormaPago)
    const [plazosPagoList, setPlazosPagoList] = useState<string[]>(opcionesPlazoPago)


    // UI States
    const [ofertaDialogOpen, setOfertaDialogOpen] = useState(false)
    const [editPrecioDialogOpen, setEditPrecioDialogOpen] = useState(false)
    const [selectedDetalleId, setSelectedDetalleId] = useState<string | null>(null)
    const [editingDetalle, setEditingDetalle] = useState<CotizacionDetalleWithRelations | null>(null)

    // Quick Add States
    const [quickProviderOpen, setQuickProviderOpen] = useState(false)
    const [quickContactOpen, setQuickContactOpen] = useState(false)
    const [quickPaymentMethodOpen, setQuickPaymentMethodOpen] = useState(false)
    const [quickPaymentTermOpen, setQuickPaymentTermOpen] = useState(false)

    // Form States - Oferta
    const [formOferta, setFormOferta] = useState({
        servicio_id: '',
        id_oferta_manual: '',
        fecha_oferta: new Date().toISOString().split('T')[0],
        proveedor_id: '',
        contacto_id: '',
        proveedor_nombre: '',
        precio: '',
        moneda: 'USD',
        forma_pago: '',
        plazo_pago: '',
        fecha_inicio_preliminar: '',
        fecha_solicitud: '',
        sitio_texto: '',
        descripcion_requerimiento: '',
        observaciones: '',

        // Multi-Price Fields
        cantidad: '1',
        precio_1_valor: '',
        precio_1_campo_adicional: '',
        precio_2_valor: '',
        precio_2_campo_adicional: '',
        precio_3_valor: '',
        precio_3_campo_adicional: '',
    })

    // Edit Custom Price State
    const [newPriceValue, setNewPriceValue] = useState('')

    // Precios catálogo editables (keyed by `${servicio_id}_${1|2|3}`)
    const [preciosCatalogo, setPreciosCatalogo] = useState<Record<string, string>>({})
    const [savingCatalogo, setSavingCatalogo] = useState<Record<string, boolean>>({})

    const loadData = useCallback(async () => {
        const ofertasData = await getOfertasProveedores(cotizacion_id)
        setOfertas(ofertasData)
    }, [cotizacion_id])



    useEffect(() => {
        const fetch = async () => {
            await loadData()
        }
        fetch()
    }, [loadData])

    // Inicializa preciosCatalogo con precios del catálogo de cada servicio
    useEffect(() => {
        const init: Record<string, string> = {}
        for (const d of detalles) {
            if (!d.servicio) continue
            init[`${d.servicio.id}_1`] = String(d.servicio.precio_1_valor ?? '')
            if (d.servicio.cantidad_precios >= 2) init[`${d.servicio.id}_2`] = String(d.servicio.precio_2_valor ?? '')
            if (d.servicio.cantidad_precios >= 3) init[`${d.servicio.id}_3`] = String(d.servicio.precio_3_valor ?? '')
        }
        setPreciosCatalogo(init)
    }, [detalles])

    // Load proveedores when dialog opens
    useEffect(() => {
        if (ofertaDialogOpen && proveedoresList.length === 0) {
            getTerceros().then(data => {
                const provs = (data as Tercero[])
                    .filter(t => t.tipo === 'proveedor' || t.tipo === 'ambos')
                    .sort((a, b) => a.razon_social.localeCompare(b.razon_social, 'es'))
                setProveedoresList(provs)
            })
        }
        if (!ofertaDialogOpen) {
            setProveedorSearch('')
        }
    }, [ofertaDialogOpen])

    const filteredProveedores = useMemo(() => {
        if (!proveedorSearch.trim()) return proveedoresList
        const term = proveedorSearch.toLowerCase()
        return proveedoresList.filter(p => p.razon_social.toLowerCase().includes(term))
    }, [proveedorSearch, proveedoresList])

    // Update contacts when provider changes
    useEffect(() => {
        if (formOferta.proveedor_id) {
            const load = async () => {
                const contacts = await getTerceroContactos(true, formOferta.proveedor_id)
                setContactosList(contacts)
            }
            load()
        } else {
            // Wrapped in a functional update or just avoided synch call if possible
            // But usually this is the way. Let's try to wrap it.
            const reset = async () => setContactosList([])
            reset()
        }
    }, [formOferta.proveedor_id])

    // Quick Add Handlers
    const handleProviderCreated = (res: { tercero?: Tercero }) => {
        if (res.tercero) {
            const t = res.tercero
            setProveedoresList(prev => [t, ...prev])
            setFormOferta(prev => ({ ...prev, proveedor_id: t.id }))
        }
    }

    const handleContactCreated = async () => {
        if (formOferta.proveedor_id) {
            const contacts = await getTerceroContactos(true, formOferta.proveedor_id)
            setContactosList(contacts)
        }
    }

    const handleFormaPagoCreated = (newValue: string) => {
        setFormasPagoList(prev => [...prev, newValue])
        setFormOferta(prev => ({ ...prev, forma_pago: newValue }))
    }

    const handlePlazoPagoCreated = (newValue: string) => {
        setPlazosPagoList(prev => [...prev, newValue])
        setFormOferta(prev => ({ ...prev, plazo_pago: newValue }))
    }

    const handleRowClick = (detalleId: string) => {
        setSelectedDetalleId(detalleId)
    }



    const handleEditPrecioClick = (detalle: CotizacionDetalleWithRelations) => {
        if (detalle.precio_seleccionado) {
            handleEditSpecificPrice(detalle, detalle.precio_seleccionado)
        }
    }

    const handleEditSpecificPrice = (detalle: CotizacionDetalleWithRelations, priceIndex: number) => {
        setSelectedDetalleId(detalle.id)

        let initialValue = 0
        let initialType = ''
        let initialCampo = null

        if (priceIndex === 1) {
            initialValue = detalle.servicio?.precio_1_valor || 0
            initialType = detalle.servicio?.precio_1_tipo || ''
            initialCampo = detalle.servicio?.precio_1_campo_adicional
        } else if (priceIndex === 2) {
            initialValue = detalle.servicio?.precio_2_valor || 0
            initialType = detalle.servicio?.precio_2_tipo || ''
            initialCampo = detalle.servicio?.precio_2_campo_adicional
        } else if (priceIndex === 3) {
            initialValue = detalle.servicio?.precio_3_valor || 0
            initialType = detalle.servicio?.precio_3_tipo || ''
            initialCampo = detalle.servicio?.precio_3_campo_adicional
        }

        setEditingDetalle({
            ...detalle,
            precio_seleccionado: priceIndex,
            precio_tipo: initialType,
            precio_campo_adicional: initialCampo ?? undefined
        })
        setNewPriceValue(initialValue.toString())
        setEditPrecioDialogOpen(true)
    }

    const handleSaveCustomPrice = async () => {
        if (!editingDetalle || !newPriceValue) return
        if (!editingDetalle.precio_seleccionado || !editingDetalle.precio_tipo) {
            toast.error("Debe seleccionar un precio base primero")
            return
        }

        const result = await updatePreciosDetalle(
            editingDetalle.id,
            editingDetalle.precio_seleccionado,
            editingDetalle.precio_tipo,
            parseFloat(newPriceValue),
            editingDetalle.precio_campo_adicional
        )

        if (result.success) {
            toast.success("Precio actualizado correctamente")
            setEditPrecioDialogOpen(false)
            setEditingDetalle(null)
            onUpdate?.()
        } else {
            toast.error(result.message)
        }
    }

    // Total = (p1 + p2 + p3) * cantidad
    const finalPrecioValue = useMemo(() => {
        const p1 = parseFloat(formOferta.precio_1_valor) || 0
        const p2 = parseFloat(formOferta.precio_2_valor) || 0
        const p3 = parseFloat(formOferta.precio_3_valor) || 0
        const cant = parseFloat(formOferta.cantidad) || 1
        const total = (p1 + p2 + p3) * cant
        return total > 0 ? total.toString() : '0'
    }, [
        formOferta.precio_1_valor, formOferta.precio_2_valor, formOferta.precio_3_valor,
        formOferta.cantidad
    ])

    const handleAddOferta = async () => {
        if (!formOferta.servicio_id) {
            toast.error("Debes seleccionar un servicio")
            return
        }
        if (parseFloat(finalPrecioValue) <= 0) {
            toast.error("Ingresa al menos un precio")
            return
        }

        try {
            // Find provider name if selected from ID
            let provName = formOferta.proveedor_nombre
            if (formOferta.proveedor_id) {
                const p = proveedoresList.find(x => x.id === formOferta.proveedor_id)
                if (p) provName = p.razon_social
            }

            await addOfertaProveedor(cotizacion_id, {
                ...formOferta,
                precio: parseFloat(finalPrecioValue),
                proveedor_nombre: provName,

                // Parse strings to numbers
                cantidad: parseFloat(formOferta.cantidad) || 1,
                precio_1_valor: parseFloat(formOferta.precio_1_valor) || undefined,
                precio_1_campo_adicional: parseFloat(formOferta.precio_1_campo_adicional) || undefined,
                precio_2_valor: parseFloat(formOferta.precio_2_valor) || undefined,
                precio_2_campo_adicional: parseFloat(formOferta.precio_2_campo_adicional) || undefined,
                precio_3_valor: parseFloat(formOferta.precio_3_valor) || undefined,
                precio_3_campo_adicional: parseFloat(formOferta.precio_3_campo_adicional) || undefined,
            })
            toast.success("Oferta agregada correctamente")
            setOfertaDialogOpen(false)
            // Reset form
            setFormOferta(prev => ({
                ...prev,
                precio: '',
                observaciones: '',
                id_oferta_manual: '', // Clear manual ID to avoid duplicates
                servicio_id: '', // Clear service
                cantidad: '1',
                precio_1_valor: '',
                precio_1_campo_adicional: '',
                precio_2_valor: '',
                precio_2_campo_adicional: '',
                precio_3_valor: '',
                precio_3_campo_adicional: ''
            }))
            loadData()
            onUpdate?.() // Notify parent to refresh if needed
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Error al agregar oferta'
            toast.error(errMsg)
            console.error(error)
        }
    }

    const handleDeleteOferta = async (oferta_id: string) => {
        if (!confirm('¿Eliminar esta oferta?')) return
        const result = await deleteOfertaProveedor(oferta_id)
        if (result.success) {
            toast.success(result.message)
            loadData()
            onUpdate?.()
        } else {
            toast.error(result.message)
        }
    }

    const formatPrecio = (valor?: number | null, moneda?: string) => {
        if (!valor) return '-'
        return `${moneda || cotizacion_moneda} ${valor.toFixed(2)}`
    }

    // Computed property for the selected detail object
    const selectedDetalle = detalles.find(d => d.id === selectedDetalleId)
    const selectedServicio = selectedDetalle?.servicio

    return (
        <div className="space-y-6">

            {/* Sección 1: Precios de la cotización actual (MASTER) */}
            <Card>
                <CardHeader>
                    <CardTitle>Precios de la Cotización</CardTitle>
                    <CardDescription>
                        Selecciona el servicio para ver detalles y ajustar precios
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead>Cant.</TableHead>
                                    <TableHead>Precios catálogo</TableHead>
                                    <TableHead className="w-52">Actualizar Catálogo</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detalles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            No hay servicios en esta cotización
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    detalles.map((detalle) => (
                                        <TableRow
                                            key={detalle.id}
                                            className={`cursor-pointer transition-colors ${selectedDetalleId === detalle.id ? 'bg-muted/50 border-l-4 border-l-primary' : 'hover:bg-muted/20'}`}
                                            onClick={() => handleRowClick(detalle.id)}
                                        >
                                            <TableCell>
                                                {detalle.servicio ? (
                                                    <div>
                                                        <div className="font-medium">{detalle.servicio.nombre}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {detalle.servicio.codigo}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    'Servicio no encontrado'
                                                )}
                                            </TableCell>
                                            <TableCell>{detalle.cantidad}</TableCell>
                                            <TableCell>
                                                {detalle.servicio ? (
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="space-y-1 flex-1">
                                                            {detalle.servicio.cantidad_precios >= 1 && (
                                                                <div className="text-sm">
                                                                    <div className="font-medium text-xs text-muted-foreground uppercase">{detalle.servicio.precio_1_tipo_nombre || detalle.servicio.precio_1_tipo || 'Precio 1'}</div>
                                                                    <div className="text-muted-foreground">
                                                                        {formatPrecio(detalle.servicio.precio_1_valor, detalle.servicio.moneda)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {detalle.servicio.cantidad_precios >= 2 && (
                                                                <div className="text-sm border-t pt-1 mt-1">
                                                                    <div className="font-medium text-xs text-muted-foreground uppercase">{detalle.servicio.precio_2_tipo_nombre || detalle.servicio.precio_2_tipo || 'Precio 2'}</div>
                                                                    <div className="text-muted-foreground">
                                                                        {formatPrecio(detalle.servicio.precio_2_valor, detalle.servicio.moneda)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {detalle.servicio.cantidad_precios >= 3 && (
                                                                <div className="text-sm border-t pt-1 mt-1">
                                                                    <div className="font-medium text-xs text-muted-foreground uppercase">{detalle.servicio.precio_3_tipo_nombre || detalle.servicio.precio_3_tipo || 'Precio 3'}</div>
                                                                    <div className="text-muted-foreground">
                                                                        {formatPrecio(detalle.servicio.precio_3_valor, detalle.servicio.moneda)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!readOnly && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6 text-muted-foreground hover:text-black mt-1"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleEditPrecioClick(detalle)
                                                                }}
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">Sin información de servicio</span>
                                                )}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                {detalle.servicio ? (
                                                    <div className="flex flex-col gap-2">
                                                        {Array.from({ length: detalle.servicio.cantidad_precios }, (_, i) => {
                                                            const idx = (i + 1) as 1 | 2 | 3
                                                            const nombreKey = `precio_${idx}_tipo_nombre` as 'precio_1_tipo_nombre' | 'precio_2_tipo_nombre' | 'precio_3_tipo_nombre'
                                                            const tipoKey = `precio_${idx}_tipo` as 'precio_1_tipo' | 'precio_2_tipo' | 'precio_3_tipo'
                                                            const tipoNombre = detalle.servicio![nombreKey] || detalle.servicio![tipoKey] || `Precio ${idx}`
                                                            const stateKey = `${detalle.servicio!.id}_${idx}`
                                                            const isSaving = !!savingCatalogo[stateKey]
                                                            return (
                                                                <div key={idx} className="flex items-center gap-1">
                                                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                                                                            {tipoNombre}
                                                                        </span>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="h-7 text-sm w-24"
                                                                            placeholder="0.00"
                                                                            value={preciosCatalogo[stateKey] ?? ''}
                                                                            onChange={e => setPreciosCatalogo(prev => ({ ...prev, [stateKey]: e.target.value }))}
                                                                            disabled={readOnly || isSaving}
                                                                        />
                                                                    </div>
                                                                    {!readOnly && (
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground mt-4"
                                                                            disabled={isSaving}
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation()
                                                                                const val = parseFloat(preciosCatalogo[stateKey] ?? '')
                                                                                if (isNaN(val)) return
                                                                                setSavingCatalogo(prev => ({ ...prev, [stateKey]: true }))
                                                                                const r = await updateServicioPrecioValor(detalle.servicio!.id, idx, val)
                                                                                setSavingCatalogo(prev => ({ ...prev, [stateKey]: false }))
                                                                                if (r.success) toast.success('Precio actualizado')
                                                                                else toast.error(r.message)
                                                                                onUpdate?.()
                                                                            }}
                                                                        >
                                                                            {isSaving
                                                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                : <Check className="h-3.5 w-3.5" />}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                            </TableCell>

                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent >
            </Card >

            {/* DETAIL SECTIONS only if a row is selected */}
            {
                selectedDetalleId && selectedServicio ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">

                        <HistorySection
                            servicioId={selectedServicio.id}
                            servicioNombre={selectedServicio.nombre}
                            servicio={selectedServicio}
                            clienteId={cliente_id ?? null}
                        />

                        {/* Sección 3: Ofertas de proveedores (DETAIL - Now separate or part of tabs? 
                        User asked for: 
                        1. Reference Prices (Catalog)
                        2. Historical Client Quotes
                        3. Supplier Offers (Historic/Reference) 
                        
                        The current "Ofertas de Proveedores" allows ADDING specific offers for THIS quote. 
                        The "Historical" is for reference.
                        Let's keep the current "Specific Offers" card as it allows management, but maybe move it or keep it side-by-side.
                        
                        For simplicity and layout:
                        - Left/Top: Catalog Prices
                        - Right/Bottom: Historical Data Tabs
                        
                        Let's put the specific offers management BELOW the history or side-by-side.
                    */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Ofertas Específicas para esta Cotización</CardTitle>
                                        <CardDescription>
                                            Registra ofertas de proveedores vinculadas a esta cotización
                                        </CardDescription>
                                    </div>
                                    {!readOnly && (
                                        <Button size="sm" onClick={() => {
                                            setFormOferta(prev => ({
                                                ...prev,
                                                servicio_id: selectedServicio.id
                                            }))
                                            setOfertaDialogOpen(true)
                                        }}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Agregar Oferta
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Existing Offers Table */}
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Proveedor</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ofertas.filter(o => o.servicio_id === selectedServicio.id).length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                                                        No hay ofertas registradas para esta cotización
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                ofertas
                                                    .filter(o => o.servicio_id === selectedServicio.id)
                                                    .map((oferta) => (
                                                        <TableRow key={oferta.id}>
                                                            <TableCell className="font-medium">
                                                                <div className="flex flex-col">
                                                                    <span>{oferta.proveedor_nombre}</span>
                                                                    {oferta.forma_pago && (
                                                                        <span className="text-xs text-muted-foreground">{oferta.forma_pago}</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {formatPrecio(oferta.precio, oferta.moneda)}
                                                            </TableCell>
                                                            <TableCell>
                                                                {!readOnly && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleDeleteOferta(oferta.id)}
                                                                        className="text-destructive h-8 w-8"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="p-12 border-2 border-dashed rounded-lg text-center text-muted-foreground bg-muted/10">
                        <p>Selecciona un servicio de la tabla para ver sus precios de referencia y ofertas.</p>
                    </div>
                )
            }

            {/* Dialog para agregar oferta de proveedor */}
            <Dialog open={ofertaDialogOpen} onOpenChange={setOfertaDialogOpen}>
                <DialogContent className="max-w-[800px] max-h-[90vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-xl font-bold uppercase text-center border-b pb-4">Registrar Oferta de Proveedor</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4 overflow-y-auto flex-1 pr-1">
                        {/* Row 1 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ID Oferta <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="Ingresa ID"
                                    value={formOferta.id_oferta_manual}
                                    onChange={e => setFormOferta({ ...formOferta, id_oferta_manual: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de la Oferta <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    value={formOferta.fecha_oferta}
                                    onChange={e => setFormOferta({ ...formOferta, fecha_oferta: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Row 2: Proveedor */}
                        <div className="space-y-2">
                            <Label>Nombre del Proveedor <span className="text-red-500">*</span></Label>
                            <div className="flex gap-2 items-start">
                                <div className="flex-1 rounded-md border focus-within:ring-2 focus-within:ring-ring">
                                    <div className="relative border-b">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                        <Input
                                            placeholder="Buscar proveedor..."
                                            value={proveedorSearch}
                                            onChange={e => setProveedorSearch(e.target.value)}
                                            className="pl-8 border-0 rounded-none rounded-t-md shadow-none focus-visible:ring-0 h-8 text-sm"
                                        />
                                    </div>
                                    <div className="max-h-36 overflow-y-auto">
                                        {filteredProveedores.length === 0 ? (
                                            <div className="py-3 text-center text-xs text-muted-foreground">
                                                {proveedorSearch ? 'Sin resultados' : 'No hay proveedores'}
                                            </div>
                                        ) : filteredProveedores.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setFormOferta({ ...formOferta, proveedor_id: p.id })}
                                                className={cn(
                                                    'w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors',
                                                    formOferta.proveedor_id === p.id && 'bg-orange-50 hover:bg-orange-50'
                                                )}
                                            >
                                                <span className="truncate">{p.razon_social}</span>
                                                {formOferta.proveedor_id === p.id && <Check className="h-3.5 w-3.5 text-orange-500 shrink-0 ml-1" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <AddButton onClick={() => setQuickProviderOpen(true)} />
                            </div>
                        </div>

                        {/* Row 3: Contacto del Proveedor */}
                        <div className="space-y-2">
                            <Label>Contacto del Proveedor</Label>
                            <div className="flex gap-2">
                                <Select
                                    disabled={!formOferta.proveedor_id}
                                    value={formOferta.contacto_id}
                                    onValueChange={val => setFormOferta({ ...formOferta, contacto_id: val })}
                                >
                                    <SelectTrigger className="min-w-0 flex-1">
                                        <SelectValue placeholder="Selecciona el contacto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contactosList.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>
                                        ))}
                                        {contactosList.length === 0 && (
                                            <SelectItem value="_empty" disabled>Sin contactos registrados</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <AddButton
                                    onClick={() => setQuickContactOpen(true)}
                                    disabled={!formOferta.proveedor_id}
                                />
                            </div>
                        </div>

                        {/* Row 4: Descripción */}
                        <div className="space-y-2">
                            <Label>Descripción general del requerimiento</Label>
                            <Input
                                value={formOferta.descripcion_requerimiento}
                                onChange={e => setFormOferta({ ...formOferta, descripcion_requerimiento: e.target.value })}
                            />
                        </div>

                        {/* Row 4a: Moneda + Forma de pago */}
                        <div className="grid grid-cols-[120px_1fr] gap-4">
                            <div className="space-y-2">
                                <Label>Moneda <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formOferta.moneda}
                                    onValueChange={val => setFormOferta({ ...formOferta, moneda: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="PEN">PEN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Forma de pago <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={formOferta.forma_pago}
                                        onValueChange={val => setFormOferta({ ...formOferta, forma_pago: val })}
                                    >
                                        <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>
                                            {formasPagoList.map(item => (
                                                <SelectItem key={item} value={item}>{item}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <AddButton onClick={() => setQuickPaymentMethodOpen(true)} />
                                </div>
                            </div>
                        </div>

                        {/* Row 4b: Fecha inicio + Plazo de pago */}
                        <div className="grid grid-cols-[160px_1fr] gap-4">
                            <div className="space-y-2">
                                <Label>Fecha inicio preliminar</Label>
                                <Input
                                    type="date"
                                    value={formOferta.fecha_inicio_preliminar}
                                    onChange={e => setFormOferta({ ...formOferta, fecha_inicio_preliminar: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Plazo de pago <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={formOferta.plazo_pago}
                                        onValueChange={val => setFormOferta({ ...formOferta, plazo_pago: val })}
                                    >
                                        <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>
                                            {plazosPagoList.map(item => (
                                                <SelectItem key={item} value={item}>{item}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <AddButton onClick={() => setQuickPaymentTermOpen(true)} />
                                </div>
                            </div>
                        </div>

                        {/* Title: Agregar Servicio */}
                        <div className="border-t pt-4">
                            <h3 className="font-bold text-lg mb-2">Agregar un servicio</h3>
                        </div>

                        {/* Row 5: Service Selection */}
                        <div className="space-y-2">
                            <Label>Selecciona el Servicio Solicitado</Label>
                            <Select
                                value={formOferta.servicio_id}
                                onValueChange={val => setFormOferta({ ...formOferta, servicio_id: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el servicio solicitado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {detalles.map(d => (
                                        d.servicio && <SelectItem key={d.servicio.id} value={d.servicio.id}>{d.servicio.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>



                            {!formOferta.precio && (
                                <p className="text-red-500 text-sm mt-1">
                                    Selecciona el servicio e ingresa el precio ofertado.
                                </p>
                            )}
                        </div>

                        {/* Dynamic Price Inputs based on Selected Service */}
                        {formOferta.servicio_id && (() => {
                            const selectedServicio = detalles.find(d => d.servicio?.id === formOferta.servicio_id)?.servicio
                            if (!selectedServicio) return null

                            return (
                                <div className="bg-slate-50 p-4 rounded-md border space-y-4">
                                    <h4 className="font-semibold text-sm text-slate-700">Desglose de Precios</h4>

                                    {/* Global Qty */}
                                    <div className="md:w-1/4">
                                        <Label className="text-xs">Cantidad</Label>
                                        <Input
                                            type="number"
                                            value={formOferta.cantidad}
                                            onChange={e => setFormOferta({ ...formOferta, cantidad: e.target.value })}
                                        />
                                    </div>

                                    {/* Precio 1 */}
                                    {selectedServicio.cantidad_precios >= 1 && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">{selectedServicio.precio_1_tipo_nombre || selectedServicio.precio_1_tipo || 'Precio 1'}</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={formOferta.precio_1_valor}
                                                onChange={e => setFormOferta({ ...formOferta, precio_1_valor: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    {/* Precio 2 */}
                                    {selectedServicio.cantidad_precios >= 2 && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">{selectedServicio.precio_2_tipo_nombre || selectedServicio.precio_2_tipo || 'Precio 2'}</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={formOferta.precio_2_valor}
                                                onChange={e => setFormOferta({ ...formOferta, precio_2_valor: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    {/* Precio 3 */}
                                    {selectedServicio.cantidad_precios >= 3 && !selectedServicio.precio_3_no_aplica && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">{selectedServicio.precio_3_tipo_nombre || selectedServicio.precio_3_tipo || 'Precio 3'}</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={formOferta.precio_3_valor}
                                                onChange={e => setFormOferta({ ...formOferta, precio_3_valor: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    {/* Calculated Total for Reference */}
                                    <div className="pt-2 border-t mt-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-muted-foreground">Total Calculado:</span>
                                            <span className="font-bold text-lg">
                                                {formOferta.moneda === 'PEN' ? 'S/' : 'USD'} {parseFloat(finalPrecioValue).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Hidden Single Price Input (Kept for compatibility logic if needed, but driven by Effect) */}
                        {/* <div className="space-y-2 hidden"> ... </div> */}

                        {/* Row 6: Obs */}
                        <div className="space-y-2">
                            <Label>Condiciones adicionales</Label>
                            <Textarea
                                placeholder="Ingresa comentarios adicionales..."
                                value={formOferta.observaciones}
                                onChange={e => setFormOferta({ ...formOferta, observaciones: e.target.value })}
                                rows={3}
                            />
                        </div>

                    </div>

                    <DialogFooter className="shrink-0 border-t pt-4">
                        <Button variant="outline" onClick={() => setOfertaDialogOpen(false)}>
                            Cerrar
                        </Button>
                        <Button onClick={handleAddOferta} className="bg-orange-400 hover:bg-orange-500">
                            Guardar Oferta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog para editar precio manualmente */}
            <Dialog open={editPrecioDialogOpen} onOpenChange={setEditPrecioDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Precio Manualmente</DialogTitle>
                        <DialogDescription>
                            Modifica el valor del precio seleccionado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Servicio</Label>
                            <div className="text-sm font-medium">{editingDetalle?.servicio?.nombre}</div>
                        </div>

                        {/* Price Details Card */}
                        <div className="border rounded-md p-3 bg-muted/20 space-y-1">
                            <div className="text-xs font-bold text-muted-foreground uppercase">
                                PRECIO {editingDetalle?.precio_seleccionado || 'MANUAL'}
                            </div>
                            <div className="font-medium text-base">
                                {editingDetalle?.precio_tipo || 'Precio Personalizado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {editingDetalle?.servicio?.moneda || cotizacion_moneda} {parseFloat(newPriceValue || '0').toFixed(2)}
                                {editingDetalle?.precio_campo_adicional && (
                                    <span className="ml-1">({editingDetalle.precio_campo_adicional}h)</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="custom-price">Nuevo Precio</Label>
                            <Input
                                id="custom-price"
                                type="number"
                                step="0.01"
                                value={newPriceValue}
                                onChange={(e) => setNewPriceValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditPrecioDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCustomPrice}>
                            Guardar Precio
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Dialogs for Quick Add */}
            <QuickTerceroDialog
                open={quickProviderOpen}
                onOpenChange={setQuickProviderOpen}
                onTerceroCreated={handleProviderCreated}
                defaultType="proveedor"
                title="NUEVO PROVEEDOR (RÁPIDO)"
            />

            <ContactoDialog
                terceros={proveedoresList}
                open={quickContactOpen}
                onOpenChange={setQuickContactOpen}
                onSuccess={handleContactCreated}
                trigger={null}
            // Pre-select provider if selected in form
            // But ContactoDialog might need defaultTerceroId prop similar to SitioDialog?
            // ContactoDialog usually selects from list. 
            // Let's assume user selects it in dialog or valid. 
            // Ideally passing defaultTerceroId would be better.
            // Assuming ContactoDialog handles logic.
            />

            <AddOptionDialog
                open={quickPaymentMethodOpen}
                onOpenChange={setQuickPaymentMethodOpen}
                category="formas_pago"
                title="Nueva Forma de Pago"
                createAction={addOptionValue}
                onOptionCreated={handleFormaPagoCreated}
            />

            <AddOptionDialog
                open={quickPaymentTermOpen}
                onOpenChange={setQuickPaymentTermOpen}
                category="plazos_pago"
                title="Nuevo Plazo de Pago"
                createAction={addOptionValue}
                onOptionCreated={handlePlazoPagoCreated}
            />
        </div >
    )
}

// Historical interfaces moved to @/types/cotizaciones

function HistorySection({ servicioId, servicioNombre, servicio, clienteId }: { servicioId: string, servicioNombre: string, servicio: Servicio, clienteId: string | null }) {
    const [activeTab, setActiveTab] = useState('catalogo')
    const [onlyThisClient, setOnlyThisClient] = useState<boolean>(Boolean(clienteId))

    // Client History State
    const [clientQuotes, setClientQuotes] = useState<HistoricalClientQuote[]>([])
    const [, setClientTotal] = useState(0)
    const [clientPage, setClientPage] = useState(1)
    const [clientLoading, setClientLoading] = useState(false)

    // Supplier History State
    const [supplierOffers, setSupplierOffers] = useState<HistoricalSupplierOffer[]>([])
    const [, setSupplierTotal] = useState(0)
    const [supplierPage, setSupplierPage] = useState(1)
    const [supplierLoading, setSupplierLoading] = useState(false)

    const loadClientHistory = useCallback(async () => {
        setClientLoading(true)
        const filterCliente = onlyThisClient ? clienteId : null
        const res = await getHistoricalClientQuotes(servicioId, clientPage, 5, filterCliente)
        setClientQuotes(res.data)
        setClientTotal(res.total)
        setClientLoading(false)
    }, [servicioId, clientPage, clienteId, onlyThisClient])

    const loadSupplierHistory = useCallback(async () => {
        setSupplierLoading(true)
        const res = await getHistoricalSupplierOffers(servicioId, supplierPage, 5)
        setSupplierOffers(res.data)
        setSupplierTotal(res.total)
        setSupplierLoading(false)
    }, [servicioId, supplierPage])

    useEffect(() => {
        const fetchHistory = async () => {
            if (activeTab === 'clientes') await loadClientHistory()
            if (activeTab === 'proveedores') await loadSupplierHistory()
        }
        fetchHistory()
    }, [activeTab, loadClientHistory, loadSupplierHistory])

    const renderPrice = (valor: number, moneda?: string) => {
        return `${moneda || 'USD'} ${Number(valor).toFixed(2)}`
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Referencias de Precio: {servicioNombre}</CardTitle>
                <CardDescription>Información histórica y de catálogo</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
                        <TabsTrigger value="clientes">Histórico Clientes</TabsTrigger>
                        <TabsTrigger value="proveedores">Histórico Prov.</TabsTrigger>
                    </TabsList>

                    <TabsContent value="catalogo" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 gap-3">
                            {servicio.cantidad_precios >= 1 && (
                                <div className="p-3 border rounded bg-slate-50 flex justify-between items-center">
                                    <div className="font-medium text-sm">{servicio.precio_1_tipo_nombre || servicio.precio_1_tipo || 'Precio 1'}</div>
                                    <div className="font-bold">{renderPrice(servicio.precio_1_valor ?? 0, servicio.moneda)} {servicio.precio_1_campo_adicional && `(${servicio.precio_1_campo_adicional}h)`}</div>
                                </div>
                            )}
                            {servicio.cantidad_precios >= 2 && (
                                <div className="p-3 border rounded bg-slate-50 flex justify-between items-center">
                                    <div className="font-medium text-sm">{servicio.precio_2_tipo_nombre || servicio.precio_2_tipo || 'Precio 2'}</div>
                                    <div className="font-bold">{renderPrice(servicio.precio_2_valor ?? 0, servicio.moneda)} {servicio.precio_2_campo_adicional && `(${servicio.precio_2_campo_adicional}h)`}</div>
                                </div>
                            )}
                            {servicio.cantidad_precios >= 3 && (
                                <div className="p-3 border rounded bg-slate-50 flex justify-between items-center">
                                    <div className="font-medium text-sm">{servicio.precio_3_tipo_nombre || servicio.precio_3_tipo || 'Precio 3'}</div>
                                    <div className="font-bold">{renderPrice(servicio.precio_3_valor ?? 0, servicio.moneda)} {servicio.precio_3_campo_adicional && `(${servicio.precio_3_campo_adicional}h)`}</div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="clientes" className="space-y-4 pt-4">
                        {clienteId && (
                            <div className="flex items-center justify-between border rounded-md p-2 bg-slate-50">
                                <span className="text-xs text-muted-foreground">
                                    {onlyThisClient
                                        ? 'Mostrando solo cotizaciones a este cliente'
                                        : 'Mostrando cotizaciones a todos los clientes'}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                        setOnlyThisClient((v) => !v)
                                        setClientPage(1)
                                    }}
                                >
                                    {onlyThisClient ? 'Ver todos' : 'Solo este cliente'}
                                </Button>
                            </div>
                        )}
                        {clientLoading ? (
                            <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                        ) : clientQuotes.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">No hay registro histórico de ventas.</div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Precio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientQuotes.map((q, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs">{new Date(q.cotizacion.fecha_emision || q.created_at || '').toLocaleDateString()}</TableCell>
                                                <TableCell className="text-xs font-medium">{q.cotizacion.cliente?.razon_social || 'Desconocido'}</TableCell>
                                                <TableCell className="text-xs">{renderPrice(q.precio_valor, q.moneda)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setClientPage(p => Math.max(1, p - 1))} disabled={clientPage === 1}>Ant</Button>
                            <span className="text-xs flex items-center">Pág {clientPage}</span>
                            <Button variant="outline" size="sm" onClick={() => setClientPage(p => p + 1)} disabled={clientQuotes.length < 5}>Sig</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="proveedores" className="space-y-4 pt-4">
                        {supplierLoading ? (
                            <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                        ) : supplierOffers.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">No hay registro histórico de ofertas.</div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Proveedor</TableHead>
                                            <TableHead>Precio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {supplierOffers.map((o, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs">{new Date(o.fecha_oferta).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-xs font-medium">{o.proveedor_nombre}</TableCell>
                                                <TableCell className="text-xs">{renderPrice(o.precio, o.moneda)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSupplierPage(p => Math.max(1, p - 1))} disabled={supplierPage === 1}>Ant</Button>
                            <span className="text-xs flex items-center">Pág {supplierPage}</span>
                            <Button variant="outline" size="sm" onClick={() => setSupplierPage(p => p + 1)} disabled={supplierOffers.length < 5}>Sig</Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
