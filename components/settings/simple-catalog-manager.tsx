
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface SimpleCatalogManagerProps {
    data: { id: string, nombre: string }[]
    createAction: (name: string) => Promise<{ success: boolean; message?: string; item?: any }>
    deleteAction?: (id: string) => Promise<{ success: boolean; message?: string }>
    placeholder?: string
    title?: string
}

export function SimpleCatalogManager({
    data,
    createAction,
    deleteAction,
    placeholder = "Nuevo registro...",
    title
}: SimpleCatalogManagerProps) {
    const [items, setItems] = useState(data)
    const [newItemName, setNewItemName] = useState("")
    const [isPending, setIsPending] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleCreate = async () => {
        if (!newItemName.trim()) return

        setIsPending(true)
        try {
            const res = await createAction(newItemName)
            if (res.success && res.item) {
                setItems([...items, res.item])
                setNewItemName("")
                toast.success("Agregado correctamente")
            } else {
                toast.error(res.message || "Error al agregar")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsPending(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!deleteAction) return
        setDeletingId(id)
        try {
            const res = await deleteAction(id)
            if (res.success) {
                setItems(items.filter(i => i.id !== id))
                toast.success("Eliminado correctamente")
            } else {
                toast.error(res.message || "Error al eliminar")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-4">
            {title && <h3 className="text-lg font-medium">{title}</h3>}
            <div className="flex gap-2">
                <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={placeholder}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    disabled={isPending}
                />
                <Button onClick={handleCreate} disabled={isPending || !newItemName.trim()}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                    No hay registros
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>
                                        {deleteAction && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                            >
                                                {deletingId === item.id ?
                                                    <Loader2 className="h-4 w-4 animate-spin" /> :
                                                    <Trash2 className="h-4 w-4" />
                                                }
                                            </Button>
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
