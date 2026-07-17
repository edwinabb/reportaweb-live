'use client'

import { useMemo, useState } from "react"
import { DataTable } from "@/components/ui/data-table"
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
import { PersonalExterno } from "@/types/terceros"
import { restoreProfile } from "@/lib/actions/users"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { ColumnFilterHeader } from "@/components/ui/column-filter-header"
import { exportToExcel } from "@/lib/utils/export-excel"

interface PersonalClientProps {
    personal: PersonalExterno[]
    isTrash?: boolean
}

export function PersonalClientPage({ personal, isTrash = false }: PersonalClientProps) {
    const router = useRouter()
    const [globalSearch, setGlobalSearch] = useState("")

    // Búsqueda multicampo: nombres, apellidos o número de documento,
    // case-insensitive y con coincidencia en cualquier posición.
    const filteredData = useMemo(() => {
        const byView = isTrash
            ? personal.filter(p => !p.is_active)
            : personal.filter(p => p.is_active)

        const search = globalSearch.trim().toLowerCase()
        if (!search) return byView

        return byView.filter((p) => {
            const nombres = p.nombres?.toLowerCase() ?? ''
            const apellidos = p.apellidos?.toLowerCase() ?? ''
            const doc = p.numero_doc?.toLowerCase() ?? ''
            return nombres.includes(search) || apellidos.includes(search) || doc.includes(search)
        })
    }, [personal, isTrash, globalSearch])

    // Opciones de filtro derivadas de los datos
    const toOptions = (values: (string | undefined | null)[]) =>
        Array.from(new Set(values.filter(Boolean) as string[]))
            .sort().map(v => ({ label: v, value: v }))

    const cargoOptions = useMemo(() => toOptions(filteredData.map(p => p.cargo)), [filteredData])
    const empresaOptions = useMemo(() => toOptions(filteredData.map(p => p.empresa)), [filteredData])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const includesFilter = (row: any, id: string, value: string[]) => {
        if (!value || value.length === 0) return true
        return value.includes(String(row.getValue(id) ?? ''))
    }

    const columns: ColumnDef<PersonalExterno>[] = [
        {
            accessorKey: "nombres",
            header: "Nombres",
            cell: ({ row }) => (
                // Estándar: nombre en rojo cuando el registro está inactivo
                <span className={cn(!row.original.is_active && "text-red-600 font-medium")}>
                    {row.original.nombres}
                </span>
            ),
        },
        {
            accessorKey: "apellidos",
            header: "Apellidos",
            cell: ({ row }) => (
                <span className={cn(!row.original.is_active && "text-red-600 font-medium")}>
                    {row.original.apellidos}
                </span>
            ),
        },
        {
            accessorKey: "tipo_doc",
            header: "Doc",
            cell: ({ row }) => row.original.tipo_doc
                ? <Badge variant="outline">{row.original.tipo_doc}</Badge>
                : <span className="text-muted-foreground text-xs">—</span>
        },
        {
            accessorKey: "numero_doc",
            header: "Número Doc",
            cell: ({ row }) => row.original.numero_doc
                ?? <span className="text-muted-foreground text-xs">—</span>
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
            cell: ({ row }) => row.original.cargo
                ?? <span className="text-muted-foreground text-xs">—</span>,
            filterFn: includesFilter,
        },
        {
            accessorKey: "empresa",
            header: ({ column }) => (
                <ColumnFilterHeader
                    title="Empresa"
                    options={empresaOptions}
                    selected={(column.getFilterValue() as string[]) ?? []}
                    onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                />
            ),
            cell: ({ row }) => row.original.empresa
                ?? <span className="text-muted-foreground text-xs">—</span>,
            filterFn: includesFilter,
        },
        {
            accessorKey: "telefono",
            header: "Teléfono",
            cell: ({ row }) => row.original.telefono
                ?? <span className="text-muted-foreground text-xs">—</span>
        },
        {
            accessorKey: "email",
            header: "Email",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                const handleRestore = async () => {
                    const res = await restoreProfile(item.id)
                    if (res.success) {
                        toast.success("Personal restaurado")
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
                            <DropdownMenuItem onClick={() => router.push(`/users/${item.id}/edit`)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <DataTable
                columns={columns}
                data={filteredData}
                hideViewOptions
                toolbarContent={() => (
                    <Input
                        placeholder="Buscar por nombres, apellidos o documento..."
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
                            onClick={() => router.push('/terceros/personal')}
                        >
                            Activos
                        </Button>
                        <Button
                            variant={isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/terceros/personal?view=trash')}
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
                                    const p = r.original as PersonalExterno
                                    return {
                                        'Nombres': p.nombres ?? '',
                                        'Apellidos': p.apellidos ?? '',
                                        'Tipo Doc': p.tipo_doc ?? '',
                                        'Número Doc': p.numero_doc ?? '',
                                        'Cargo': p.cargo ?? '',
                                        'Empresa': p.empresa ?? '',
                                        'Teléfono': p.telefono ?? '',
                                        'Email': p.email ?? '',
                                        'Estado': p.is_active ? 'Activo' : 'Inactivo',
                                    }
                                })
                                if (!exportToExcel('TERCEROS-PERSONAL', rows)) toast.error('No hay registros para exportar')
                            }}
                        >
                            <FileText className="h-4 w-4 text-green-600" />
                        </Button>
                        {!isTrash && (
                            <Button
                                size="sm"
                                className="h-8 bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => router.push('/users/create?personal_externo=1&redirect_to=/terceros/personal')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Personal
                            </Button>
                        )}
                    </div>
                )}
            />
        </div>
    )
}
