"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Tercero } from "@/types/terceros"

interface TercerosTableProps {
    data: Tercero[]
    customAction?: React.ReactNode
}

import { useRouter } from "next/navigation"

export function TercerosTable({ data, customAction }: TercerosTableProps) {
    const router = useRouter()
    return <DataTable
        columns={columns}
        data={data}
        searchKey="razon_social"
        customAction={customAction}
    />
}
