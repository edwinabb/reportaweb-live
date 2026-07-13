'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { JobTitleDialog } from "@/components/settings/users/job-titles/job-title-dialog"

export function JobTitleDialogTrigger() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Cargo
            </Button>
            <JobTitleDialog open={open} onOpenChange={setOpen} />
        </>
    )
}
