
"use client"

import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, Trash, RotateCcw, Copy, Eye, FileText } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { deleteCotizacion, restoreCotizacion, duplicateCotizacion } from "@/lib/actions/cotizaciones"
import { Cotizacion } from "@/types/cotizaciones"

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

interface CotizacionActionsProps {
    cotizacion: Cotizacion
}

export function CotizacionActions({ cotizacion }: CotizacionActionsProps) {
    const [openDelete, setOpenDelete] = useState(false)
    const [openRestore, setOpenRestore] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleDelete = async () => {
        startTransition(async () => {
            const result = await deleteCotizacion(cotizacion.id)
            if (result.success) {
                toast.success("Cotización deshabilitada")
                router.refresh()
            } else {
                toast.error(result.message)
            }
            setOpenDelete(false)
        })
    }

    const handleRestore = async () => {
        startTransition(async () => {
            const result = await restoreCotizacion(cotizacion.id)
            if (result.success) {
                toast.success("Cotización restaurada correctamente")
                router.refresh()
            } else {
                toast.error(result.message)
            }
            setOpenRestore(false)
        })
    }

    const handleDuplicate = async () => {
        const loadingToast = toast.loading("Duplicando cotización...")
        startTransition(async () => {
            const result = await duplicateCotizacion(cotizacion.id)
            toast.dismiss(loadingToast)
            if (result.success && result.new_id) {
                toast.success(result.message)
                router.refresh()
                // Optional: Redirect to new quote
                // router.push(`/cotizaciones/${result.new_id}`)
            } else {
                toast.error(result.message || "Error al duplicar")
            }
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
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(cotizacion.id)}>
                        Copiar ID
                    </DropdownMenuItem>

                    {cotizacion.is_active ? (
                        <>
                            <DropdownMenuItem onClick={() => router.push(`/cotizaciones/${cotizacion.id}?mode=view`)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver
                            </DropdownMenuItem>
                            {/* Solo permitir editar si no está aprobada ni rechazada, o si usuario es admin (implementar roles luego) */}
                            {/* Por ahora, restricción UI simple */}
                            {!['APROBADA', 'RECHAZADA'].includes(cotizacion.estado) && (
                                <DropdownMenuItem onClick={() => router.push(`/cotizaciones/${cotizacion.id}?tab=paso1`)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/cotizaciones/${cotizacion.id}?tab=paso4`)}>
                                <FileText className="mr-2 h-4 w-4" /> Crear PDF
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
                        <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
                        <AlertDialogDescription>
                            La cotización <b>{cotizacion.numero}</b> dejará de estar visible en la lista activa, pero podrá ser restaurada desde la papelera.
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
                            {isPending ? "Procesando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* RESTORE DIALOG */}
            <AlertDialog open={openRestore} onOpenChange={setOpenRestore}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restaurar cotización?</AlertDialogTitle>
                        <AlertDialogDescription>
                            La cotización <b>{cotizacion.numero}</b> volverá a estar activa.
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
