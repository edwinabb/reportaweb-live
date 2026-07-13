import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Clock, Activity, CalendarClock } from 'lucide-react'
import type { PlanesStats as StatsData } from '@/lib/actions/planes'

export function PlanesStats({ stats }: { stats: StatsData }) {
    return (
        <div className="grid gap-4 md:grid-cols-5">
            <StatCard
                title="Total activos"
                value={stats.total}
                description="Planes registrados"
                icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
                title="Abiertos"
                value={stats.abiertos}
                description="Pendientes de solución"
                icon={<Clock className="h-4 w-4 text-blue-500" />}
            />
            <StatCard
                title="Críticos"
                value={stats.criticos}
                description="Requieren atención"
                icon={<AlertCircle className="h-4 w-4 text-red-500" />}
                valueClassName="text-red-600"
            />
            <StatCard
                title="Vencidos"
                value={stats.vencidos}
                description="Fecha límite superada"
                icon={<CalendarClock className="h-4 w-4 text-orange-500" />}
                valueClassName="text-orange-600"
            />
            <StatCard
                title="Cerrados"
                value={stats.cerrados}
                description="Históricos resueltos"
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            />
        </div>
    )
}

interface StatCardProps {
    title: string
    value: number
    description: string
    icon: React.ReactNode
    valueClassName?: string
}

function StatCard({ title, value, description, icon, valueClassName }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}
