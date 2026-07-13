'use client'

import { Tercero, TerceroPersonal } from "@/types/terceros"
import { DataTable } from "@/components/ui/data-table"
import { PersonalDialog } from "@/components/terceros/personal-dialog"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Trash, Pencil, Plus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteTerceroPersonal, restoreTerceroPersonal } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PersonalClientProps {
    personal: TerceroPersonal[]
    terceros: Tercero[]
    isTrash?: boolean
}

export function PersonalClientPage({ personal, terceros, isTrash = false }: PersonalClientProps) {
    const router = useRouter()

    const columns: ColumnDef<TerceroPersonal>[] = [
        {
            accessorKey: "nombres",
            header: "Nombres",
        },
        {
            accessorKey: "apellidos",
            header: "Apellidos",
        },
        {
            accessorKey: "tipo_doc",
            header: "Doc",
            cell: ({ row }) => <Badge variant="outline">{row.getValue("tipo_doc")}</Badge>
        },
        {
            accessorKey: "numero_doc",
            header: "Número Doc",
        },
        {
            accessorKey: "cargo",
            header: "Cargo",
        },
        {
            accessorKey: "telefono",
            header: "Teléfono",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                const handleDelete = async () => {
                    if (confirm("¿Estás seguro de eliminar este personal?")) {
                        const res = await deleteTerceroPersonal(item.id)
                        if (res.success) {
                            toast.success("Personal eliminado")
                            router.refresh()
                        } else {
                            toast.error(res.message)
                        }
                    }
                }

                const handleRestore = async () => {
                    if (confirm("¿Restaurar este personal?")) {
                        const res = await restoreTerceroPersonal(item.id)
                        if (res.success) {
                            toast.success("Personal restaurado")
                            router.refresh()
                        } else {
                            toast.error(res.message)
                        }
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
                                const editButton = document.querySelector(`[data-personal-edit="${item.id}"]`) as HTMLElement
                                editButton?.click()
                            }}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                <Trash className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const filteredData = isTrash
        ? personal.filter(p => !p.is_active)
        : personal.filter(p => p.is_active)

    return (
        <div className="flex flex-col gap-4">

            <div className="rounded-md border p-6 bg-background">
                {/* Hidden edit triggers for each personal */}
                {filteredData.map(p => (
                    <PersonalDialog
                        key={p.id}
                        terceros={terceros}
                        personalToEdit={p}
                        trigger={
                            <button
                                data-personal-edit={p.id}
                                className="hidden"
                                title={`Editar ${p.nombres} ${p.apellidos}`}
                            />
                        }
                        onSuccess={() => router.refresh()}
                    />
                ))}

                <DataTable
                    columns={columns}
                    data={filteredData}
                    searchKey="nombres"
                    customAction={
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
                            {!isTrash && (
                                <PersonalDialog
                                    terceros={terceros}
                                    onSuccess={() => router.refresh()}
                                    trigger={
                                        <Button size="sm" className="h-8 bg-orange-600 hover:bg-orange-700 text-white">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Nuevo Personal
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    }
                />
            </div>
        </div>
    )
}
