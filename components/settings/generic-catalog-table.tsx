
"use client"

import { useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Trash, RotateCcw, MoreHorizontal, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface GenericCatalogTableProps {
    data: any[]
    itemName: string // e.g., "Rubro", "Area"
    createAction?: (name: string) => Promise<{ success: boolean; message?: string; item?: any }>
    updateAction?: (id: string, name: string) => Promise<{ success: boolean; message?: string }>
    deleteAction: (id: string) => Promise<{ success: boolean; message?: string }>
    restoreAction: (id: string) => Promise<{ success: boolean; message?: string }>
    embedded?: boolean // To hide header if needed
    customCreateTrigger?: React.ReactNode
    columns?: ColumnDef<any>[]
}

export function GenericCatalogTable({
    data,
    itemName,
    createAction,
    updateAction,
    deleteAction,
    restoreAction,
    embedded = false,
    customCreateTrigger,
    columns: customColumns
}: GenericCatalogTableProps) {
    const router = useRouter()
    const [view, setView] = useState<'active' | 'trash'>('active')
    const [newItemName, setNewItemName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)

    // Edit State
    const [editItem, setEditItem] = useState<{ id: string, nombre: string } | null>(null)
    const [editName, setEditName] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)

    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const filteredData = data.filter(item => {
        if (view === 'active') return item.is_active !== false // Handle null/undefined as true optional
        return item.is_active === false
    })

    const handleCreate = async () => {
        if (!newItemName.trim()) return
        setIsCreating(true)
        try {
            if (createAction) {
                const res = await createAction(newItemName)
                if (res.success) {
                    toast.success(`${itemName} creado correctamente`)
                    setCreateOpen(false)
                    setNewItemName("")
                    router.refresh()
                } else {
                    toast.error(res.message || "Error al crear")
                }
            }
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Error inesperado'
            toast.error(errMsg)
        } finally {
            setIsCreating(false)
        }
    }

    const handleEditClick = (item: any) => {
        setEditItem({ id: item.id, nombre: item.nombre })
        setEditName(item.nombre)
    }

    const handleUpdate = async () => {
        if (!editItem || !editName.trim()) return
        setIsUpdating(true)
        try {
            if (updateAction) {
                const res = await updateAction(editItem.id, editName)
                if (res.success) {
                    toast.success(`${itemName} actualizado`)
                    setEditItem(null)
                    setEditName("")
                    router.refresh()
                } else {
                    toast.error(res.message || "Error al actualizar")
                }
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsUpdating(false)
        }
    }


    const confirmDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await deleteAction(deleteId)
            if (res.success) {
                toast.success(`${itemName} eliminado`)
                router.refresh()
            } else {
                toast.error(res.message || "Error al eliminar")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const handleRestore = async (id: string) => {
        try {
            const res = await restoreAction(id)
            if (res.success) {
                toast.success(`${itemName} restaurado`)
                router.refresh()
            } else {
                toast.error(res.message || "Error al restaurar")
            }
        } catch (error) {
            toast.error("Error inesperado")
        }
    }

    const defaultColumns: ColumnDef<any>[] = [
        {
            accessorKey: "nombre",
            header: "Nombre",
            cell: ({ row }) => <span className="font-medium">{row.getValue("nombre")}</span>
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                if (view === 'trash') {
                    return (
                        <div className="flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestore(item.id)}
                                className="bg-green-50 hover:bg-green-100 text-green-700"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Restaurar</span>
                            </Button>
                        </div>
                    )
                }

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menú</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                {updateAction && (
                                    <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                        Editar
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="text-red-600 focus:text-red-600">
                                    <Trash className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            }
        }
    ]

    const tableColumns = customColumns ? [
        ...customColumns,
        defaultColumns.find(c => c.id === "actions")!
    ] : defaultColumns

    return (
        <div className="space-y-4">
            {/* Edit Dialog */}
            <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar {itemName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder={`Nombre del ${itemName}`}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                            />
                        </div>
                        <Button onClick={handleUpdate} disabled={isUpdating || !editName.trim()} className="w-full">
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el registro. Podrás restaurarlo desde la papelera.
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

            <div className={embedded ? "" : "border rounded-md p-4"}>
                <DataTable
                    columns={tableColumns}
                    data={filteredData}
                    searchKey="nombre"
                    hideViewOptions={true}
                    customAction={
                        <div className="flex items-center gap-2">
                            <Button
                                variant={view === 'active' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setView('active')}
                            >
                                Activos
                            </Button>
                            <Button
                                variant={view === 'trash' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setView('trash')}
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Papelera</span>
                            </Button>

                            {view === 'active' && (
                                customCreateTrigger ? customCreateTrigger : (
                                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                                                <Plus className="mr-2 h-4 w-4" />
                                                <span className="hidden sm:inline">Nuevo {itemName}</span>
                                                <span className="inline sm:hidden">Nuevo</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Crear {itemName}</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Nombre</Label>
                                                    <Input
                                                        value={newItemName}
                                                        onChange={(e) => setNewItemName(e.target.value)}
                                                        placeholder={`Nombre del ${itemName}`}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                                    />
                                                </div>
                                                <Button onClick={handleCreate} disabled={isCreating || !newItemName.trim()} className="w-full">
                                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Crear
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )
                            )}
                        </div>
                    }
                />
            </div>
        </div>
    )
}
