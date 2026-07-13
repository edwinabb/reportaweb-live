"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPlantilla, updatePlantilla } from "@/lib/actions/plantillas"
import { getOpcionesRespuesta } from "@/lib/actions/opciones"
import { Plantilla, OpcionRespuesta, PlantillaItem } from "@/types/formatos"
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
    initialData?: Plantilla
}

export function PlantillaEditor({ initialData }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [nombre, setNombre] = useState(initialData?.nombre || "")
    const [descripcion, setDescripcion] = useState(initialData?.descripcion || "")

    // Safety check: initialData items might be strings (old) or objects (new)
    const [estructura, setEstructura] = useState(() => {
        return initialData?.estructura?.map(section => ({
            ...section,
            items: section.items.map(item => {
                if (typeof item === 'string') {
                    return { text: item, opcion_respuesta_id: undefined } as PlantillaItem
                }
                return item as PlantillaItem
            })
        })) || []
    })

    const [opcionesSets, setOpcionesSets] = useState<OpcionRespuesta[]>([])
    const [defaultSetId, setDefaultSetId] = useState<string>("")

    useEffect(() => {
        const loadOptions = async () => {
            const sets = await getOpcionesRespuesta(initialData?.tenant_id || "") // Pass empty or current context
            setOpcionesSets(sets)
            // Find "Básico" or take the first one as default
            const basico = sets.find(s => s.name === 'Básico')
            if (basico) setDefaultSetId(basico.id)
            else if (sets.length > 0) setDefaultSetId(sets[0].id)
        }
        loadOptions()
    }, [initialData?.tenant_id])

    const handleAddSection = () => {
        setEstructura([...estructura, { category: "Nueva Sección", items: [] }])
    }

    const handleRemoveSection = (idx: number) => {
        const newEstructura = [...estructura]
        newEstructura.splice(idx, 1)
        setEstructura(newEstructura)
    }

    const handleSectionTitleChange = (idx: number, title: string) => {
        const newEstructura = [...estructura]
        newEstructura[idx].category = title
        setEstructura(newEstructura)
    }

    const handleAddItem = (sectionIdx: number) => {
        const newEstructura = [...estructura]
        newEstructura[sectionIdx].items.push({
            text: "Nueva pregunta",
            opcion_respuesta_id: defaultSetId
        })
        setEstructura(newEstructura)
    }

    const handleRemoveItem = (sectionIdx: number, itemIdx: number) => {
        const newEstructura = [...estructura]
        newEstructura[sectionIdx].items.splice(itemIdx, 1)
        setEstructura(newEstructura)
    }

    const handleItemTextChange = (sectionIdx: number, itemIdx: number, text: string) => {
        const newEstructura = [...estructura]
        newEstructura[sectionIdx].items[itemIdx].text = text
        setEstructura(newEstructura)
    }

    const handleItemOptionChange = (sectionIdx: number, itemIdx: number, setId: string) => {
        const newEstructura = [...estructura]
        newEstructura[sectionIdx].items[itemIdx].opcion_respuesta_id = setId
        setEstructura(newEstructura)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const payload = {
                nombre,
                descripcion,
                estructura,
                is_active: true
            }

            let res
            if (initialData?.id) {
                res = await updatePlantilla(initialData.id, payload)
            } else {
                res = await createPlantilla(payload)
            }

            if (res.success) {
                toast.success(res.message)
                router.push("/formatos") // Went back to list
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {initialData ? "Actualizar Plantilla" : "Crear Plantilla"}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Información Básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nombre del Formato</Label>
                        <Input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Checklist de Camionetas"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Breve descripción del propósito..."
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Estructura del Checklist</h3>
                    <Button type="button" variant="outline" onClick={handleAddSection}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Sección
                    </Button>
                </div>

                {estructura.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg bg-gray-50 text-gray-400">
                        No hay secciones definidas. Agrega una para comenzar.
                    </div>
                )}

                {estructura.map((section, sIdx) => (
                    <Card key={sIdx} className="relative group border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                                <Input
                                    value={section.category}
                                    onChange={(e) => handleSectionTitleChange(sIdx, e.target.value)}
                                    className="font-semibold text-lg border-transparent hover:border-input focus:border-input px-0 h-auto py-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveSection(sIdx)}
                                    className="ml-auto text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {section.items.map((item, iIdx) => (
                                <div key={iIdx} className="flex items-center gap-2 ml-6">
                                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                                    <div className="flex-1 grid grid-cols-[1fr,200px] gap-2">
                                        <Input
                                            value={item.text}
                                            onChange={(e) => handleItemTextChange(sIdx, iIdx, e.target.value)}
                                            className="h-9"
                                            placeholder="Pregunta..."
                                        />
                                        <Select
                                            value={item.opcion_respuesta_id || defaultSetId}
                                            onValueChange={(val) => handleItemOptionChange(sIdx, iIdx, val)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Tipo de Respuesta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {opcionesSets.map(opt => (
                                                    <SelectItem key={opt.id} value={opt.id}>
                                                        {opt.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItem(sIdx, iIdx)}
                                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddItem(sIdx)}
                                className="ml-6 mt-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                                <Plus className="mr-2 h-3 w-3" /> Agregar Pregunta
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </form>
    )
}

