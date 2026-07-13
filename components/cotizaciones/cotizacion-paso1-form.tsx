'use client'

import { useActionState } from 'react'
import { useEffect, useState, useRef } from 'react'
import { createCotizacion, updateCotizacionPaso1, getCotizacionById } from '@/lib/actions/cotizaciones'
import { getTasasCambio } from '@/lib/actions/tasas-cambio'
import { Cotizacion, TasaCambio, CotizacionDetalleWithRelations } from '@/types/cotizaciones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { CardDescription } from '@/components/ui/card'
import { ServicioSelector } from './servicio-selector'
import { ServiciosTable } from './servicios-table'
import { toast } from 'sonner'
import { Plus, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QuickTerceroDialog } from '@/components/terceros/quick-tercero-dialog'
import { ContactoDialog } from '@/components/terceros/contacto-dialog'
import { SitioDialog } from '@/components/terceros/sitio-dialog'
import { AddOptionDialog } from '@/components/common/add-option-dialog'
import { addOptionValue, getOpcionesRespuesta } from '@/lib/actions/opciones'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface CotizacionPaso1FormProps {
    cotizacion?: Cotizacion
    detalles?: CotizacionDetalleWithRelations[]
    terceros: any[] // Lista de clientes
    contactos: any[] // Lista de contactos del cliente
    sitios: any[] // Lista de sitios del cliente
    opcionesFormaPago?: string[]
    opcionesPlazoPago?: string[]
    readOnly?: boolean
    defaultOpenServiceSelector?: boolean
}

interface FormState {
    message: string
    success?: boolean
    cotizacion_id?: string
}

