'use client'

import { useState, useTransition } from 'react'
import { Pencil, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { DocumentType, UserDocument } from '@/types/user-documents'
import { updateUserDocument } from '@/lib/actions/user-documents'

interface EditDocumentDialogProps {
    document: UserDocument
    documentTypes: DocumentType[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function EditDocumentDialog({ document, documentTypes, open, onOpenChange, onSuccess }: EditDocumentDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [validFrom, setValidFrom] = useState(document.valid_from || '')
    const [validUntil, setValidUntil] = useState(document.valid_until || '')
    const [selectedTypeId, setSelectedTypeId] = useState(document.document_type_id)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    async function handleUpdate() {
        if (validFrom && validUntil && new Date(validUntil) < new Date(validFrom)) {
            toast.error("La fecha de vencimiento debe ser posterior o igual a la fecha de inicio.")
            return
        }

        startTransition(async () => {
            const formData = new FormData()
            formData.append('id', document.id)
            formData.append('user_id', document.user_id)
            formData.append('document_type_id', selectedTypeId)
            if (validFrom) formData.append('valid_from', validFrom)
            if (validUntil) formData.append('valid_until', validUntil)
            if (selectedFile) formData.append('file', selectedFile)

            // @ts-ignore - ActionState mismatch workaround if needed, or update calling signature
            const res = await updateUserDocument(null, formData)

            if (res?.success) {
                toast.success(res.message)
                onOpenChange(false)
                onSuccess?.()
            } else {
                toast.error(res?.message || "Error al actualizar documento")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5 text-orange-500" />
                        Editar Documento
                    </DialogTitle>
                    <DialogDescription>
                        Modifique los detalles del documento para {document.user?.first_name} {document.user?.last_name}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Tipo de Documento</Label>
                        <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {documentTypes.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="valid_from" className="text-xs">Válido Desde</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    id="valid_from"
                                    type="date"
                                    className="pl-8 h-9 text-sm"
                                    value={validFrom}
                                    onChange={(e) => setValidFrom(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valid_until" className="text-xs">Válido Hasta</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    id="valid_until"
                                    type="date"
                                    className="pl-8 h-9 text-sm"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reemplazar Archivo (Opcional)</Label>
                        <Input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                        {selectedFile && <p className="text-xs text-green-600">Archivo seleccionado: {selectedFile.name}</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={isPending}
                        className="bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
