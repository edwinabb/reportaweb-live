'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { useRouter, useSearchParams } from 'next/navigation'
import { ViewModeToggle } from '@/components/common/view-mode-toggle'

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function FormatosTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentView = searchParams.get('view') as 'active' | 'trash' || 'active'

    return (
        <DataTable
            columns={columns}
            data={data}
            searchKey="codigo_interno" // Assuming 'codigo_interno' is the key to filter by
            newAction={() => router.push('/formatos/nuevo')}
            newActionLabel="Nueva Inspección"
            customAction={<ViewModeToggle currentView={currentView} />}
        />
    )
}
