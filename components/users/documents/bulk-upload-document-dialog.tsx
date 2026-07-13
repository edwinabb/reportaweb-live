'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Upload, Loader2, AlertCircle, CheckCircle2, UserPlus, X, Search, Check } from 'lucide-react'

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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

import { DocumentType } from '@/types/user-documents'
import { Profile } from '@/types'
import { uploadBulkUserDocument } from '@/lib/actions/user-documents'
import { getProfiles } from '@/lib/actions/users'
import { cn } from '@/lib/utils'

interface BulkUploadDocumentDialogProps {
    documentTypes: DocumentType[]
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function BulkUploadDocumentDialog({ documentTypes, trigger, onSuccess }: BulkUploadDocumentDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)

    const [selectedTypeObj, setSelectedTypeObj] = useState<DocumentType | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const form = useForm({
        defaultValues: {
            document_type_id: '',
            valid_from: '',
            valid_until: '',
        },
    })

    // Load profiles when dialog opens
    useEffect(() => {
        if (open) {
            setIsLoadingProfiles(true)
            getProfiles(true).then(data => {
                setProfiles(data)
                setIsLoadingProfiles(false)
            })
        } else {
            form.reset()
            setSelectedUserIds([])
            setSearchTerm('')
            setSelectedFile(null)
            setSelectedTypeObj(null)
        }
    }, [open, form])

    // Date Logic (same as single upload)
    const watchUntil = form.watch('valid_until')
    useEffect(() => {
        const from = form.getValues('valid_from')
        if (watchUntil && !from) {
            const untilDate = new Date(watchUntil)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (untilDate < today) {
                form.setValue('valid_from', watchUntil)
            } else {
                form.setValue('valid_from', new Date().toISOString().split('T')[0])
            }
        }
    }, [watchUntil, form])

    const watchTypeId = form.watch('document_type_id')
    useEffect(() => {
        const found = documentTypes.find(d => d.id === watchTypeId)
        setSelectedTypeObj(found || null)
    }, [watchTypeId, documentTypes])

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doc_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleUser = (id: string) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        )
    }

    const selectAll = () => {
        if (selectedUserIds.length === filteredProfiles.length) {
            setSelectedUserIds([])
        } else {
            setSelectedUserIds(filteredProfiles.map(p => p.id))
        }
    }

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault()
        const values = form.getValues()

        if (selectedUserIds.length === 0) {
            toast.error("Seleccione al menos un usuario")
            return
        }
        if (!values.document_type_id) {
            toast.error("Seleccione un tipo de documento")
            return
        }
        if (!selectedFile) {
            toast.error("Seleccione un archivo")
            return
        }
        if (!values.valid_until) {
            toast.error("La fecha de vencimiento es obligatoria para cargas masivas.")
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
            formData.append('user_ids', JSON.stringify(selectedUserIds))
            formData.append('document_type_id', values.document_type_id)
            if (values.valid_from) formData.append('valid_from', values.valid_from)
            if (values.valid_until) formData.append('valid_until', values.valid_until)
            formData.append('file', selectedFile)

            const result = await uploadBulkUserDocument(null, formData)
            if (result?.success) {
                toast.success(result.message)
                setOpen(false)
                onSuccess?.()
            } else {
                toast.error(result?.message || 'Error en carga masiva')
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="default" className="bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-medium">
                        <Upload className="mr-2 h-4 w-4" /> Subir documento
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Subir Documento</DialogTitle>
                    <DialogDescription>
                        Cargue un documento y asígnelo a múltiples usuarios simultáneamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT: FORM INFO */}
                        <div className="space-y-4">
                            <Form {...form}>
                                <div className="space-y-4">
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
                                                        {documentTypes.map(t => (
                                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="valid_from"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Desde</FormLabel>
                                                    <FormControl><Input type="date" {...field} className="h-8 text-xs" /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="valid_until"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Hasta (Vence) <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl><Input type="date" {...field} className="h-8 text-xs" /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <FormLabel className="text-xs">Archivo <span className="text-red-500">*</span></FormLabel>
                                        <label className={cn(
                                            "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                            selectedFile ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"
                                        )}>
                                            <div className="flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                                                {selectedFile ? (
                                                    <>
                                                        <CheckCircle2 className="w-5 h-5 mb-1 text-primary" />
                                                        <p className="text-[10px] font-medium truncate w-full px-2">{selectedFile.name}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-5 h-5 mb-1 text-muted-foreground" />
                                                        <p className="text-[10px] text-muted-foreground px-2">Click para cargar</p>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                </div>
                            </Form>
                        </div>

                        {/* RIGHT: USER SELECTION */}
                        <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/20">
                            <div className="p-3 border-b bg-background/50 flex flex-col gap-2 font-medium text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    Seleccionar Usuarios ({selectedUserIds.length}) <span className="text-red-500">*</span>
                                </span>
                                <div className="relative">
                                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar..."
                                        className="h-7 pl-8 text-xs"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <Button variant="link" className="h-auto p-0 text-[10px]" onClick={selectAll}>
                                        {selectedUserIds.length === filteredProfiles.length ? 'Deseleccionar todo' : 'Seleccionar filtrados'}
                                    </Button>
                                </div>
                            </div>
                            <ScrollArea className="flex-1 h-[250px]">
                                {isLoadingProfiles ? (
                                    <div className="flex items-center justify-center h-full"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                ) : (
                                    <div className="p-1 space-y-0.5">
                                        {filteredProfiles.map(p => (
                                            <div
                                                key={p.id}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md hover:bg-background cursor-pointer transition-colors",
                                                    selectedUserIds.includes(p.id) && "bg-background shadow-sm"
                                                )}
                                                onClick={() => toggleUser(p.id)}
                                            >
                                                <Checkbox checked={selectedUserIds.includes(p.id)} />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] font-medium truncate">{p.full_name}</span>
                                                    <span className="text-[9px] text-muted-foreground italic">{p.doc_number || 'S/D'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    {selectedUserIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 p-2 bg-muted/30 rounded-md border border-dashed">
                            {selectedUserIds.slice(0, 10).map(id => {
                                const p = profiles.find(x => x.id === id)
                                return (
                                    <Badge key={id} variant="secondary" className="text-[9px] py-0 h-5">
                                        {p?.first_name}
                                        <X className="ml-1 h-2 w-2 cursor-pointer" onClick={() => toggleUser(id)} />
                                    </Badge>
                                )
                            })}
                            {selectedUserIds.length > 10 && <span className="text-[9px] text-muted-foreground px-1">+{selectedUserIds.length - 10} más</span>}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
                    <Button
                        onClick={handleUpload}
                        disabled={
                            isPending ||
                            selectedUserIds.length === 0 ||
                            !form.getValues('document_type_id') ||
                            !selectedFile ||
                            !form.getValues('valid_until')
                        }
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Subir a {selectedUserIds.length} usuarios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
