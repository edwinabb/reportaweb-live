'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Trash2, ArchiveRestore, Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { createConfigDoc, updateConfigDoc, deleteConfigItem, restoreConfigItem } from "@/lib/actions/cotizaciones-config"

interface ConfigDoc {
    id: string
    nombre: string
    contenido: string
    is_active: boolean
}

interface ConfigDocTableProps {
    data: ConfigDoc[]
}

export function ConfigDocTable({ data }: ConfigDocTableProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [showTrash, setShowTrash] = useState(false)

    // Create State
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [nombre, setNombre] = useState("")
    const [contenido, setContenido] = useState("")

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editContenido, setEditContenido] = useState("")

    const filteredData = data.filter(item => {
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = showTrash ? !item.is_active : item.is_active
        return matchesSearch && matchesStatus
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nombre || !contenido) {
            toast.error("Complete todos los campos")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createConfigDoc(nombre, contenido)
            if (result.success) {
                toast.success("Documento configurado")
                setIsOpen(false)
                setNombre("")
                setContenido("")
                router.refresh()
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const startEdit = (item: ConfigDoc) => {
        setEditingId(item.id)
        setEditContenido(item.contenido || "")
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditContenido("")
    }

    const saveEdit = async (id: string) => {
        const result = await updateConfigDoc(id, editContenido)
        if (result.success) {
            toast.success("Actualizado correctamente")
            setEditingId(null)
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const handleDelete = async (id: string) => {
        const result = await deleteConfigItem('cotizaciones_configuracion_doc', id)
        if (result.success) {
            toast.success("Movido a papelera")
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const handleRestore = async (id: string) => {
        const result = await restoreConfigItem('cotizaciones_configuracion_doc', id)
        if (result.success) {
            toast.success("Restaurado")
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar documento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showTrash ? "default" : "outline"}
                        onClick={() => setShowTrash(!showTrash)}
                    >
                        {showTrash ? "Ver Activos" : "Ver Papelera"}
                    </Button>

                    {!showTrash && (
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nuevo Texto
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Nuevo Texto de Documento</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre / Sección</Label>
                                        <Input
                                            id="nombre"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            placeholder="Ej. Terminos y Condiciones"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contenido">Contenido</Label>
                                        <Textarea
                                            id="contenido"
                                            value={contenido}
                                            onChange={(e) => setContenido(e.target.value)}
                                            placeholder="Texto del documento..."
                                            className="min-h-[200px]"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                                        <Button type="submit" disabled={isSubmitting}>Guardar</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Nombre</TableHead>
                            <TableHead>Contenido</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No se encontraron resultados
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nombre}</TableCell>
                                    <TableCell>
                                        {editingId === item.id ? (
                                            <div className="flex flex-col gap-2">
                                                <Textarea
                                                    value={editContenido}
                                                    onChange={(e) => setEditContenido(e.target.value)}
                                                    className="min-h-[150px]"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                        <X className="h-4 w-4 mr-1" /> Cancelar
                                                    </Button>
                                                    <Button size="sm" onClick={() => saveEdit(item.id)}>
                                                        <Save className="h-4 w-4 mr-1" /> Guardar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="max-h-[100px] overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                                                {item.contenido}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {showTrash ? (
                                            <Button variant="ghost" size="icon" onClick={() => handleRestore(item.id)}>
                                                <ArchiveRestore className="h-4 w-4 text-green-600" />
                                            </Button>
                                        ) : (
                                            <div className="flex gap-1">
                                                {!editingId && (
                                                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
