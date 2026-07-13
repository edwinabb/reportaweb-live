'use client'

import { Servicio } from "@/types/cotizaciones"
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
import { Badge } from "@/components/ui/badge"
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
import { ServicioForm } from "@/components/cotizaciones/servicio-form"
import { deleteServicio, restoreServicio } from "@/lib/actions/servicios"

interface ServiciosClientProps {
    servicios: Servicio[]
    isTrash?: boolean
}

export function ServiciosClientPage({ servicios, isTrash = false }: ServiciosClientProps) {
    const router = useRouter()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [editingService, setEditingService] = useState<Servicio | undefined>(undefined)

    const confirmDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await deleteServicio(deleteId)
            if (res.success) {
                toast.success("Servicio eliminado")
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
        const res = await restoreServicio(id)
        if (res.success) {
            toast.success("Servicio restaurado")
            router.refresh()
        } else {
            toast.error(res.message)
        }
    }

    const columns: ColumnDef<Servicio>[] = [
        {
            accessorKey: "codigo",
            header: "Código",
            cell: ({ row }) => <span className="font-mono">{row.getValue("codigo")}</span>
        },
        {
            accessorKey: "nombre",
            header: "Nombre",
            cell: ({ row }) => <span>{row.getValue("nombre")}</span>
        },
        {
            accessorKey: "tipo_servicio",
            header: "Tipo",
            cell: ({ row }) => <Badge variant="secondary">{row.getValue("tipo_servicio")}</Badge>
        },
        {
            accessorKey: "moneda",
            header: "Moneda",
        },
        {
            id: "precio_1",
            header: "Precio 1",
            cell: ({ row }) => {
                const s = row.original
                if (!s.precio_1_tipo && !s.precio_1_valor) return <span className="text-muted-foreground/40">—</span>
                return (
                    <div className="text-xs min-w-[90px]">
                        <div className="font-medium">{s.precio_1_tipo_nombre || s.precio_1_tipo}</div>
                        <div className="text-muted-foreground">{s.moneda} {s.precio_1_valor?.toFixed(2)}</div>
                    </div>
                )
            }
        },
        {
            id: "precio_2",
            header: "Precio 2",
            cell: ({ row }) => {
                const s = row.original
                if ((s.cantidad_precios ?? 1) < 2) return <span className="text-muted-foreground/40">—</span>
                return (
                    <div className="text-xs min-w-[90px]">
                        <div className="font-medium">{s.precio_2_tipo_nombre || s.precio_2_tipo}</div>
                        <div className="text-muted-foreground">{s.moneda} {s.precio_2_valor?.toFixed(2)}</div>
                    </div>
                )
            }
        },
        {
            id: "precio_3",
            header: "Precio 3",
            cell: ({ row }) => {
                const s = row.original
                if ((s.cantidad_precios ?? 1) < 3) return <span className="text-muted-foreground/40">—</span>
                return (
                    <div className="text-xs min-w-[90px]">
                        <div className="font-medium">{s.precio_3_tipo_nombre || s.precio_3_tipo}</div>
                        <div className="text-muted-foreground">{s.moneda} {s.precio_3_valor?.toFixed(2)}</div>
                    </div>
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
                                setEditingService(item)
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

    // Manually filter trash items if the API returns mixed (depending on how getServicios works)
    // But better to assume Page passed correct data. 
    // If getMaquinariaModelos was changed to return ALL when !onlyActive, we need to filter here.
    // For Servicios, we will modify getServicios next to follow strict pattern, or use same.
    // For now, let's filter just in case.
    const filteredData = isTrash
        ? servicios.filter(s => !s.is_active)
        : servicios.filter(s => s.is_active)

    return (
        <>
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el servicio. Podrás restaurarlo desde la papelera.
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
                        searchKey="nombre"
                        customAction={
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={!isTrash ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.push('/cotizaciones/servicios')}
                                >
                                    Activos
                                </Button>
                                <Button
                                    variant={isTrash ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.push('/cotizaciones/servicios?view=trash')}
                                >
                                    <Trash className="w-4 h-4 mr-2" />
                                    Papelera
                                </Button>
                                {!isTrash && (
                                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => {
                                        setEditingService(undefined)
                                        setFormOpen(true)
                                    }}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nuevo Servicio
                                    </Button>
                                )}
                            </div>
                        }
                    />
                </div>
            </div>

            <ServicioForm
                open={formOpen}
                onOpenChange={setFormOpen}
                servicio={editingService}
                onSuccess={() => {
                    setFormOpen(false)
                    router.refresh()
                }}
            />
        </>
    )
}
