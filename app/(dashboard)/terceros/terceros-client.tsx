"use client"

import { Tercero } from "@/types/terceros"
import { TercerosTable } from "./terceros-table"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { Trash2, Plus } from "lucide-react"

interface TercerosClientProps {
    data: Tercero[]
    isTrash?: boolean
}

export function TercerosClient({ data, isTrash = false }: TercerosClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentView = searchParams.get("view") || "active"

    const handleViewChange = (view: string) => {
        router.push(`/terceros?view=${view}`)
    }

    const CustomActions = (
        <div className="flex items-center space-x-2 bg-muted/50 p-1 rounded-lg">
            <Button
                size="sm"
                variant={currentView === 'active' ? "default" : "ghost"}
                className={currentView === 'active' ? "bg-orange-600 hover:bg-orange-700" : "hover:bg-transparent"}
                onClick={() => handleViewChange('active')}
            >
                Activos
            </Button>
            <Button
                size="sm"
                variant={currentView === 'trash' ? "default" : "ghost"}
                className={currentView === 'trash' ? "bg-red-600 hover:bg-red-700" : "hover:bg-transparent"}
                onClick={() => handleViewChange('trash')}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Papelera
            </Button>
            {!isTrash && (
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => router.push('/terceros/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Tercero
                </Button>
            )}
        </div>
    )

    const filteredData = isTrash
        ? data.filter(d => !d.is_active)
        : data

    return (
        <div className="flex flex-col gap-4">

            <TercerosTable
                data={filteredData}
                customAction={CustomActions}
            />
        </div>
    )
}
