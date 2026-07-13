'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, MessageSquarePlus, Loader2, FileDown, RotateCcw } from 'lucide-react'

import type { InformeCompleto } from '@/lib/actions/formatos-informes'
import {
    aprobarInforme,
    rechazarInforme,
    agregarComentarioInforme,
    getComentariosInforme,
    reabrirInforme,
} from '@/lib/actions/formatos-informes'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

type Comentario = {
    id: string
    autor_tipo: string
    texto: string
    created_at: string
    autor: { first_name: string | null; last_name: string | null } | null
}

type Props = {
    informe: InformeCompleto
}

export function InformeReadView({ informe }: Props) {
    const router = useRouter()
    const [rechazoDialog, setRechazoDialog] = React.useState(false)
    const [razonRechazo, setRazonRechazo] = React.useState('')
    const [busy, setBusy] = React.useState(false)
    const [comentarios, setComentarios] = React.useState<Comentario[]>([])
    const [nuevoComentario, setNuevoComentario] = React.useState('')
    const [loadingComentarios, setLoadingComentarios] = React.useState(true)

    React.useEffect(() => {
        ;(async () => {
            setLoadingComentarios(true)
            const data = await getComentariosInforme(informe.id)
            setComentarios(data as unknown as Comentario[])
            setLoadingComentarios(false)
        })()
    }, [informe.id])

    const handleAprobar = async () => {
        setBusy(true)
        const res = await aprobarInforme(informe.id)
        setBusy(false)
        if (res.success) {
            toast.success('Informe aprobado')
            router.refresh()
        } else toast.error(res.error)
    }

    const handleRechazar = async () => {
        if (!razonRechazo.trim()) {
            toast.error('Indicá la razón del rechazo')
            return
        }
        setBusy(true)
        const res = await rechazarInforme(informe.id, razonRechazo)
        setBusy(false)
        setRechazoDialog(false)
        if (res.success) {
            toast.success('Informe rechazado')
            router.refresh()
        } else toast.error(res.error)
    }

    const handleComentar = async () => {
        if (!nuevoComentario.trim()) return
        setBusy(true)
        const res = await agregarComentarioInforme(informe.id, nuevoComentario, 'INTERNO')
        setBusy(false)
        if (res.success) {
            toast.success('Comentario agregado')
            setNuevoComentario('')
            const data = await getComentariosInforme(informe.id)
            setComentarios(data as unknown as Comentario[])
            router.refresh()
        } else toast.error(res.error)
    }

    const canAprobar = informe.estado === 'ENVIADO' || informe.estado === 'CON_COMENTARIOS' || informe.estado === 'RECHAZADO'
    const canRechazar = informe.estado === 'ENVIADO' || informe.estado === 'CON_COMENTARIOS' || informe.estado === 'APROBADO'
    const canReabrir = informe.estado === 'RECHAZADO'

    const handleReabrir = async () => {
        setBusy(true)
        const res = await reabrirInforme(informe.id)
        setBusy(false)
        if (res.success) {
            toast.success('Informe reabierto — ahora podés editarlo')
            router.refresh()
        } else toast.error(res.error)
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground font-mono">
                            {informe.codigo_informe ?? `${informe.formato.codigo} (sin correlativo)`}
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">{informe.formato.nombre}</h1>
                        <div className="mt-2 flex items-center gap-2">
                            <EstadoBadge estado={informe.estado} />
                            {informe.enviado_at && (
                                <span className="text-xs text-muted-foreground">
                                    Enviado: {new Date(informe.enviado_at).toLocaleString('es-PE')}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <Button asChild variant="outline">
                            <a href={`/api/informes/${informe.id}/pdf`} target="_blank" rel="noopener noreferrer">
                                <FileDown className="mr-2 h-4 w-4" /> PDF
                            </a>
                        </Button>
                        {canReabrir && (
                            <Button
                                variant="outline"
                                onClick={handleReabrir}
                                disabled={busy}
                                title="Reabrir como borrador para editar y reenviar"
                            >
                                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                                Reabrir
                            </Button>
                        )}
                        {canAprobar && (
                            <Button
                                onClick={handleAprobar}
                                disabled={busy}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Aprobar
                            </Button>
                        )}
                        {canRechazar && (
                            <Button
                                variant="outline"
                                onClick={() => setRechazoDialog(true)}
                                disabled={busy}
                                className="text-destructive hover:text-destructive"
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Rechazar
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Cliente" value={informe.cliente?.razon_social} />
                <Field label="RUC" value={informe.cliente?.ruc} mono />
                <Field
                    label="Cotización"
                    value={
                        informe.cotizacion?.numero && informe.cotizacion?.anio
                            ? `${informe.cotizacion.numero}/${informe.cotizacion.anio}`
                            : null
                    }
                    mono
                />
                <Field label="Tarea" value={informe.tarea_codigo_override ?? informe.tarea?.codigo} mono />
                <Field label="Descripción" value={informe.tarea_descripcion_override ?? informe.tarea?.descripcion} />
                <Field label="Sitio" value={informe.sitio_descripcion_override ?? informe.sitio?.nombre} />
            </Card>

            {/* Respuestas agrupadas */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Respuestas</h2>
                <div className="space-y-6">
                    {agruparPorSeccion(informe.version.preguntas).map(([seccion, preguntas]) => (
                        <div key={seccion || 'default'}>
                            {seccion && <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase">{seccion}</h3>}
                            <div className="space-y-2">
                                {preguntas.map(q => {
                                    const r = informe.respuestas.find(x => x.pregunta_id === q.id)
                                    return <RespuestaRow key={q.id} pregunta={q} respuesta={r} />
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Observaciones */}
            {informe.observaciones && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-2">Observaciones</h2>
                    <p className="text-sm whitespace-pre-wrap">{informe.observaciones}</p>
                </Card>
            )}

            {/* Firma */}
            {informe.firma_url && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-2">Firma</h2>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={informe.firma_url} alt="Firma" className="max-h-40 border rounded-md bg-white" />
                    {informe.enviado_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Firmado el {new Date(informe.enviado_at).toLocaleString('es-PE')}
                        </p>
                    )}
                </Card>
            )}

            {/* Comentarios */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Comentarios</h2>
                {loadingComentarios ? (
                    <div className="text-sm text-muted-foreground">Cargando…</div>
                ) : comentarios.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No hay comentarios.</div>
                ) : (
                    <div className="space-y-3 mb-4">
                        {comentarios.map(c => (
                            <div key={c.id} className="border-l-2 border-muted pl-3 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">
                                        {c.autor ? `${c.autor.first_name ?? ''} ${c.autor.last_name ?? ''}`.trim() : 'Anónimo'}
                                    </span>
                                    <Badge variant="outline" className="text-xs">{c.autor_tipo}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(c.created_at).toLocaleString('es-PE')}
                                    </span>
                                </div>
                                <p className="whitespace-pre-wrap">{c.texto}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="space-y-2">
                    <Textarea
                        value={nuevoComentario}
                        onChange={e => setNuevoComentario(e.target.value)}
                        placeholder="Escribir comentario…"
                        rows={2}
                    />
                    <Button size="sm" onClick={handleComentar} disabled={busy || !nuevoComentario.trim()}>
                        <MessageSquarePlus className="mr-2 h-4 w-4" /> Agregar comentario
                    </Button>
                </div>
            </Card>

            {informe.razon_rechazo && (
                <Card className="p-6 border-destructive/50">
                    <h2 className="text-lg font-semibold text-destructive mb-2">Razón del rechazo</h2>
                    <p className="text-sm whitespace-pre-wrap">{informe.razon_rechazo}</p>
                </Card>
            )}

            <Dialog open={rechazoDialog} onOpenChange={setRechazoDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rechazar informe</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>Razón del rechazo</Label>
                        <Textarea
                            value={razonRechazo}
                            onChange={e => setRazonRechazo(e.target.value)}
                            rows={4}
                            placeholder="Describí qué observaste…"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRechazoDialog(false)} disabled={busy}>
                            Cancelar
                        </Button>
                        <Button onClick={handleRechazar} disabled={busy} variant="destructive">
                            {busy ? 'Rechazando…' : 'Rechazar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className={mono ? 'text-sm font-mono' : 'text-sm'}>
                {value ?? <span className="text-muted-foreground">—</span>}
            </div>
        </div>
    )
}

function RespuestaRow({
    pregunta,
    respuesta,
}: {
    pregunta: InformeCompleto['version']['preguntas'][number]
    respuesta: InformeCompleto['respuestas'][number] | undefined
}) {
    let valorDisplay: React.ReactNode = <span className="text-muted-foreground italic">sin respuesta</span>

    if (respuesta) {
        if (pregunta.tipo === 'SELECCION_UNICA' && respuesta.opcion_id) {
            const opt = pregunta.opciones.find(o => o.id === respuesta.opcion_id)
            valorDisplay = opt ? (
                <Badge
                    className={
                        opt.es_conforme === true
                            ? 'bg-green-600 hover:bg-green-600'
                            : opt.es_conforme === false
                            ? 'bg-red-600 hover:bg-red-600'
                            : ''
                    }
                    variant={opt.es_conforme === null ? 'secondary' : 'default'}
                >
                    {opt.etiqueta}
                </Badge>
            ) : respuesta.opcion_id
        } else if (pregunta.tipo === 'SELECCION_MULTIPLE' && respuesta.opciones_ids) {
            valorDisplay = (
                <div className="flex gap-1 flex-wrap">
                    {(respuesta.opciones_ids as string[]).map(oid => {
                        const opt = pregunta.opciones.find(o => o.id === oid)
                        return (
                            <Badge key={oid} variant="secondary">
                                {opt?.etiqueta ?? oid}
                            </Badge>
                        )
                    })}
                </div>
            )
        } else if (pregunta.tipo === 'TEXTO_CORTO' || pregunta.tipo === 'TEXTO_LARGO') {
            valorDisplay = <span className="whitespace-pre-wrap">{respuesta.valor_texto ?? '—'}</span>
        } else if (pregunta.tipo === 'NUMERO') {
            valorDisplay = <span className="font-mono">{respuesta.valor_numero ?? '—'}</span>
        } else if (pregunta.tipo === 'FECHA') {
            valorDisplay = <span className="font-mono">{respuesta.valor_fecha ?? '—'}</span>
        } else if (pregunta.tipo === 'BOOLEANO') {
            valorDisplay = respuesta.valor_booleano === null ? '—' : respuesta.valor_booleano ? 'Sí' : 'No'
        } else if (pregunta.tipo === 'FOTO' && respuesta.valor_foto_url) {
            valorDisplay = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={respuesta.valor_foto_url}
                    alt="Foto"
                    className="max-h-32 rounded border"
                />
            )
        }
    }

    return (
        <div className="grid grid-cols-[1fr_auto] gap-3 items-start border-b last:border-0 pb-2 last:pb-0">
            <div className="text-sm">{pregunta.texto}</div>
            <div className="text-sm text-right min-w-[160px]">
                {valorDisplay}
                {respuesta?.nota && (
                    <div className="text-xs text-muted-foreground mt-1 italic">Nota: {respuesta.nota}</div>
                )}
            </div>
        </div>
    )
}

function agruparPorSeccion<T extends { seccion: string | null; orden: number }>(preguntas: T[]): Array<[string, T[]]> {
    const map = new Map<string, T[]>()
    preguntas.forEach(q => {
        const key = q.seccion ?? ''
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(q)
    })
    return Array.from(map.entries()).map(([k, arr]) => [k, arr.sort((a, b) => a.orden - b.orden)])
}

function EstadoBadge({ estado }: { estado: string }) {
    const cfg: Record<string, { label: string; className: string }> = {
        BORRADOR: { label: 'Borrador', className: 'bg-gray-500' },
        ENVIADO: { label: 'Enviado', className: 'bg-blue-600' },
        APROBADO: { label: 'Aprobado', className: 'bg-green-600' },
        RECHAZADO: { label: 'Rechazado', className: 'bg-red-600' },
        CON_COMENTARIOS: { label: 'Con comentarios', className: 'bg-amber-600' },
    }
    const c = cfg[estado] ?? { label: estado, className: 'bg-gray-500' }
    return <Badge className={`${c.className} hover:${c.className}`}>{c.label}</Badge>
}
