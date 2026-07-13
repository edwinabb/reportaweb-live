"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { Maquinaria, MaquinariaTipoDoc } from "@/types/maquinaria"
import { toast } from "sonner"
import { createMaquinariaDocumento, updateMaquinariaDocumento } from "@/lib/actions/maquinaria-docs"
import { useRouter } from "next/navigation"

export type DocumentoInitial = {
    id: string
    maquinaria_id: string
    tipo_doc_id: string
    numero_doc?: string | null
    fecha_emision?: string | null
    fecha_vencimiento?: string | null
    archivo_url?: string | null
}

interface GlobalDocumentDialogProps {
    maquinarias: Maquinaria[]
    tipos: MaquinariaTipoDoc[]
    initial?: DocumentoInitial
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Cuando viene como modal controlado (edit), no renderizar el trigger */
    triggerless?: boolean
}

export function GlobalDocumentDialog({
    maquinarias,
    tipos,
    initial,
    open: openProp,
    onOpenChange,
    triggerless,
}: GlobalDocumentDialogProps) {
    const router = useRouter()
    const [openState, setOpenState] = useState(false)
    const open = openProp !== undefined ? openProp : openState
    const setOpen = onOpenChange || setOpenState

    const [isPending, setIsPending] = useState(false)
    const isEdit = Boolean(initial)

    // Determinar el propietario inicial de la maquinaria si se está editando
    const initialMaq = initial ? maquinarias.find(m => m.id === initial.maquinaria_id) : null
    const initialPropietario = initialMaq?.propietario || "todos"

    const [propietarioFilter, setPropietarioFilter] = useState<"propio" | "tercero" | "todos">(initialPropietario as any)
    const [selectedMaquinaria, setSelectedMaquinaria] = useState(initial?.maquinaria_id || "")
    const [selectedTipo, setSelectedTipo] = useState(initial?.tipo_doc_id || "")

    const filteredMaquinarias = maquinarias.filter(m =>
        propietarioFilter === "todos" ? true : m.propietario === propietarioFilter
    )

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsPending(true)
        const formData = new FormData(event.currentTarget)

        // En edit, asegurar que los campos controlados de Select lleguen
        if (!formData.get('maquinaria_id')) formData.set('maquinaria_id', selectedMaquinaria)
        if (!formData.get('tipo_doc_id')) formData.set('tipo_doc_id', selectedTipo)

        try {
            const res = isEdit
                ? await updateMaquinariaDocumento(initial!.id, null, formData)
                : await createMaquinariaDocumento(null, formData)
            if (res.success) {
                toast.success(isEdit ? "Documento actualizado" : "Documento agregado")
                setOpen(false)
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch {
            toast.error("Error desconocido")
        } finally {
            setIsPending(false)
        }
    }

    const content = (
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEdit ? "MODIFICAR DOCUMENTO" : "AGREGAR DOCUMENTO"}</DialogTitle>
                <DialogDescription>
                    {isEdit
                        ? "Edita los datos del documento. El archivo solo se reemplaza si cargás uno nuevo."
                        : "Registra un documento para un equipo específico"}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                    <Label htmlFor="tipo_doc_id" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                        Tipo de documento
                    </Label>
                    <Select
                        name="tipo_doc_id"
                        required
                        value={selectedTipo}
                        onValueChange={setSelectedTipo}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                            {tipos.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                        Tipo de Maquinaria
                    </Label>
                    <Select
                        value={propietarioFilter}
                        onValueChange={(val) => {
                            setPropietarioFilter(val as any)
                            // No limpiar selectedMaquinaria si venía del initial
                            if (!isEdit) setSelectedMaquinaria("")
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todas</SelectItem>
                            <SelectItem value="propio">Interna (Propia)</SelectItem>
                            <SelectItem value="tercero">Externa (Terceros)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="maquinaria_id" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                        Maquinaria para la que aplica este documento
                    </Label>
                    <Select
                        name="maquinaria_id"
                        required
                        value={selectedMaquinaria}
                        onValueChange={setSelectedMaquinaria}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona el equipo a asignar" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredMaquinarias.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.nombre} - {m.placa || m.codigo_interno || 'S/N'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="numero_doc">Número / Referencia (Opcional)</Label>
                    <Input name="numero_doc" placeholder="Ej. Poliza #123456" defaultValue={initial?.numero_doc || ''} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="archivo" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                        Documento (Máximo 5 MB)
                    </Label>
                    {isEdit && initial?.archivo_url && (
                        <p className="text-xs text-muted-foreground">
                            Archivo actual: <a href={initial.archivo_url} target="_blank" rel="noopener" className="text-orange-600 underline">ver</a>. Subí uno nuevo sólo si querés reemplazarlo.
                        </p>
                    )}
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="archivo" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <p className="text-sm text-gray-500"><span className="font-semibold">Clic para cargar el documento</span></p>
                                <p className="text-xs text-gray-500">PDF, JPG, PNG (MAX. 5MB)</p>
                            </div>
                            <Input id="archivo" name="archivo" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" required={!isEdit} />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fecha_emision" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                            Válido desde (Emisión)
                        </Label>
                        <Input type="date" name="fecha_emision" required defaultValue={initial?.fecha_emision || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fecha_vencimiento" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                            Válido hasta (Vencimiento)
                        </Label>
                        <Input type="date" name="fecha_vencimiento" required defaultValue={initial?.fecha_vencimiento || ''} />
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cerrar
                    </Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isPending}>
                        {isPending ? "Guardando..." : (isEdit ? "Guardar cambios" : "Guardar")}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    )

    if (triggerless) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                {content}
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Documento
                </Button>
            </DialogTrigger>
            {content}
        </Dialog>
    )
}
