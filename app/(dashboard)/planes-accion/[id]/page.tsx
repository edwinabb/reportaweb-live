import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlanAccionById, getPlanAvances } from '@/lib/actions/planes'
import { ClosePlanDialog } from '@/components/planes/close-plan-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Truck, Calendar, FileText, HelpCircle, User2 } from 'lucide-react'
import { formatDateInTZ, formatDateTimeInTZ } from '@/lib/utils/tz'

export const dynamic = 'force-dynamic'

const prioridadClass = (p: string | null) => {
    switch (p) {
        case 'CRITICA': return 'bg-red-600 text-white'
        case 'ALTA': return 'bg-orange-500 text-white'
        case 'MEDIA': return 'bg-yellow-500 text-white'
        case 'BAJA': return 'bg-blue-500 text-white'
        default: return 'bg-slate-400 text-white'
    }
}

const estadoClass = (e: string | null) => {
    switch (e) {
        case 'PENDIENTE': return 'bg-slate-100 text-slate-700 border-slate-300'
        case 'EN_PROCESO': return 'bg-blue-50 text-blue-700 border-blue-300'
        case 'REVISION': return 'bg-amber-50 text-amber-700 border-amber-300'
        case 'CERRADO': return 'bg-green-50 text-green-700 border-green-300'
        case 'VERIFICADO': return 'bg-emerald-50 text-emerald-700 border-emerald-300'
        case 'RECHAZADO': return 'bg-red-50 text-red-700 border-red-300'
        default: return ''
    }
}

const profileInitials = (first?: string | null, last?: string | null, email?: string | null) => {
    const a = (first || '').trim().charAt(0)
    const b = (last || '').trim().charAt(0)
    if (a || b) return `${a}${b}`.toUpperCase()
    return (email || '?').charAt(0).toUpperCase()
}

const profileLabel = (first?: string | null, last?: string | null, email?: string | null) => {
    const name = [first, last].filter(Boolean).join(' ').trim()
    return name || email || 'Sin nombre'
}

const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return formatDateInTZ(iso, 'America/Lima')
}

const formatDateTime = (iso: string | null) => {
    if (!iso) return '—'
    return formatDateTimeInTZ(iso, 'America/Lima')
}

