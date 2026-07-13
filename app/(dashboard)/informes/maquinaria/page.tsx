import type { Metadata } from 'next'
import { getAllReportesMaquinaria } from '@/lib/actions/reportes'
import { ReportesMaquinariaSection } from '@/components/reportes/reportes-maquinaria-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Maquinaria — Reporta.la' }

export default async function ReportesMaquinariaPage() {
    const reportes = await getAllReportesMaquinaria()
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesMaquinariaSection reportes={reportes as any} />
        </div>
    )
}
