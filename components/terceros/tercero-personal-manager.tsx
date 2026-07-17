"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Loader2 } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { getPersonalExterno } from "@/lib/actions/terceros-modules"
import { PersonalExterno } from "@/types/terceros"

interface TerceroPersonalManagerProps {
    terceroId: string
}

/**
 * Tab "Personal" del editor de tercero (DUDA-TER-006). El personal externo son
 * users del sistema (profiles.tercero_id); el alta y la edición se hacen en el
 * módulo Usuarios, prellenando el vínculo con este tercero.
 */
export function TerceroPersonalManager({ terceroId }: TerceroPersonalManagerProps) {
    const router = useRouter()
    const [personal, setPersonal] = useState<PersonalExterno[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadPersonal = useCallback(async () => {
        setIsLoading(true)
        const data = await getPersonalExterno(true, terceroId)
        setPersonal(data)
        setIsLoading(false)
    }, [terceroId])

    useEffect(() => {
        if (terceroId) {
            loadPersonal()
        }
    }, [terceroId, loadPersonal])

    const createUrl = `/users/create?tercero_id=${terceroId}&redirect_to=/terceros/${terceroId}/edit`

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    Personal externo vinculado a este tercero (usuarios del sistema)
                </p>
                <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => router.push(createUrl)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Personal
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {personal.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Sin personal vinculado.
                                </TableCell>
                            </TableRow>
                        )}
                        {personal.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{`${p.nombres} ${p.apellidos}`.trim()}</TableCell>
                                <TableCell>
                                    {p.numero_doc ? (
                                        <span>
                                            {p.tipo_doc && <Badge variant="outline" className="mr-1 text-xs">{p.tipo_doc}</Badge>}
                                            {p.numero_doc}
                                        </span>
                                    ) : "—"}
                                </TableCell>
                                <TableCell>{p.email || "—"}</TableCell>
                                <TableCell>{p.telefono || "—"}</TableCell>
                                <TableCell>{p.cargo || "—"}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Editar usuario"
                                        onClick={() => router.push(`/users/${p.id}/edit`)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    )
}
