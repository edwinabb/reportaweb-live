'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DocumentTypeDialog } from "@/components/settings/document-types/document-type-dialog"

export function DocumentTypeDialogTrigger() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Tipo
            </Button>
            <DocumentTypeDialog open={open} onOpenChange={setOpen} />
        </>
    )
}
