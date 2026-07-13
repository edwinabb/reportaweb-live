"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
import { Button } from "@/components/ui/button"
import { MoreHorizontal, FileText, Trash2, DollarSign, Loader2 } from "lucide-react"
import { deshabilitarReporteMaquinaria, type ValoracionItem } from "@/lib/actions/ventas"

interface Props {
    row: ValoracionItem
}

export function ValoracionRowActions({ row }: Props) {
    const router = useRouter()
    const [deshabilitarOpen, setDeshabilitarOpen] = useState(false)
    const [pending, setPending] = useState(false)

    const puedeDeshabilitar = row.estado === 'PENDIENTE'
    const esValoradoSinFactura = row.estado === 'VALORADO' && !row.factura_codigo

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Acciones del informe">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase text-gray-400 font-medium">
                        Informe {row.id_reporte}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="gap-2"
                        onClick={() => {
                            navigator.clipboard.writeText(row.id)
                            toast.success('ID copiado')
                        }}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Copiar ID reporte
                    </DropdownMenuItem>
                    {row.pdf_reporte && (
                        <DropdownMenuItem asChild>
                            <a href={row.pdf_reporte} target="_blank" rel="noreferrer" className="gap-2 flex items-center w-full">
                                <FileText className="h-3.5 w-3.5 text-orange-600" />
                                Ver PDF del reporte
                            </a>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        disabled
                        className="gap-2 text-gray-400"
                        title="Precio por Día (override) — próximamente"
                    >
                        <DollarSign className="h-3.5 w-3.5" />
                        Precio por Día (F.9)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={!puedeDeshabilitar}
                        onClick={() => setDeshabilitarOpen(true)}
                        className="gap-2 text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Deshabilitar informe
                        {!puedeDeshabilitar && (
                            <span className="text-[10px] text-gray-400 ml-auto">
                                {esValoradoSinFactura ? 'deshacé valor.' : 'facturado'}
                            </span>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={deshabilitarOpen} onOpenChange={setDeshabilitarOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Deshabilitar informe {row.id_reporte}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El informe se marca como inactivo y queda excluido de futuras valorizaciones.
                            Solo se permite si el reporte NO está valorizado ni facturado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={pending}
                            onClick={async (e) => {
                                e.preventDefault()
                                setPending(true)
                                const res = await deshabilitarReporteMaquinaria(row.id)
                                setPending(false)
                                if (res.success) {
                                    toast.success(res.message)
                                    setDeshabilitarOpen(false)
                                    router.refresh()
                                } else {
                                    toast.error(res.message)
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {pending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Deshabilitando…</> : 'Deshabilitar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
