import { getValoracionesComprasData, ValoracionesComprasParams } from "@/lib/actions/compras";
import { ValoracionesComprasTable } from "@/components/compras/valoraciones/valoraciones-table";
import { columns } from "@/components/compras/valoraciones/valoraciones-columns";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Valoración Compras | Reporta.la",
    description: "Gestión detallada de valoraciones de compras y facturación",
};

export default async function ValoracionesComprasPage({
    searchParams,
}: {
    searchParams: Promise<ValoracionesComprasParams>;
}) {
    const params = await searchParams;
    const data = await getValoracionesComprasData(params);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="w-full">
                <ValoracionesComprasTable
                    columns={columns}
                    data={data.data}
                    pageCount={Math.ceil(data.total / (data.limit || 20))}
                />
            </div>
        </div>
    );
}
