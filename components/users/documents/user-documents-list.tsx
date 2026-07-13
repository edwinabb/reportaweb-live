'use client'

import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, Trash2, Eye, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTransition } from 'react'
import { deleteUserDocument } from '@/lib/actions/user-documents'

import { UserDocument } from '@/types/user-documents'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/utils/supabase/client'

interface UserDocumentsListProps {
    documents: UserDocument[]
    userId: string
}

export function UserDocumentsList({ documents, userId }: UserDocumentsListProps) {
    const [, startTransition] = useTransition()
    const supabase = createClient() // For getting public URL if needed, though usually server passes it. 
    // Actually, storage path is private usually. We need signed URLs or proxy.
    // For now, assuming we use the `getUserDocuments` which usually returns signed URLs or we generate them on fly? 
    // The schema says `file_path`.

    // Helper to get view URL


    const handleView = async (path: string) => {
        const { data } = await supabase.storage.from('doc_usuarios').createSignedUrl(path, 60 * 60) // 1 hour
        if (data?.signedUrl) {
            window.open(data.signedUrl, '_blank')
        } else {
            toast.error("No se pudo generar el enlace de visualización")
        }
    }

    const handleDelete = (docId: string) => {
        startTransition(async () => {
            const result = await deleteUserDocument(docId, userId)
            if (result?.success) {
                toast.success(result.message)
            } else {
                toast.error(result?.message || 'Error al eliminar')
            }
        })
    }

    const getStatusBadge = (doc: UserDocument) => {
        if (!doc.valid_until) {
            return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Permanente</Badge>
        }

        const today = new Date()
        const validUntil = parseISO(doc.valid_until) // Assuming YYYY-MM-DD string
        const diff = differenceInDays(validUntil, today)
        const alertDays = doc.document_type?.expiration_alert_days || 30

        if (diff < 0) {
            return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> VENCIDO</Badge>
        } else if (diff <= alertDays) {
            return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200 gap-1"><AlertCircle className="w-3 h-3" /> Por Vencer ({diff} días)</Badge>
        } else {
            return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 gap-1"><CheckCircle className="w-3 h-3" /> Vigente</Badge>
        }
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No hay documentos cargados</h3>
                <p className="text-sm text-muted-foreground">Sube los documentos requeridos usando el botón &ldquo;Subir Documento&rdquo;.</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Fechas</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{doc.document_type?.name || 'Documento Desconocido'}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            {doc.file_name}
                                            {/* ({(doc.file_size || 0 / 1024).toFixed(0)} KB) */}
                                        </p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm space-y-1">
                                    {doc.valid_from && (
                                        <p className="text-muted-foreground text-xs">Desde: <span className="font-medium text-foreground">{format(parseISO(doc.valid_from), 'PP', { locale: es })}</span></p>
                                    )}
                                    {doc.valid_until ? (
                                        <p className="text-muted-foreground text-xs">Hasta: <span className="font-medium text-foreground">{format(parseISO(doc.valid_until), 'PP', { locale: es })}</span></p>
                                    ) : (
                                        <p className="text-muted-foreground text-xs">-</p>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(doc)}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleView(doc.file_path)} title="Ver Documento">
                                        <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" title="Eliminar">
                                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción moverá el documento a la papelera.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(doc.id)} className="bg-destructive">
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
