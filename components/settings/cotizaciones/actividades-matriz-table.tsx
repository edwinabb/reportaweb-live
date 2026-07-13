'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Trash2, ArchiveRestore, Pencil } from "lucide-react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { createActividadMatriz } from "@/lib/actions/cotizaciones-config"
import { deleteConfigItem, restoreConfigItem, updateActividadMatriz } from "@/lib/actions/cotizaciones-config"

interface ActividadMatriz {
    id: string
    nombre: string
    descripcion?: string
    responsable_default: string
    is_active: boolean
}

interface ActividadesMatrizTableProps {
    data: ActividadMatriz[]
}

export function ActividadesMatrizTable({ data }: ActividadesMatrizTableProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [showTrash, setShowTrash] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Create Form states
    const [nombre, setNombre] = useState("")
    const [descripcion, setDescripcion] = useState("")
    const [responsable, setResponsable] = useState("EMPRESA")

    // Edit State
    const [editOpen, setEditOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<ActividadMatriz | null>(null)
    const [editNombre, setEditNombre] = useState("")
    const [editDescripcion, setEditDescripcion] = useState("")
    const [editResponsable, setEditResponsable] = useState("EMPRESA")


    const filteredData = data.filter(item => {
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = showTrash ? !item.is_active : item.is_active
        return matchesSearch && matchesStatus
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nombre) {
            toast.error("El nombre es requerido")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createActividadMatriz(nombre, descripcion, responsable)
            if (result.success) {
                toast.success("Actividad creada correctamente")
                setIsOpen(false)
                setNombre("")
                setDescripcion("")
                setResponsable("EMPRESA")
                router.refresh()
            } else {
                toast.error(result.message || "Error al crear actividad")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

    const openEdit = (item: ActividadMatriz) => {
        setEditingItem(item)
        setEditNombre(item.nombre)
        setEditDescripcion(item.descripcion || "")
        setEditResponsable(item.responsable_default)
        setEditOpen(true)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingItem || !editNombre) return

        setIsSubmitting(true)
        try {
            const result = await updateActividadMatriz(editingItem.id, editNombre, editDescripcion, editResponsable)
            if (result.success) {
                toast.success("Actividad actualizada correctamente")
                setEditOpen(false)
                setEditingItem(null)
                router.refresh()
            } else {
                toast.error(result.message || "Error al actualizar")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        const result = await deleteConfigItem('actividades_matriz', id)
        if (result.success) {
            toast.success("Actividad movida a la papelera")
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const handleRestore = async (id: string) => {
        const result = await restoreConfigItem('actividades_matriz', id)
        if (result.success) {
            toast.success("Actividad restaurada")
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
                            placeholder="Buscar actividad..."
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
                                    Nueva Actividad
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nueva Actividad de Matriz</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre</Label>
                                        <Input
                                            id="nombre"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            placeholder="Ej. Operador"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="descripcion">Descripción</Label>
                                        <Textarea
                                            id="descripcion"
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            placeholder="Detalle largo que aparecerá en el documento..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="responsable">Responsable Default</Label>
                                        <Select value={responsable} onValueChange={setResponsable}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EMPRESA">EMPRESA</SelectItem>
                                                <SelectItem value="CLIENTE">CLIENTE</SelectItem>
                                            </SelectContent>
                                        </Select>
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

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Actividad</DialogTitle>
                    </DialogHeader>
                    {editingItem && (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    value={editNombre}
                                    onChange={(e) => setEditNombre(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Textarea
                                    value={editDescripcion}
                                    onChange={(e) => setEditDescripcion(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Responsable Default</Label>
                                <Select value={editResponsable} onValueChange={setEditResponsable}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EMPRESA">EMPRESA</SelectItem>
                                        <SelectItem value="CLIENTE">CLIENTE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>Guardar Cambios</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción (Documento)</TableHead>
                            <TableHead>Responsable Default</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No se encontraron resultados
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nombre}</TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={item.descripcion}>
                                        {item.descripcion || '-'}
                                    </TableCell>
                                    <TableCell>{item.responsable_default}</TableCell>
                                    <TableCell>
                                        {showTrash ? (
                                            <Button variant="ghost" size="icon" onClick={() => handleRestore(item.id)}>
                                                <ArchiveRestore className="h-4 w-4 text-green-600" />
                                            </Button>
                                        ) : (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
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
