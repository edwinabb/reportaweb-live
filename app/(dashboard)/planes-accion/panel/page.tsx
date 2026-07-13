import { getPlanesStats, getPlanesAggregates } from '@/lib/actions/planes'
import { PlanesStats } from '@/components/planes/planes-stats'
import { DonutChart } from '@/components/planes/donut-chart'
import { BarList } from '@/components/planes/bar-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

const ESTADO_LABEL: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En proceso',
    REVISION: 'Revisión',
    CERRADO: 'Cerrado',
    VERIFICADO: 'Verificado',
    RECHAZADO: 'Rechazado',
    SIN_ESTADO: 'Sin estado',
}

const ESTADO_COLOR: Record<string, string> = {
    PENDIENTE: '#94a3b8',
    EN_PROCESO: '#3b82f6',
    REVISION: '#f59e0b',
    CERRADO: '#22c55e',
    VERIFICADO: '#10b981',
    RECHAZADO: '#ef4444',
    SIN_ESTADO: '#cbd5e1',
}

const PRIORIDAD_LABEL: Record<string, string> = {
    CRITICA: 'Crítica',
    ALTA: 'Alta',
    MEDIA: 'Media',
    BAJA: 'Baja',
    SIN_PRIORIDAD: 'Sin prioridad',
}

const PRIORIDAD_COLOR: Record<string, string> = {
    CRITICA: '#dc2626',
    ALTA: '#f97316',
    MEDIA: '#eab308',
    BAJA: '#3b82f6',
    SIN_PRIORIDAD: '#cbd5e1',
}

export default async function PlanesAccionPanelPage() {
    const [stats, agg] = await Promise.all([getPlanesStats(), getPlanesAggregates()])

    return (
        <div className="h-full flex-1 flex-col space-y-6 p-8 md:flex">
            <div className="space-y-8">
                <PlanesStats stats={stats} />

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Distribución por estado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DonutChart
                                segments={agg.byEstado.map((x) => ({
                                    key: x.key,
                                    label: ESTADO_LABEL[x.key] || x.key,
                                    count: x.count,
                                    color: ESTADO_COLOR[x.key] || '#94a3b8',
                                }))}
                                centerLabel="planes"
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Distribución por prioridad</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DonutChart
                                segments={agg.byPrioridad.map((x) => ({
                                    key: x.key,
                                    label: PRIORIDAD_LABEL[x.key] || x.key,
                                    count: x.count,
                                    color: PRIORIDAD_COLOR[x.key] || '#94a3b8',
                                }))}
                                centerLabel="planes"
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Top 10 maquinarias con más planes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BarList
                                items={agg.byMaquinaria.map((m) => ({
                                    label: m.nombre,
                                    value: m.count,
                                }))}
                                color="bg-orange-500"
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Preguntas más recurrentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BarList
                                items={agg.byPregunta.map((p) => ({
                                    label: p.titulo,
                                    value: p.count,
                                }))}
                                color="bg-blue-500"
                                emptyLabel="Sin preguntas vinculadas (planes legacy)"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
