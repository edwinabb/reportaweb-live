import type { Metadata } from 'next'
import { getAllReportesGastos } from '@/lib/actions/reportes'
import { ReportesGastosSection } from '@/components/reportes/reportes-gastos-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Gastos — Reporta.la' }

export default async function ReportesGastosPage() {
    const { data } = await getAllReportesGastos({ page: 1, limit: 500 })
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesGastosSection reportes={data as any} />
        </div>
    )
}