export function CotizacionPaso1Form({
    cotizacion,
    detalles = [],
    terceros,
    contactos,
    sitios,
    opcionesFormaPago = [],
    opcionesPlazoPago = [],
    readOnly = false,
    defaultOpenServiceSelector = false
}: CotizacionPaso1FormProps) {
    const router = useRouter()
    const isEditing = !!cotizacion
    const [selectorOpen, setSelectorOpen] = useState(defaultOpenServiceSelector)

    // If receiving the prop, prioritize it on mount
    useEffect(() => {
        if (defaultOpenServiceSelector) {
            setSelectorOpen(true)
        }
    }, [defaultOpenServiceSelector])

    const [tasasCambio, setTasasCambio] = useState<TasaCambio[]>([])
    const [currentDetalles, setCurrentDetalles] = useState(detalles)

    const [state, formAction] = useActionState<FormState, FormData>(
        isEditing ? updateCotizacionPaso1 : createCotizacion,
        { message: '', success: false, cotizacion_id: '' }
    )

    // Pending Action state to handle "Save & Add Service" flow
    const [pendingAction, setPendingAction] = useState<'none' | 'add-service'>('none')
    const formRef = useRef<HTMLFormElement>(null)

    // State for Quick Add Lists
    const [quickClientOpen, setQuickClientOpen] = useState(false)
    const [tercerosList, setTercerosList] = useState(terceros)

    const [quickContactOpen, setQuickContactOpen] = useState(false)
    const [contactosList, setContactosList] = useState(contactos)

    const [quickSiteOpen, setQuickSiteOpen] = useState(false)
    const [sitiosList, setSitiosList] = useState(sitios)

    const [quickPaymentMethodOpen, setQuickPaymentMethodOpen] = useState(false)
    const [formasPagoList, setFormasPagoList] = useState<string[]>(opcionesFormaPago)

    const [quickPaymentTermOpen, setQuickPaymentTermOpen] = useState(false)
    const [plazosPagoList, setPlazosPagoList] = useState<string[]>(opcionesPlazoPago)

    // Sync props to state (for router.refresh updates)
    useEffect(() => { setTercerosList(terceros) }, [terceros])
    useEffect(() => { setContactosList(contactos) }, [contactos])
    useEffect(() => { setSitiosList(sitios) }, [sitios])

    // Fetch dynamic options (keep for real-time updates if needed, but rely on props for initial)
    useEffect(() => {
        loadOptions()
    }, [])

    const loadOptions = async () => {
        const options = await getOpcionesRespuesta('auto')

        const formasPagoSet = options.find(o => o.name === 'FORMAS_PAGO')
        if (formasPagoSet && formasPagoSet.values && formasPagoSet.values.length > 0) {
            const dbValues = typeof formasPagoSet.values[0] === 'string'
                ? formasPagoSet.values as string[]
                : formasPagoSet.values.map((v: any) => v.value)

            setFormasPagoList(prev => Array.from(new Set([...prev, ...dbValues])))
        }

        const plazosPagoSet = options.find(o => o.name === 'PLAZOS_PAGO')
        if (plazosPagoSet && plazosPagoSet.values && plazosPagoSet.values.length > 0) {
            const dbValues = typeof plazosPagoSet.values[0] === 'string'
                ? plazosPagoSet.values as string[]
                : plazosPagoSet.values.map((v: any) => v.value)

            setPlazosPagoList(prev => Array.from(new Set([...prev, ...dbValues])))
        }
    }

    const handleTerceroCreated = (result: any) => {
        if (result?.tercero) {
            setTercerosList(prev => [...prev, result.tercero])
            setSelectedCliente(result.tercero.id)
            toast.success('Cliente seleccionado')
        }
    }

    const refreshAuxLists = () => {
        router.refresh()
    }

    useEffect(() => {
        loadTasas()
    }, [])

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message) // "Cotización creada"

            if (state.cotizacion_id) {
                if (!isEditing) {
                    // Created new one.
                    if (pendingAction === 'add-service') {
                        // Redirect with action param to open selector
                        router.push(`/cotizaciones/${state.cotizacion_id}?action=add-service`)
                    } else {
                        // Normal save
                        router.push(`/cotizaciones/${state.cotizacion_id}`)
                    }
                } else {
                    // Just updated
                    // Nothing special needed unless we want to clear pending action
                    setPendingAction('none')
                }
            }
        } else if (state?.message && !state?.success) {
            toast.error(state.message)
            setPendingAction('none') // Reset on error
        }
    }, [state, isEditing, router, pendingAction])

    const loadTasas = async () => {
        const tasas = await getTasasCambio()
        setTasasCambio(tasas)
    }

    const refreshDetalles = async () => {
        if (cotizacion?.id) {
            const updated = await getCotizacionById(cotizacion.id)
            if (updated?.detalles) {
                setCurrentDetalles(updated.detalles)
            }
        }
    }

    const [selectedCliente, setSelectedCliente] = useState(cotizacion?.cliente_id || '')
    const [filteredContactos, setFilteredContactos] = useState(contactos)
    const [filteredSitios, setFilteredSitios] = useState(sitios)

    useEffect(() => {
        if (selectedCliente) {
            setFilteredContactos(contactosList.filter(c => c.tercero_id === selectedCliente))
            setFilteredSitios(sitiosList.filter(s => s.terceros?.some((t: any) => t.id === selectedCliente)))
        } else {
            setFilteredContactos([])
            setFilteredSitios([])
        }
    }, [selectedCliente, contactosList, sitiosList])

    const today = new Date().toISOString().split('T')[0]

    // Handler for "Agregar Servicio"
    const handleAddServiceClick = () => {
        if (isEditing) {
            setSelectorOpen(true)
        } else {
            // "Auto-save" flow
            // Trigger form submission programmatically
            setPendingAction('add-service')
            // Using requestSubmit to ensure validation runs
            formRef.current?.requestSubmit()
        }
    }

    return (
        <div className="space-y-6">
            <form action={formAction} ref={formRef}>
                {isEditing && (
                    <input type="hidden" name="id" value={cotizacion.id} />
                )}

                {/* Boxed Tabs Layout */}
                <div className="rounded-lg border bg-background">

                    {/* Header moved to parent page */}

                    <div className="p-6 space-y-6">

                        {/* Fila 1: Cotización, Fecha, Fecha Inicio, Periodo */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Cotización</Label>
                                <Input
                                    value={cotizacion?.numero || 'Se generará automáticamente'}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fecha_emision">Fecha *</Label>
                                <Input
                                    id="fecha_emision"
                                    name="fecha_emision"
                                    type="date"
                                    defaultValue={cotizacion?.fecha_emision || today}
                                    required
                                    disabled={readOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fecha_inicio_estimada">Fecha estimada de inicio</Label>
                                <Input
                                    id="fecha_inicio_estimada"
                                    name="fecha_inicio_estimada"
                                    type="date"
                                    defaultValue={cotizacion?.fecha_inicio_estimada}
                                    disabled={readOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="periodo">Periodo *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="periodo"
                                        name="periodo"
                                        type="number"
                                        min="0"
                                        defaultValue={cotizacion?.periodo || 7}
                                        required
                                        className="w-20"
                                        disabled={readOnly}
                                    />
                                    <Select
                                        name="periodo_unidad"
                                        defaultValue={cotizacion?.periodo_unidad || 'DIA'}
                                        disabled={readOnly}
                                    >
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DIA">DIA</SelectItem>
                                            <SelectItem value="SEMANA">SEMANA</SelectItem>
                                            <SelectItem value="MES">MES</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Fila 2: Cliente y Contacto */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cliente_id">Cliente *</Label>
                                <input type="hidden" name="cliente_id" value={selectedCliente} />
                                <div className="flex gap-2">
                                    <SearchableSelect
                                        options={tercerosList.map(t => ({
                                            value: t.id,
                                            label: t.ruc ? `${t.razon_social} - ${t.ruc}` : t.razon_social
                                        }))}
                                        value={selectedCliente}
                                        onChange={setSelectedCliente}
                                        placeholder="Seleccionar cliente"
                                        searchPlaceholder="Buscar cliente..."
                                        disabled={readOnly}
                                        className="flex-1"
                                    />
                                    {!readOnly && (
                                        <AddButton onClick={() => setQuickClientOpen(true)} />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contacto_id">Contacto del cliente</Label>
                                <div className="flex gap-2">
                                    <Select
                                        name="contacto_id"
                                        defaultValue={cotizacion?.contacto_id || '_none'}
                                        disabled={!selectedCliente}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={selectedCliente ? "Seleccionar contacto" : "Seleccione cliente primero"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">Sin contacto</SelectItem>
                                            {filteredContactos.map((contacto) => (
                                                <SelectItem key={contacto.id} value={contacto.id}>
                                                    {contacto.nombre_completo}
                                                    {contacto.email && ` - ${contacto.email}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!readOnly && selectedCliente && (
                                        <AddButton onClick={() => setQuickContactOpen(true)} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fila 3: Sitio */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sitio_id">Nombre del sitio</Label>
                                <div className="flex gap-2">
                                    <Select
                                        name="sitio_id"
                                        defaultValue={cotizacion?.sitio_id || '_none'}
                                        disabled={!selectedCliente}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={selectedCliente ? "Seleccionar sitio" : "Seleccione cliente primero"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">Sin sitio</SelectItem>
                                            {filteredSitios.map((sitio) => (
                                                <SelectItem key={sitio.id} value={sitio.id}>
                                                    {sitio.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!readOnly && selectedCliente && (
                                        <AddButton onClick={() => setQuickSiteOpen(true)} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fila 4: Forma Pago, Plazo, Moneda */}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px] gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="forma_pago">Forma de pago *</Label>
                                <div className="flex gap-2 items-center">
                                    <Select
                                        name="forma_pago"
                                        defaultValue={cotizacion?.forma_pago || ''}
                                        required
                                    >
                                        <SelectTrigger className="min-w-0 flex-1">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {formasPagoList.map((fp) => (
                                                <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!readOnly && (
                                        <AddButton onClick={() => setQuickPaymentMethodOpen(true)} />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="plazo_pago">Plazo de pago *</Label>
                                <div className="flex gap-2 items-center">
                                    <Select
                                        name="plazo_pago"
                                        defaultValue={cotizacion?.plazo_pago || ''}
                                        required
                                    >
                                        <SelectTrigger className="min-w-0 flex-1">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plazosPagoList.map((pp) => (
                                                <SelectItem key={pp} value={pp}>{pp}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!readOnly && (
                                        <AddButton onClick={() => setQuickPaymentTermOpen(true)} />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="moneda">Moneda *</Label>
                                <Select
                                    name="moneda"
                                    defaultValue={cotizacion?.moneda || 'USD'}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="PEN">PEN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Fila 5: Descripción */}
                        <div className="space-y-2 pt-2">
                            <Label htmlFor="descripcion_requerimiento">Descripción del Requerimiento</Label>
                            <CardDescription className="mb-2">Detalles adicionales del servicio solicitado</CardDescription>
                            <Textarea
                                id="descripcion_requerimiento"
                                name="descripcion_requerimiento"
                                placeholder="pendiente definir servicios"
                                rows={3}
                                defaultValue={cotizacion?.descripcion_requerimiento}
                                disabled={readOnly}
                            />
                        </div>

                    </div>
                </div>

                {/* Servicios Section (Previously in a separate Card, now following form visually) */}
                <div className="mt-6 rounded-lg border bg-background overflow-hidden ">
                    <div className="bg-muted px-6 py-4 flex items-center justify-between border-b">
                        <div>
                            <h3 className="font-semibold leading-none tracking-tight">Servicios incluidos en la cotización</h3>
                            <p className="text-sm text-muted-foreground mt-1">Agrega los servicios que se incluirán en esta cotización</p>
                        </div>
                        {!readOnly && (
                            <Button
                                type="button"
                                onClick={handleAddServiceClick}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar Servicio
                            </Button>
                        )}
                    </div>
                    <div className="p-6">
                        {isEditing && currentDetalles.length > 0 ? (
                            <ServiciosTable
                                detalles={currentDetalles}
                                onUpdate={refreshDetalles}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50 text-center">
                                <p className="text-muted-foreground font-medium mb-2">
                                    No hay servicios agregados a esta cotización
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => router.push('/cotizaciones')}>
                        Cancelar
                    </Button>
                    {!readOnly && (
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                            <Save className="mr-2 h-4 w-4" />
                            {isEditing ? 'Actualizar' : 'Crear Cotización'}
                        </Button>
                    )}
                </div>
            </form>

            {isEditing && (
                <ServicioSelector
                    cotizacion_id={cotizacion.id}
                    open={selectorOpen}
                    onOpenChange={setSelectorOpen}
                    onServicioAdded={refreshDetalles}
                />
            )}

            {/* Dialogs for Quick Add */}
            <QuickTerceroDialog
                open={quickClientOpen}
                onOpenChange={setQuickClientOpen}
                onTerceroCreated={handleTerceroCreated}
            />

            <ContactoDialog
                terceros={tercerosList}
                defaultTerceroId={selectedCliente}
                open={quickContactOpen}
                onOpenChange={setQuickContactOpen}
                onSuccess={() => {
                    setQuickContactOpen(false)
                    refreshAuxLists()
                }}
                trigger={null}
            />

            <SitioDialog
                terceros={tercerosList}
                open={quickSiteOpen}
                onOpenChange={setQuickSiteOpen}
                defaultTerceroId={selectedCliente}
                onSuccess={() => {
                    setQuickSiteOpen(false)
                    refreshAuxLists()
                }}
                trigger={null}
            />

            <AddOptionDialog
                open={quickPaymentMethodOpen}
                onOpenChange={setQuickPaymentMethodOpen}
                title="Nueva Forma de Pago"
                category="FORMAS_PAGO"
                createAction={addOptionValue}
                onOptionCreated={(val) => {
                    setFormasPagoList(prev => [...prev, val])
                }}
            />

            <AddOptionDialog
                open={quickPaymentTermOpen}
                onOpenChange={setQuickPaymentTermOpen}
                title="Nuevo Plazo de Pago"
                category="PLAZOS_PAGO"
                createAction={addOptionValue}
                onOptionCreated={(val) => {
                    setPlazosPagoList(prev => [...prev, val])
                }}
            />
        </div>
    )
}

function AddButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-orange-500 hover:bg-orange-600 text-white h-8 w-8 shrink-0"
            onClick={onClick}
        >
            <Plus className="h-5 w-5" />
        </Button>
    )
}
