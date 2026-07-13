'use client'

import { TasaCambio } from "@/types/cotizaciones"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Trash, Pencil, MoreHorizontal, RotateCcw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { TasaCambioForm } from "@/components/cotizaciones/tasa-cambio-form"
import { deleteTasaCambio, restoreTasaCambio } from "@/lib/actions/tasas-cambio"
import { format } from "date-fns"

interface TasasClientProps {
    tasas: TasaCambio[]
    isTrash?: boolean
}

export function TasasClientPage({ tasas, isTrash = false }: TasasClientProps) {
    const router = useRouter()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [editingTasa, setEditingTasa] = useState<TasaCambio | undefined>(undefined)

    const confirmDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await deleteTasaCambio(deleteId)
            if (res.success) {
                toast.success("Tasa de cambio eliminada")
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch (_error) {
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const handleRestore = async (id: string) => {
        const res = await restoreTasaCambio(id)
        if (res.success) {
            toast.success("Tasa restaurada")
            router.refresh()
        } else {
            toast.error(res.message)
        }
    }

    const columns: ColumnDef<TasaCambio>[] = [
        {
            accessorKey: "fecha_vigencia",
            header: "Fecha",
            cell: ({ row }) => <span className="font-mono">{format(new Date(row.getValue("fecha_vigencia")), 'dd/MM/yyyy')}</span>
        },
        {
            accessorKey: "moneda_origen",
            header: "Origen",
        },
        {
            accessorKey: "moneda_destino",
            header: "Destino",
        },
        {
            accessorKey: "tasa",
            header: "Tasa",
            cell: ({ row }) => <span className="font-bold">{row.getValue("tasa")}</span>
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
                            onClick={() => handleRestore(item.id)}
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
                            <DropdownMenuItem onClick={() => {
                                setEditingTasa(item)
                                setFormOpen(true)
                            }}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="text-red-600 focus:text-red-600">
                                <Trash className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        },
    ]

    const filteredData = isTrash
        ? tasas.filter(t => !t.is_active)
        : tasas.filter(t => t.is_active)

    return (
        <>
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la tasa de cambio. Podrás restaurarla desde la papelera.
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

                <div className="rounded-lg border p-6 bg-background">
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        searchKey="fecha_vigencia"
                        customAction={
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={!isTrash ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.push('/cotizaciones/tasas')}
                                >
                                    Activos
                                </Button>
                                <Button
                                    variant={isTrash ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.push('/cotizaciones/tasas?view=trash')}
                                >
                                    <Trash className="w-4 h-4 mr-2" />
                                    Papelera
                                </Button>
                                {!isTrash && (
                                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => {
                                        setEditingTasa(undefined)
                                        setFormOpen(true)
                                    }}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nueva Tasa
                                    </Button>
                                )}
                            </div>
                        }
                    />
                </div>
            </div>

            <TasaCambioForm
                open={formOpen}
                onOpenChange={setFormOpen}
                tasa={editingTasa}
                onSuccess={() => {
                    setFormOpen(false)
                    router.refresh()
                }}
            />
        </>
    )
}
