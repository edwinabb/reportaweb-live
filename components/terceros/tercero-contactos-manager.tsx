"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    createTerceroContacto,
    updateTerceroContacto,
    deleteTerceroContacto,
    getTerceroContactos
} from "@/lib/actions/terceros-modules"
import { TerceroContacto } from "@/types/terceros"

import { ActionCatalogoDialog } from "@/components/common/action-catalogo-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    getContactosCargos,
    getContactosAreas,
    createContactoCargo,
    createContactoArea
} from "@/lib/actions/catalogos"

interface TerceroContactosManagerProps {
    terceroId: string
}

export function TerceroContactosManager({ terceroId }: TerceroContactosManagerProps) {
    const [contactos, setContactos] = useState<TerceroContacto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<TerceroContacto | null>(null)

    const [cargos, setCargos] = useState<{ id: string, nombre: string }[]>([])
    const [areas, setAreas] = useState<{ id: string, nombre: string }[]>([])

    const loadContactos = async () => {
        setIsLoading(true)
        const [data, c, a] = await Promise.all([
            getTerceroContactos(true, terceroId),
            getContactosCargos(),
            getContactosAreas()
        ])
        setContactos(data as any)
        setCargos(c)
        setAreas(a)
        setIsLoading(false)
    }

    useEffect(() => {
        if (terceroId) {
            loadContactos()
        }
    }, [terceroId])

    const handleCreate = async (formData: FormData) => {
        formData.append("tercero_id", terceroId)
        const result = await createTerceroContacto(null, formData)
        if (result.success) {
            toast.success("Contacto creado")
            setIsDialogOpen(false)
            loadContactos()
        } else {
            toast.error(result.message)
        }
    }

    const handleUpdate = async (formData: FormData) => {
        if (editingContact) {
            formData.append("id", editingContact.id)
            formData.append("tercero_id", terceroId)
            const result = await updateTerceroContacto(null, formData)
            if (result.success) {
                toast.success("Contacto actualizado")
                setIsDialogOpen(false)
                setEditingContact(null)
                loadContactos()
            } else {
                toast.error(result.message)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este contacto?")) {
            const result = await deleteTerceroContacto(id)
            if (result.success) {
                toast.success("Contacto eliminado")
                loadContactos()
            } else {
                toast.error(result.message)
            }
        }
    }

    const openCreate = () => {
        setEditingContact(null)
        setIsDialogOpen(true)
    }

    const openEdit = (contact: TerceroContacto) => {
        setEditingContact(contact)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Lista de Contactos</h3>
                <Button onClick={openCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Contacto
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : contactos.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-muted/10 text-muted-foreground">
                    No hay contactos registrados.
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Cargo</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contactos.map((contact) => (
                                <TableRow key={contact.id}>
                                    <TableCell className="font-medium">{contact.nombre_completo}</TableCell>
                                    <TableCell>{contact.cargo || "-"}</TableCell>
                                    <TableCell>{contact.telefono || "-"}</TableCell>
                                    <TableCell>{contact.email || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(contact)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingContact ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
                    </DialogHeader>
                    <form action={editingContact ? handleUpdate : handleCreate} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nombre_completo">Nombre Completo *</Label>
                            <Input
                                id="nombre_completo"
                                name="nombre_completo"
                                defaultValue={editingContact?.nombre_completo}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cargo">Cargo</Label>
                                <div className="flex gap-2">
                                    <Select name="cargo" defaultValue={editingContact?.cargo}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Cargo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cargos.map(c => (
                                                <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <ActionCatalogoDialog
                                        label="Cargo"
                                        createAction={createContactoCargo}
                                        onItemCreated={(newItem: { id: string, nombre: string }) => {
                                            setCargos([...cargos, newItem])
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="area">Área</Label>
                                <div className="flex gap-2">
                                    <Select name="area" defaultValue={editingContact?.area}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Área" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {areas.map(a => (
                                                <SelectItem key={a.id} value={a.nombre}>{a.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <ActionCatalogoDialog
                                        label="Área"
                                        createAction={createContactoArea}
                                        onItemCreated={(newItem: { id: string, nombre: string }) => {
                                            setAreas([...areas, newItem])
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="telefono">Teléfono</Label>
                                <Input
                                    id="telefono"
                                    name="telefono"
                                    defaultValue={editingContact?.telefono}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={editingContact?.email}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
