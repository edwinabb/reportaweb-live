'use client'

import { useMemo, useState } from "react"
import { TerceroSitio } from "@/types/terceros"
import { DataTable } from "@/components/ui/data-table"
import { SitioDialog } from "@/components/terceros/sitio-dialog"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Trash, Pencil, Plus, RotateCcw, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { deleteTerceroSitio, restoreTerceroSitio } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { ColumnFilterHeader } from "@/components/ui/column-filter-header"
import { exportToExcel } from "@/lib/utils/export-excel"

interface SitiosClientProps {
    sitios: TerceroSitio[]
    terceros: { id: string; razon_social: string }[]
    isTrash?: boolean
}

export function SitiosClientPage({ sitios, terceros, isTrash = false }: SitiosClientProps) {
    const router = useRouter()
    const [globalSearch, setGlobalSearch] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingSitio, setEditingSitio] = useState<TerceroSitio | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Búsqueda multicampo: nombre, código o empresa (tercero asociado),
    // case-insensitive y con coincidencia en cualquier posición.
    const filteredData = useMemo(() => {
        const byView = isTrash
            ? sitios.filter(s => !s.is_active)
            : sitios.filter(s => s.is_active)

        const search = globalSearch.trim().toLowerCase()
        if (!search) return byView

        return byView.filter((s) => {
            const nombre = s.nombre?.toLowerCase() ?? ''
            const codigo = s.codigo?.toLowerCase() ?? ''
            const empresas = (s.terceros ?? []).map(t => t.razon_social?.toLowerCase() ?? '')
            return nombre.includes(search) || codigo.includes(search) || empresas.some(e => e.includes(search))
        })
    }, [sitios, isTrash, globalSearch])

    // Opciones de filtro derivadas de los datos
    const tipoOptions = useMemo(() =>
        Array.from(new Set(filteredData.map(s => s.tipo).filter(Boolean) as string[]))
            .sort().map(v => ({ label: v, value: v })),
        [filteredData])
    const empresaOptions = useMemo(() =>
        Array.from(new Set(filteredData.flatMap(s => (s.terceros ?? []).map(t => t.razon_social)).filter(Boolean) as string[]))
            .sort().map(v => ({ label: v, value: v })),
        [filteredData])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const includesFilter = (row: any, id: string, value: string[]) => {
        if (!value || value.length === 0) return true
        return value.includes(String(row.getValue(id) ?? ''))
    }

    // Filtro sobre la lista de terceros asociados (M:N)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empresaFilter = (row: any, _id: string, value: string[]) => {
        if (!value || value.length === 0) return true
        const nombres = ((row.original as TerceroSitio).terceros ?? []).map(t => t.razon_social)
        return nombres.some(n => value.includes(n))
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await deleteTerceroSitio(deleteId)
            if (res.success) {
                toast.success("Sitio eliminado")
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

    const columns: ColumnDef<TerceroSitio>[] = [
        {
            accessorKey: "codigo",
            header: "Código",
            cell: ({ row }) => <span className="font-mono font-bold">{row.getValue("codigo")}</span>
        },
        {
            accessorKey: "nombre",
            header: "Nombre Sitio",
            cell: ({ row }) => (
                // Estándar: nombre en rojo cuando el registro está inactivo
                <span className={cn(!row.original.is_active && "text-red-600 font-medium")}>
                    {row.original.nombre}
                </span>
            ),
        },
        {
            accessorKey: "terceros",
            header: ({ column }) => (
                <ColumnFilterHeader
                    title="Tercero(s) Asociado(s)"
                    options={empresaOptions}
                    selected={(column.getFilterValue() as string[]) ?? []}
                    onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                />
            ),
            cell: ({ row }) => {
                const tercerosRow = row.original.terceros || []
                if (tercerosRow.length === 0) return <span className="text-muted-foreground">Sin terceros</span>
                return (
                    <div className="flex flex-wrap gap-1">
                        {tercerosRow.map((t, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {t.razon_social}
                            </Badge>
                        ))}
                    </div>
                )
            },
            filterFn: empresaFilter,
        },
        {
            accessorKey: "tipo",
            header: ({ column }) => (
                <ColumnFilterHeader
                    title="Tipo"
                    options={tipoOptions}
                    selected={(column.getFilterValue() as string[]) ?? []}
                    onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                />
            ),
            cell: ({ row }) => {
                const tipo = row.getValue("tipo") as string
                return tipo
                    ? <Badge variant="secondary">{tipo}</Badge>
                    : <span className="text-muted-foreground text-xs">—</span>
            },
            filterFn: includesFilter,
        },
        {
            accessorKey: "direccion",
            header: "Dirección",
        },
        {
            accessorKey: "ciudad",
            header: "Ciudad",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                const handleRestore = async () => {
                    const res = await restoreTerceroSitio(item.id)
                    if (res.success) {
                        toast.success("Sitio restaurado")
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
                                setEditingSitio(item)
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
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el sitio. Podrás restaurarlo desde la papelera.
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
            <SitioDialog
                terceros={terceros}
                sitioToEdit={editingSitio ?? undefined}
                trigger={null}
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) setEditingSitio(null)
                }}
                onSuccess={() => router.refresh()}
            />

            <DataTable
                columns={columns}
                data={filteredData}
                hideViewOptions
                toolbarContent={() => (
                    <Input
                        placeholder="Buscar por nombre, código o empresa..."
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
                            onClick={() => router.push('/terceros/sitios')}
                        >
                            Activos
                        </Button>
                        <Button
                            variant={isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/terceros/sitios?view=trash')}
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
                                    const s = r.original as TerceroSitio
                                    return {
                                        'Código': s.codigo ?? '',
                                        'Nombre Sitio': s.nombre ?? '',
                                        'Tercero(s) Asociado(s)': (s.terceros ?? []).map(t => t.razon_social).join(', '),
                                        'Tipo': s.tipo ?? '',
                                        'Dirección': s.direccion ?? '',
                                        'Ciudad': s.ciudad ?? '',
                                        'Estado': s.is_active ? 'Activo' : 'Inactivo',
                                    }
                                })
                                if (!exportToExcel('TERCEROS-SITIOS', rows)) toast.error('No hay registros para exportar')
                            }}
                        >
                            <FileText className="h-4 w-4 text-green-600" />
                        </Button>
                        {!isTrash && (
                            <Button
                                size="sm"
                                className="h-8 bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => {
                                    setEditingSitio(null)
                                    setDialogOpen(true)
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Sitio
                            </Button>
                        )}
                    </div>
                )}
            />
        </div>
    )
}
