'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setSentryRouteContext } from '@/lib/sentry'

/**
 * Componente sin render que actualiza los tags de Sentry (section + page)
 * cada vez que el usuario navega a una nueva ruta.
 * Incluirlo una sola vez en el layout del dashboard.
 */
export function SentryRouteContext() {
    const pathname = usePathname()

    useEffect(() => {
        setSentryRouteContext(pathname)
    }, [pathname])

    return null
}
