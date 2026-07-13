import { getPanelVentasData, PanelVentasParams } from "@/lib/actions/ventas";
import { KPICards } from "@/components/ventas/panel/kpi-cards";
import { PanelList } from "@/components/ventas/panel/panel-list";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Panel Ventas | Reporta.la",
    description: "Dashboard de gestión de ventas y valorizaciones",
};

export default async function PanelVentasPage({
    searchParams,
}: {
    searchParams: Promise<PanelVentasParams>;
}) {
    const params = await searchParams;
    const data = await getPanelVentasData(params);

    return (
        <div className="flex flex-col gap-6 p-6">

            <div className="w-full">
                <KPICards metrics={data.kpis} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {/* Left Panel: Pendientes de Valorizar */}
                <PanelList
                    title="Pendientes de Valorizar Ventas"
                    type="VALUATION"
                    data={data.valuationList.data}
                    page={data.valuationList.page}
                    total={data.valuationList.total}
                    limit={data.valuationList.limit}
                />

                {/* Right Panel: Pendientes de Facturar */}
                <PanelList
                    title="Pendientes de Facturar Ventas"
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
