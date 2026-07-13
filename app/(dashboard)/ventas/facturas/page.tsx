import { getFacturasVentaData, FacturasVentaParams } from "@/lib/actions/ventas"
import { FacturasVentaTable } from "@/components/ventas/facturas/facturas-venta-table"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Facturación Ventas | Reporta.la",
    description: "Gestión de facturas emitidas, cobros y detracciones",
}

export default async function FacturasVentaPage({
    searchParams,
}: {
    searchParams: Promise<FacturasVentaParams>
}) {
    const params = await searchParams
    const { data, total, kpis } = await getFacturasVentaData(params)

    return (
        <div className="flex flex-col gap-6 p-6">
            <FacturasVentaTable data={data} total={total} kpis={kpis} />
        </div>
    )
}
