'use client'

import { MaquinariaTipoDoc } from "@/types/maquinaria"
import { DataTable } from "@/components/ui/data-table"
import { TipoDocForm } from "@/components/maquinaria/tipo-doc-form"
import { ColumnDef } from "@tanstack/react-table"
import { Trash, Pencil, MoreHorizontal, RotateCcw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColumnFilterHeader } from "@/components/ui/column-filter-header"
import { useRouter } from "next/navigation"
import { deleteMaquinariaTipo, restoreMaquinariaTipo } from "@/lib/actions/maquinaria-types"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useMemo, useState } from "react"
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

interface TypesClientProps {
    tipos: MaquinariaTipoDoc[]
    isTrash?: boolean
    categories: string[]
    models: { id: string, modelo: string, marca: string }[]
    embedded?: boolean
}

// Wrapper for the Create Form to make it a Dialog
function CreateTypeDialog({ categories, models }: { categories: string[], models: { id: string, modelo: string, marca: string }[] }) {
    const [open, setOpen] = useState(false)
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Tipo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo Tipo de Documento</DialogTitle>
                    <DialogDescription>Define un nuevo tipo de documento para maquinaria.</DialogDescription>
                </DialogHeader>
                <div className="p-4">
                    <TipoDocForm
                        categories={categories}
                        models={models}
                        onSuccess={() => setOpen(false)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}

function EditTypeDialog({ tipo, categories, models, open, onOpenChange }: {
    tipo: MaquinariaTipoDoc
    categories: string[]
    models: { id: string, modelo: string, marca: string }[]
    open: boolean
    onOpenChange: (o: boolean) => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Tipo de Documento</DialogTitle>
                    <DialogDescription>Modificá los datos del tipo.</DialogDescription>
                </DialogHeader>
                <div className="p-4">
                    <TipoDocForm
                        categories={categories}
                        models={models}
                        initial={{
                            id: tipo.id,
                            nombre: tipo.nombre || '',
                            aplica_a: tipo.aplica_a || 'todos',
                            categoria: (tipo as any).categoria || 'sin_vencimiento',
                            dias_alerta: tipo.dias_alerta ?? 30,
                            es_obligatorio: tipo.es_obligatorio ?? false,
                            categoria_equipo: (tipo as any).categoria_equipo ?? null,
                            modelo_id: (tipo as any).modelo_id ?? null,
                        }}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function TypesClientPage(props: TypesClientProps) {
    const { tipos, isTrash = false, categories, models } = props
    const router = useRouter()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [editItem, setEditItem] = useState<MaquinariaTipoDoc | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [globalSearch, setGlobalSearch] = useState("")

    // Búsqueda por nombre, case-insensitive y con coincidencia en cualquier posición.
    const filteredTipos = useMemo(() => {
        const search = globalSearch.trim().toLowerCase()
        if (!search) return tipos
        return tipos.filter((t) => (t.nombre?.toLowerCase() ?? '').includes(search))
    }, [tipos, globalSearch])

    const siNoOptions = [
        { label: "Sí", value: "Sí" },
        { label: "No", value: "No" },
    ]

    // Filtra por el valor booleano mostrado (Sí/No)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booleanSiNoFilter = (row: any, id: string, value: string[]) => {
        if (!value || value.length === 0) return true
        return value.includes(row.getValue(id) ? "Sí" : "No")
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await deleteMaquinariaTipo(deleteId)
            if (res.success) {
                toast.success("Tipo eliminado")
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const columns: ColumnDef<MaquinariaTipoDoc>[] = [
        {
            accessorKey: "nombre",
            header: "Nombre",
            cell: ({ row }) => <span>{row.getValue("nombre")}</span>
        },
        {
            accessorKey: "aplica_a",
            header: "Aplica a",
            cell: ({ row }) => <span className="capitalize">{row.getValue("aplica_a")}</span>
        },
        {
            accessorKey: "requiere_vencimiento",
            header: ({ column }) => (
                <ColumnFilterHeader
                    title="Vencimiento"
                    options={siNoOptions}
                    selected={(column.getFilterValue() as string[]) ?? []}
                    onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                />
            ),
            cell: ({ row }) => <Badge variant="outline">{row.getValue("requiere_vencimiento") ? "Sí" : "No"}</Badge>,
            filterFn: booleanSiNoFilter,
        },
        {
            accessorKey: "dias_alerta",
            header: "Días Alerta",
        },
        {
            accessorKey: "es_obligatorio",
            header: ({ column }) => (
                <ColumnFilterHeader
                    title="Obligatorio"
                    options={siNoOptions}
                    selected={(column.getFilterValue() as string[]) ?? []}
                    onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                />
            ),
            cell: ({ row }) => <Badge variant={row.getValue("es_obligatorio") ? "default" : "secondary"}>{row.getValue("es_obligatorio") ? "Sí" : "No"}</Badge>,
            filterFn: booleanSiNoFilter,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                const handleRestore = async () => {
                    const res = await restoreMaquinariaTipo(item.id)
                    if (res.success) {
                        toast.success("Tipo restaurado")
                        router.refresh()
                    } else {
                        toast.error(res.message)
                    }
                }

                if (isTrash) {
                    return (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRestore}
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
                            <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="text-red-600 focus:text-red-600">
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
                <EditTypeDialog
                    tipo={editItem}
                    categories={categories}
                    models={models}
                    open={true}
                    onOpenChange={(o) => !o && setEditItem(null)}
                />
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el tipo de documento. Podrás restaurarlo desde la papelera.
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

                <div className={!props.embedded ? "rounded-lg border p-6 bg-background" : ""}>
                    <DataTable
                        columns={columns}
                        data={filteredTipos}
                        hideViewOptions
                        toolbarContent={() => (
                            <Input
                                placeholder="Buscar por nombre..."
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                className="h-8 w-full md:w-[280px]"
                            />
                        )}
                        customAction={
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={!isTrash ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.push('/maquinarias/types')}
                                >
                                    Activos
                                </Button>
                                <Button
                                    variant={isTrash ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.push('/maquinarias/types?view=trash')}
                                >
                                    <Trash className="w-4 h-4 mr-2" />
                                    Papelera
                                </Button>
                                {!isTrash && (
                                    <CreateTypeDialog categories={categories} models={models} />
                                )}
                            </div>
                        }
                    />
                </div>
            </div>
        </>
    )
}
