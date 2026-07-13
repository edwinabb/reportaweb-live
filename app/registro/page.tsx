import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import { RegistroPageClient } from './page-client'

const montserrat = Montserrat({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-montserrat',
})

export const metadata: Metadata = {
    title: 'Empieza tu trial gratis — REPORTAR.APP',
    description: 'Prueba REPORTAR.APP 10 días gratis. Sin tarjeta de crédito.',
}

export default function RegistroPage() {
    return (
        <div className={montserrat.variable}>
            <RegistroPageClient />
        </div>
    )
}
