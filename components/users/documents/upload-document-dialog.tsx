'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { DocumentType, uploadDocumentSchema, UploadDocumentFormValues } from '@/types/user-documents'
import { uploadUserDocument } from '@/lib/actions/user-documents'
import { cn } from '@/lib/utils'

interface UploadDocumentDialogProps {
    userId: string
    documentTypes: DocumentType[]
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function UploadDocumentDialog({ userId, documentTypes, trigger, onSuccess }: UploadDocumentDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [selectedTypeObj, setSelectedTypeObj] = useState<DocumentType | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<UploadDocumentFormValues>({
        resolver: zodResolver(uploadDocumentSchema),
        defaultValues: {
            user_id: userId,
            document_type_id: '',
            valid_from: '',
            valid_until: '',
        },
    })

    // Reset when closing
    useEffect(() => {
        if (!open) {
            form.reset({ user_id: userId })
            setSelectedTypeObj(null)
            setSelectedFile(null)
        }
    }, [open, userId, form])

    // Update selected type object when ID changes
    const watchTypeId = form.watch('document_type_id')
    useEffect(() => {
        const found = documentTypes.find(d => d.id === watchTypeId)
        setSelectedTypeObj(found || null)

        if (found && found.category === 'sin_vencimiento') {
            form.setValue('valid_from', '')
            form.setValue('valid_until', '')
        }
    }, [watchTypeId, documentTypes, form])

    // Auto-fill dates logic
    const watchUntil = form.watch('valid_until')
    useEffect(() => {
        const from = form.getValues('valid_from')
        if (watchUntil && !from) {
            const untilDate = new Date(watchUntil)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (untilDate < today) {
                // Already expired: set from = until
                form.setValue('valid_from', watchUntil)
            } else {
                // Not expired yet: set from = today
                form.setValue('valid_from', new Date().toISOString().split('T')[0])
            }
        }
    }, [watchUntil, form])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
        }
    }

    function onSubmit(values: UploadDocumentFormValues) {
        if (!selectedFile) {
            toast.error("Debe seleccionar un archivo")
            return
        }

        // Validate date order
        if (values.valid_from && values.valid_until) {
            if (new Date(values.valid_until) < new Date(values.valid_from)) {
                toast.error("La fecha de vencimiento debe ser posterior o igual a la fecha de inicio.")
                return
            }
        }

        startTransition(async () => {
            const formData = new FormData()
            formData.append('user_id', values.user_id)
            formData.append('document_type_id', values.document_type_id)
            if (values.valid_from) formData.append('valid_from', values.valid_from)
            if (values.valid_until) formData.append('valid_until', values.valid_until)
            formData.append('file', selectedFile)

            const result = await uploadUserDocument(null, formData)

            if (result?.success) {
                toast.success(result.message)
                setOpen(false)
                onSuccess?.()
            } else {
                toast.error(result?.message || 'Error al subir documento')
            }
        })
    }

    const showDateFields = selectedTypeObj?.category === 'con_vencimiento' || selectedTypeObj?.category === 'seguro'

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button><Upload className="mr-2 h-4 w-4" /> Subir Documento</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Cargar Documento</DialogTitle>
                    <DialogDescription>
                        Seleccione el tipo de documento y cargue el archivo.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="document_type_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Documento <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione tipo..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {documentTypes.map((type) => (
                                                <SelectItem key={type.id} value={type.id}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormLabel>Archivo (PDF o Imagen, Max 20MB) <span className="text-red-500">*</span></FormLabel>
                            <div className="flex items-center justify-center w-full">
                                <label className={cn(
                                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                    selectedFile ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50 border-muted-foreground/25 text-muted-foreground"
                                )}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                                        {selectedFile ? (
                                            <>
                                                <CheckCircle2 className="w-8 h-8 mb-2 text-primary" />
                                                <p className="text-sm font-medium text-foreground truncate max-w-full">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB - Click para cambiar
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mb-2" />
                                                <p className="text-sm">
                                                    <span className="font-semibold text-primary">Click para subir</span> o arrastrar y soltar
                                                </p>
                                                <p className="text-xs mt-1">PDF, JPG, PNG (Max 20MB)</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".pdf,image/*"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                        </div>

                        {showDateFields && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                <FormField
                                    control={form.control}
                                    name="valid_from"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Válido Desde</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="valid_until"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Válido Hasta <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {selectedTypeObj?.category === 'con_vencimiento' && (
                            <div className="p-3 bg-yellow-50 text-yellow-800 text-[11px] leading-tight rounded-md flex items-start gap-2 border border-yellow-200">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Este documento requiere control de vencimientos. Se le notificará {selectedTypeObj.expiration_alert_days} días antes.</span>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending || !selectedFile} className="min-w-[100px]">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Subir
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
