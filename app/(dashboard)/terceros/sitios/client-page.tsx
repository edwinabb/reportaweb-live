'use client'

import { TerceroSitio } from "@/types/terceros"
import { DataTable } from "@/components/ui/data-table"
import { SitioDialog } from "@/components/terceros/sitio-dialog"
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
import { deleteTerceroSitio, restoreTerceroSitio } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SitiosClientProps {
    sitios: TerceroSitio[]
    terceros: { id: string; razon_social: string }[]
    isTrash?: boolean
}

export function SitiosClientPage({ sitios, terceros, isTrash = false }: SitiosClientProps) {
    const router = useRouter()

    const columns: ColumnDef<TerceroSitio>[] = [
        {
            accessorKey: "codigo",
            header: "Código",
            cell: ({ row }) => <span className="font-mono font-bold">{row.getValue("codigo")}</span>
        },
        {
            accessorKey: "nombre",
            header: "Nombre Sitio",
        },
        {
            accessorKey: "terceros",
            header: "Tercero(s) Asociado(s)",
            cell: ({ row }) => {
                const terceros = row.original.terceros || []
                if (terceros.length === 0) return <span className="text-muted-foreground">Sin terceros</span>
                return (
                    <div className="flex flex-wrap gap-1">
                        {terceros.map((t, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {t.razon_social}
                            </Badge>
                        ))}
                    </div>
                )
            }
        },
        {
            accessorKey: "tipo",
            header: "Tipo",
            cell: ({ row }) => <Badge variant="secondary">{row.getValue("tipo")}</Badge>
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

                const handleDelete = async () => {
                    if (confirm("¿Estás seguro de eliminar este sitio?")) {
                        const res = await deleteTerceroSitio(item.id)
                        if (res.success) {
                            toast.success("Sitio eliminado")
                            router.refresh()
                        } else {
                            toast.error(res.message)
                        }
                    }
                }

                const handleRestore = async () => {
                    if (confirm("¿Restaurar este sitio?")) {
                        const res = await restoreTerceroSitio(item.id)
                        if (res.success) {
                            toast.success("Sitio restaurado")
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
                                const editButton = document.querySelector(`[data-sitio-edit="${item.id}"]`) as HTMLElement
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
        ? sitios.filter(s => !s.is_active)
        : sitios.filter(s => s.is_active)

    return (
        <div className="flex flex-col gap-4">

            <div className="rounded-md border p-6 bg-background">
                {/* Hidden edit triggers for each sitio */}
                {filteredData.map(sitio => (
                    <SitioDialog
                        key={sitio.id}
                        terceros={terceros}
                        sitioToEdit={sitio}
                        trigger={
                            <button
                                data-sitio-edit={sitio.id}
                                className="hidden"
                                title={`Editar ${sitio.nombre}`}
                            />
                        }
                        onSuccess={() => router.refresh()}
                    />
                ))}

                <DataTable
                    columns={columns}
                    data={filteredData}
                    searchKey="nombre"
                    customAction={
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
                            {!isTrash && (
                                <SitioDialog
                                    terceros={terceros}
                                    onSuccess={() => router.refresh()}
                                    trigger={
                                        <Button size="sm" className="h-8 bg-orange-600 hover:bg-orange-700 text-white">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Nuevo Sitio
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
