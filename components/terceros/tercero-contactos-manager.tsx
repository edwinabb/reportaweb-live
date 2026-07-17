"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
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
    deleteTerceroContacto,
    getTerceroContactos
} from "@/lib/actions/terceros-modules"
import { getTercerosForSelect } from "@/lib/actions/terceros"
import { TerceroContacto } from "@/types/terceros"
import { ContactoDialog } from "./contacto-dialog"

interface TerceroContactosManagerProps {
    terceroId: string
}

/**
 * Tab "Contactos" del editor de tercero. El form canónico es ContactoDialog
 * (mismo componente que la lista global /terceros/contactos) — DUDA-TER-011.
 */
export function TerceroContactosManager({ terceroId }: TerceroContactosManagerProps) {
    const [contactos, setContactos] = useState<TerceroContacto[]>([])
    const [terceros, setTerceros] = useState<{ id: string; razon_social: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<TerceroContacto | null>(null)

    const loadContactos = useCallback(async () => {
        setIsLoading(true)
        const [data, tercerosList] = await Promise.all([
            getTerceroContactos(true, terceroId),
            getTercerosForSelect(),
        ])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setContactos(data as any)
        setTerceros(tercerosList)
        setIsLoading(false)
    }, [terceroId])

    useEffect(() => {
        if (terceroId) {
            loadContactos()
        }
    }, [terceroId, loadContactos])

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
                                <TableHead>Área</TableHead>
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
                                    <TableCell>{contact.area || "-"}</TableCell>
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

            <ContactoDialog
                terceros={terceros}
                defaultTerceroId={terceroId}
                contactoToEdit={editingContact ?? undefined}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) setEditingContact(null)
                }}
                onSuccess={() => loadContactos()}
            />
        </div>
    )
}
