'use client'

import { use, useState, useEffect } from 'react'
import Image from 'next/image'
import {
    getCotizacionByToken,
    validatePIN,
    aprobarServicio,
    rechazarServicio,
    finalizarAprobacion
} from '@/lib/actions/cotizaciones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2, AlertCircle, FileText, ClipboardCheck } from 'lucide-react'

// ── Marketing Left Column (reused in PIN + Success screens) ────────────────────
function MarketingColumn() {
    return (
        <section className="hidden lg:flex relative w-2/5 bg-slate-950 overflow-hidden items-start justify-center shrink-0">
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
            <div className="relative z-10 px-16 max-w-lg pt-[20vh]">
                <div className="mb-10">
                    <a
                        href="https://www.reportar.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-3xl font-semibold text-white tracking-tight hover:text-orange-400 transition-colors"
                    >
                        REPORTAR.APP
                    </a>
                </div>
                <h1 className="text-white font-bold text-5xl leading-tight mb-6 tracking-tight">
                    Cobra todo lo que<br />tu maquinaria trabajó
                </h1>
                <p className="text-white/90 text-xl leading-relaxed border-l-4 border-orange-500 pl-6">
                    / Gestiona, reporta y valoriza en minutos
                </p>
            </div>
            <div className="absolute bottom-4 left-4 px-6 py-4">
                <span className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
                    Industrial Performance Matrix
                </span>
            </div>
        </section>
    )
}

