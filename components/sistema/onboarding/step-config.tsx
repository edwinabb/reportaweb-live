'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { setupTenantConfig } from '@/lib/actions/onboarding'

type Props = {
    tenantId: string
}

export function StepConfig({ tenantId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [done, setDone] = useState(false)

    // Config display fields (read-only defaults — these are the seeded values)
    const configDefaults = [
        { label: 'Código formato personal', value: 'INF-P' },
        { label: 'Código formato maquinaria', value: 'INF-M' },
        { label: 'Código valorización compra', value: 'VAL-C' },
        { label: 'Código valorización venta', value: 'VAL-V' },
        { label: 'Formato de fecha', value: 'dd/MM/yyyy' },
        { label: 'Versión formato', value: 'v2' },
    ]

    function handleSetup() {
        startTransition(async () => {
            const res = await setupTenantConfig(tenantId)
            if (!res.success) {
                toast.error(res.message || 'Error al configurar el tenant')
                return
            }
            toast.success('Configuración inicial aplicada correctamente')
            setDone(true)
        })
    }

    function handleFinalize() {
        router.push('/sistema')
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold mb-1">Configuración inicial</h2>
                <p className="text-sm text-muted-foreground">
                    Aplica la configuración por defecto de informes, checklists y valorizaciones para este tenant.
                    Podrá ajustarse después desde Configuración.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {configDefaults.map(cfg => (
                    <div key={cfg.label} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{cfg.label}</Label>
                        <Input value={cfg.value} readOnly className="bg-muted/40 text-sm" />
                    </div>
                ))}
            </div>

            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Incluye por defecto:</p>
                <ul className="list-disc list-inside space-y-0.5">
                    <li>Checklist: cliente, empresa, tarea y observaciones</li>
                    <li>Informe personal: horas extras, horas dominicales, firma trabajador</li>
                    <li>Informe maquinaria: 1 rigger, 1 turno</li>
                    <li>Detracción 0% en valorizaciones</li>
                </ul>
            </div>

            {!done ? (
                <Button onClick={handleSetup} disabled={isPending}>
                    {isPending ? 'Aplicando configuración...' : 'Aplicar configuración por defecto'}
                </Button>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <CheckCircle2 className="h-5 w-5" />
                        Configuración aplicada correctamente
                    </div>
                    <Button onClick={handleFinalize}>
                        Finalizar onboarding → Ir a Sistema
                    </Button>
                </div>
            )}
        </div>
    )
}
