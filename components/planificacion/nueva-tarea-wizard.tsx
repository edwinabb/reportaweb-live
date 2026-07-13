"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetDescription
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
// import { cn } from "@/lib/utils" // Unused currently
import { Truck } from "lucide-react"
import { createTarea } from "@/lib/actions/planificacion"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

// Types for local state form
interface FormData {
    titulo: string
    cliente_nombre: string
    contacto_nombre: string
    sitio: string
    fecha_inicio: Date | undefined
    fecha_fin: Date | undefined
    prioridad: 'BAJA' | 'MEDIA' | 'ALTA'
    fechas_multiples: Date[]
    descripcion: string
    tipo_tarea: string
    servicio: string
    cotizacion: string
    confirmada: boolean
    personal: string[] // IDs
    maquinaria: string[] // IDs
}

const TIPO_TAREA_OPTIONS = [
    'MANTENIMIENTO', 'MERCADEO', 'OPERACIONES', 'PERSONAL', 'PROYECTOS',
    'SST', 'STAND BY', 'TURNOS', 'VACACIONES', 'VENTAS'
]

interface Props {
    onSuccess: () => void
    personalList: { id: string, nombre: string, avatar?: string | null }[]
    maquinariaList: { id: string, nombre: string, codigo: string }[]
}

export function NuevaTareaWizard({ onSuccess, personalList = [], maquinariaList = [] }: Props) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("info") // info, personal, maquinaria

    const [formData, setFormData] = useState<FormData>({
        titulo: "",
        cliente_nombre: "",
        contacto_nombre: "",
        sitio: "",
        fecha_inicio: new Date(),
        fecha_fin: new Date(),
        prioridad: 'MEDIA',
        fechas_multiples: [],
        descripcion: "",
        tipo_tarea: "",
        servicio: "",
        cotizacion: "",
        confirmada: false,
        personal: [],
        maquinaria: []
    })

    const handleSubmit = async () => {
        setIsLoading(true)

        // Detecta si fechas_multiples son consecutivas (delta 1 día entre cada par):
        //   - consecutivas → 1 intervalo con fecha_inicio/fecha_fin
        //   - salteadas    → 1 intervalo con fechas_multiples array
        const ordenadas = [...formData.fechas_multiples].sort((a, b) => a.getTime() - b.getTime())
        const fechasStr = ordenadas.map((d) => format(d, 'yyyy-MM-dd'))
        const esConsecutivo =
            ordenadas.length > 0 &&
            ordenadas.every((d, i) => {
                if (i === 0) return true
                const diff = (d.getTime() - ordenadas[i - 1].getTime()) / (1000 * 60 * 60 * 24)
                return Math.round(diff) === 1
            })

        const recursos = [
            ...formData.personal.map((id) => ({ tipo_recurso: 'PERSONAL' as const, recurso_id: id })),
            ...formData.maquinaria.map((id) => ({ tipo_recurso: 'MAQUINARIA' as const, recurso_id: id })),
        ]

        const intervalo = esConsecutivo
            ? { fecha_inicio: fechasStr[0], fecha_fin: fechasStr[fechasStr.length - 1], recursos }
            : { fechas_multiples: fechasStr, recursos }

        const res = await createTarea({
            header: {
                titulo: formData.titulo,
                cliente_nombre: formData.cliente_nombre,
                sitio: formData.sitio,
                prioridad: formData.prioridad,
                descripcion: formData.descripcion,
                estado: formData.confirmada ? 'CONFIRMADA' : 'BORRADOR',
                tipo_tarea: (formData.tipo_tarea || null) as never,
                servicio_ref: formData.servicio || null,
                cotizacion_ref: formData.cotizacion || null,
            },
            intervalos: [intervalo],
        })

        setIsLoading(false)
        if (res.success) {
            toast.success("Tarea creada exitosamente")
            setOpen(false)
            onSuccess()
        } else {
            toast.error(res.message)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">Nueva Tarea</Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-4xl w-full flex flex-col h-full p-0 gap-0" side="right">
                <div className="p-6 border-b">
                    <SheetHeader>
                        <SheetTitle>Nueva Tarea</SheetTitle>
                        <SheetDescription>
                            Complete la información para programar una nueva tarea.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="flex border-b mb-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab("info")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "info"
                                ? "border-orange-600 text-orange-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Información General
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("personal")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "personal"
                                ? "border-orange-600 text-orange-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Personal ({formData.personal.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("maquinaria")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "maquinaria"
                                ? "border-orange-600 text-orange-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Maquinaria ({formData.maquinaria.length})
                        </button>
                    </div>

                    {activeTab === "info" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">Título de la tarea <span className="text-red-500">*</span></Label>
                                <Input
                                    value={formData.titulo}
                                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                    placeholder="Ingresa el título de la tarea"
                                    className="bg-gray-50/50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cliente</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.cliente_nombre}
                                            onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                                            placeholder="Seleccionar el cliente"
                                        />
                                        <Button size="icon" className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-10 w-10 shadow-sm">
                                            <span className="text-lg font-bold">+</span>
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Contacto del cliente</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.contacto_nombre}
                                            onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                                            placeholder="Seleccionar el contacto"
                                        />
                                        <Button size="icon" className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-10 w-10 shadow-sm">
                                            <span className="text-lg font-bold">+</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <div className="space-y-2">
                                    <Label>Sitio</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.sitio}
                                            onChange={(e) => setFormData({ ...formData, sitio: e.target.value })}
                                            placeholder="Seleccionar el sitio"
                                        />
                                        <Button size="icon" className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-10 w-10 shadow-sm">
                                            <span className="text-lg font-bold">+</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cotización</Label>
                                    <Select value={formData.cotizacion} onValueChange={(v) => setFormData({ ...formData, cotizacion: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar la cotización" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CT-001">CT-001 (Demo)</SelectItem>
                                            <SelectItem value="CT-002">CT-002 (Demo)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Servicio</Label>
                                    <Select value={formData.servicio} onValueChange={(v) => setFormData({ ...formData, servicio: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar el servicio" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALQUILER">Alquiler</SelectItem>
                                            <SelectItem value="MANIOBRA">Maniobra</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* DATES & TIMES BLOCK */}
                            <div className="grid md:grid-cols-2 gap-8 mt-4">
                                {/* Calendar Column */}
                                <div className="space-y-2">
                                    <Label className="text-red-500 font-medium">Fecha(s) de ejecución *</Label>
                                    <div className="flex justify-start border rounded-lg p-2 bg-white shadow-sm w-fit">
                                        <Calendar
                                            mode="multiple"
                                            selected={formData.fechas_multiples}
                                            onSelect={(dates) => {
                                                const sorted = dates?.sort((a, b) => a.getTime() - b.getTime()) || []
                                                setFormData({
                                                    ...formData,
                                                    fechas_multiples: sorted,
                                                    fecha_inicio: sorted[0],
                                                    fecha_fin: sorted[sorted.length - 1]
                                                })
                                            }}
                                            className="rounded-md"
                                            locale={es}
                                        />
                                    </div>
                                    <div className="text-xs text-center text-gray-500">
                                        {formData.fechas_multiples.length > 0
                                            ? `${formData.fechas_multiples.length} días seleccionados`
                                            : <span className="bg-orange-500 text-white px-2 py-0.5 rounded">! No se ha seleccionado una fecha</span>}
                                    </div>
                                </div>

                                {/* Controls Column */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-red-500 font-medium">Hora de inicio *</Label>
                                            <Input type="time" defaultValue="07:00" className="bg-gray-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-red-500 font-medium">Hora de finalización *</Label>
                                            <Input type="time" defaultValue="18:00" className="bg-gray-50" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 items-center">
                                        <div className="space-y-2">
                                            <Label>Prioridad</Label>
                                            <Select value={formData.prioridad} onValueChange={(v: any) => setFormData({ ...formData, prioridad: v })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="BAJA">Baja</SelectItem>
                                                    <SelectItem value="MEDIA">Media</SelectItem>
                                                    <SelectItem value="ALTA">Alta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 flex flex-col items-center justify-center">
                                            <Label className="mb-2">¿Confirmada?</Label>
                                            <Switch
                                                checked={formData.confirmada}
                                                onCheckedChange={(c) => setFormData({ ...formData, confirmada: c })}
                                                className="data-[state=checked]:bg-green-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Tipo de Tarea</Label>
                                        <Select value={formData.tipo_tarea} onValueChange={(v) => setFormData({ ...formData, tipo_tarea: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px] overflow-y-auto">
                                                {TIPO_TAREA_OPTIONS.map(opt => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Label className="font-semibold text-gray-700">Comentarios o instrucciones especiales</Label>
                                <Textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Ingresa instrucciones adicionales con referencia a la tarea"
                                    className="min-h-[100px] bg-white border-gray-300"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "personal" && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="font-semibold">Seleccionar Personal</Label>
                                <Input placeholder="Buscar personal..." className="max-w-[250px] h-9" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-50 p-2 rounded-md border min-h-[300px]">
                                {personalList.length === 0 ? <p className="text-sm text-gray-400 p-2 col-span-2">No se encontró personal disponible.</p> : personalList.map((p) => (
                                    <div key={p.id} className={`flex items-center space-x-2 p-3 bg-white rounded-md border shadow-sm transition-colors ${formData.personal.includes(p.id) ? 'border-orange-500 bg-orange-50' : 'hover:border-orange-300'}`}>
                                        <Checkbox
                                            id={`p-${p.id}`}
                                            checked={formData.personal.includes(p.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setFormData({ ...formData, personal: [...formData.personal, p.id] })
                                                else setFormData({ ...formData, personal: formData.personal.filter(x => x !== p.id) })
                                            }}
                                        />
                                        <Label htmlFor={`p-${p.id}`} className="flex-1 cursor-pointer flex items-center gap-3">
                                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs overflow-hidden">
                                                {p.avatar ? <Image src={p.avatar} alt={p.nombre} width={32} height={32} className="h-full w-full object-cover" /> : (p.nombre ? p.nombre.charAt(0) : '?')}
                                            </div>
                                            <span className="text-sm font-medium">{p.nombre}</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "maquinaria" && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="font-semibold">Seleccionar Maquinaria</Label>
                                <Input placeholder="Buscar equipo..." className="max-w-[250px] h-9" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-50 p-2 rounded-md border min-h-[300px]">
                                {maquinariaList.length === 0 ? <p className="text-sm text-gray-400 p-2 col-span-2">No hay maquinaria disponible.</p> : maquinariaList.map((m) => (
                                    <div key={m.id} className={`flex items-center space-x-2 p-3 bg-white rounded-md border shadow-sm transition-colors ${formData.maquinaria.includes(m.id) ? 'border-orange-500 bg-orange-50' : 'hover:border-orange-300'}`}>
                                        <Checkbox
                                            id={`m-${m.id}`}
                                            checked={formData.maquinaria.includes(m.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setFormData({ ...formData, maquinaria: [...formData.maquinaria, m.id] })
                                                else setFormData({ ...formData, maquinaria: formData.maquinaria.filter(x => x !== m.id) })
                                            }}
                                        />
                                        <Label htmlFor={`m-${m.id}`} className="flex-1 cursor-pointer flex items-center gap-3">
                                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-gray-800">{m.codigo}</span>
                                                <span className="text-xs text-gray-500">{m.nombre}</span>
                                            </div>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t mt-auto">
                    <SheetFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
                            {isLoading ? "Guardando..." : "Crear Tarea"}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}
