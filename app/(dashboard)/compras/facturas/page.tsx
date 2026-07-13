import { getFacturasComprasData, FacturasComprasParams } from "@/lib/actions/compras";
import { FacturasCompraTable } from "@/components/compras/facturas/facturas-compra-table";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Facturación Compras | Reporta.la",
    description: "Facturas recibidas de proveedores, pagos y detracción retenida",
};

export default async function FacturasComprasPage({
    searchParams,
}: {
    searchParams: Promise<FacturasComprasParams>;
}) {
    const params = await searchParams;
    const data = await getFacturasComprasData(params);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="w-full">
                <FacturasCompraTable data={data.data} total={data.total} kpis={data.kpis} />
            </div>
        </div>
    );
}
