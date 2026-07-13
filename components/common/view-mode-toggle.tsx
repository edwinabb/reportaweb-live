"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Trash2 } from "lucide-react"

interface ViewModeToggleProps {
    currentView?: "active" | "trash"
    baseUrl?: string // Optional base URL if different from current pathname, usually redundant if using search params on same page
}

export function ViewModeToggle({ currentView = "active" }: ViewModeToggleProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const setView = (v: "active" | "trash") => {
        const params = new URLSearchParams(searchParams.toString())
        if (v === "active") {
            params.delete("view")
        } else {
            params.set("view", "trash")
        }
        router.push(`${pathname}?${params.toString()}`)
    }

    // Determine effective view from props or search params fallback? 
    // The parent passes currentView often derived from searchParams, ensuring sync.
    // If not passed, we could derive it here, but props are safer for controlled usage.

    // Style: "Active View Selected"
    // Active Button: Solid Orange, White Text
    // Trash Button: Ghost, Gray Text

    // Style: "Trash View Selected"
    // Active Button: Ghost, Gray Text
    // Trash Button: Solid Red or Dark, White Text (Mockup showed Red/Dark)

    const isTrash = currentView === "trash"

    return (
        <div className="flex items-center gap-2 mr-2">
            <Button
                variant={!isTrash ? "default" : "outline"}
                size="sm"
                onClick={() => setView("active")}
                className={!isTrash ? "bg-orange-600 hover:bg-orange-700 text-white gap-2" : "gap-2 text-muted-foreground"}
            >
                <CheckCircle2 className="h-4 w-4" />
                Activos
            </Button>
            <Button
                variant={isTrash ? "destructive" : "outline"} // Using destructive for Red/Dark emphasis when active if preferred, or just default with color override
                size="sm"
                onClick={() => setView("trash")}
                className={isTrash ? "bg-red-600 hover:bg-red-700 text-white gap-2" : "gap-2 text-muted-foreground"}
            >
                <Trash2 className="h-4 w-4" />
                Papelera
            </Button>
        </div>
    )
}
