'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { PlanAccion } from '@/types/formatos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Ban, CheckCircle, Clock, Eye, TrendingUp } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { updatePlanAccion } from '@/lib/actions/planes'
import { formatDateInTZ, todayInTZ } from '@/lib/utils/tz'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AvanceDialog } from './avance-dialog'

const prioridadClass = (p: string | null) => {
    switch (p) {
        case 'CRITICA': return 'bg-red-600 text-white hover:bg-red-700'
        case 'ALTA': return 'bg-orange-500 text-white hover:bg-orange-600'
        case 'MEDIA': return 'bg-yellow-500 text-white hover:bg-yellow-600'
        case 'BAJA': return 'bg-blue-500 text-white hover:bg-blue-600'
        default: return 'bg-slate-400 text-white hover:bg-slate-500'
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

export const columns: ColumnDef<PlanAccion>[] = [
    {
        accessorKey: 'codigo',
        header: 'Código',
        cell: ({ row }) => (
            <span className="font-mono text-xs whitespace-nowrap">
                {row.original.codigo || '—'}
            </span>
        ),
    },
    {
        id: 'problema',
        header: 'Problema / Hallazgo',
        accessorFn: (row) =>
            row.titulo || row.descripcion_problema || row.pregunta_ref?.titulo || '',
        cell: ({ row }) => {
            const main =
                row.original.titulo ||
                row.original.descripcion_problema ||
                row.original.pregunta_ref?.titulo ||
                'Sin título'
            const pregunta = row.original.pregunta_ref?.titulo
            return (
                <div className="max-w-[360px]">
                    <p className="font-medium line-clamp-2">{main}</p>
                    {pregunta && pregunta !== main && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            {pregunta}
                        </p>
                    )}
                </div>
            )
        },
    },
    {
        id: 'maquinaria',
        header: 'Maquinaria',
        accessorFn: (row) => row.maquinaria?.nombre || '',
        cell: ({ row }) => {
            const m = row.original.maquinaria
            if (!m) return <span className="text-xs text-muted-foreground">—</span>
            return (
                <div className="text-sm">
                    <p className="font-medium truncate max-w-[160px]">{m.nombre || '—'}</p>
                    {m.codigo_interno && (
                        <p className="text-xs text-muted-foreground">{m.codigo_interno}</p>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: 'prioridad',
        header: 'Prioridad',
        cell: ({ row }) => {
            const p = row.original.prioridad
            return <Badge className={prioridadClass(p)}>{p || '—'}</Badge>
        },
    },
    {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => {
            const e = row.original.estado
            return (
                <Badge variant="outline" className={estadoClass(e)}>
                    {e ? e.replace('_', ' ') : '—'}
                </Badge>
            )
        },
    },
    {
        id: 'responsables',
        header: 'Responsables',
        cell: ({ row }) => {
            const resps = row.original.responsables || []
            if (resps.length === 0) {
                return <span className="text-xs text-muted-foreground">Sin asignar</span>
            }
            const visible = resps.slice(0, 3)
            const extra = resps.length - visible.length
            return (
                <TooltipProvider>
                    <div className="flex -space-x-2">
                        {visible.map((r) => {
                            const label = profileLabel(
                                r.profile?.first_name,
                                r.profile?.last_name,
                                r.profile?.email,
                            )
                            return (
                                <Tooltip key={r.profile_id}>
                                    <TooltipTrigger asChild>
                                        <Avatar className="h-7 w-7 border-2 border-white">
                                            <AvatarFallback className="text-xs bg-slate-200">
                                                {profileInitials(
                                                    r.profile?.first_name,
                                                    r.profile?.last_name,
                                                    r.profile?.email,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>{label}</TooltipContent>
                                </Tooltip>
                            )
                        })}
                        {extra > 0 && (
                            <Avatar className="h-7 w-7 border-2 border-white">
                                <AvatarFallback className="text-xs bg-slate-300">
                                    +{extra}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                </TooltipProvider>
            )
        },
    },
    {
        accessorKey: 'fecha_limite',
        header: 'Fecha Límite',
        cell: ({ row }) => {
            const raw = row.original.fecha_limite
            if (!raw || !raw.trim()) return <span className="text-xs text-muted-foreground">—</span>
            const hoyLima = todayInTZ('America/Lima')
            const vencido = raw < hoyLima && row.original.estado !== 'CERRADO'
            return (
                <span className={`text-sm ${vencido ? 'text-red-600 font-medium' : ''}`}>
                    {formatDateInTZ(raw + 'T12:00:00', 'America/Lima')}
                </span>
            )
        },
    },
    {
        id: 'acciones',
        cell: ({ row }) => <PlanRowActions plan={row.original} />,
    },
]

function PlanRowActions({ plan }: { plan: PlanAccion }) {
    const router = useRouter()
    const [avanceOpen, setAvanceOpen] = useState(false)

    const handleStatusChange = async (newStatus: string) => {
        const toastId = toast.loading('Actualizando...')
        const res = await updatePlanAccion(plan.id, {
            estado: newStatus as PlanAccion['estado'],
            fecha_cierre: newStatus === 'CERRADO' ? new Date().toISOString() : null,
        })
        toast.dismiss(toastId)
        if (res.success) {
            toast.success('Estado actualizado')
            router.refresh()
        } else {
            toast.error(res.message)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={`/planes-accion/${plan.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalle
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAvanceOpen(true)}>
                        <TrendingUp className="mr-2 h-4 w-4" /> Registrar avance
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs">Cambiar estado</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleStatusChange('EN_PROCESO')}>
                        <Clock className="mr-2 h-4 w-4" /> En proceso
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('CERRADO')}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Cerrar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleStatusChange('RECHAZADO')}
                        className="text-red-600"
                    >
                        <Ban className="mr-2 h-4 w-4" /> Descartar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <AvanceDialog plan={plan} open={avanceOpen} onOpenChange={setAvanceOpen} />
        </>
    )
}
