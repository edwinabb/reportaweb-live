'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    MessageSquare, CheckCircle2, Loader2, Send,
    AlertTriangle, ShieldCheck, X, ZoomIn,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    Dialog, DialogContent,
} from '@/components/ui/dialog'
import { ImagenUpload } from './imagen-upload'
import { agregarRespuesta, guardarResolucion, cerrarTicket } from '@/lib/actions/soporte'
import {
    slugifyTenantName, SECCION_LABELS,
    type TicketSoporte, type TicketRespuesta, type TicketEstado, type RespuestaTipo,
} from '@/lib/soporte-shared'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'

const CRITICIDAD_BADGE: Record<string, string> = {
    ALTA:  'bg-red-100    text-red-700',
    MEDIA: 'bg-orange-100 text-orange-700',
    BAJA:  'bg-blue-100   text-blue-700',
}

const ESTADO_BADGE: Record<string, string> = {
    ABIERTO:     'bg-gray-100    text-gray-700',
    EN_PROGRESO: 'bg-blue-100    text-blue-700',
    CERRADO:     'bg-emerald-100 text-emerald-700',
}

const ESTADO_LABELS: Record<string, string> = {
    ABIERTO:     'Abierto',
    EN_PROGRESO: 'En Progreso',
    CERRADO:     'Cerrado',
}

type Props = {
    ticket:        TicketSoporte
    respuestas:    TicketRespuesta[]
    isAdmin:       boolean
    currentUserId: string
}

function ThumbnailGrid({ urls }: { urls: string[] }) {
    const [lightbox, setLightbox] = useState<string | null>(null)
    if (!urls.length) return null
    return (
        <>
            <div className="flex flex-wrap gap-2 mt-2">
                {urls.map((url, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setLightbox(url)}
                        className="relative group rounded-md overflow-hidden border h-16 w-16"
                    >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                    </button>
                ))}
            </div>
            <Dialog open={!!lightbox} onOpenChange={o => !o && setLightbox(null)}>
                <DialogContent className="max-w-3xl p-2 flex items-center justify-center">
                    {lightbox && <img src={lightbox} alt="" className="max-h-[80vh] w-auto rounded" />}
                </DialogContent>
            </Dialog>
        </>
    )
}