export default function AprobacionPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params)
    const [pin, setPin] = useState('')
    const [validated, setValidated] = useState(false)
    const [loading, setLoading] = useState(false)
    const [cotizacion, setCotizacion] = useState<any>(null)
    const [serviciosEstado, setServiciosEstado] = useState<Record<string, 'APROBADA' | 'RECHAZADA' | 'PENDIENTE'>>({})
    const [observaciones, setObservaciones] = useState<Record<string, string>>({})
    const [comentarios, setComentarios] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [tareaInfo, setTareaInfo] = useState<{ tarea_id: string | null; tarea_codigo: string | null; estado: string } | null>(null)

    useEffect(() => {
        if (validated) loadCotizacion()
    }, [validated])

    const loadCotizacion = async () => {
        const data = await getCotizacionByToken(token)
        if (data) {
            setCotizacion(data)
            const estados: Record<string, 'APROBADA' | 'RECHAZADA' | 'PENDIENTE'> = {}
            data.detalles?.forEach((d: any) => {
                estados[d.id] = d.estado_aprobacion || 'PENDIENTE'
            })
            setServiciosEstado(estados)
        }
    }

    const handleValidatePIN = async () => {
        if (!pin || pin.length !== 4) {
            toast.error('Ingresa un PIN de 4 dígitos')
            return
        }
        setLoading(true)
        const result = await validatePIN(token, pin)
        setLoading(false)
        if (result.valid) {
            setValidated(true)
        } else {
            toast.error(result.message)
        }
    }

    const handleToggleServicio = async (detalleId: string, nuevoEstado: 'APROBADA' | 'RECHAZADA') => {
        const estadoActual = serviciosEstado[detalleId]
        if (estadoActual === nuevoEstado) {
            setServiciosEstado(prev => ({ ...prev, [detalleId]: 'PENDIENTE' }))
            return
        }
        setServiciosEstado(prev => ({ ...prev, [detalleId]: nuevoEstado }))
        if (nuevoEstado === 'APROBADA') {
            await aprobarServicio(cotizacion.id, detalleId)
        } else {
            await rechazarServicio(cotizacion.id, detalleId)
        }
    }

    const handleSubmit = async () => {
        const obsLines = Object.entries(observaciones)
            .filter(([id, obs]) => obs.trim() && serviciosEstado[id] === 'RECHAZADA')
            .map(([id, obs]) => {
                const det = cotizacion.detalles?.find((d: any) => d.id === id)
                return `• ${det?.servicio?.nombre || 'Servicio'}: ${obs}`
            })
        const fullComentarios = [
            comentarios.trim(),
            obsLines.length > 0 ? 'Observaciones por servicio:\n' + obsLines.join('\n') : ''
        ].filter(Boolean).join('\n\n')

        setLoading(true)
        const result = await finalizarAprobacion(cotizacion.id, fullComentarios, token)
        setLoading(false)
        if (result.success) {
            setTareaInfo({
                tarea_id: result.tarea_id ?? null,
                tarea_codigo: result.tarea_codigo ?? null,
                estado: result.estado ?? 'ENVIADA'
            })
            setSubmitted(true)
        } else {
            toast.error(result.message)
        }
    }

    const formatPrecio = (valor?: number, moneda?: string) => {
        if (!valor) return '-'
        const simbolo = moneda === 'PEN' ? 'S/' : (moneda || 'S/')
        return `${simbolo} ${valor.toFixed(2)}`
    }

    // ── PIN SCREEN ──────────────────────────────────────────────────────────────
    if (!validated) {
        return (
            <main className="flex h-screen w-full overflow-hidden">
                <MarketingColumn />
                <section className="w-full lg:w-3/5 bg-white flex flex-col justify-center px-8 md:px-16 overflow-y-auto py-12">
                    <div className="max-w-sm w-full mx-auto space-y-8">
                        <div>
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl mb-4">
                                <ClipboardCheck className="h-6 w-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-1">Revisión de Cotización</h2>
                            <p className="text-slate-500 text-base">Ingresa el PIN de acceso que recibiste en el correo.</p>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="pin" className="text-sm font-semibold text-slate-600 block uppercase tracking-wider">
                                PIN de Acceso
                            </Label>
                            <Input
                                id="pin"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="· · · ·"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="text-center font-black tracking-[0.6em] h-20 border-2 border-slate-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl bg-slate-50"
                                style={{ fontSize: '3.375rem' }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleValidatePIN() }}
                            />
                        </div>

                        <Button
                            onClick={handleValidatePIN}
                            disabled={loading || pin.length !== 4}
                            className="w-full py-3.5 px-8 bg-[#FF5500] hover:bg-orange-700 disabled:opacity-70 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] uppercase tracking-wide h-12"
                        >
                            {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verificando...</> : 'Acceder'}
                        </Button>

                        <div className="pt-4 border-t border-slate-100">
                            <img src="/logo-full.png" alt="Reporta.la" className="h-6 opacity-40" />
                        </div>
                    </div>
                </section>
            </main>
        )
    }

    // ── LOADING ─────────────────────────────────────────────────────────────────
    if (!cotizacion) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
    if (submitted) {
        const isAprobada = tareaInfo?.estado === 'APROBADA'
        const aprobadosCount = Object.values(serviciosEstado).filter(e => e === 'APROBADA').length
        const rechazadosCount = Object.values(serviciosEstado).filter(e => e === 'RECHAZADA').length

        return (
            <main className="flex h-screen w-full overflow-hidden">
                <MarketingColumn />
                <section className="w-full lg:w-3/5 bg-white flex flex-col justify-center px-8 md:px-16 overflow-y-auto py-12">
                    <div className="max-w-lg w-full mx-auto space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl ${isAprobada ? 'bg-green-500' : 'bg-orange-500'}`}>
                                <CheckCircle2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900">
                                    {isAprobada ? '¡Cotización Aprobada!' : 'Respuesta Enviada'}
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    {isAprobada
                                        ? 'Has aprobado todos los servicios. Procederemos con la atención.'
                                        : 'Hemos recibido tu respuesta con observaciones.'}
                                </p>
                            </div>
                        </div>

                        {/* Tarea generada */}
                        {tareaInfo?.tarea_codigo && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                                <div className="shrink-0 w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
                                    <ClipboardCheck className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Referencia de atención</p>
                                    <p className="font-mono font-bold text-slate-900 text-lg">{tareaInfo.tarea_codigo}</p>
                                </div>
                            </div>
                        )}

                        {/* Resumen contadores */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                <div className="text-3xl font-black text-green-600">{aprobadosCount}</div>
                                <div className="text-xs font-medium text-green-700 mt-1 uppercase tracking-wide">Aprobados</div>
                            </div>
                            <div className={`border rounded-xl p-4 text-center ${rechazadosCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className={`text-3xl font-black ${rechazadosCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{rechazadosCount}</div>
                                <div className={`text-xs font-medium mt-1 uppercase tracking-wide ${rechazadosCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>Rechazados</div>
                            </div>
                        </div>

                        {/* Detalle por servicio */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Detalle de decisiones</p>
                            {cotizacion.detalles?.map((d: any) => {
                                const estado = serviciosEstado[d.id]
                                const obs = observaciones[d.id]
                                const isAp = estado === 'APROBADA'
                                const isRe = estado === 'RECHAZADA'
                                return (
                                    <div key={d.id} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${isAp ? 'bg-green-50 border-green-200' : isRe ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                        {isAp
                                            ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                            : isRe
                                                ? <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                                : <AlertCircle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-900">{d.servicio?.nombre}</div>
                                            {obs && <div className="text-slate-600 text-xs mt-0.5 italic">"{obs}"</div>}
                                        </div>
                                        <span className={`text-xs font-semibold shrink-0 ${isAp ? 'text-green-700' : isRe ? 'text-red-700' : 'text-gray-500'}`}>
                                            {isAp ? 'Aprobado' : isRe ? 'Rechazado' : 'Pendiente'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Comentarios generales */}
                        {comentarios.trim() && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Comentarios generales</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comentarios}</p>
                            </div>
                        )}

                        <p className="text-sm text-slate-500 text-center pb-2">
                            Nos pondremos en contacto contigo pronto.
                        </p>

                        <div className="pt-2 border-t border-slate-100">
                            <img src="/logo-full.png" alt="Reporta.la" className="h-6 opacity-40" />
                        </div>
                    </div>
                </section>
            </main>
        )
    }

    const aprobados = Object.values(serviciosEstado).filter(e => e === 'APROBADA').length
    const rechazados = Object.values(serviciosEstado).filter(e => e === 'RECHAZADA').length
    const pendientes = Object.values(serviciosEstado).filter(e => e === 'PENDIENTE').length
    const monedaSimbolo = cotizacion.moneda === 'PEN' ? 'S/' : 'USD'
    const totalValor = (cotizacion.detalles || []).reduce((sum: number, d: any) => {
        const s = d.servicio
        const maxPrice = Math.max(s?.precio_1_valor || 0, s?.precio_2_valor || 0, s?.precio_3_valor || 0)
        return sum + (maxPrice * (d.cantidad || 1))
    }, 0)

    // ── MAIN APPROVAL FORM ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Top bar */}
            <div className="bg-[#111827] border-b border-gray-700 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <a href="https://reportar.app" target="_blank" rel="noopener noreferrer"
                        className="text-white opacity-80 hover:opacity-100 font-semibold tracking-widest text-sm"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        REPORTAR.APP
                    </a>
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm font-mono hidden sm:block">{cotizacion.numero}</span>
                        <a href={`/aprobacion/${token}/preview`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs">
                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                Ver PDF
                            </Button>
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* ── COTIZACIÓN PREVIEW ── */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="bg-[#111827] px-6 py-5 flex items-center justify-between">
                        <div>
                            <h1 className="text-white text-xl font-bold">Cotización {cotizacion.numero}</h1>
                            <p className="text-gray-400 text-sm mt-0.5">
                                {new Date(cotizacion.fecha_emision).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="h-1 bg-orange-500" />

                    <div className="p-6 grid sm:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
                            <p className="font-semibold text-gray-900">{cotizacion.cliente?.razon_social}</p>
                            {cotizacion.cliente?.ruc && <p className="text-sm text-gray-500">RUC: {cotizacion.cliente.ruc}</p>}
                            {cotizacion.contacto?.nombre_completo && (
                                <p className="text-sm text-gray-600 mt-1">Attn: {cotizacion.contacto.nombre_completo}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Condiciones</p>
                            {cotizacion.moneda && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Moneda:</span>
                                    <span className="font-medium text-gray-800">{cotizacion.moneda === 'PEN' ? 'Soles (S/)' : 'Dólares (USD)'}</span>
                                </div>
                            )}
                            {cotizacion.forma_pago && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Forma de pago:</span>
                                    <span className="font-medium text-gray-800">{cotizacion.forma_pago}</span>
                                </div>
                            )}
                            {cotizacion.plazo_pago && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Plazo:</span>
                                    <span className="font-medium text-gray-800">{cotizacion.plazo_pago}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RESUMEN ── */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Aprobados', value: aprobados, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                        { label: 'Rechazados', value: rechazados, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                        { label: 'Pendientes', value: pendientes, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`rounded-xl border ${bg} p-4 text-center`}>
                            <div className={`text-3xl font-black ${color}`}>{value}</div>
                            <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
                        </div>
                    ))}
                </div>

                {/* ── SERVICIOS ── */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-gray-900">Servicios Cotizados</h2>
                            <p className="text-sm text-gray-500">Aprueba o rechaza cada ítem</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Referencial</p>
                            <p className="text-xl font-black text-orange-500">{monedaSimbolo} {totalValor.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="divide-y">
                        {cotizacion.detalles?.map((detalle: any, idx: number) => {
                            const estado = serviciosEstado[detalle.id]
                            const isAprobado = estado === 'APROBADA'
                            const isRechazado = estado === 'RECHAZADA'

                            return (
                                <div key={detalle.id} className={`p-5 transition-colors ${isAprobado ? 'bg-green-50' : isRechazado ? 'bg-red-50' : ''}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 mt-0.5">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 text-base">{detalle.servicio?.nombre}</h3>
                                                    {detalle.servicio?.descripcion && (
                                                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{detalle.servicio.descripcion}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                                                        <span>Cant: <strong>{detalle.cantidad}</strong></span>
                                                        {detalle.precio_tipo && <span>· {detalle.precio_tipo}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 min-w-[120px]">
                                                    {([1, 2, 3] as const).map(idx => {
                                                        const nombre = (detalle.servicio as any)?.[`precio_${idx}_tipo_nombre`] as string | null
                                                        const valor = (detalle.servicio as any)?.[`precio_${idx}_valor`] as number | null
                                                        if (!valor) return null
                                                        return (
                                                            <div key={idx} className="mb-1">
                                                                {nombre && <div className="text-[10px] text-gray-400 uppercase">{nombre}</div>}
                                                                <div className="text-base font-bold text-gray-900">{monedaSimbolo} {valor.toFixed(2)}</div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={isAprobado ? 'default' : 'outline'}
                                                    className={isAprobado
                                                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                                                        : 'border-green-300 text-green-700 hover:bg-green-50'}
                                                    onClick={() => handleToggleServicio(detalle.id, 'APROBADA')}
                                                >
                                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                                    Aprobar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={isRechazado ? 'default' : 'outline'}
                                                    className={isRechazado
                                                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                                                        : 'border-red-300 text-red-700 hover:bg-red-50'}
                                                    onClick={() => handleToggleServicio(detalle.id, 'RECHAZADA')}
                                                >
                                                    <XCircle className="mr-1.5 h-4 w-4" />
                                                    Rechazar
                                                </Button>
                                                {isAprobado && <Badge className="bg-green-100 text-green-800 border-green-200 self-center">✓ Aprobado</Badge>}
                                                {isRechazado && <Badge className="bg-red-100 text-red-800 border-red-200 self-center">✗ Rechazado</Badge>}
                                            </div>

                                            {isRechazado && (
                                                <div className="mt-3">
                                                    <Textarea
                                                        placeholder="¿Por qué rechazas este servicio? (opcional)"
                                                        value={observaciones[detalle.id] || ''}
                                                        onChange={(e) => setObservaciones(prev => ({ ...prev, [detalle.id]: e.target.value }))}
                                                        rows={2}
                                                        className="text-sm border-red-200 focus:border-red-400 bg-white"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── COMENTARIOS GENERALES ── */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50">
                        <h2 className="font-bold text-gray-900">Comentarios Generales</h2>
                        <p className="text-sm text-gray-500">Opcional — observaciones adicionales</p>
                    </div>
                    <div className="p-6">
                        <Textarea
                            placeholder="Escribe tus comentarios generales aquí..."
                            value={comentarios}
                            onChange={(e) => setComentarios(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                {/* ── SUBMIT ── */}
                <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    {pendientes === cotizacion.detalles?.length && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Debes aprobar o rechazar al menos un servicio antes de enviar.
                            </AlertDescription>
                        </Alert>
                    )}
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || pendientes === cotizacion.detalles?.length}
                        className="w-full h-12 text-base font-bold bg-[#111827] hover:bg-gray-800 text-white"
                        size="lg"
                    >
                        {loading
                            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Enviando respuesta...</>
                            : 'Enviar Respuesta al Proveedor'
                        }
                    </Button>
                    <p className="text-xs text-gray-400 text-center">
                        Al enviar, el proveedor recibirá tu decisión inmediatamente.
                    </p>
                </div>
            </div>
        </div>
    )
}
