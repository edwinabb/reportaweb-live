'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

interface CotizacionHeaderProps {
    cotizacionId?: string
    readOnly?: boolean
}

export function CotizacionHeader({ cotizacionId, readOnly }: CotizacionHeaderProps) {
    const searchParams = useSearchParams()
    const activeTab = searchParams.get('tab') || 'paso1'

    const getTabClass = (tabName: string) => {
        const isActive = activeTab === tabName
        const baseClass = "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors"

        if (isActive) {
            return `${baseClass} border-orange-500 text-orange-500 cursor-default`
        }
        return `${baseClass} border-transparent text-muted-foreground hover:text-foreground`
    }

    const disabledClass = "px-4 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground/50 whitespace-nowrap cursor-not-allowed"

    return (
        <div className="flex border-b overflow-x-auto bg-background rounded-t-lg">
            {/* Paso 1: Información General */}
            <Link
                href={cotizacionId ? `/cotizaciones/${cotizacionId}?tab=paso1` : '#'}
                className={getTabClass('paso1')}
                onClick={(e) => !cotizacionId && e.preventDefault()}
            >
                1. Información General
            </Link>

            {/* Paso 2: Matriz Responsabilidad */}
            {cotizacionId ? (
                <Link
                    href={`/cotizaciones/${cotizacionId}?tab=paso2`}
                    className={getTabClass('paso2')}
                >
                    2. Matriz Responsabilidad
                </Link>
            ) : (
                <div className={disabledClass}>
                    2. Matriz Responsabilidad
                </div>
            )}

            {/* Paso 3: Precios */}
            {cotizacionId ? (
                <Link
                    href={`/cotizaciones/${cotizacionId}?tab=paso3`}
                    className={getTabClass('paso3')}
                >
                    3. Precios
                </Link>
            ) : (
                <div className={disabledClass}>
                    3. Precios
                </div>
            )}

            {/* Paso 4: Crear PDF */}
            {cotizacionId ? (
                <Link
                    href={`/cotizaciones/${cotizacionId}?tab=paso4`}
                    className={getTabClass('paso4')}
                >
                    4. Crear PDF
                </Link>
            ) : (
                <div className={disabledClass}>
                    4. Crear PDF
                </div>
            )}

            {/* Paso 5: Enviar al Cliente */}
            {cotizacionId ? (
                <Link
                    href={`/cotizaciones/${cotizacionId}?tab=paso5`}
                    className={getTabClass('paso5')}
                >
                    5. Enviar al Cliente
                </Link>
            ) : (
                <div className={disabledClass}>
                    5. Enviar al Cliente
                </div>
            )}

            {/* Paso 6: Respuesta del Cliente */}
            {cotizacionId ? (
                <Link
                    href={`/cotizaciones/${cotizacionId}?tab=paso6`}
                    className={getTabClass('paso6')}
                >
                    6. Respuesta del Cliente
                </Link>
            ) : (
                <div className={disabledClass}>
                    6. Respuesta del Cliente
                </div>
            )}
        </div>
    )
}
