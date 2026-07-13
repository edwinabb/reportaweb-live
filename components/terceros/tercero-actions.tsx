"use client"

import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, Trash, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { deleteTercero, restoreTercero } from "@/lib/actions/terceros"
import { Tercero } from "@/types/terceros"

import { Button } from "@/components/ui/button"
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

interface TerceroActionsProps {
    tercero: Tercero
}

export function TerceroActions({ tercero }: TerceroActionsProps) {
    const [openDelete, setOpenDelete] = useState(false)
    const [openRestore, setOpenRestore] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleDelete = async () => {
        startTransition(async () => {
            const result = await deleteTercero(tercero.id)
            if (result.success) {
                toast.success("Tercero movido a papelera")
                router.refresh()
            } else {
                toast.error(result.message)
            }
            setOpenDelete(false)
        })
    }

    const handleRestore = async () => {
        startTransition(async () => {
            const result = await restoreTercero(tercero.id)
            if (result.success) {
                toast.success("Tercero restaurado correctamente")
                router.refresh()
            } else {
                toast.error(result.message)
            }
            setOpenRestore(false)
        })
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
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(tercero.id)}>
                        Copiar ID
                    </DropdownMenuItem>

                    {tercero.is_active ? (
                        <>
                            <DropdownMenuItem onClick={() => router.push(`/terceros/${tercero.id}/edit`)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600"
                                onSelect={(e) => {
                                    e.preventDefault()
                                    setOpenDelete(true)
                                }}
                            >
                                <Trash className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                        </>
                    ) : (
                        <DropdownMenuItem
                            className="text-green-600"
                            onSelect={(e) => {
                                e.preventDefault()
                                setOpenRestore(true)
                            }}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* DELETE DIALOG */}
            <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Mover a papelera?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El tercero <b>{tercero.razon_social}</b> dejará de estar visible en la lista activa.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isPending}
                        >
                            {isPending ? "Eliminando..." : "Confirmar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* RESTORE DIALOG */}
            <AlertDialog open={openRestore} onOpenChange={setOpenRestore}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restaurar tercero?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El tercero <b>{tercero.razon_social}</b> volverá a estar activo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleRestore()
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={isPending}
                        >
                            {isPending ? "Restaurando..." : "Confirmar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
