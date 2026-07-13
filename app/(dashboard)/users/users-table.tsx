
"use client"

import { DataTable } from "@/components/ui/data-table"
import { useRouter } from "next/navigation"

export function UsersTable({ columns, data }: { columns: any, data: any }) {
    const router = useRouter()

    return (
        <DataTable
            columns={columns}
            data={data}
            searchKey="email"
            newActionLabel="+ Nuevo Usuario"
            newAction={() => router.push('/users/create')}
        />
    )
}
