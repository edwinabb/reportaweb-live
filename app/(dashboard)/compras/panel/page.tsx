import { getPanelComprasData, PanelComprasParams } from "@/lib/actions/compras";
import { KPICards } from "@/components/compras/panel/kpi-cards";
import { PanelList } from "@/components/compras/panel/panel-list";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Panel Compras | Reporta.la",
    description: "Dashboard de gestión de compras y valorizaciones a proveedores",
};

export default async function PanelComprasPage({
    searchParams,
}: {
    searchParams: Promise<PanelComprasParams>;
}) {
    const params = await searchParams;
    const data = await getPanelComprasData(params);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="w-full">
                <KPICards metrics={data.kpis} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                <PanelList
                    title="Pendientes de Valorizar Compras"
                    type="VALUATION"
                    data={data.valuationList.data}
                    page={data.valuationList.page}
                    total={data.valuationList.total}
                    limit={data.valuationList.limit}
                />

                <PanelList
                    title="Pendientes de Facturar Compras"
                    type="INVOICING"
                    data={data.invoicingList.data}
                    page={data.invoicingList.page}
                    total={data.invoicingList.total}
                    limit={data.invoicingList.limit}
                />
            </div>
        </div>
    );
}
