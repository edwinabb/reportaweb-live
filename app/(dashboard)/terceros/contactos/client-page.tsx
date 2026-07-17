'use client'

import { useMemo, useState } from "react"
import { TerceroContacto } from "@/types/terceros"
import { DataTable } from "@/components/ui/data-table"
import { ContactoDialog } from "@/components/terceros/contacto-dialog"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Trash, Pencil, MoreHorizontal, RotateCcw, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { deleteTerceroContacto, restoreTerceroContacto } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ColumnFilterHeader } from "@/components/ui/column-filter-header"
import { exportToExcel } from "@/lib/utils/export-excel"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface ContactosClientProps {
    contactos: TerceroContacto[]
    terceros: { id: string; razon_social: string }[]
    isTrash?: boolean
}

export function ContactosClientPage({ contactos, terceros, isTrash = false }: ContactosClientProps) {
    const router = useRouter()
    const [globalSearch, setGlobalSearch] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingContacto, setEditingContacto] = useState<TerceroContacto | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Búsqueda multicampo: nombre, email o empresa,
    // case-insensitive y con coincidencia en cualquier posición.
    const filteredData = useMemo(() => {
        const byView = isTrash
            ? contactos.filter(c => !c.is_active)
            : contactos.filter(c => c.is_active)

        const search = globalSearch.trim().toLowerCase()
        if (!search) return byView

        return byView.filter((c) => {
            const nombre = c.nombre_completo?.toLowerCase() ?? ''
            const email = c.email?.toLowerCase() ?? ''
            const empresa = c.tercero?.razon_social?.toLowerCase() ?? ''
            return nombre.includes(search) || email.includes(search) || empresa.includes(search)
        })
    }, [contactos, isTrash, globalSearch])

    // Opciones de filtro derivadas de los datos
    const toOptions = (values: (string | undefined | null)[]) =>
        Array.from(new Set(values.filter(Boolean) as string[]))
            .sort().map(v => ({ label: v, value: v }))

    const cargoOptions = useMemo(() => toOptions(filteredData.map(c => c.cargo)), [filteredData])
    const empresaOptions = useMemo(() => toOptions(filteredData.map(c => c.tercero?.razon_social)), [filteredData])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const includesFilter = (row: any, id: string, value: string[]) => {
        if (!value || value.length === 0) return true
        return value.includes(String(row.getValue(id) ?? ''))
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await deleteTerceroContacto(deleteId)
            if (res.success) {
                toast.success("Contacto eliminado")
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch {
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const columns: ColumnDef<TerceroContacto>[] = [
        {
            id: "empresa",
            accessorFn: (row) => row.tercero?.razon_social ?? '',
            header: ({ column }) => (
                <ColumnFilterHeader
                    title="Empresa"
                    options={empresaOptions}
                    selected={(column.getFilterValue() as string[]) ?? []}
                    onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                />
            ),
            cell: ({ row }) => row.original.tercero?.razon_social || "N/A",
            filterFn: includesFilter,
        },
        {
            accessorKey: "nombre_completo",
            header: "Nombre Completo",
            cell: ({ row }) => (
                // Estándar: nombre en rojo cuando el registro está inactivo
                <span className={cn(!row.original.is_active && "text-red-600 font-medium")}>
                    {row.original.nombre_completo}
                </span>
            ),
        },
        {
            accessorKey: "email",
            header: "Correo Electrónico",
        },
        {
            accessorKey: "telefono",
            header: "Teléfono",
        },
        {
            accessorKey: "cargo",
            header: ({ column }) => (
                <ColumnFilterHeader
                    title="Cargo"
                    options={cargoOptions}
                    selected={(column.getFilterValue() as string[]) ?? []}
                    onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                />
            ),
            filterFn: includesFilter,
        },
        {
            accessorKey: "area",
            header: "Área",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                const handleRestore = async () => {
                    const res = await restoreTerceroContacto(item.id)
                    if (res.success) {
                        toast.success("Contacto restaurado")
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
                            <DropdownMenuItem onClick={() => {
                                setEditingContacto(item)
                                setDialogOpen(true)
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

    return (
        <div className="flex flex-col gap-4">
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el contacto. Podrás restaurarlo desde la papelera.
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

            {/* Dialog único (crear/editar) — sin hack querySelector */}
            <ContactoDialog
                terceros={terceros}
                contactoToEdit={editingContacto ?? undefined}
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) setEditingContacto(null)
                }}
                onSuccess={() => router.refresh()}
            />

            <DataTable
                columns={columns}
                data={filteredData}
                hideViewOptions
                toolbarContent={() => (
                    <Input
                        placeholder="Buscar por nombre, email o empresa..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="h-8 w-full md:w-[280px]"
                    />
                )}
                customAction={(table) => (
                    <div className="flex items-center gap-2">
                        <Button
                            variant={!isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/terceros/contactos')}
                        >
                            Activos
                        </Button>
                        <Button
                            variant={isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/terceros/contactos?view=trash')}
                        >
                            <Trash className="w-4 h-4 mr-2" />
                            Papelera
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            title="Descargar Excel (lo filtrado)"
                            onClick={() => {
                                const rows = table.getFilteredRowModel().rows.map(r => {
                                    const c = r.original as TerceroContacto
                                    return {
                                        'Empresa': c.tercero?.razon_social ?? '',
                                        'Nombre Completo': c.nombre_completo ?? '',
                                        'Correo Electrónico': c.email ?? '',
                                        'Teléfono': c.telefono ?? '',
                                        'Cargo': c.cargo ?? '',
                                        'Área': c.area ?? '',
                                        'Estado': c.is_active ? 'Activo' : 'Inactivo',
                                    }
                                })
                                if (!exportToExcel('TERCEROS-CONTACTOS', rows)) toast.error('No hay registros para exportar')
                            }}
                        >
                            <FileText className="h-4 w-4 text-green-600" />
                        </Button>
                        {!isTrash && (
                            <Button
                                size="sm"
                                className="h-8 bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => {
                                    setEditingContacto(null)
                                    setDialogOpen(true)
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Contacto
                            </Button>
                        )}
                    </div>
                )}
            />
        </div>
    )
}
