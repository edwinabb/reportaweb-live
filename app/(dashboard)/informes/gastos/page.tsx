import type { Metadata } from 'next'
import { getAllReportesGastos } from '@/lib/actions/reportes'
import { ReportesGastosSection } from '@/components/reportes/reportes-gastos-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Gastos — Reporta.la' }

export default async function ReportesGastosPage() {
    const reportes = await getAllReportesGastos()
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesGastosSection reportes={reportes as any} />
        </div>
    )
}
