'use client'

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Trash, MoreHorizontal, RotateCcw, FileText, Download, Search, Filter, FileArchive, Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteMaquinariaDocumento, restoreMaquinariaDocumento } from "@/lib/actions/maquinaria-docs"
import { format } from "date-fns"
import { GlobalDocumentDialog } from "@/components/maquinaria/global-document-dialog"
import { Maquinaria, MaquinariaTipoDoc } from "@/types/maquinaria"

export type DocGlobal = {
    id: string
    numero_doc: string
    fecha_emision?: string | null
    fecha_vencimiento?: string | null
    archivo_url?: string | null
    estado?: string
    maquinaria_id: string
    tipo_doc_id: string
    is_active: boolean
    maquinaria: { internal_id: string, modelo: string, codigo_interno?: string, modelo_ref?: { modelo: string } }
    tipo_doc: { nombre: string }
}

interface DocumentosGlobalesClientProps {
    documentos: DocGlobal[]
    maquinarias: Maquinaria[]
    tipos: MaquinariaTipoDoc[]
    isTrash?: boolean
}

export function DocumentosGlobalesClientPage({ documentos, maquinarias, tipos, isTrash = false }: DocumentosGlobalesClientProps) {
    const router = useRouter()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleteMachineId, setDeleteMachineId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [editItem, setEditItem] = useState<DocGlobal | null>(null)

    // Filtros Locales
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all') // all, current, expiring, expired
    const [isDownloading, setIsDownloading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredData.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredData.map(d => d.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const confirmDelete = async () => {
        if (!deleteId || !deleteMachineId) return
        setIsDeleting(true)
        try {
            const res = await deleteMaquinariaDocumento(deleteId, deleteMachineId)
            if (res.message && res.message.includes("eliminado")) {
                toast.success("Documento eliminado")
                router.refresh()
            } else {
                toast.error(res.message || "Error al eliminar")
            }
        } catch {
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
            setDeleteMachineId(null)
        }
    }

    const handleRestore = async (id: string, machineId: string) => {
        const res = await restoreMaquinariaDocumento(id, machineId)
        if (res.success) {
            toast.success("Documento restaurado")
            router.refresh()
        } else {
            toast.error(res.message)
        }
    }

    const handleDownloadExcel = async () => {
        try {
            const { utils, writeFile } = await import('xlsx')

            const docsToExport = selectedIds.size > 0
                ? filteredData.filter(d => selectedIds.has(d.id))
                : filteredData

            const dataToExport = docsToExport.map(doc => {
                const maq = doc.maquinaria
                const modelo = maq?.modelo_ref?.modelo || maq?.modelo || '-'
                const fecha = doc.fecha_vencimiento
                let estado = 'N/A'
                if (fecha) {
                    const isExpired = new Date(fecha) < new Date()
                    estado = isExpired ? 'VENCIDO' : 'VIGENTE'
                }

                return {
                    'Equipo': maq?.internal_id || maq?.codigo_interno || '-',
                    'Modelo': modelo,
                    'Tipo Documento': doc.tipo_doc?.nombre,
                    'Nº Documento': doc.numero_doc,
                    'Válido desde': doc.fecha_emision ? format(new Date(doc.fecha_emision), 'dd/MM/yyyy') : '-',
                    'Vencimiento': fecha ? format(new Date(fecha), 'dd/MM/yyyy') : '-',
                    'Estado': estado,
                    'Archivo': doc.archivo_url || 'No adjunto'
                }
            })

            const ws = utils.json_to_sheet(dataToExport)
            const wb = utils.book_new()
            utils.book_append_sheet(wb, ws, "Documentos Maquinaria")
            writeFile(wb, `Reporte_Docs_Maquinaria_${format(new Date(), 'yyyyMMdd')}.xlsx`)
            toast.success(`Excel generado (${docsToExport.length} documentos)`)
        } catch (error) {
            console.error(error)
            toast.error("Error al generar Excel")
        }
    }

    const handleDownloadZip = async () => {
        setIsDownloading(true)
        try {
            const JSZip = (await import('jszip')).default
            const { saveAs } = await import('file-saver')

            const zip = new JSZip()
            const folder = zip.folder("documentos_maquinaria")

            const docsToExport = selectedIds.size > 0
                ? filteredData.filter(d => selectedIds.has(d.id))
                : filteredData

            if (docsToExport.length === 0) {
                toast.error("No hay documentos para descargar")
                return
            }

            let count = 0
            await Promise.all(docsToExport.map(async (doc) => {
                if (!doc.archivo_url) return

                try {
                    const response = await fetch(doc.archivo_url)
                    if (!response.ok) throw new Error('Fetch failed')
                    const blob = await response.blob()

                    // Naming: [Equipo]_[Tipo]_[Fecha].ext
                    const maq = doc.maquinaria
                    const equipo = (maq?.internal_id || maq?.codigo_interno || 'Equipo').replace(/[^a-zA-Z0-9]/g, '_')
                    const tipo = (doc.tipo_doc?.nombre || 'Doc').replace(/[^a-zA-Z0-9]/g, '_')
                    const ext = doc.archivo_url.split('.').pop()?.split('?')[0] || 'pdf'

                    const safeName = `${equipo}_${tipo}_${doc.numero_doc || 'SF'}.${ext}`

                    folder?.file(safeName, blob)
                    count++
                } catch {
                    // console.error("Error downloading file", doc.archivo_url)
                }
            }))

            if (count === 0) {
                toast.error("No se pudieron descargar los archivos")
                return
            }

            const content = await zip.generateAsync({ type: "blob" })
            saveAs(content, `Documentos_Maquinaria_${format(new Date(), 'yyyyMMdd')}.zip`)
            toast.success(`Descargados ${count} documentos`)

        } catch (error) {
            console.error(error)
            toast.error("Error al generar el ZIP")
        } finally {
            setIsDownloading(false)
        }
    }

    // Filtrado
    const filteredData = documentos.filter(doc => {
        // Trash Filter
        if (isTrash && doc.is_active) return false
        if (!isTrash && !doc.is_active) return false

        // Search Filter (Equipo, Tipo, Num)
        const term = searchTerm.toLowerCase()
        const maq = doc.maquinaria
        const searchMatch = !term ||
            (maq?.internal_id || '').toLowerCase().includes(term) ||
            (maq?.codigo_interno || '').toLowerCase().includes(term) ||
            (doc.tipo_doc?.nombre || '').toLowerCase().includes(term) ||
            (doc.numero_doc || '').toLowerCase().includes(term)

        if (!searchMatch) return false

        // Type Filter
        if (typeFilter !== 'all' && doc.tipo_doc_id !== typeFilter) return false

        // Status Filter
        if (statusFilter !== 'all') {
            if (!doc.fecha_vencimiento) {
                if (statusFilter === 'vigente') return true
                return false
            }
            const fecha = new Date(doc.fecha_vencimiento)
            const today = new Date()
            const isExpired = fecha < today

            if (statusFilter === 'vencido' && !isExpired) return false
            if (statusFilter === 'vigente' && isExpired) return false

            if (statusFilter === 'por_vencer') {
                const diffTime = fecha.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0 || diffDays > 30) return false
            }
        }

        return true
    })

    const columns: ColumnDef<DocGlobal>[] = [
        {
            id: "select",
            header: () => (
                <Checkbox
                    checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedIds.has(row.original.id)}
                    onCheckedChange={() => toggleSelect(row.original.id)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "maquinaria.internal_id",
            header: "EQUIPO",
            cell: ({ row }) => {
                const maq = row.original.maquinaria
                const modelo = maq?.modelo_ref?.modelo || maq?.modelo || '-'
                return (
                    <div className="flex flex-col">
                        <span className="font-bold">{maq?.internal_id || maq?.codigo_interno || '-'}</span>
                        <span className="text-xs text-muted-foreground uppercase">{modelo}</span>
                    </div>
                )
            }
        },
        {
            accessorKey: "tipo_doc.nombre",
            header: "TIPO DOCUMENTO",
        },
        {
            accessorKey: "numero_doc",
            header: "Nº DOCUMENTO",
            cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("numero_doc")}</span>
        },
        {
            header: "ESTADO",
            accessorKey: "estado_calc", // Virtual
            cell: ({ row }) => {
                const fecha = row.original.fecha_vencimiento
                if (!fecha) return <Badge variant="secondary">N/A</Badge>
                const date = new Date(fecha)
                const now = new Date()
                const isExpired = date < now
                return (
                    <Badge variant={isExpired ? "destructive" : "outline"} className={!isExpired ? "border-green-600 text-green-600 bg-green-50" : ""}>
                        {isExpired ? "VENCIDO" : "VIGENTE"}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "fecha_emision",
            header: "VÁLIDO DESDE",
            cell: ({ row }) => {
                const fecha = row.original.fecha_emision
                if (!fecha) return <span className="text-muted-foreground">-</span>
                return <span>{format(new Date(fecha), 'dd/MM/yyyy')}</span>
            }
        },
        {
            accessorKey: "fecha_vencimiento",
            header: "VENCIMIENTO",
            cell: ({ row }) => {
                const fecha = row.getValue("fecha_vencimiento") as string
                if (!fecha) return <span className="text-muted-foreground">-</span>
                return <span>{format(new Date(fecha), 'dd/MM/yyyy')}</span>
            }
        },
        {
            id: "archivo",
            header: "ARCHIVO",
            cell: ({ row }) => {
                const url = row.original.archivo_url
                if (!url) return null
                return (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm font-medium">
                        Link del archivo
                    </a>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                if (isTrash) {
                    return (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(item.id, item.maquinaria_id)}
                            className="bg-green-50 hover:bg-green-100 text-green-700"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurar
                        </Button>
                    )
                }

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditItem(item)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            {item.archivo_url && (
                                <DropdownMenuItem onClick={() => item.archivo_url && window.open(item.archivo_url, '_blank')}>
                                    <Download className="mr-2 h-4 w-4" /> Descargar
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                                setDeleteId(item.id)
                                setDeleteMachineId(item.maquinaria_id)
                            }} className="text-red-600 focus:text-red-600">
                                <Trash className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        },
    ]

    return (
        <>
            {editItem && (
                <GlobalDocumentDialog
                    maquinarias={maquinarias}
                    tipos={tipos}
                    initial={{
                        id: editItem.id,
                        maquinaria_id: editItem.maquinaria_id,
                        tipo_doc_id: editItem.tipo_doc_id,
                        numero_doc: editItem.numero_doc,
                        fecha_emision: editItem.fecha_emision,
                        fecha_vencimiento: editItem.fecha_vencimiento,
                        archivo_url: editItem.archivo_url,
                    }}
                    open={true}
                    onOpenChange={(o) => !o && setEditItem(null)}
                    triggerless
                />
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el documento. Podrás restaurarlo desde la papelera.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete() }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col gap-4">

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar equipo o documento..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo Documento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                {tipos.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos (Estado)</SelectItem>
                                <SelectItem value="vigente">Vigente</SelectItem>
                                <SelectItem value="por_vencer">Por vencer (30d)</SelectItem>
                                <SelectItem value="vencido">Vencido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 1. Vista Button */}
                        <Button variant="ghost" size="sm" className="gap-1 bg-white border">
                            <Filter className="w-4 h-4" /> Vista
                        </Button>

                        {/* 2. Activos/Papelera Segmented */}
                        <div className="flex items-center bg-muted/50 p-1 rounded-md border">
                            <Button
                                variant={!isTrash ? "default" : "ghost"}
                                size="sm"
                                className={!isTrash ? "bg-[#FF5A1F] h-7 text-xs shadow-sm hover:bg-[#FF5A1F]/90" : "h-7 text-xs hover:bg-transparent text-muted-foreground"}
                                onClick={() => router.push('/maquinarias/documentos')}
                            >
                                Activos
                            </Button>
                            <Button
                                variant={isTrash ? "default" : "ghost"}
                                size="sm"
                                className={isTrash ? "h-7 text-xs shadow-sm bg-white text-foreground" : "h-7 text-xs hover:bg-transparent text-muted-foreground"}
                                onClick={() => router.push('/maquinarias/documentos?view=trash')}
                            >
                                <Trash className="w-3.5 h-3.5 mr-1" />
                                Papelera
                            </Button>
                        </div>

                        {/* 3. Excel & ZIP Icons */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-green-200 hover:border-green-300 hover:bg-green-50"
                            onClick={handleDownloadExcel}
                            title="Descargar Excel"
                        >
                            <FileText className="h-4 w-4 text-green-600" />
                            {selectedIds.size > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">{selectedIds.size}</span>}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-yellow-200 hover:border-yellow-300 hover:bg-yellow-50"
                            onClick={handleDownloadZip}
                            disabled={isDownloading}
                            title="Descargar ZIP"
                        >
                            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4 text-yellow-600" />}
                            {!isDownloading && selectedIds.size > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-600 text-[10px] text-white">{selectedIds.size}</span>}
                        </Button>

                        {/* 4. Subir Documento */}
                        {!isTrash && (
                            <GlobalDocumentDialog maquinarias={maquinarias} tipos={tipos} />
                        )}
                    </div>
                </div>

                <div className="rounded-lg border p-6 bg-background">
                    <DataTable
                        columns={columns}
                        data={filteredData}
                    // searchKey removed to use custom filtering
                    />
                </div>
            </div>
        </>
    )
}
