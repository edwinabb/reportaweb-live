'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Info, Loader2 } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,

} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
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

import { DocumentType, documentTypeSchema, DocumentTypeFormValues, DOC_CATEGORIES } from '@/types/user-documents'
import { upsertDocumentType } from '@/lib/actions/document-types'

interface DocumentTypeDialogProps {
    documentType?: DocumentType
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DocumentTypeDialog({ documentType, open, onOpenChange }: DocumentTypeDialogProps) {
    const [isPending, startTransition] = useTransition()

    const form = useForm<DocumentTypeFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(documentTypeSchema) as any,
        defaultValues: {
            id: documentType?.id,
            name: documentType?.name || '',
            code: documentType?.code || '',
            category: documentType?.category || 'sin_vencimiento',
            expiration_alert_days: documentType?.expiration_alert_days ?? 30,
        },
    })

    function onSubmit(values: DocumentTypeFormValues) {
        startTransition(async () => {
            const formData = new FormData()
            if (values.id) formData.append('id', values.id)
            formData.append('name', values.name)
            if (values.code) formData.append('code', values.code)
            formData.append('category', values.category)
            formData.append('expiration_alert_days', values.expiration_alert_days.toString())

            const result = await upsertDocumentType(null, formData)

            if (result?.success) {
                toast.success(result.message)
                onOpenChange(false)
                form.reset()
            } else {
                toast.error(result?.message || 'Error al guardar')
            }
        })
    }

    const category = form.watch('category')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{documentType ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}</DialogTitle>
                    <DialogDescription>
                        Define las reglas y características para este tipo de documento.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Antecedentes Penales" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una categoría" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {DOC_CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat === 'con_vencimiento' ? 'Con Vencimiento' :
                                                            cat === 'sin_vencimiento' ? 'Sin Vencimiento' :
                                                                'Seguro'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {(category === 'con_vencimiento' || category === 'seguro') && (
                            <div className="rounded-lg border p-4 bg-muted/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">Configuración de Alertas</span>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="expiration_alert_days"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Días de anticipación para alerta</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} {...field} />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Cuantos días antes del vencimiento se marcará como &ldquo;Por Vencer&rdquo;.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
