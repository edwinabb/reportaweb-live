import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, HardHat, Plus, TrendingDown, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getDashboardEppMetrics } from '@/lib/actions/epp'

const NIVEL_LABEL: Record<string, { label: string; color: string }> = {
    VENCIDO: { label: 'Vencido', color: 'bg-red-100 text-red-800 border-red-200' },
    D15: { label: 'Vence en ≤15d', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    D30: { label: 'Vence en ≤30d', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
}

export default async function EppDashboardPage() {
    const m = await getDashboardEppMetrics()

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">EPP · Dashboard SST</h2>
                    <p className="text-muted-foreground">
                        Gestión de equipos de protección personal — entregas, stock y alertas de vencimiento.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/epp/entrega/nueva">
                        <Plus className="h-4 w-4 mr-2" /> Registrar entrega
                    </Link>
                </Button>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Colaboradores activos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{m.colaboradores_activos}</div>
                        <p className="text-xs text-muted-foreground">Con EPP vigente o próximo a vencer</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Próximos a vencer</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{m.epp_proximos}</div>
                        <p className="text-xs text-muted-foreground">En los próximos 30 días</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vencidos sin reemplazar</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{m.epp_vencidos}</div>
                        <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Alertas recientes</CardTitle>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/epp/alertas">Ver todas</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {m.alertas_recientes.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">Sin alertas pendientes.</p>
                        ) : (
                            <ul className="space-y-2">
                                {m.alertas_recientes.map((a: any) => {
                                    const colabFull = (a.item?.entrega?.colaborador?.first_name || '') + ' ' + (a.item?.entrega?.colaborador?.last_name || '')
                                    const meta = NIVEL_LABEL[a.nivel] ?? { label: a.nivel, color: 'bg-gray-100' }
                                    return (
                                        <li key={a.id} className="flex items-center justify-between text-sm border-b last:border-b-0 py-1.5">
                                            <div className="flex-1">
                                                <div className="font-medium">{colabFull.trim() || 'Colaborador'}</div>
                                                <div className="text-xs text-muted-foreground">{a.item?.catalogo?.epp_nombre}</div>
                                            </div>
                                            <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Últimas entregas</CardTitle>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/epp/entrega/nueva"><Plus className="h-3 w-3 mr-1" /> Nueva</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {m.ultimas_entregas.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-6 text-center flex flex-col items-center gap-3">
                                <HardHat className="h-10 w-10 text-muted-foreground/40" />
                                Sin entregas registradas.
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {m.ultimas_entregas.map((e: any) => {
                                    const conf = e.estado_confirmacion as string | null
                                    const confMeta =
                                        conf === 'PARCIAL'
                                            ? { label: '⚠ Parcial', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                                            : conf === 'COMPLETO'
                                            ? { label: '✓ Completo', cls: 'bg-green-50 text-green-700 border-green-200' }
                                            : conf === 'PENDIENTE'
                                            ? { label: '⏳ Pendiente', cls: 'bg-gray-50 text-gray-500 border-gray-200' }
                                            : null
                                    return (
                                        <li key={e.id} className={`flex items-center justify-between text-sm border-b last:border-b-0 py-1.5 ${conf === 'PARCIAL' ? 'bg-amber-50/60 rounded px-1' : ''}`}>
                                            <div className="flex-1">
                                                <div className="font-medium">{e.colaborador?.first_name} {e.colaborador?.last_name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {(e.items || []).length} items · {format(new Date(e.fecha_entrega), "dd 'de' MMM yyyy", { locale: es })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {confMeta && (
                                                    <Badge variant="outline" className={`text-[10px] ${confMeta.cls}`}>{confMeta.label}</Badge>
                                                )}
                                                {e.pdf_url ? (
                                                    <Button asChild size="sm" variant="ghost" className="h-7">
                                                        <a href={e.pdf_url} target="_blank" rel="noopener">PDF</a>
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
