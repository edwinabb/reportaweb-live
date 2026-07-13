'use client'

import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export type StepDef = {
    number: number
    name: string
    required: boolean
    done: boolean
}

type WizardShellProps = {
    tenantId: string
    tenantName: string
    currentStep: number
    steps: StepDef[]
    children: React.ReactNode
}

export function WizardShell({ tenantId, tenantName, currentStep, steps, children }: WizardShellProps) {
    const totalSteps = steps.length
    const prevStep = currentStep > 1 ? currentStep - 1 : null
    const nextStep = currentStep < totalSteps ? currentStep + 1 : null
    const currentStepDef = steps.find(s => s.number === currentStep)

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">{tenantName}</p>
                </div>
                <Badge variant="outline" className="text-sm">
                    Paso {currentStep} de {totalSteps}
                </Badge>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Stepper — horizontal on mobile, vertical on desktop */}
                <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:w-56 shrink-0">
                    {steps.map(step => {
                        const isActive = step.number === currentStep
                        const isDone = step.done
                        return (
                            <Link
                                key={step.number}
                                href={`/sistema/onboarding/${tenantId}?step=${step.number}`}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                            >
                                <span className={cn(
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                                    isActive
                                        ? 'border-primary-foreground text-primary-foreground'
                                        : isDone
                                            ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-950'
                                            : 'border-border'
                                )}>
                                    {isDone ? <Check className="h-3 w-3" /> : step.number}
                                </span>
                                <span className="truncate">{step.name}</span>
                                {!step.required && !isActive && (
                                    <span className="ml-auto text-xs text-muted-foreground hidden lg:block">Opc.</span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                    <div className="rounded-lg border bg-card p-6">
                        {children}
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between mt-4">
                        <div>
                            {prevStep && (
                                <Link href={`/sistema/onboarding/${tenantId}?step=${prevStep}`}>
                                    <Button variant="outline" size="sm">← Anterior</Button>
                                </Link>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {currentStepDef && !currentStepDef.required && nextStep && (
                                <Link href={`/sistema/onboarding/${tenantId}?step=${nextStep}`}>
                                    <Button variant="ghost" size="sm">Omitir</Button>
                                </Link>
                            )}
                            {!nextStep && (
                                <Link href="/sistema">
                                    <Button variant="outline" size="sm">Finalizar</Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
