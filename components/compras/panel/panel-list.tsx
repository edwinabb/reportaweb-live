'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ProveedorGroupMetric } from "@/lib/actions/compras";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PanelListProps {
    title: string;
    data: ProveedorGroupMetric[];
    page: number;
    total: number;
    limit: number;
    type: 'VALUATION' | 'INVOICING';
}

export function PanelList({ title, data, page, total, limit, type }: PanelListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const isValuation = type === 'VALUATION';
    const pageKey = isValuation ? 'valuationPage' : 'invoicingPage';
    const sortKey = isValuation ? 'valuationSort' : 'invoicingSort';
    const currentSort = searchParams.get(sortKey) || 'value_desc';

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const toggleSort = (field: 'qty' | 'value' | 'oldest') => {
        const newSort = currentSort === `${field}_desc` ? `${field}_asc` : `${field}_desc`;
        updateParam(sortKey, newSort);
    };

    const handleRowClick = (proveedorId: string) => {
        const estado = isValuation ? 'PENDIENTE' : 'VALORADO';
        router.push(`/compras/valoraciones?proveedor_id=${proveedorId}&estado=${estado}`);
    };

    const totalPages = Math.ceil(total / limit);
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    const qtyLabel = isValuation ? 'Informes' : 'Valoraciones';
    const dateLabel = isValuation ? 'Informe Más Antiguo' : 'Valoración Más Antigua';
    const valueLabel = isValuation ? 'Horas Pendiente' : 'Monto Pendiente';

    return (
        <div className="rounded-md border bg-white shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-orange-600">{title}</h3>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px] text-center">No.</TableHead>
                        <TableHead>Proveedor</TableHead>

                        <TableHead className="whitespace-nowrap text-center">
                            <Button variant="ghost" size="sm" onClick={() => toggleSort('qty')}>
                                {qtyLabel}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>

                        <TableHead className="whitespace-nowrap">
                            <Button variant="ghost" size="sm" onClick={() => toggleSort('oldest')} className="w-full justify-start pl-0">
                                {dateLabel}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>

                        <TableHead className="text-right whitespace-nowrap">
                            <Button variant="ghost" size="sm" onClick={() => toggleSort('value')} className="w-full justify-end pr-0">
                                {valueLabel}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[50px] pr-5"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Sin resultados pendientes.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item, index) => (
                            <TableRow
                                key={item.proveedor_id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleRowClick(item.proveedor_id)}
                            >
                                <TableCell className="text-center">{startItem + index}</TableCell>
                                <TableCell className="font-medium max-w-[200px] truncate" title={item.proveedor_nombre}>
                                    {item.proveedor_nombre}
                                </TableCell>
                                <TableCell className="text-center">{item.cantidad}</TableCell>
                                <TableCell className="whitespace-nowrap pl-10">
                                    {item.oldest_date && format(new Date(item.oldest_date), "MMM d, yyyy", { locale: es })}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-700 whitespace-nowrap pr-10">
                                    {isValuation
                                        ? `${item.total_value.toFixed(2)} hrs`
                                        : `$${item.total_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                    }
                                </TableCell>
                                <TableCell className="pr-5">
                                    <ArrowRight className="h-4 w-4 text-orange-500" />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <div className="flex items-center justify-between py-4 px-4 border-t">
                <span className="text-sm text-muted-foreground">
                    Mostrando {total > 0 ? `${startItem}-${endItem}` : '0'} de {total}
                </span>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateParam(pageKey, String(page - 1))}
                        disabled={page <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </Button>
                    <div className="text-sm font-medium">
                        Página {page} de {totalPages || 1}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateParam(pageKey, String(page + 1))}
                        disabled={page >= totalPages}
                    >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
