"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CotizacionesBarChart = dynamic(() => import("./cotizaciones-bar-chart"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-md bg-muted/40" />,
})

const MESES_LARGO = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface CotizacionRow {
    id: string
    numero: string
    cliente: string
    fecha_solicitud: string | null
}

interface DashboardStats {
    year: number
    selectedMonth: number
    monthly: { mes: string; enviadas: number; rechazadas: number; aprobadas: number }[]
    daily: { dia: number; enviadas: number; rechazadas: number; aprobadas: number }[]
    pendientesPorEnviar: CotizacionRow[]
    enviadas: CotizacionRow[]
}

export function CotizacionesPanel({ stats }: { stats: DashboardStats }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleMonthChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('mes', value)
        router.push(`/cotizaciones/panel?${params.toString()}`)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cotizaciones por mes — {stats.year}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px]" data-testid="panel-chart-mensual">
                        <CotizacionesBarChart data={stats.monthly} xKey="mes" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>Cotizaciones por día</CardTitle>
                    <Select value={String(stats.selectedMonth)} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-[160px]" data-testid="panel-mes-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MESES_LARGO.map((mes, idx) => (
                                <SelectItem key={mes} value={String(idx + 1)}>{mes}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px]" data-testid="panel-chart-diario">
                        <CotizacionesBarChart data={stats.daily} xKey="dia" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Pendientes por enviar ({stats.pendientesPorEnviar.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ListaCotizaciones
                            rows={stats.pendientesPorEnviar}
                            testId="panel-lista-pendientes"
                            emptyText="No hay cotizaciones pendientes de enviar."
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Enviadas ({stats.enviadas.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ListaCotizaciones
                            rows={stats.enviadas}
                            testId="panel-lista-enviadas"
                            emptyText="No hay cotizaciones enviadas."
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ListaCotizaciones({
    rows, testId, emptyText,
}: { rows: CotizacionRow[]; testId: string; emptyText: string }) {
    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground" data-testid={`${testId}-empty`}>
                {emptyText}
            </p>
        )
    }
    return (
        <ul className="space-y-1 max-h-[300px] overflow-y-auto" data-testid={testId}>
            {rows.map((c) => (
                <li key={c.id}>
                    <Link
                        href={`/cotizaciones/${c.id}`}
                        className="flex items-center justify-between text-sm hover:underline py-1 border-b last:border-0"
                    >
                        <span className="font-medium">{c.numero}</span>
                        <span className="text-muted-foreground">{c.cliente}</span>
                        <span className="text-xs text-muted-foreground">{c.fecha_solicitud ?? '-'}</span>
                    </Link>
                </li>
            ))}
        </ul>
    )
}
