import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, FileCheck, DollarSign } from "lucide-react";

interface KPICardsProps {
    metrics: {
        total_informes: number;
        total_horas: number;
        total_valoraciones: number;
        total_monto: number;
    };
}

export function KPICards({ metrics }: KPICardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-sm font-medium">Total Informes</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="text-4xl font-bold">{metrics.total_informes}</div>
                    <p className="text-xs text-muted-foreground">Pendientes de Valorizar</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-sm font-medium">Horas Totales</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="text-4xl font-bold">{metrics.total_horas.toFixed(2)} hrs</div>
                    <p className="text-xs text-muted-foreground">Pendientes de Valorizar</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-sm font-medium">Total Valoraciones</CardTitle>
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="text-4xl font-bold">{metrics.total_valoraciones}</div>
                    <p className="text-xs text-muted-foreground">Pendientes de Facturar</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="text-4xl font-bold">
                        ${metrics.total_monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Pendientes de Pagar</p>
                </CardContent>
            </Card>
        </div>
    );
}
