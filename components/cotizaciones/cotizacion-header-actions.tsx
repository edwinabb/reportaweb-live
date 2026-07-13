"use client"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { ViewModeToggle } from "@/components/common/view-mode-toggle"

export function CotizacionHeaderActions() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentView = (searchParams.get("view") as "active" | "trash") || "active"

    return (
        <div className="flex items-center gap-2">
            <ViewModeToggle currentView={currentView} />

            <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => router.push('/cotizaciones/nueva')}
            >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Cotización
            </Button>
        </div>
    )
}
