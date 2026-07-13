'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerTrial } from '@/lib/actions/trial'
import type { FleetType } from '@/lib/trial-seed'

const PAISES = ['Perú', 'Colombia', 'Chile', 'Ecuador', 'Bolivia', 'Otro'] as const

const FLEET_TYPE_OPTIONS: { label: string; value: FleetType }[] = [
    { label: 'Grúas y equipos de izaje',            value: 'gruas' },
    { label: 'Excavadoras y movimiento de tierras', value: 'excavadoras' },
    { label: 'Compactadoras y rodillos',            value: 'compactadoras' },
    { label: 'Mezcladoras y equipos de concreto',   value: 'mezcladoras' },
    { label: 'Flota mixta',                         value: 'mixta' },
]

const FLEET_SIZE_OPTIONS: { label: string; value: number }[] = [
    { label: '1–5 máquinas',   value: 3  },
    { label: '6–20 máquinas',  value: 12 },
    { label: '21–50 máquinas', value: 35 },
    { label: 'Más de 50',      value: 75 },
]

function isValidEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
}

export function RegistroPageClient() {
    const router = useRouter()

    const [adminName,   setAdminName]   = useState('')
    const [email,       setEmail]       = useState('')
    const [password,    setPassword]    = useState('')
    const [companyName, setCompanyName] = useState('')
    const [country,     setCountry]     = useState<string>('Perú')
    const [fleetType,   setFleetType]   = useState<FleetType | ''>('')
    const [fleetSize,   setFleetSize]   = useState<number | null>(null)

    const [loading,     setLoading]     = useState(false)
    const [error,       setError]       = useState<string | null>(null)
    const [emailErr,    setEmailErr]    = useState<string | null>(null)
    const [passwordErr, setPasswordErr] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setEmailErr(null)
        setPasswordErr(null)

        // Validación email
        if (!isValidEmail(email)) {
            setEmailErr('Ingresa un correo electrónico válido. Ej: juan@empresa.com')
            return
        }

        // Validación contraseña
        if (password.length < 8) {
            setPasswordErr('La contraseña debe tener al menos 8 caracteres.')
            return
        }

        setLoading(true)

        const result = await registerTrial({
            adminName,
            email:       email.trim().toLowerCase(),
            password,
            companyName,
            country,
            fleetType:  fleetType || null,
            fleetSize,
        })

        if (!result.success) {
            setError(result.error ?? 'Ocurrió un error. Intenta de nuevo.')
            setLoading(false)
            return
        }

        const params = new URLSearchParams({ email: email.trim().toLowerCase(), password })
        router.push(`/api/auth/trial-login?${params.toString()}`)
    }

    return (
        <main
            className="min-h-screen flex"
            style={{
                backgroundImage: 'url(/bg-registro2.jpg)',
                backgroundSize:  'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Overlay oscuro sobre toda la pantalla */}
            <div className="absolute inset-0 bg-black/55 pointer-events-none" />

            {/* Columna izquierda — branding (solo visible en md+) */}
            <div className="relative z-10 hidden md:flex flex-col justify-between flex-1 px-12 py-12">
                {/* Logo */}
                <div>
                    <span
                        className="text-white text-2xl tracking-widest"
                        style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', fontWeight: 500, letterSpacing: '0.18em' }}
                    >
                        REPORTAR.APP
                    </span>
                </div>

                {/* Tagline central */}
                <div className="max-w-md">
                    <h2
                        className="text-white text-4xl leading-snug mb-4"
                        style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', fontWeight: 600 }}
                    >
                        Planifica, reporta y valoriza en minutos.
                    </h2>
                    <p className="text-white/70 text-base">
                        Sistema de Gestión de Maquinaria Pesada.
                    </p>
                </div>

                {/* Footer */}
                <p className="text-white/40 text-xs">
                    © 2026{' '}
                    <span style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', fontWeight: 400 }}>
                        REPORTAR.APP
                    </span>
                    {' '}· Todos los derechos reservados
                </p>
            </div>

            {/* Columna derecha — formulario */}
            <div className="relative z-10 flex items-center justify-center w-full md:w-[480px] md:min-w-[480px] px-4 py-10">
                <div className="w-full max-w-md">

                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Card header */}
                        <div className="px-8 pt-8 pb-4">
                            {/* Logo */}
                            <div className="mb-4">
                                <span
                                    className="text-orange-600 text-lg tracking-widest"
                                    style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', fontWeight: 500, letterSpacing: '0.18em' }}
                                >
                                    REPORTAR.APP
                                </span>
                            </div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Empieza tu trial gratis
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                10 días sin compromiso · Sin tarjeta de crédito
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            {/* ── Sección 1: Tu cuenta ─────────────────── */}
                            <div className="px-8 py-4 space-y-4 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                    Tu cuenta
                                </p>

                                {/* Nombre completo */}
                                <div>
                                    <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo <span className="text-orange-600">*</span>
                                    </label>
                                    <input
                                        id="adminName"
                                        type="text"
                                        required
                                        value={adminName}
                                        onChange={e => setAdminName(e.target.value)}
                                        placeholder="Juan Pérez"
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email <span className="text-orange-600">*</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setEmailErr(null) }}
                                        onBlur={() => {
                                            if (email && !isValidEmail(email))
                                                setEmailErr('Correo inválido. Debe tener el formato: usuario@dominio.com')
                                        }}
                                        placeholder="juan@empresa.com"
                                        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                            emailErr ? 'border-red-400 bg-red-50' : 'border-gray-200'
                                        }`}
                                    />
                                    {emailErr && (
                                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <span>⚠</span> {emailErr}
                                        </p>
                                    )}
                                </div>

                                {/* Contraseña */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Contraseña <span className="text-orange-600">*</span>
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setPasswordErr(null) }}
                                        placeholder="Mínimo 8 caracteres"
                                        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                            passwordErr ? 'border-red-400 bg-red-50' : 'border-gray-200'
                                        }`}
                                    />
                                    {passwordErr && (
                                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <span>⚠</span> {passwordErr}
                                        </p>
                                    )}
                                </div>

                                {/* Empresa */}
                                <div>
                                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre de la empresa <span className="text-orange-600">*</span>
                                    </label>
                                    <input
                                        id="companyName"
                                        type="text"
                                        required
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        placeholder="Grúas Norte S.A.C."
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                {/* País */}
                                <div>
                                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                                        País <span className="text-orange-600">*</span>
                                    </label>
                                    <select
                                        id="country"
                                        required
                                        value={country}
                                        onChange={e => setCountry(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                                    >
                                        {PAISES.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* ── Sección 2: Tu operación ──────────────── */}
                            <div className="px-8 py-4 space-y-4 border-t border-gray-100">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                        Tu operación
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        Usamos esto para personalizar tu experiencia. Puedes cambiarlo después.
                                    </p>
                                </div>

                                {/* Tipo de maquinaria */}
                                <div>
                                    <label htmlFor="fleetType" className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de maquinaria
                                    </label>
                                    <select
                                        id="fleetType"
                                        value={fleetType}
                                        onChange={e => setFleetType(e.target.value as FleetType | '')}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                                    >
                                        <option value="">Selecciona una opción</option>
                                        {FLEET_TYPE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tamaño de flota */}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Tamaño de flota</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FLEET_SIZE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setFleetSize(fleetSize === opt.value ? null : opt.value)}
                                                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                                    fleetSize === opt.value
                                                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── Submit ───────────────────────────────── */}
                            <div className="px-8 py-5 border-t border-gray-100 space-y-3">
                                {error && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                                        <span className="mt-0.5">⚠</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-colors"
                                >
                                    {loading ? 'Creando tu cuenta…' : 'Empezar trial gratis →'}
                                </button>

                                <p className="text-center text-xs text-gray-400">
                                    ¿Ya tienes cuenta?{' '}
                                    <Link href="/login" className="text-orange-600 hover:underline font-medium">
                                        Inicia sesión
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    )
}
