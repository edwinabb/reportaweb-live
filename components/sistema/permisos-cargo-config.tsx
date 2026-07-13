'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react'
import {
    getPermisosParaCargo,
    upsertCargoPermiso,
    seedPermisosParaCargo,
    type CargoPermiso,
    type ViedCampo,
} from '@/lib/actions/permisos'
import type { JobTitle } from '@/types/job-titles'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const VIED: ViedCampo[] = ['puede_ver', 'puede_ingresar', 'puede_editar', 'puede_eliminar']
const VIED_LABELS: Record<ViedCampo, string> = {
    puede_ver:      'Ver',
    puede_ingresar: 'Ingresar',
    puede_editar:   'Editar',
    puede_eliminar: 'Eliminar',
}

function agruparPorSeccion(permisos: CargoPermiso[]): Record<string, CargoPermiso[]> {
    return permisos.reduce<Record<string, CargoPermiso[]>>((acc, p) => {
        const sec = p.sistema_recursos?.seccion ?? 'Otros'
        if (!acc[sec]) acc[sec] = []
        acc[sec].push(p)
        return acc
    }, {})
}

const ORDEN_SECCIONES = ['Negocio', 'Recursos', 'Operaciones', 'Config', 'Otros']

export function PermisosCargoConfig({
    cargos,
    initialCargoId,
    initialPermisos,
    tenantId,
}: {
    cargos: JobTitle[]
    initialCargoId: string
    initialPermisos: CargoPermiso[]
    tenantId: string
}) {
    const [selectedCargoId, setSelectedCargoId]   = useState(initialCargoId)
    const [permisos, setPermisos]                 = useState(initialPermisos)
    const [isPending, startTransition]            = useTransition()
    const [isSeedPending, startSeedTransition]    = useTransition()

    function handleCargoChange(cargoId: string) {
        setSelectedCargoId(cargoId)
        startTransition(async () => {
            let data = await getPermisosParaCargo(cargoId)
            if (data.length === 0 && tenantId) {
                await seedPermisosParaCargo(cargoId, tenantId)
                data = await getPermisosParaCargo(cargoId)
            }
            setPermisos(data)
        })
    }

    function handleToggle(recursoId: string, campo: ViedCampo, valor: boolean) {
        // Actualización optimista
        setPermisos(prev => prev.map(p =>
            p.recurso_id === recursoId ? { ...p, [campo]: valor } : p
        ))

        startTransition(async () => {
            const result = await upsertCargoPermiso(selectedCargoId, recursoId, campo, valor)
            if (!result.success) {
                // Revertir en caso de error
                setPermisos(prev => prev.map(p =>
                    p.recurso_id === recursoId ? { ...p, [campo]: !valor } : p
                ))
                toast.error(result.error ?? 'Error al guardar el permiso')
            }
        })
    }

    function handleSeed() {
        if (!tenantId) {
            toast.error('No hay tenant seleccionado')
            return
        }
        startSeedTransition(async () => {
            const result = await seedPermisosParaCargo(selectedCargoId, tenantId)
            if (result.success) {
                const data = await getPermisosParaCargo(selectedCargoId)
                setPermisos(data)
                toast.success('Permisos inicializados con acceso completo')
            } else {
                toast.error(result.error ?? 'Error al inicializar permisos')
            }
        })
    }

    const grupos = agruparPorSeccion(permisos)
    const seccionesOrdenadas = ORDEN_SECCIONES.filter(s => grupos[s])

    return (
        <div className="space-y-6">
            {/* Selector de cargo */}
            <div className="flex items-center gap-3">
                <Select value={selectedCargoId} onValueChange={handleCargoChange} disabled={isPending}>
                    <SelectTrigger className="w-72">
                        <SelectValue placeholder="Seleccionar cargo…" />
                    </SelectTrigger>
                    <SelectContent>
                        {cargos.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                <span>{c.name}</span>
                                {!c.is_active && (
                                    <Badge variant="secondary" className="ml-2 text-[10px]">inactivo</Badge>
                                )}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(isPending || isSeedPending) && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {/* Sin permisos configurados */}
            {permisos.length === 0 && !isPending && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                        <ShieldX className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Este cargo no tiene permisos configurados.<br />
                            Inicializalo con acceso completo y luego ajustá lo que necesitás.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSeed}
                            disabled={isSeedPending || !tenantId}
                        >
                            {isSeedPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                            Inicializar permisos por defecto
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Tabla VIED por sección */}
            {seccionesOrdenadas.map(seccion => (
                <Card key={seccion}>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {seccion}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 font-medium text-muted-foreground w-1/2">
                                        Módulo
                                    </th>
                                    {VIED.map(col => (
                                        <th key={col} className="text-center py-2 font-medium text-muted-foreground w-[80px]">
                                            {VIED_LABELS[col]}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {grupos[seccion]
                                    .sort((a, b) => (a.sistema_recursos?.orden ?? 0) - (b.sistema_recursos?.orden ?? 0))
                                    .map(p => {
                                        const bloqueado = !p.puede_ver
                                        return (
                                            <tr
                                                key={p.recurso_id}
                                                className={cn(
                                                    'border-b last:border-0 transition-colors',
                                                    bloqueado ? 'bg-destructive/5' : 'hover:bg-muted/30'
                                                )}
                                            >
                                                <td className="py-2 flex items-center gap-2">
                                                    {bloqueado
                                                        ? <ShieldX className="h-3.5 w-3.5 text-destructive/60 shrink-0" />
                                                        : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
                                                    }
                                                    <span className={cn(bloqueado && 'text-muted-foreground line-through')}>
                                                        {p.sistema_recursos?.nombre}
                                                    </span>
                                                </td>
                                                {VIED.map(col => (
                                                    <td key={col} className="py-2 text-center">
                                                        <Checkbox
                                                            checked={p[col]}
                                                            onCheckedChange={(checked) =>
                                                                handleToggle(p.recurso_id, col, checked as boolean)
                                                            }
                                                            disabled={isPending}
                                                            aria-label={`${VIED_LABELS[col]} ${p.sistema_recursos?.nombre}`}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