export function TicketDetalle({ ticket, respuestas, isAdmin, currentUserId }: Props) {
    const router = useRouter()
    const [isPending,      startTransition]      = useTransition()
    const [isCierrePending, startCierreTransition] = useTransition()

    // Panel respuesta
    const [respMensaje,  setRespMensaje]  = useState('')
    const [respTipo,     setRespTipo]     = useState<RespuestaTipo>('COMENTARIO')
    const [respEstado,   setRespEstado]   = useState<TicketEstado>('EN_PROGRESO')
    const [respImages,   setRespImages]   = useState<File[]>([])

    // Panel resolución (solo admin)
    const [resExplicacion, setResExplicacion] = useState(ticket.explicacion_no_tecnica ?? '')
    const [resPrevencion,  setResPrevencion]  = useState(ticket.como_se_previene ?? '')
    const [resImagenesRep, setResImagenesRep] = useState<File[]>([])
    const [resImagenesPru, setResImagenesPru] = useState<File[]>([])
    const [isSavingRes,    startSaveRes]      = useTransition()

    const isClosed = ticket.estado === 'CERRADO'

    async function uploadFiles(files: File[]) {
        if (!files.length) return []
        const supabase = createClient()
        const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', ticket.tenant_id)
            .single()
        const tenantSlug = slugifyTenantName(company?.name ?? ticket.tenant_id)
        const urls: string[] = []
        for (const file of files) {
            const ext  = file.name.split('.').pop() ?? 'jpg'
            const path = `${tenantSlug}/${ticket.numero}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const { data, error } = await supabase.storage
                .from('problemas')
                .upload(path, file, { upsert: false })
            if (!error && data) {
                const { data: { publicUrl } } = supabase.storage.from('problemas').getPublicUrl(data.path)
                urls.push(publicUrl)
            }
        }
        return urls
    }

    function handleEnviarRespuesta() {
        if (!respMensaje.trim()) { toast.error('Escribí un mensaje'); return }
        startTransition(async () => {
            const imageUrls = await uploadFiles(respImages)
            const estado = respTipo === 'CAMBIO_ESTADO' ? respEstado : undefined
            const result = await agregarRespuesta(ticket.id, respMensaje.trim(), respTipo, estado, imageUrls)
            if (!result.success) { toast.error(result.error ?? 'Error'); return }
            toast.success('Respuesta enviada')
            setRespMensaje('')
            setRespImages([])
            router.refresh()
        })
    }

    function handleGuardarResolucion() {
        startSaveRes(async () => {
            const repUrls = await uploadFiles(resImagenesRep)
            const pruUrls = await uploadFiles(resImagenesPru)
            const result = await guardarResolucion(ticket.id, {
                explicacion_no_tecnica:    resExplicacion || undefined,
                como_se_previene:          resPrevencion  || undefined,
                imagenes_replica_dev:      repUrls.length ? [...ticket.imagenes_replica_dev,      ...repUrls] : undefined,
                imagenes_pruebas_exitosas: pruUrls.length ? [...ticket.imagenes_pruebas_exitosas, ...pruUrls] : undefined,
            })
            if (!result.success) { toast.error(result.error ?? 'Error'); return }
            toast.success('Resolución guardada')
            setResImagenesRep([])
            setResImagenesPru([])
            router.refresh()
        })
    }

    function handleCerrar() {
        startCierreTransition(async () => {
            const result = await cerrarTicket(ticket.id)
            if (!result.success) { toast.error(result.error ?? 'Error'); return }
            toast.success('Ticket cerrado')
            router.refresh()
        })
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-muted-foreground">
                                    #{String(ticket.numero).padStart(4, '0')}
                                </span>
                                <Badge className={cn(CRITICIDAD_BADGE[ticket.criticidad], 'border-0')}>
                                    {ticket.criticidad}
                                </Badge>
                                <Badge className={cn(ESTADO_BADGE[ticket.estado], 'border-0')}>
                                    {ESTADO_LABELS[ticket.estado]}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {SECCION_LABELS[ticket.seccion] ?? ticket.seccion} ·{' '}
                                {ticket.reporter_nombre} ·{' '}
                                {format(new Date(ticket.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                            </p>
                        </div>
                        {isAdmin && !isClosed && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Cerrar ticket
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Cerrar el ticket?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            El ticket pasará a estado CERRADO. No se podrán agregar más respuestas.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleCerrar}
                                            disabled={isCierrePending}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {isCierrePending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                                            Cerrar ticket
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{ticket.descripcion}</p>
                    <ThumbnailGrid urls={ticket.imagenes_problema} />
                </CardContent>
            </Card>

            {/* Historial */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Historial</h2>
                {respuestas.map(r => (
                    <div
                        key={r.id}
                        className={cn(
                            'rounded-lg border px-4 py-3 text-sm',
                            r.tipo === 'SISTEMA'
                                ? 'bg-muted/30 text-muted-foreground text-xs italic border-dashed'
                                : r.es_de_soporte
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-white',
                        )}
                    >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {r.tipo !== 'SISTEMA' && (
                                <>
                                    {r.es_de_soporte
                                        ? <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                        : <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                    }
                                    <span className="font-medium text-xs">
                                        {r.es_de_soporte ? 'Equipo de Soporte' : (r.reporter_nombre ?? 'Usuario')}
                                    </span>
                                </>
                            )}
                            <span className="text-[11px] text-muted-foreground ml-auto">
                                {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                            </span>
                        </div>
                        <p className="whitespace-pre-wrap">{r.mensaje}</p>
                        {r.estado_nuevo && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Estado → <strong>{ESTADO_LABELS[r.estado_nuevo] ?? r.estado_nuevo}</strong>
                            </p>
                        )}
                        <ThumbnailGrid urls={r.imagenes} />
                    </div>
                ))}
            </div>

            {/* Agregar respuesta */}
            {!isClosed && (
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm">Agregar Respuesta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Textarea
                            value={respMensaje}
                            onChange={e => setRespMensaje(e.target.value)}
                            placeholder="Escribí tu mensaje…"
                            rows={3}
                            disabled={isPending}
                            className="resize-none"
                        />
                        <ImagenUpload
                            images={respImages}
                            onChange={setRespImages}
                            maxImages={3}
                            disabled={isPending}
                        />
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            {isAdmin && (
                                <Select
                                    value={respTipo}
                                    onValueChange={v => setRespTipo(v as RespuestaTipo)}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="w-44">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="COMENTARIO">Comentario</SelectItem>
                                        <SelectItem value="CAMBIO_ESTADO">Cambiar estado</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            {isAdmin && respTipo === 'CAMBIO_ESTADO' && (
                                <Select
                                    value={respEstado}
                                    onValueChange={v => setRespEstado(v as TicketEstado)}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="w-36">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EN_PROGRESO">En Progreso</SelectItem>
                                        <SelectItem value="ABIERTO">Abierto</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            <Button
                                onClick={handleEnviarRespuesta}
                                disabled={isPending}
                                className="ml-auto"
                            >
                                {isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    : <Send className="h-4 w-4 mr-2" />
                                }
                                Enviar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Resolución (solo admin) */}
            {isAdmin && (
                <Card className="border-emerald-200">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Resolución (solo visible para administradores)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Qué pasó (sin términos técnicos)</Label>
                            <Textarea
                                value={resExplicacion}
                                onChange={e => setResExplicacion(e.target.value)}
                                placeholder="Explicá qué causó el problema en términos simples…"
                                rows={3}
                                disabled={isSavingRes || isClosed}
                                className="resize-none text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Cómo evitamos que vuelva a ocurrir</Label>
                            <Textarea
                                value={resPrevencion}
                                onChange={e => setResPrevencion(e.target.value)}
                                placeholder="Medida preventiva aplicada…"
                                rows={2}
                                disabled={isSavingRes || isClosed}
                                className="resize-none text-sm"
                            />
                        </div>

                        {ticket.imagenes_replica_dev.length > 0 && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Imágenes réplica en dev</p>
                                <ThumbnailGrid urls={ticket.imagenes_replica_dev} />
                            </div>
                        )}
                        {!isClosed && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">Agregar imágenes de réplica</Label>
                                <ImagenUpload
                                    images={resImagenesRep}
                                    onChange={setResImagenesRep}
                                    maxImages={3}
                                    disabled={isSavingRes}
                                />
                            </div>
                        )}

                        {ticket.imagenes_pruebas_exitosas.length > 0 && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Imágenes pruebas exitosas</p>
                                <ThumbnailGrid urls={ticket.imagenes_pruebas_exitosas} />
                            </div>
                        )}
                        {!isClosed && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">Agregar imágenes de pruebas exitosas</Label>
                                <ImagenUpload
                                    images={resImagenesPru}
                                    onChange={setResImagenesPru}
                                    maxImages={3}
                                    disabled={isSavingRes}
                                />
                            </div>
                        )}

                        {!isClosed && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGuardarResolucion}
                                disabled={isSavingRes}
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                                {isSavingRes && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                Guardar borrador de resolución
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
