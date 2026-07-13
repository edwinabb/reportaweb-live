"use client"

import { useState } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { Trash, FileText, Plus, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { createMaquinariaDocumento, deleteMaquinariaDocumento } from "@/lib/actions/maquinaria-docs"
import { MaquinariaDocumento, MaquinariaTipoDoc } from "@/types/maquinaria"
import { Badge } from "@/components/ui/badge"

// Helper for date formatting
const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Logic to check status
const getStatus = (doc: MaquinariaDocumento) => {
    if (!doc.fecha_vencimiento) return { label: 'Vigente', color: 'bg-green-100 text-green-800' }
    const today = new Date()
    const expiry = new Date(doc.fecha_vencimiento)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-800' }
    if (diffDays <= 30) return { label: 'Por Vencer', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Vigente', color: 'bg-green-100 text-green-800' }
}

interface DocumentsTabProps {
    maquinariaId: string
    documentos: MaquinariaDocumento[]
    tiposDocs: MaquinariaTipoDoc[]
}

export function DocumentsTab({ maquinariaId, documentos, tiposDocs }: DocumentsTabProps) {
    const [open, setOpen] = useState(false)

    // Create Action
    const createAction = async (prevState: any, formData: FormData) => {
        formData.append('maquinaria_id', maquinariaId)
        const result = await createMaquinariaDocumento(prevState, formData)
        if (result.success) {
            toast.success("Documento agregado")
            setOpen(false)
        } else {
            toast.error(result.message)
        }
        return result
    }

    const [createState, formCreateAction, isCreating] = useActionState(createAction, { message: '', success: false })

    // Delete Action
    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este documento?")) return
        const res = await deleteMaquinariaDocumento(id, maquinariaId)
        if (res.message.includes("eliminado")) {
            toast.success("Documento eliminado")
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Documentación</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" /> Agregar Documento
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar Documento</DialogTitle>
                            <DialogDescription>
                                Sube documentos vigentes como SOAT, Revisión Técnica, etc.
                            </DialogDescription>
                        </DialogHeader>
                        <form action={formCreateAction} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label>Tipo de Documento</Label>
                                <Select name="tipo_doc_id" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiposDocs.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Número de Documento / Poliza</Label>
                                <Input name="numero_doc" placeholder="Ej. 12345678" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Fecha Emisión</Label>
                                    <Input name="fecha_emision" type="date" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Vencimiento (Opcional)</Label>
                                    <Input name="fecha_vencimiento" type="date" />
                                </div>
                            </div>
                            {/* File upload would require <Input type="file" name="archivo" /> but handling server action file upload requires specific setup. 
                                For now, assuming basic text data or separate logic. Integrating rudimentary file input: 
                             */}
                            <div className="grid gap-2">
                                <Label>Archivo (PDF/IMG)</Label>
                                <Input name="archivo" type="file" accept="image/*,.pdf" />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating ? "Guardando..." : "Guardar"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Número</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Archivo</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documentos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No hay documentos registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            documentos.map((doc) => {
                                const status = getStatus(doc)
                                return (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">
                                            {doc.tipo_doc?.nombre || 'Otro'}
                                        </TableCell>
                                        <TableCell>{doc.numero_doc}</TableCell>
                                        <TableCell>{formatDate(doc.fecha_vencimiento)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={status.color}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {doc.archivo_url ? (
                                                <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                    <FileText className="h-4 w-4" /> Ver
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-destructive hover:bg-destructive/10">
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
