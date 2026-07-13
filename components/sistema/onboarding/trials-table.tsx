'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { extendTrial, convertTrial } from '@/lib/actions/trial'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface TrialRow {
    id: string
    name: string
    fleet_type: string | null
    fleet_size: number | null
    trial_status: string
    trial_start_at: string | null
    trial_expires_at: string | null
    adminEmail: string | null
    adminName: string | null
}

function getDaysRemaining(expiresAt: string | null): number {
    if (!expiresAt) return 0
    const now = Date.now()
    const expiry = new Date(expiresAt).getTime()
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
}

function StatusBadge({ trial }: { trial: TrialRow }) {
    if (trial.trial_status === 'converted') {
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Convertido</Badge>
    }
    if (trial.trial_status === 'expired') {
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Expirado</Badge>
    }
    const days = getDaysRemaining(trial.trial_expires_at)
    if (days <= 0) {
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Expirado</Badge>
    }
    return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">{days} días restantes</Badge>
}

function TrialRowActions({ trial }: { trial: TrialRow }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    function handleExtend() {
        startTransition(async () => {
            await extendTrial(trial.id, 7)
            router.refresh()
        })
    }

    function handleConvert() {
        startTransition(async () => {
            await convertTrial(trial.id)
            router.refresh()
        })
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                size="sm"
                variant="outline"
                onClick={handleExtend}
                disabled={isPending}
            >
                +7 días
            </Button>
            <Button
                size="sm"
                variant="ghost"
                onClick={handleConvert}
                disabled={isPending}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
                Convertir
            </Button>
        </div>
    )
}

interface TrialsTableProps {
    trials: TrialRow[]
}

export function TrialsTable({ trials }: TrialsTableProps) {
    if (trials.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-6 text-center">
                No hay trials registrados.
            </p>
        )
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo flota</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Registrado</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {trials.map(trial => (
                        <tr key={trial.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{trial.name}</td>
                            <td className="px-4 py-3">
                                <div className="flex flex-col">
                                    {trial.adminName && (
                                        <span>{trial.adminName}</span>
                                    )}
                                    {trial.adminEmail && (
                                        <span className="text-xs text-muted-foreground">{trial.adminEmail}</span>
                                    )}
                                    {!trial.adminName && !trial.adminEmail && (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {trial.fleet_type ? (
                                    <span className="capitalize">{trial.fleet_type}{trial.fleet_size ? ` (${trial.fleet_size})` : ''}</span>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                                {trial.trial_start_at
                                    ? new Date(trial.trial_start_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'}
                            </td>
                            <td className="px-4 py-3">
                                <StatusBadge trial={trial} />
                            </td>
                            <td className="px-4 py-3">
                                <TrialRowActions trial={trial} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
