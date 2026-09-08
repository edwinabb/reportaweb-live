import type { Metadata } from 'next'
import { getAllReportesMaquinaria } from '@/lib/actions/reportes'
import { ReportesMaquinariaSection } from '@/components/reportes/reportes-maquinaria-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Maquinaria — Reporta.la' }

const PAGE_SIZE = 50

export default async function ReportesMaquinariaPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const { page: pageParam } = await searchParams
    const page = Math.max(1, Number(pageParam) || 1)
    const { data: reportes, count } = await getAllReportesMaquinaria({ page, limit: PAGE_SIZE })
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesMaquinariaSection reportes={reportes as any} count={count} page={page} pageSize={PAGE_SIZE} />
        </div>
    )
}
