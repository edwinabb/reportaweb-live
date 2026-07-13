'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Send, Upload, X, Camera, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'

import type { InformeCompleto } from '@/lib/actions/formatos-informes'
import { formatDateTimeInTZ } from '@/lib/utils/tz'
import {
    saveBorrador,
    enviarInforme,
    uploadInformeFoto,
} from '@/lib/actions/formatos-informes'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

import { SignatureCanvas } from './signature-canvas'

type Maquinaria = { id: string; nombre: string; codigo: string }
type Personal = { id: string; nombre: string; avatar?: string | null }

type Props = {
    informe: InformeCompleto
    maquinarias: Maquinaria[]
    personal: Personal[]
}

type RespuestaState = {
    opcion_id: string | null
    opciones_ids: string[]
    valor_texto: string
    valor_numero: string
    valor_fecha: string
    valor_booleano: boolean | null
    valor_foto_url: string | null
    nota: string
}

function initRespuesta(): RespuestaState {
    return {
        opcion_id: null,
        opciones_ids: [],
        valor_texto: '',
        valor_numero: '',
        valor_fecha: '',
        valor_booleano: null,
        valor_foto_url: null,
        nota: '',
    }
}

export function InformeFillForm({ informe, maquinarias, personal }: Props) {
    const router = useRouter()
    const { version } = informe

    // Respuestas state (keyed by pregunta_id)
    const [respuestas, setRespuestas] = React.useState<Record<string, RespuestaState>>(() => {
        const map: Record<string, RespuestaState> = {}
        version.preguntas.forEach(q => {
            const existing = informe.respuestas.find(r => r.pregunta_id === q.id)
            map[q.id] = {
                opcion_id: existing?.opcion_id ?? null,
                opciones_ids: (existing?.opciones_ids as string[]) ?? [],
                valor_texto: existing?.valor_texto ?? '',
                valor_numero: existing?.valor_numero?.toString() ?? '',
                valor_fecha: existing?.valor_fecha ?? '',
                valor_booleano: existing?.valor_booleano ?? null,
                valor_foto_url: existing?.valor_foto_url ?? null,
                nota: existing?.nota ?? '',
            }
        })
        return map
    })

    const [observaciones, setObservaciones] = React.useState(informe.observaciones ?? '')
    const [tareaCodigoOverride, setTareaCodigoOverride] = React.useState(informe.tarea_codigo_override ?? '')
    const [tareaDescripcionOverride, setTareaDescripcionOverride] = React.useState(informe.tarea_descripcion_override ?? '')
    const [sitioDescripcionOverride, setSitioDescripcionOverride] = React.useState(informe.sitio_descripcion_override ?? '')

    const [maquinariasSeleccionadas, setMaquinariasSeleccionadas] = React.useState<string[]>(
        informe.maquinarias.map(m => m.maquinaria_id)
    )
    const [personalSeleccionado, setPersonalSeleccionado] = React.useState<
        Array<{ profile_id: string; rol: string }>
    >(
        informe.personal
            .filter(p => p.profile_id)
            .map(p => ({ profile_id: p.profile_id!, rol: p.rol_en_trabajo ?? '' }))
    )

    const [saving, setSaving] = React.useState(false)
    const [confirmEnviar, setConfirmEnviar] = React.useState(false)
    const [pin, setPin] = React.useState('')
    const [firmaBase64, setFirmaBase64] = React.useState<string | null>(null)
    const [enviando, setEnviando] = React.useState(false)

    const updateRespuesta = (preguntaId: string, patch: Partial<RespuestaState>) => {
        setRespuestas(prev => ({ ...prev, [preguntaId]: { ...prev[preguntaId], ...patch } }))
    }

    const buildRespuestasPayload = () => {
        return version.preguntas
            .map(q => {
                const r = respuestas[q.id]
                if (!r) return null
                // Detectar si hay valor
                const hasValue =
                    r.opcion_id !== null ||
                    r.opciones_ids.length > 0 ||
                    r.valor_texto !== '' ||
                    r.valor_numero !== '' ||
                    r.valor_fecha !== '' ||
                    r.valor_booleano !== null ||
                    r.valor_foto_url !== null ||
                    r.nota !== ''
                if (!hasValue) return null
                return {
                    pregunta_id: q.id,
                    opcion_id: r.opcion_id,
                    opciones_ids: r.opciones_ids.length > 0 ? r.opciones_ids : null,
                    valor_texto: r.valor_texto || null,
                    valor_numero: r.valor_numero !== '' ? Number(r.valor_numero) : null,
                    valor_fecha: r.valor_fecha || null,
                    valor_booleano: r.valor_booleano,
                    valor_foto_url: r.valor_foto_url,
                    nota: r.nota || null,
                }
            })
            .filter(Boolean) as any[]
    }

    const handleSave = async (silent = false) => {
        setSaving(true)
        const res = await saveBorrador(informe.id, {
            respuestas: buildRespuestasPayload(),
            observaciones,
            tarea_codigo_override: tareaCodigoOverride || null,
            tarea_descripcion_override: tareaDescripcionOverride || null,
            sitio_descripcion_override: sitioDescripcionOverride || null,
            maquinaria_ids: maquinariasSeleccionadas,
            personal: personalSeleccionado.map(p => ({
                profile_id: p.profile_id,
                tipo_personal: 'PROPIO' as const,
                rol_en_trabajo: p.rol || null,
            })),
        })
        setSaving(false)
        if (res.success) {
            if (!silent) toast.success('Borrador guardado')
            return true
        } else {
            toast.error(res.error)
            return false
        }
    }

    const handleEnviar = async () => {
        setEnviando(true)
        // Primero guardar
        const ok = await handleSave(true)
        if (!ok) {
            setEnviando(false)
            return
        }
        const res = await enviarInforme({
            informeId: informe.id,
            firma_base64: firmaBase64,
            pin: pin ? Number(pin) : null,
            observaciones,
        })
        setEnviando(false)
        setConfirmEnviar(false)
        if (res.success) {
            toast.success(`Informe ${res.codigo ?? ''} enviado`)
            router.push(`/informes/${informe.id}`)
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    // Upload foto — comprime a 920px/60% antes de enviar al servidor
    const handleFoto = async (preguntaId: string, file: File) => {
        try {
            const compressed = await imageCompression(file, {
                maxWidthOrHeight: 920,
                initialQuality: 0.6,
                useWebWorker: true,
                fileType: 'image/jpeg',
            })
            const reader = new FileReader()
            reader.onload = async e => {
                const base64 = e.target?.result as string
                const res = await uploadInformeFoto({
                    informeId: informe.id,
                    preguntaId,
                    fileBase64: base64,
                    filename: file.name.replace(/\.[^.]+$/, '.jpg'),
                })
                if (res.success) {
                    updateRespuesta(preguntaId, { valor_foto_url: res.url })
                    toast.success('Foto subida')
                } else {
                    toast.error(res.error)
                }
            }
            reader.readAsDataURL(compressed)
        } catch {
            toast.error('Error al procesar la imagen')
        }
    }

    // Agrupar preguntas por sección
    const secciones = React.useMemo(() => {
        const map = new Map<string, typeof version.preguntas>()
        version.preguntas.forEach(q => {
            const key = q.seccion ?? ''
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(q)
        })
        return Array.from(map.entries())
    }, [version.preguntas])

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground font-mono">
                            {informe.formato.codigo}{version.etiqueta_version ? ` · ${version.etiqueta_version}` : ''}
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">{informe.formato.nombre}</h1>
                        <div className="mt-2 flex items-center gap-2">
                            <Badge variant="secondary">Borrador</Badge>
                            <span className="text-xs text-muted-foreground">
                                Creado: {formatDateTimeInTZ(informe.created_at, 'America/Lima')}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || enviando}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar
                        </Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => setConfirmEnviar(true)}
                            disabled={saving || enviando}
                        >
                            <Send className="mr-2 h-4 w-4" /> Enviar
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Bloques de cabecera (tarea/cliente/sitio) */}
            {(version.muestra_bloque_tarea || version.muestra_bloque_cliente || version.muestra_bloque_cotizacion) && (
                <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {version.muestra_bloque_cliente && (
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Cliente</Label>
                            <div className="text-sm">
                                {informe.cliente?.razon_social ?? <span className="text-muted-foreground">— sin cliente —</span>}
                            </div>
                            {informe.cliente?.ruc && (
                                <div className="text-xs text-muted-foreground font-mono">
                                    RUC: {informe.cliente.ruc}
                                </div>
                            )}
                        </div>
                    )}

                    {version.muestra_bloque_cotizacion && informe.cotizacion && (
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Cotización</Label>
                            <div className="text-sm font-mono">
                                {informe.cotizacion.numero ?? '—'}/{informe.cotizacion.anio ?? '—'}
                            </div>
                        </div>
                    )}

                    {version.muestra_bloque_tarea && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="tarea-codigo" className="text-xs text-muted-foreground">Tarea (código)</Label>
                                <Input
                                    id="tarea-codigo"
                                    value={tareaCodigoOverride}
                                    onChange={e => setTareaCodigoOverride(e.target.value)}
                                    placeholder={informe.tarea?.codigo ?? 'Ej: T-2546'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tarea-desc" className="text-xs text-muted-foreground">Descripción de la tarea</Label>
                                <Input
                                    id="tarea-desc"
                                    value={tareaDescripcionOverride}
                                    onChange={e => setTareaDescripcionOverride(e.target.value)}
                                    placeholder={informe.tarea?.descripcion ?? ''}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="sitio" className="text-xs text-muted-foreground">Sitio</Label>
                        <Input
                            id="sitio"
                            value={sitioDescripcionOverride}
                            onChange={e => setSitioDescripcionOverride(e.target.value)}
                            placeholder={informe.sitio?.nombre ?? 'Ej: GUADALUPITO'}
                        />
                    </div>
                </Card>
            )}

            {/* Maquinaria */}
            {version.requisito_maquinaria !== 'DESHABILITADO' && (
                <Card className="p-6">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold">Maquinaria</h2>
                        <p className="text-sm text-muted-foreground">
                            {version.requisito_maquinaria === 'UNICO'
                                ? 'Seleccioná una grúa.'
                                : version.requisito_maquinaria === 'MULTIPLE'
                                ? 'Seleccioná una o más.'
                                : 'Opcional.'}
                        </p>
                    </div>
                    <MaquinariasPicker
                        maquinarias={maquinarias}
                        value={maquinariasSeleccionadas}
                        onChange={setMaquinariasSeleccionadas}
                        multiple={version.requisito_maquinaria === 'MULTIPLE'}
                    />
                </Card>
            )}

            {/* Personal */}
            {version.requisito_personal !== 'DESHABILITADO' && (
                <Card className="p-6">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold">Personal</h2>
                        <p className="text-sm text-muted-foreground">
                            {version.requisito_personal === 'UNICO'
                                ? 'Registrado por (operador/rigger).'
                                : version.requisito_personal === 'MULTIPLE'
                                ? 'Agregá todo el personal involucrado.'
                                : 'Opcional.'}
                        </p>
                    </div>
                    <PersonalPicker
                        personal={personal}
                        value={personalSeleccionado}
                        onChange={setPersonalSeleccionado}
                        multiple={version.requisito_personal === 'MULTIPLE'}
                    />
                </Card>
            )}

            {/* Preguntas */}
            {secciones.map(([seccion, preguntas]) => (
                <Card key={seccion || 'default'} className="p-6">
                    {seccion && <h2 className="text-lg font-semibold mb-4">{seccion}</h2>}
                    <div className="flex flex-col gap-4">
                        {preguntas.map(q => (
                            <PreguntaField
                                key={q.id}
                                pregunta={q}
                                valor={respuestas[q.id]}
                                onChange={patch => updateRespuesta(q.id, patch)}
                                onUploadFoto={file => handleFoto(q.id, file)}
                            />
                        ))}
                    </div>
                </Card>
            ))}

            {/* Observaciones */}
            {version.muestra_bloque_observaciones && (
                <Card className="p-6">
                    <Label htmlFor="observaciones" className="text-sm font-semibold">Observaciones</Label>
                    <Textarea
                        id="observaciones"
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                        rows={4}
                        placeholder="Comentarios del trabajo, hallazgos, etc."
                        className="mt-2"
                    />
                </Card>
            )}

            {/* Botones inferiores */}
            <div className="flex items-center justify-end gap-2 pb-4">
                <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || enviando}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar borrador
                </Button>
                <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => setConfirmEnviar(true)}
                    disabled={saving || enviando}
                >
                    <Send className="mr-2 h-4 w-4" /> Enviar informe
                </Button>
            </div>

            {/* Dialog enviar — firma + PIN */}
            <Dialog open={confirmEnviar} onOpenChange={setConfirmEnviar}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Enviar informe</DialogTitle>
                        <DialogDescription>
                            {version.muestra_bloque_firma
                                ? 'Firmá en el canvas e ingresá tu PIN para confirmar el envío. Una vez enviado no se puede editar.'
                                : 'Se asignará el correlativo al enviar. Una vez enviado no se puede editar.'}
                        </DialogDescription>
                    </DialogHeader>

                    {version.muestra_bloque_firma && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm mb-2 block">Firma</Label>
                                <SignatureCanvas onChange={setFirmaBase64} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pin" className="text-sm">PIN</Label>
                                <Input
                                    id="pin"
                                    type="password"
                                    inputMode="numeric"
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    placeholder="••••"
                                    className="text-center tracking-widest font-mono"
                                    maxLength={8}
                                />
                                <p className="text-xs text-muted-foreground">
                                    El PIN se configura en <a href="/settings/perfil" className="underline">Mi Perfil</a>.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmEnviar(false)} disabled={enviando}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={handleEnviar}
                            disabled={enviando}
                        >
                            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Confirmar envío
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Sub-componente: pregunta individual
// ─────────────────────────────────────────────────────────────
function PreguntaField({
    pregunta,
    valor,
    onChange,
    onUploadFoto,
}: {
    pregunta: InformeCompleto['version']['preguntas'][number]
    valor: RespuestaState
    onChange: (patch: Partial<RespuestaState>) => void
    onUploadFoto: (file: File) => void
}) {
    const req = pregunta.requerida ? <span className="text-red-500 ml-1">*</span> : null

    return (
        <div className="space-y-2 border-l-2 border-muted pl-4 py-1">
            <Label className="text-sm font-medium">
                {pregunta.texto}
                {req}
            </Label>
            {pregunta.texto_ayuda && (
                <p className="text-xs text-muted-foreground">{pregunta.texto_ayuda}</p>
            )}

            {/* Renderizado según tipo */}
            {pregunta.tipo === 'SELECCION_UNICA' && (
                <RadioGroup
                    value={valor.opcion_id ?? ''}
                    onValueChange={v => onChange({ opcion_id: v })}
                    className="flex flex-wrap gap-4"
                >
                    {pregunta.opciones.map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                            <RadioGroupItem id={`q-${pregunta.id}-${opt.id}`} value={opt.id} />
                            <Label htmlFor={`q-${pregunta.id}-${opt.id}`} className="cursor-pointer text-sm">
                                {opt.etiqueta}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            )}

            {pregunta.tipo === 'SELECCION_MULTIPLE' && (
                <div className="flex flex-wrap gap-4">
                    {pregunta.opciones.map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                            <Checkbox
                                id={`q-${pregunta.id}-${opt.id}`}
                                checked={valor.opciones_ids.includes(opt.id)}
                                onCheckedChange={checked => {
                                    if (checked) {
                                        onChange({ opciones_ids: [...valor.opciones_ids, opt.id] })
                                    } else {
                                        onChange({ opciones_ids: valor.opciones_ids.filter(x => x !== opt.id) })
                                    }
                                }}
                            />
                            <Label htmlFor={`q-${pregunta.id}-${opt.id}`} className="cursor-pointer text-sm">
                                {opt.etiqueta}
                            </Label>
                        </div>
                    ))}
                </div>
            )}

            {pregunta.tipo === 'TEXTO_CORTO' && (
                <Input
                    value={valor.valor_texto}
                    onChange={e => onChange({ valor_texto: e.target.value })}
                />
            )}

            {pregunta.tipo === 'TEXTO_LARGO' && (
                <Textarea
                    value={valor.valor_texto}
                    onChange={e => onChange({ valor_texto: e.target.value })}
                    rows={3}
                />
            )}

            {pregunta.tipo === 'NUMERO' && (
                <Input
                    type="number"
                    value={valor.valor_numero}
                    onChange={e => onChange({ valor_numero: e.target.value })}
                />
            )}

            {pregunta.tipo === 'FECHA' && (
                <Input
                    type="date"
                    value={valor.valor_fecha}
                    onChange={e => onChange({ valor_fecha: e.target.value })}
                />
            )}

            {pregunta.tipo === 'BOOLEANO' && (
                <RadioGroup
                    value={valor.valor_booleano === null ? '' : valor.valor_booleano ? 'true' : 'false'}
                    onValueChange={v => onChange({ valor_booleano: v === 'true' })}
                    className="flex gap-4"
                >
                    <div className="flex items-center gap-2">
                        <RadioGroupItem id={`bool-${pregunta.id}-y`} value="true" />
                        <Label htmlFor={`bool-${pregunta.id}-y`} className="cursor-pointer">Sí</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <RadioGroupItem id={`bool-${pregunta.id}-n`} value="false" />
                        <Label htmlFor={`bool-${pregunta.id}-n`} className="cursor-pointer">No</Label>
                    </div>
                </RadioGroup>
            )}

            {pregunta.tipo === 'FOTO' && (
                <div className="space-y-2">
                    {valor.valor_foto_url ? (
                        <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={valor.valor_foto_url}
                                alt="Foto subida"
                                className="max-h-40 rounded-md border"
                            />
                            <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={() => onChange({ valor_foto_url: null })}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                                <Camera className="h-4 w-4" />
                                Subir foto
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                    const f = e.target.files?.[0]
                                    if (f) onUploadFoto(f)
                                }}
                            />
                        </label>
                    )}
                </div>
            )}

            {pregunta.permite_nota && (
                <div className="mt-2">
                    <Input
                        placeholder="Nota (opcional)…"
                        value={valor.nota}
                        onChange={e => onChange({ nota: e.target.value })}
                        className="text-sm"
                    />
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Maquinarias picker
// ─────────────────────────────────────────────────────────────
function MaquinariasPicker({
    maquinarias,
    value,
    onChange,
    multiple,
}: {
    maquinarias: Maquinaria[]
    value: string[]
    onChange: (ids: string[]) => void
    multiple: boolean
}) {
    if (!multiple) {
        return (
            <Select
                value={value[0] ?? ''}
                onValueChange={v => onChange(v ? [v] : [])}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Seleccioná maquinaria…" />
                </SelectTrigger>
                <SelectContent>
                    {maquinarias.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                            <span className="font-mono text-xs mr-2">{m.codigo}</span>
                            {m.nombre}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }
    return (
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
            {maquinarias.map(m => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                        checked={value.includes(m.id)}
                        onCheckedChange={checked => {
                            if (checked) onChange([...value, m.id])
                            else onChange(value.filter(x => x !== m.id))
                        }}
                    />
                    <span className="font-mono text-xs">{m.codigo}</span>
                    <span>{m.nombre}</span>
                </label>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Personal picker
// ─────────────────────────────────────────────────────────────
function PersonalPicker({
    personal,
    value,
    onChange,
    multiple,
}: {
    personal: Personal[]
    value: Array<{ profile_id: string; rol: string }>
    onChange: (v: Array<{ profile_id: string; rol: string }>) => void
    multiple: boolean
}) {
    if (!multiple) {
        return (
            <Select
                value={value[0]?.profile_id ?? ''}
                onValueChange={v => onChange(v ? [{ profile_id: v, rol: value[0]?.rol ?? '' }] : [])}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Seleccioná registrante…" />
                </SelectTrigger>
                <SelectContent>
                    {personal.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }
    return (
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
            {personal.map(p => {
                const entry = value.find(v => v.profile_id === p.id)
                return (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                            checked={!!entry}
                            onCheckedChange={checked => {
                                if (checked) onChange([...value, { profile_id: p.id, rol: '' }])
                                else onChange(value.filter(v => v.profile_id !== p.id))
                            }}
                        />
                        <span>{p.nombre}</span>
                    </label>
                )
            })}
        </div>
    )
}
