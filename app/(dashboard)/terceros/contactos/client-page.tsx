'use client'

import { Tercero, TerceroContacto } from "@/types/terceros"
import { DataTable } from "@/components/ui/data-table"
import { ContactoDialog } from "@/components/terceros/contacto-dialog"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Trash, Pencil, MoreHorizontal, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { deleteTerceroContacto, restoreTerceroContacto } from "@/lib/actions/terceros-modules"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ContactosClientProps {
    contactos: TerceroContacto[]
    terceros: Tercero[]
    isTrash?: boolean
}

export function ContactosClientPage({ contactos, terceros, isTrash = false }: ContactosClientProps) {
    const router = useRouter()

    const columns: ColumnDef<TerceroContacto>[] = [
        {
            accessorKey: "tercero.razon_social",
            header: "Empresa",
            cell: ({ row }) => row.original.tercero?.razon_social || "N/A"
        },
        {
            accessorKey: "nombre_completo",
            header: "Nombre Completo",
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
            header: "Cargo",
        },
        {
            accessorKey: "area",
            header: "Área",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original

                const handleDelete = async () => {
                    if (confirm("¿Estás seguro de eliminar este contacto?")) {
                        const res = await deleteTerceroContacto(item.id)
                        if (res.success) {
                            toast.success("Contacto eliminado")
                            router.refresh()
                        } else {
                            toast.error(res.message)
                        }
                    }
                }

                const handleRestore = async () => {
                    if (confirm("¿Restaurar este contacto?")) {
                        const res = await restoreTerceroContacto(item.id)
                        if (res.success) {
                            toast.success("Contacto restaurado")
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
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menú</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.nombre_completo)}>
                                    Copiar nombre
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    const editButton = document.querySelector(`[data-contacto-edit="${item.id}"]`) as HTMLElement
                                    editButton?.click()
                                }}>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                    <Trash className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                )
            }
        },
    ]

    const filteredData = isTrash
        ? contactos.filter(c => !c.is_active)
        : contactos.filter(c => c.is_active)

    return (
        <div className="flex flex-col gap-4">

            <div className="rounded-md border p-6 bg-background">
                {/* Hidden edit triggers for each contact */}
                {filteredData.map(c => (
                    <ContactoDialog
                        key={c.id}
                        terceros={terceros}
                        contactoToEdit={c}
                        trigger={
                            <button
                                data-contacto-edit={c.id}
                                className="hidden"
                                title={`Editar ${c.nombre_completo}`}
                            />
                        }
                        onSuccess={() => router.refresh()}
                    />
                ))}

                <DataTable
                    columns={columns}
                    data={filteredData}
                    searchKey="nombre_completo"
                    customAction={
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
                            {!isTrash && (
                                <ContactoDialog
                                    terceros={terceros}
                                    onSuccess={() => router.refresh()}
                                    trigger={
                                        <Button size="sm" className="h-8 bg-orange-600 hover:bg-orange-700 text-white">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Nuevo Contacto
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