async function PlanDetailContent({ id }: { id: string }) {
    const [plan, avances] = await Promise.all([
        getPlanAccionById(id),
        getPlanAvances(id),
    ])

    if (!plan) notFound()

    const mainTitle =
        plan.titulo ||
        plan.descripcion_problema ||
        plan.pregunta_ref?.titulo ||
        'Sin título'
    const pregunta = plan.pregunta_ref?.titulo
    const isCerrado = plan.estado === 'CERRADO' || plan.estado === 'VERIFICADO'
    const fotos = (plan.lista_fotos as string[] | null) || []
    const responsables = plan.responsables || []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                            {plan.codigo || '—'}
                        </span>
                        <Badge className={prioridadClass(plan.prioridad)}>
                            {plan.prioridad || '—'}
                        </Badge>
                        <Badge variant="outline" className={estadoClass(plan.estado)}>
                            {plan.estado?.replace('_', ' ') || '—'}
                        </Badge>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">{mainTitle}</h1>
                    {pregunta && pregunta !== mainTitle && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                            <HelpCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>Pregunta: {pregunta}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/planes-accion">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Link>
                    </Button>
                    <ClosePlanDialog
                        planId={plan.id}
                        planCodigo={plan.codigo}
                        disabled={isCerrado}
                    />
                </div>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left column: info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Descripción</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {plan.descripcion_problema && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Problema / hallazgo
                                    </p>
                                    <p className="whitespace-pre-wrap">{plan.descripcion_problema}</p>
                                </div>
                            )}
                            {plan.accion_correctiva_propuesta && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Acción correctiva propuesta
                                    </p>
                                    <p className="whitespace-pre-wrap">
                                        {plan.accion_correctiva_propuesta}
                                    </p>
                                </div>
                            )}
                            {!plan.descripcion_problema && !plan.accion_correctiva_propuesta && (
                                <p className="text-xs text-muted-foreground italic">
                                    Sin descripción registrada (plan legacy).
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {fotos.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Evidencia del hallazgo ({fotos.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {fotos.map((url, i) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block aspect-video rounded border bg-slate-50 overflow-hidden hover:ring-2 hover:ring-blue-500"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`Evidencia ${i + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Timeline de avances */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Historial de avances ({avances.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {avances.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    Sin avances registrados.
                                </p>
                            ) : (
                                <ul className="space-y-4">
                                    {avances.map((av) => (
                                        <li
                                            key={av.id}
                                            className="border-l-2 border-slate-200 pl-4 relative"
                                        >
                                            <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-blue-500" />
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {formatDateTime(av.created_at)}
                                                {av.estado && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {av.estado}
                                                    </Badge>
                                                )}
                                            </div>
                                            {av.comentario && (
                                                <p className="text-sm mt-1 whitespace-pre-wrap">
                                                    {av.comentario}
                                                </p>
                                            )}
                                            {Array.isArray(av.fotos) && av.fotos.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {av.fotos.slice(0, 4).map((url, i) => (
                                                        <a
                                                            key={i}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="h-16 w-16 rounded border overflow-hidden hover:ring-2 hover:ring-blue-500"
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={url}
                                                                alt={`Avance ${i + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right column: metadata */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Contexto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <InfoRow
                                icon={<Truck className="h-4 w-4" />}
                                label="Maquinaria"
                                value={
                                    plan.maquinaria ? (
                                        <>
                                            <p className="font-medium">{plan.maquinaria.nombre || '—'}</p>
                                            {plan.maquinaria.modelo && (
                                                <p className="text-xs text-muted-foreground">
                                                    {plan.maquinaria.modelo}
                                                </p>
                                            )}
                                            {plan.maquinaria.codigo_interno && (
                                                <p className="text-xs font-mono text-muted-foreground">
                                                    {plan.maquinaria.codigo_interno}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        '—'
                                    )
                                }
                            />
                            <InfoRow
                                icon={<FileText className="h-4 w-4" />}
                                label="Plantilla"
                                value={plan.plantilla?.nombre || '—'}
                            />
                            <InfoRow
                                icon={<Calendar className="h-4 w-4" />}
                                label="Fecha límite"
                                value={formatDate(plan.fecha_limite)}
                            />
                            <InfoRow
                                icon={<Calendar className="h-4 w-4" />}
                                label="Creado"
                                value={formatDate(plan.created_at)}
                            />
                            {plan.fecha_cierre && (
                                <InfoRow
                                    icon={<Calendar className="h-4 w-4 text-green-600" />}
                                    label="Cerrado"
                                    value={formatDate(plan.fecha_cierre)}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Responsables ({responsables.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {responsables.length === 0 ? (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <User2 className="h-4 w-4" />
                                    Sin responsables asignados
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {responsables.map((r) => (
                                        <li
                                            key={r.profile_id}
                                            className="flex items-center gap-3"
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="text-xs bg-slate-200">
                                                    {profileInitials(
                                                        r.profile?.first_name,
                                                        r.profile?.last_name,
                                                        r.profile?.email,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 text-sm">
                                                <p className="font-medium truncate">
                                                    {profileLabel(
                                                        r.profile?.first_name,
                                                        r.profile?.last_name,
                                                        r.profile?.email,
                                                    )}
                                                </p>
                                                {r.profile?.email && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {r.profile.email}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div>{value}</div>
            </div>
        </div>
    )
}

export default async function PlanAccionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    return (
        <div className="h-full flex-1 flex-col p-8">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <PlanDetailContent id={id} />
            </Suspense>
        </div>
    )
}
