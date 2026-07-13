'use client'

import Link from 'next/link'
import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { marcarAlertaGestionada, runEppAlertsScanner, sendEppAlertasEmails } from '@/lib/actions/epp'

type Alerta = {
    id: string
    nivel: 'VENCIDO' | 'D15' | 'D30' | string
    fecha_generacion: string
    item: {
        id: string
        fecha_vencimiento: string
        cantidad: number
        catalogo: { epp_nombre: string | null; tipo: string | null } | null
        entrega: {
            colaborador_id: string
            colaborador: { id: string; first_name: string | null; last_name: string | null } | null
        } | null
    } | null
}

const NIVEL_META: Record<string, { label: string; cls: string; priority: number }> = {
    VENCIDO: { label: 'Vencido', cls: 'bg-red-100 text-red-800 border-red-200', priority: 0 },
    D15: { label: 'Vence en ≤15d', cls: 'bg-orange-100 text-orange-800 border-orange-200', priority: 1 },
    D30: { label: 'Vence en ≤30d', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', priority: 2 },
}

export function AlertasClient({ alertas }: { alertas: Alerta[] }) {
    const router = useRouter()
    const [filter, setFilter] = useState<string>('all')
    const [scanning, setScanning] = useState(false)
    const [sending, setSending] = useState(false)
    const [, startTransition] = useTransition()

    const handleSendEmails = async () => {
        if (alertas.length === 0) {
            toast.info('No hay alertas pendientes para enviar')
            return
        }
        setSending(true)
        const res = await sendEppAlertasEmails()
        setSending(false)
        if (res.success) {
            const total = res.resultados.reduce((sum, r) => sum + r.enviados, 0)
            toast.success(total > 0 ? `${total} emails enviados` : 'Sin destinatarios con email configurado')
        } else {
            toast.error(res.message ?? 'Error enviando emails')
        }
    }

    const handleScan = async () => {
        setScanning(true)
        const res = await runEppAlertsScanner()
        setScanning(false)
        if (res.success) {
            toast.success(res.message)
            startTransition(() => router.refresh())
        } else {
            toast.error(res.message)
        }
    }

    const filtered = useMemo(() => {
        const src = filter === 'all' ? alertas : alertas.filter((a) => a.nivel === filter)
        return [...src].sort((a, b) => (NIVEL_META[a.nivel]?.priority ?? 9) - (NIVEL_META[b.nivel]?.priority ?? 9))
    }, [alertas, filter])

    const counts = useMemo(() => {
        const c = { VENCIDO: 0, D15: 0, D30: 0 }
        alertas.forEach((a) => { if (a.nivel in c) (c as any)[a.nivel]++ })
        return c
    }, [alertas])

    const handleMarcar = async (id: string) => {
        const res = await marcarAlertaGestionada(id)
        if (res.success) {
            toast.success(res.message)
            startTransition(() => router.refresh())
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Vencidos</div><div className="text-2xl font-bold text-red-600">{counts.VENCIDO}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">≤15 días</div><div className="text-2xl font-bold text-orange-600">{counts.D15}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">≤30 días</div><div className="text-2xl font-bold text-yellow-600">{counts.D30}</div></CardContent></Card>
            </div>

            <div className="flex items-center justify-between">
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los niveles</SelectItem>
                        <SelectItem value="VENCIDO">Vencidos</SelectItem>
                        <SelectItem value="D15">Próximos a vencer (≤15d)</SelectItem>
                        <SelectItem value="D30">Próximos a vencer (≤30d)</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-2 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? 'Escaneando…' : 'Regenerar alertas'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSendEmails} disabled={sending || alertas.length === 0}>
                    <Mail className={`h-3.5 w-3.5 mr-2 ${sending ? 'animate-pulse' : ''}`} />
                    {sending ? 'Enviando…' : 'Enviar por email'}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>EPP</TableHead>
                            <TableHead>Vence</TableHead>
                            <TableHead>Nivel</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    {alertas.length === 0
                                        ? 'Sin alertas pendientes. El motor diario las genera automáticamente.'
                                        : 'Sin alertas en este filtro.'}
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((a) => {
                            const meta = NIVEL_META[a.nivel] ?? { label: a.nivel, cls: 'bg-gray-100' }
                            const colab = a.item?.entrega?.colaborador
                            const colabId = a.item?.entrega?.colaborador_id
                            const colabName = [colab?.first_name, colab?.last_name].filter(Boolean).join(' ') || 'Colaborador'
                            return (
                                <TableRow key={a.id}>
                                    <TableCell className="font-medium">
                                        {colabId ? (
                                            <Link href={`/epp/colaborador/${colabId}`} className="hover:underline text-orange-600">
                                                {colabName}
                                            </Link>
                                        ) : colabName}
                                    </TableCell>
                                    <TableCell>{a.item?.catalogo?.epp_nombre || '—'}</TableCell>
                                    <TableCell>{a.item?.fecha_vencimiento ? format(new Date(a.item.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : '—'}</TableCell>
                                    <TableCell><Badge variant="outline" className={meta.cls}>{meta.label}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="ghost" onClick={() => handleMarcar(a.id)}>Marcar gestionada</Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
