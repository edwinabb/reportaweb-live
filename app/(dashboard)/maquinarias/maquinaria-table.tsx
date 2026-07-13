"use client"
import { Button } from "@/components/ui/button"

import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"
import { Maquinaria } from "@/types/maquinaria"

interface MaquinariaTableProps {
    data: Maquinaria[]
    isTrash?: boolean
}

import { useRouter } from "next/navigation"

import { Trash } from "lucide-react"

export function MaquinariaTable({ data, isTrash = false }: MaquinariaTableProps) {
    const router = useRouter()
    const columns = getColumns(isTrash)

    return (
        <div className="flex flex-col gap-4">
            <DataTable
                columns={columns}
                data={data}
                searchKey="nombre"
                customAction={
                    <div className="flex items-center gap-2">
                        <Button
                            variant={!isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/maquinarias')}
                        >
                            Activos
                        </Button>
                        <Button
                            variant={isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/maquinarias?view=trash')}
                        >
                            <Trash className="w-4 h-4 mr-2" />
                            Papelera
                        </Button>
                        {!isTrash && (
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => router.push('/maquinarias/create')}>
                                <span className="mr-2">+</span>
                                Nuevo Equipo
                            </Button>
                        )}
                        {/* Tipos de Documentos button removed as per user request */}
                    </div>
                }
            />
        </div>
    )
}
