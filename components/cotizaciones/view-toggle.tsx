
"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Trash2 } from "lucide-react"

export function ViewToggle() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const view = searchParams.get("view") || "active"

    const setView = (v: string) => {
        const params = new URLSearchParams(searchParams)
        if (v === "active") params.delete("view")
        else params.set("view", v)
        router.replace(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/50">
            <Button
                variant={view === "active" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("active")}
                className="gap-2"
            >
                <CheckCircle2 className="h-4 w-4" />
                Activos
            </Button>
            <Button
                variant={view === "trash" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("trash")}
                className="gap-2"
            >
                <Trash2 className="h-4 w-4" />
                Papelera
            </Button>
        </div>
    )
}
