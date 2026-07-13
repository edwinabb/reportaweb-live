'use client'

import { useState, useEffect, useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { JobTitle } from "@/types/job-titles"
import { upsertJobTitle } from "@/lib/actions/job-titles"
import { toast } from "sonner"

interface JobTitleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    jobTitle?: JobTitle | null
}

const initialState = {
    message: "",
    success: false,
    errors: {}
}

export function JobTitleDialog({ open, onOpenChange, jobTitle }: JobTitleDialogProps) {
    const [state, formAction] = useActionState(upsertJobTitle, initialState)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message)
            onOpenChange(false)
        } else if (state?.message) {
            toast.error(state.message)
            setIsLoading(false)
        }
    }, [state, onOpenChange])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form action={(formData) => {
                    setIsLoading(true)
                    formAction(formData)
                }}>
                    <DialogHeader>
                        <DialogTitle>{jobTitle ? 'Editar Cargo' : 'Nuevo Cargo'}</DialogTitle>
                        <DialogDescription>
                            {jobTitle ? 'Modifique los detalles del cargo aquí.' : 'Ingrese el nombre del nuevo cargo para el personal.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <input type="hidden" name="id" value={jobTitle?.id || ''} />
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre del Cargo</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={jobTitle?.name || ''}
                                placeholder="Ej. Operador de Montacargas"
                                required
                            />
                            {state?.errors?.name && (
                                <p className="text-sm text-destructive">{state.errors.name[0]}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar Cargo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
