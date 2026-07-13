'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { updatePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [state, setState] = useState<{ success?: boolean; error?: string; loading?: boolean }>({})
    const [sessionReady, setSessionReady] = useState(false)
    const [sessionError, setSessionError] = useState('')

    useEffect(() => {
        // Supabase sends a `code` param for PKCE flow
        const code = searchParams.get('code')
        if (!code) {
            setSessionError('El enlace es inválido o ha expirado. Solicita uno nuevo.')
            return
        }

        const supabase = createClient()
        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) {
                setSessionError('El enlace ha expirado o ya fue utilizado. Solicita uno nuevo.')
            } else {
                setSessionReady(true)
            }
        })
    }, [searchParams])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setState({ loading: true })
        const result = await updatePassword(password)
        setState(result)
        if (result.success) {
            setTimeout(() => router.push('/login'), 2500)
        }
    }

    return (
        <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-slate-900" />
            </div>

            <Card className="relative z-10 w-full max-w-[400px] mx-4 bg-white/95 backdrop-blur-md shadow-2xl border-orange-500/20">
                <CardHeader className="space-y-1 items-center pb-0">
                    <div className="flex justify-center mb-0">
                        <Image
                            src="/logo-login-v2.png"
                            width={300}
                            height={80}
                            alt="Reporta Logo"
                            className="h-16 w-auto"
                            priority
                        />
                    </div>
                    <CardDescription className="text-center text-slate-500">
                        Nueva contraseña
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 mt-4">
                    {sessionError ? (
                        <div className="flex flex-col items-center gap-3 py-2 text-center">
                            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md w-full">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{sessionError}</span>
                            </div>
                            <a href="/login" className="text-sm text-orange-600 hover:underline">
                                Volver al inicio de sesión
                            </a>
                        </div>
                    ) : !sessionReady ? (
                        <p className="text-sm text-slate-500 text-center py-4">Verificando enlace...</p>
                    ) : state.success ? (
                        <div className="flex flex-col items-center gap-3 py-4 text-center">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                            <p className="text-sm text-slate-700 font-medium">
                                Contraseña actualizada. Redirigiendo al inicio de sesión...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {state.error && (
                                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{state.error}</span>
                                </div>
                            )}
                            <p className="text-sm text-slate-600">
                                Elige una contraseña segura de al menos 8 caracteres.
                            </p>
                            <div className="grid gap-2">
                                <Label htmlFor="new-password" className="text-slate-700 font-medium">
                                    Nueva contraseña
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={8}
                                        required
                                        className="bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 transition-all font-medium py-5 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6"
                                type="submit"
                                disabled={state.loading}
                            >
                                {state.loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            <div className="absolute bottom-4 text-white/40 text-xs font-light tracking-widest">
                © {new Date().getFullYear()} REPORTA.LA
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    )
}
