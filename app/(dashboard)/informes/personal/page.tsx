import type { Metadata } from 'next'
import { getAllReportesPersonal } from '@/lib/actions/reportes'
import { ReportesPersonalSection } from '@/components/reportes/reportes-personal-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Personal — Reporta.la' }

const PAGE_SIZE = 50

export default async function ReportesPersonalPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const { page: pageParam } = await searchParams
    const page = Math.max(1, Number(pageParam) || 1)
    const { data: reportes, count } = await getAllReportesPersonal({ page, limit: PAGE_SIZE })
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesPersonalSection reportes={reportes as any} count={count} page={page} pageSize={PAGE_SIZE} />
        </div>
    )
}
