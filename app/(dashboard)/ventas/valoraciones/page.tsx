import { Suspense } from "react";
import { getValoracionesData, ValoracionesParams } from "@/lib/actions/ventas";
import { ValoracionesTable } from "@/components/ventas/valoraciones/valoraciones-table";
import { columns } from "@/components/ventas/valoraciones/valoraciones-columns";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Valoración Ventas | Reporta.la",
    description: "Gestión detallada de valoraciones y facturación",
};

export default async function ValoracionesPage({
    searchParams,
}: {
    searchParams: Promise<ValoracionesParams>;
}) {
    const params = await searchParams;
    const data = await getValoracionesData(params);

    return (
        <div className="flex flex-col gap-6 p-6">

            <div className="w-full">
                <ValoracionesTable
                    columns={columns}
                    data={data.data}
                    pageCount={Math.ceil(data.total / (data.limit || 20))}
                />
            </div>
        </div>
    );
}
