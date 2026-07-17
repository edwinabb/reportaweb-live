"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    deleteTerceroSitio,
    getTerceroSitios
} from "@/lib/actions/terceros-modules"
import { getTercerosForSelect } from "@/lib/actions/terceros"
import { TerceroSitio } from "@/types/terceros"
import { SitioDialog } from "./sitio-dialog"

interface TerceroSitiosManagerProps {
    terceroId: string
}

/**
 * Tab "Sitios" del editor de tercero. El form canónico es SitioDialog
 * (mismo componente que la lista global /terceros/sitios, ahora con
 * MapPicker/lat-long incorporados) — DUDA-TER-011.
 */
export function TerceroSitiosManager({ terceroId }: TerceroSitiosManagerProps) {
    const [sitios, setSitios] = useState<TerceroSitio[]>([])
    const [terceros, setTerceros] = useState<{ id: string; razon_social: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSitio, setEditingSitio] = useState<TerceroSitio | null>(null)

    const loadSitios = useCallback(async () => {
        setIsLoading(true)
        const [data, tercerosList] = await Promise.all([
            getTerceroSitios(true, terceroId),
            getTercerosForSelect(),
        ])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSitios(data as any)
        setTerceros(tercerosList)
        setIsLoading(false)
    }, [terceroId])

    useEffect(() => {
        if (terceroId) {
            loadSitios()
        }
    }, [terceroId, loadSitios])

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este sitio?")) {
            const result = await deleteTerceroSitio(id)
            if (result.success) {
                toast.success("Sitio eliminado")
                loadSitios()
            } else {
                toast.error(result.message)
            }
        }
    }

    const openCreate = () => {
        setEditingSitio(null)
        setIsDialogOpen(true)
    }

    const openEdit = (sitio: TerceroSitio) => {
        setEditingSitio(sitio)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Lista de Sitios</h3>
                <Button onClick={openCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Sitio
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : sitios.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-muted/10 text-muted-foreground">
                    No hay sitios registrados.
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead>Ciudad</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sitios.map((sitio) => (
                                <TableRow key={sitio.id}>
                                    <TableCell className="font-medium">{sitio.nombre}</TableCell>
                                    <TableCell>{sitio.codigo || "-"}</TableCell>
                                    <TableCell>{sitio.tipo || "-"}</TableCell>
                                    <TableCell>{sitio.direccion || "-"}</TableCell>
                                    <TableCell>{sitio.ciudad || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(sitio)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(sitio.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <SitioDialog
                terceros={terceros}
                defaultTerceroId={terceroId}
                sitioToEdit={editingSitio ?? undefined}
                trigger={null}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) setEditingSitio(null)
                }}
                onSuccess={() => loadSitios()}
            />
        </div>
    )
}
