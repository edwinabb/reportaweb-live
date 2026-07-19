'use client'

import { useActionState } from 'react'
import { login, requestPasswordReset } from '@/lib/actions/auth'
import { AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle2, Mail, Lock, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

const initialState = { error: '' }

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, initialState)
    const [showPassword, setShowPassword] = useState(false)
    const [forgotMode, setForgotMode] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotState, setForgotState] = useState<{ success?: boolean; error?: string; loading?: boolean }>({})

    async function handleForgotSubmit(e: React.FormEvent) {
        e.preventDefault()
        setForgotState({ loading: true })
        const result = await requestPasswordReset(forgotEmail)
        setForgotState(result)
    }

    return (
        <main className="flex h-screen w-full overflow-hidden">
            {/* Left Column — 60% — imagen + slogan */}
            <section className="hidden lg:flex relative w-3/5 bg-slate-950 overflow-hidden items-start justify-center">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/images/login-bg.png"
                        alt="Maquinaria pesada"
                        fill
                        className="object-cover opacity-50"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
                </div>
                <div className="relative z-10 px-16 max-w-3xl pt-[20vh]">
                    <h1 className="text-white font-bold text-5xl leading-tight mb-6 tracking-tight">
                        Planifica, reporta<br />y valoriza en minutos
                    </h1>
                    <p className="text-white/90 text-xl leading-relaxed border-l-4 border-orange-500 pl-6">
                        Sistema de Gestión de Maquinaria Pesada.
                    </p>
                </div>
                <div className="absolute bottom-4 left-4 px-6 py-4">
                    <span className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
                        Industrial Performance Matrix
                    </span>
                </div>
            </section>

            {/* Right Column — 40% — formulario */}
            <section className="w-full lg:w-2/5 bg-white flex flex-col justify-between py-16 px-8 md:px-16 relative overflow-y-auto">
                <div className="flex flex-col items-start mt-20">
                    {/* Logo */}
                    <div className="mb-14">
                        <a
                            href="https://reportar.app"
                            className="text-3xl text-slate-900 hover:text-orange-600 transition-colors" style={{ fontFamily: `var(--font-montserrat, Montserrat, sans-serif)`, fontWeight: 500, letterSpacing: `0.15em` }}
                        >
                            REPORTAR.APP
                        </a>
                    </div>

                    {!forgotMode ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-semibold text-slate-900 mb-1">Bienvenido</h2>
                                <p className="text-slate-500 text-base">Accede a tu plataforma de gestión de maquinaria pesada.</p>
                            </div>

                            <form action={formAction} className="w-full space-y-5">
                                {state?.error && (
                                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span>{state.error}</span>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label htmlFor="email" className="text-sm font-semibold text-slate-600 block">
                                        Correo Electrónico
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="nombre@empresa.com"
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="password" className="text-sm font-semibold text-slate-600 block">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className="text-xs text-slate-500">Recordarme</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setForgotMode(true)}
                                        className="text-xs text-orange-600 hover:underline font-semibold"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-3.5 px-8 bg-[#FF5500] hover:bg-orange-700 disabled:opacity-70 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2 mt-2"
                                >
                                    <span>{isPending ? 'Ingresando...' : 'Iniciar Sesión'}</span>
                                    {!isPending && <ArrowRight className="h-4 w-4" />}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="w-full space-y-6">
                            {forgotState.success ? (
                                <div className="flex flex-col items-center gap-4 py-8 text-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-2">Correo enviado</h2>
                                        <p className="text-sm text-slate-600">
                                            Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setForgotMode(false); setForgotState({}); setForgotEmail('') }}
                                        className="text-sm text-orange-600 hover:underline font-semibold"
                                    >
                                        Volver al inicio de sesión
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotSubmit} className="space-y-5">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-1">Recuperar contraseña</h2>
                                        <p className="text-sm text-slate-500">
                                            Ingresa tu correo y te enviaremos un enlace para restablecerla.
                                        </p>
                                    </div>

                                    {forgotState.error && (
                                        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            <span>{forgotState.error}</span>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label htmlFor="reset-email" className="text-sm font-semibold text-slate-600 block">
                                            Correo Electrónico
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
                                            <input
                                                id="reset-email"
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                placeholder="tu@correo.com"
                                                required
                                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none text-sm"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotState.loading}
                                        className="w-full py-3.5 px-8 bg-[#FF5500] hover:bg-orange-700 disabled:opacity-70 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-500/25 transition-all uppercase tracking-wide flex items-center justify-center gap-2"
                                    >
                                        {forgotState.loading ? 'Enviando...' : 'Enviar enlace'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setForgotMode(false); setForgotState({}); setForgotEmail('') }}
                                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        Volver al inicio de sesión
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-8 flex flex-col items-center border-t border-slate-100 mt-auto mb-8 gap-1">
                    <span className="text-xs text-slate-400">© 2026 REPORTAR.APP</span>
                    <span className="text-xs text-slate-300">Versión: {process.env.NEXT_PUBLIC_APP_VERSION}</span>
                </div>

                {/* Elemento decorativo */}
                <div className="absolute top-0 right-0 p-2 opacity-[0.03] pointer-events-none select-none leading-none text-[140px]">
                    ⚙
                </div>
            </section>
        </main>
    )
}
