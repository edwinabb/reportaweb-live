'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Lock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

/**
 * Diálogo que pide la contraseña de login del usuario actual antes de permitir
 * editar un dato sensible (firma, PIN). Tras verificación exitosa llama a
 * `onAuthenticated()`.
 *
 * El verify se hace con signInWithPassword contra el email del usuario logueado
 * — si coincide, Supabase refresca la sesión pero no abre una nueva.
 */

interface ReAuthDialogProps {
    open: boolean
    onOpenChange: (o: boolean) => void
    title: string
    description?: string
    onAuthenticated: () => void
}

export function ReAuthDialog({ open, onOpenChange, title, description, onAuthenticated }: ReAuthDialogProps) {
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const reset = () => {
        setPassword('')
        setError(null)
        setSubmitting(false)
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password.trim()) return
        setSubmitting(true)
        setError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) {
            setError('No se pudo identificar al usuario actual.')
            setSubmitting(false)
            return
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password,
        })

        if (signInError) {
            setError('Contraseña incorrecta.')
            setSubmitting(false)
            toast.error('Contraseña incorrecta')
            return
        }

        setSubmitting(false)
        reset()
        onOpenChange(false)
        onAuthenticated()
    }

    const handleClose = (o: boolean) => {
        if (!o) reset()
        onOpenChange(o)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-orange-600" /> {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description || 'Ingresá tu contraseña de login para continuar.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleVerify} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="reauth-password">Contraseña</Label>
                        <Input
                            id="reauth-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting || !password.trim()}>
                            {submitting ? 'Verificando…' : 'Verificar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
