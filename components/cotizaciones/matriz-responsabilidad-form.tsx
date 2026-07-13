'use client'

import { useState, useEffect } from 'react'
import {
    getMatrizResponsabilidad,
    saveMatrizResponsabilidad,
    getActividadesMatrizCatalog,
    addActividadMatrizCatalog
} from '@/lib/actions/cotizaciones'
import { MatrizResponsabilidad, ActividadMatriz, Responsable, ActividadRow } from '@/types/cotizaciones'
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
import { toast } from 'sonner'
import { Plus, Save, Info } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface MatrizResponsabilidadFormProps {
    cotizacion_id: string
    readOnly?: boolean
}

type ActividadLocal = Omit<ActividadRow, 'responsable'> & { responsable: Responsable | null }

export function MatrizResponsabilidadForm({ cotizacion_id, readOnly = false }: MatrizResponsabilidadFormProps) {
    const [actividades, setActividades] = useState<ActividadLocal[]>([])
    const [catalogoActividades, setCatalogoActividades] = useState<ActividadMatriz[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [nuevaActividad, setNuevaActividad] = useState('')
    const [nuevaDescripcion, setNuevaDescripcion] = useState('')
    const [nuevoResponsable, setNuevoResponsable] = useState<Responsable>('EMPRESA')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)

            // Load existing matriz
            const matriz = await getMatrizResponsabilidad(cotizacion_id)

            // Load catalog
            const catalogo = await getActividadesMatrizCatalog()
            setCatalogoActividades(catalogo)

            if (matriz.length > 0) {
                // Use existing matriz, but fetch description from catalog if linked
                setActividades(matriz.map(m => {
                    const catalogItem = m.actividad_id ? catalogo.find(c => c.id === m.actividad_id) : null
                    return {
                        actividad_id: m.actividad_id,
                        actividad: m.actividad,
                        // Use catalog description if available, otherwise empty since we don't save custom ones anymore
                        descripcion: catalogItem?.descripcion || '',
                        responsable: m.responsable,
                        orden: m.orden
                    }
                }))
            } else {
                // Initialize with catalog defaults
                setActividades(catalogo.map((cat, index) => ({
                    actividad_id: cat.id, // Link to catalog
                    actividad: cat.nombre,
                    descripcion: cat.descripcion || '',
                    responsable: cat.responsable_default || null,
                    orden: index + 1
                })))
            }

            setLoading(false)
        }

        loadData()
    }, [cotizacion_id])

    const handleToggleResponsable = (index: number) => {
        const newActividades = [...actividades]
        const current = newActividades[index].responsable

        // Cycle: null -> EMPRESA -> CLIENTE -> AMBOS -> EMPRESA
        if (current === null) newActividades[index].responsable = 'EMPRESA'
        else if (current === 'EMPRESA') newActividades[index].responsable = 'CLIENTE'
        else if (current === 'CLIENTE') newActividades[index].responsable = 'AMBOS'
        else newActividades[index].responsable = 'EMPRESA'

        setActividades(newActividades)
    }

    const handleDescriptionChange = (index: number, val: string) => {
        const newActividades = [...actividades]
        newActividades[index].descripcion = val
        setActividades(newActividades)
    }

    const handleAddActividad = async () => {
        if (!nuevaActividad.trim()) {
            toast.error('Ingresa el nombre de la actividad')
            return
        }

        // Add to catalog
        const result = await addActividadMatrizCatalog(nuevaActividad, nuevoResponsable, nuevaDescripcion)

        if (result.success) {
            // Add to current list
            setActividades([
                ...actividades,
                {
                    actividad: nuevaActividad,
                    descripcion: nuevaDescripcion,
                    responsable: nuevoResponsable,
                    orden: actividades.length + 1
                }
            ])

            setNuevaActividad('')
            setNuevaDescripcion('')
            setNuevoResponsable('EMPRESA')
            setDialogOpen(false)
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        const actividadesParaGuardar = actividades.map(a => ({
            ...a,
            responsable: a.responsable ?? 'EMPRESA' as Responsable
        }))
        const result = await saveMatrizResponsabilidad(cotizacion_id, actividadesParaGuardar)
        setSaving(false)

        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    if (loading) {
        return <div className="text-center py-8">Cargando...</div>
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Matriz de Responsabilidad</CardTitle>
                        <CardDescription>
                            Define qué actividades son responsabilidad de la empresa y cuáles del cliente
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {!readOnly && (
                            <>
                                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar Actividad
                                </Button>
                                <Button onClick={handleSave} disabled={saving}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? 'Guardando...' : 'Guardar Matriz'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {actividades.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        No hay actividades definidas. Agrega una actividad para comenzar.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {actividades.map((actividad, index) => (
                            <div
                                key={index}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                            >
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{actividad.actividad}</span>
                                        {actividad.descripcion && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[300px]">
                                                        <p className="text-sm">{actividad.descripcion}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    {/* Description hidden as per request, accessible via Info icon */}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        variant={actividad.responsable === 'EMPRESA' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => { const a = [...actividades]; a[index].responsable = 'EMPRESA'; setActividades(a) }}
                                        className={actividad.responsable === 'EMPRESA' ? 'bg-black hover:bg-black/90' : ''}
                                        disabled={readOnly}
                                    >
                                        Empresa
                                    </Button>
                                    <Button
                                        variant={actividad.responsable === 'CLIENTE' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => { const a = [...actividades]; a[index].responsable = 'CLIENTE'; setActividades(a) }}
                                        className={actividad.responsable === 'CLIENTE' ? 'bg-black hover:bg-black/90' : ''}
                                        disabled={readOnly}
                                    >
                                        Cliente
                                    </Button>
                                    <Button
                                        variant={actividad.responsable === 'AMBOS' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => { const a = [...actividades]; a[index].responsable = 'AMBOS'; setActividades(a) }}
                                        className={actividad.responsable === 'AMBOS' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                                        disabled={readOnly}
                                    >
                                        Ambos
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Dialog para agregar actividad */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>AGREGAR NUEVA ACTIVIDAD</DialogTitle>
                        <DialogDescription>
                            Agrega una nueva actividad a la matriz de responsabilidad
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="actividad">Nombre de la Actividad *</Label>
                            <Input
                                id="actividad"
                                placeholder="Ej: Combustible"
                                value={nuevaActividad}
                                onChange={(e) => setNuevaActividad(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                            <Textarea
                                id="descripcion"
                                placeholder="Detalles adicionales para el documento..."
                                value={nuevaDescripcion}
                                onChange={(e) => setNuevaDescripcion(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="responsable">Responsable por Defecto *</Label>
                            <Select
                                value={nuevoResponsable}
                                onValueChange={(v) => setNuevoResponsable(v as Responsable)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EMPRESA">Empresa</SelectItem>
                                    <SelectItem value="CLIENTE">Cliente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddActividad}>
                            Agregar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

