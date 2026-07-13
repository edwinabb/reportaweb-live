"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash, RotateCcw } from "lucide-react"

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

import { Maquinaria } from "@/types/maquinaria"
import { deleteMaquinaria, restoreMaquinaria } from "@/lib/actions/maquinarias"
import { toast } from "sonner"

interface MaquinariaActionsProps {
    maquinaria: Maquinaria
    isTrash?: boolean
}

export function MaquinariaActions({ maquinaria, isTrash = false }: MaquinariaActionsProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    const onDelete = async () => {
        setIsPending(true)
        try {
            await deleteMaquinaria(maquinaria.id)
            toast.success("Maquinaria eliminada")
            router.refresh()
            setOpen(false)
        } catch (error) {
            toast.error("Error al eliminar")
        } finally {
            setIsPending(false)
        }
    }

    const onRestore = async () => {
        if (confirm("¿Restaurar esta maquinaria?")) {
            try {
                await restoreMaquinaria(maquinaria.id)
                toast.success("Maquinaria restaurada")
                router.refresh()
            } catch (error) {
                toast.error("Error al restaurar")
            }
        }
    }

    if (isTrash) {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={onRestore}
                className="bg-green-50 hover:bg-green-100 text-green-700 h-8 px-2"
            >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
            </Button>
        )
    }

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la maquinaria.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                            {isPending ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(maquinaria.id)}>
                        Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/maquinarias/${maquinaria.id}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpen(true)} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
