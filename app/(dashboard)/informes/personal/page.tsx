import type { Metadata } from 'next'
import { getAllReportesPersonal } from '@/lib/actions/reportes'
import { ReportesPersonalSection } from '@/components/reportes/reportes-personal-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Personal — Reporta.la' }

export default async function ReportesPersonalPage() {
    const reportes = await getAllReportesPersonal()
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesPersonalSection reportes={reportes as any} />
        </div>
    )
}
