import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { getSupabaseContext } from '@/lib/action-context'

async function getReportes() {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []
    const { data, error } = await adminClient
        .from('sst_epp_reporte')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('fecha_fin', { ascending: false })
        .limit(50)
    if (error) {
        console.error('[reportes] error:', error)
        return []
    }
    return data || []
}

export default async function ReportesPage() {
    const reportes = await getReportes()

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">EPP · Reportes semanales</h2>
                <p className="text-muted-foreground">
                    Reporte automático con entregas, vencidos y próximos a vencer del período. Generados por el scheduler.
                </p>
            </div>

            <Separator />

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Período</TableHead>
                                <TableHead>Generado</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        Aún no se ha generado ningún reporte semanal. El scheduler corre los lunes a las 8:00.
                                    </TableCell>
                                </TableRow>
                            ) : reportes.map((r: any) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">
                                        {format(new Date(r.fecha_inicio), 'dd MMM', { locale: es })} — {format(new Date(r.fecha_fin), 'dd MMM yyyy', { locale: es })}
                                    </TableCell>
                                    <TableCell>{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy HH:mm', { locale: es }) : '—'}</TableCell>
                                    <TableCell>
                                        <span className={r.enviado ? 'text-green-600 text-sm' : 'text-orange-600 text-sm'}>
                                            {r.enviado ? 'Enviado' : 'Pendiente envío'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {r.pdf_url ? (
                                            <Button asChild size="sm" variant="ghost">
                                                <a href={r.pdf_url} target="_blank" rel="noopener">
                                                    <Download className="h-3.5 w-3.5 mr-1" /> PDF
                                                </a>
                                            </Button>
                                        ) : <span className="text-xs text-muted-foreground">Sin PDF</span>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
