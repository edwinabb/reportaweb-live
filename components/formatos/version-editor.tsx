'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowUp,
    ArrowDown,
    Trash2,
    Plus,
    Save,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Copy,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
    PlantillaDetalle,
    VersionDetalle,
    SaveVersionInput,
} from '@/lib/actions/formatos'
import { saveVersionBorrador, publicarVersion, clonarVersion } from '@/lib/actions/formatos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type TipoPregunta =
    | 'SELECCION_UNICA'
    | 'SELECCION_MULTIPLE'
    | 'TEXTO_CORTO'
    | 'TEXTO_LARGO'
    | 'NUMERO'
    | 'FECHA'
    | 'BOOLEANO'
    | 'FOTO'

type Requisito = 'DESHABILITADO' | 'OPCIONAL' | 'UNICO' | 'MULTIPLE'

type PreguntaEdit = {
    id: string          // UUID local o del server
    seccion: string
    texto: string
    tipo: TipoPregunta
    requerida: boolean
    permite_nota: boolean
    texto_ayuda: string
    opciones: Array<{ id: string; etiqueta: string; valor: string; es_conforme: boolean | null }>
}

const TIPOS: Array<{ value: TipoPregunta; label: string }> = [
    { value: 'SELECCION_UNICA', label: 'Selección única (ej. SI/NO/NO APLICA)' },
    { value: 'SELECCION_MULTIPLE', label: 'Selección múltiple' },
    { value: 'TEXTO_CORTO', label: 'Texto corto' },
    { value: 'TEXTO_LARGO', label: 'Texto largo (observaciones)' },
    { value: 'NUMERO', label: 'Número (ej. horómetro, km)' },
    { value: 'FECHA', label: 'Fecha' },
    { value: 'BOOLEANO', label: 'Sí / No (booleano)' },
    { value: 'FOTO', label: 'Foto' },
]

const REQUISITOS: Array<{ value: Requisito; label: string }> = [
    { value: 'DESHABILITADO', label: 'Deshabilitado' },
    { value: 'OPCIONAL', label: 'Opcional' },
    { value: 'UNICO', label: 'Único (obligatorio)' },
    { value: 'MULTIPLE', label: 'Múltiple' },
]

const DEFAULT_OPCIONES_SI_NO_NA = [
    { etiqueta: 'SI', valor: 'si', es_conforme: true },
    { etiqueta: 'NO', valor: 'no', es_conforme: false },
    { etiqueta: 'NO APLICA', valor: 'na', es_conforme: null },
]

function uid(): string {
    return `tmp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

type Props = {
    formato: PlantillaDetalle
    version: VersionDetalle
}

export function VersionEditor({ formato, version }: Props) {
    const router = useRouter()
    const readonly = version.estado !== 'BORRADOR'

    // Bloques
    const [bloques, setBloques] = React.useState({
        empresa: version.muestra_bloque_empresa,
        cliente: version.muestra_bloque_cliente,
        cotizacion: version.muestra_bloque_cotizacion,
        tarea: version.muestra_bloque_tarea,
        observaciones: version.muestra_bloque_observaciones,
        firma: version.muestra_bloque_firma,
    })
    const [reqMaquinaria, setReqMaquinaria] = React.useState<Requisito>(version.requisito_maquinaria)
    const [reqPersonal, setReqPersonal] = React.useState<Requisito>(version.requisito_personal)

    const [preguntas, setPreguntas] = React.useState<PreguntaEdit[]>(
        version.preguntas.map(p => ({
            id: p.id,
            seccion: p.seccion ?? '',
            texto: p.texto,
            tipo: p.tipo,
            requerida: p.requerida,
            permite_nota: p.permite_nota,
            texto_ayuda: p.texto_ayuda ?? '',
            opciones: p.opciones.map(o => ({
                id: o.id,
                etiqueta: o.etiqueta,
                valor: o.valor,
                es_conforme: o.es_conforme,
            })),
        }))
    )

    const [saving, setSaving] = React.useState(false)
    const [publishing, setPublishing] = React.useState(false)
    const [cloning, setCloning] = React.useState(false)
    const [confirmPublish, setConfirmPublish] = React.useState(false)

    const seccionesUnicas = Array.from(new Set(preguntas.map(p => p.seccion).filter(Boolean)))

    const addPregunta = (tipo: TipoPregunta = 'SELECCION_UNICA') => {
        setPreguntas(prev => {
            const ultima = prev[prev.length - 1]
            const nueva: PreguntaEdit = {
                id: uid(),
                seccion: ultima?.seccion ?? 'INSPECCIÓN REALIZADA',
                texto: '',
                tipo,
                requerida: true,
                permite_nota: tipo === 'SELECCION_UNICA',
                texto_ayuda: '',
                opciones: tipo === 'SELECCION_UNICA'
                    ? DEFAULT_OPCIONES_SI_NO_NA.map(o => ({ id: uid(), ...o }))
                    : [],
            }
            return [...prev, nueva]
        })
    }

    const updatePregunta = (id: string, patch: Partial<PreguntaEdit>) => {
        setPreguntas(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
    }

    const movePregunta = (id: string, dir: -1 | 1) => {
        setPreguntas(prev => {
            const idx = prev.findIndex(p => p.id === id)
            if (idx < 0) return prev
            const newIdx = idx + dir
            if (newIdx < 0 || newIdx >= prev.length) return prev
            const copy = [...prev]
            const [item] = copy.splice(idx, 1)
            copy.splice(newIdx, 0, item)
            return copy
        })
    }

    const removePregunta = (id: string) => {
        setPreguntas(prev => prev.filter(p => p.id !== id))
    }

    const addOpcion = (preguntaId: string) => {
        updatePregunta(preguntaId, {
            opciones: [
                ...(preguntas.find(p => p.id === preguntaId)?.opciones ?? []),
                { id: uid(), etiqueta: '', valor: '', es_conforme: null },
            ],
        })
    }

    const updateOpcion = (
        preguntaId: string,
        opcionId: string,
        patch: Partial<PreguntaEdit['opciones'][number]>
    ) => {
        const pregunta = preguntas.find(p => p.id === preguntaId)
        if (!pregunta) return
        updatePregunta(preguntaId, {
            opciones: pregunta.opciones.map(o => (o.id === opcionId ? { ...o, ...patch } : o)),
        })
    }

    const removeOpcion = (preguntaId: string, opcionId: string) => {
        const pregunta = preguntas.find(p => p.id === preguntaId)
        if (!pregunta) return
        updatePregunta(preguntaId, {
            opciones: pregunta.opciones.filter(o => o.id !== opcionId),
        })
    }

    const handleSave = async () => {
        // Validar
        for (let i = 0; i < preguntas.length; i++) {
            const q = preguntas[i]
            if (!q.texto.trim()) {
                toast.error(`Pregunta ${i + 1}: el texto es requerido`)
                return
            }
            if (
                (q.tipo === 'SELECCION_UNICA' || q.tipo === 'SELECCION_MULTIPLE') &&
                q.opciones.length === 0
            ) {
                toast.error(`Pregunta ${i + 1}: necesita al menos 1 opción`)
                return
            }
            for (const o of q.opciones) {
                if (!o.etiqueta.trim() || !o.valor.trim()) {
                    toast.error(`Pregunta ${i + 1}: opción con etiqueta/valor vacíos`)
                    return
                }
            }
            const valores = q.opciones.map(o => o.valor.trim().toLowerCase())
            if (new Set(valores).size !== valores.length) {
                toast.error(`Pregunta ${i + 1}: valores de opciones duplicados`)
                return
            }
        }

        const input: SaveVersionInput = {
            muestra_bloque_empresa: bloques.empresa,
            muestra_bloque_cliente: bloques.cliente,
            muestra_bloque_cotizacion: bloques.cotizacion,
            muestra_bloque_tarea: bloques.tarea,
            muestra_bloque_observaciones: bloques.observaciones,
            muestra_bloque_firma: bloques.firma,
            requisito_maquinaria: reqMaquinaria,
            requisito_personal: reqPersonal,
            preguntas: preguntas.map((q, idx) => ({
                seccion: q.seccion.trim() || null,
                orden: idx + 1,
                texto: q.texto.trim(),
                tipo: q.tipo,
                requerida: q.requerida,
                permite_nota: q.permite_nota,
                texto_ayuda: q.texto_ayuda.trim() || null,
                opciones: q.opciones.map((o, optIdx) => ({
                    orden: optIdx + 1,
                    etiqueta: o.etiqueta.trim(),
                    valor: o.valor.trim(),
                    es_conforme: o.es_conforme,
                })),
            })),
        }

        setSaving(true)
        const res = await saveVersionBorrador(version.id, input)
        setSaving(false)

        if (res.success) {
            toast.success('Cambios guardados')
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    const handlePublish = async () => {
        setPublishing(true)
        await handleSave()  // guardar antes de publicar
        const res = await publicarVersion(version.id)
        setPublishing(false)
        setConfirmPublish(false)
        if (res.success) {
            toast.success('Versión publicada. Ya se puede llenar esta plantilla.')
            router.push(`/formatos/${formato.id}`)
        } else {
            toast.error(res.error)
        }
    }

    const handleClone = async () => {
        setCloning(true)
        const res = await clonarVersion(version.id)
        setCloning(false)
        if (res.success) {
            toast.success('Nueva versión BORRADOR creada')
            router.push(`/formatos/${formato.id}/versiones/${res.nuevaVersionId}`)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground font-mono">
                            {formato.codigo} · Versión {version.etiqueta_version ?? `V.${version.numero_version}`}
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">{formato.nombre}</h1>
                        <div className="mt-2 flex items-center gap-2">
                            <EstadoBadge estado={version.estado} />
                            {readonly && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" /> Versión no editable — cloná para cambiar
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {readonly ? (
                            <Button
                                variant="outline"
                                onClick={handleClone}
                                disabled={cloning}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                {cloning ? 'Clonando…' : 'Clonar a nueva versión'}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleSave}
                                    disabled={saving || publishing}
                                >
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar borrador
                                </Button>
                                <Button
                                    className="bg-orange-600 hover:bg-orange-700"
                                    onClick={() => setConfirmPublish(true)}
                                    disabled={saving || publishing || preguntas.length === 0}
                                >
                                    {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    Publicar versión
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>

            {/* Config de bloques */}
            <Card className="p-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Bloques del informe</h2>
                        <p className="text-sm text-muted-foreground">
                            Qué encabezados mostrar en el informe llenado (se autocompletan desde la tarea).
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(['empresa', 'cliente', 'cotizacion', 'tarea', 'observaciones', 'firma'] as const).map(k => (
                            <div key={k} className="flex items-center justify-between rounded-md border p-3">
                                <Label htmlFor={`bloque-${k}`} className="capitalize text-sm">{k}</Label>
                                <Switch
                                    id={`bloque-${k}`}
                                    checked={bloques[k]}
                                    onCheckedChange={val => setBloques(prev => ({ ...prev, [k]: val }))}
                                    disabled={readonly}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Config de recursos */}
            <Card className="p-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Recursos vinculados</h2>
                        <p className="text-sm text-muted-foreground">
                            Si el informe pide seleccionar maquinaria y/o personal al llenarse.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Maquinaria</Label>
                            <Select value={reqMaquinaria} onValueChange={v => setReqMaquinaria(v as Requisito)} disabled={readonly}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {REQUISITOS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Personal</Label>
                            <Select value={reqPersonal} onValueChange={v => setReqPersonal(v as Requisito)} disabled={readonly}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {REQUISITOS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Preguntas */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold">Preguntas ({preguntas.length})</h2>
                        <p className="text-sm text-muted-foreground">
                            Ordená con los botones ↑ ↓. Agrupá por sección para organizar visualmente.
                        </p>
                    </div>
                    {!readonly && (
                        <Button onClick={() => addPregunta('SELECCION_UNICA')} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="mr-2 h-4 w-4" /> Agregar pregunta
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    {preguntas.length === 0 ? (
                        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border rounded-md">
                            Aún no hay preguntas. Usá "Agregar pregunta" para empezar.
                        </div>
                    ) : (
                        preguntas.map((q, idx) => (
                            <PreguntaRow
                                key={q.id}
                                idx={idx}
                                total={preguntas.length}
                                pregunta={q}
                                secciones={seccionesUnicas}
                                readonly={readonly}
                                onUpdate={patch => updatePregunta(q.id, patch)}
                                onMoveUp={() => movePregunta(q.id, -1)}
                                onMoveDown={() => movePregunta(q.id, 1)}
                                onRemove={() => removePregunta(q.id)}
                                onAddOpcion={() => addOpcion(q.id)}
                                onUpdateOpcion={(opcionId, patch) => updateOpcion(q.id, opcionId, patch)}
                                onRemoveOpcion={opcionId => removeOpcion(q.id, opcionId)}
                            />
                        ))
                    )}
                </div>

                {!readonly && preguntas.length > 5 && (
                    <div className="mt-4">
                        <Button onClick={() => addPregunta('SELECCION_UNICA')} variant="outline" className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Agregar pregunta
                        </Button>
                    </div>
                )}
            </Card>

            <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Publicar esta versión?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Una vez publicada, <strong>{version.etiqueta_version ?? `V.${version.numero_version}`}</strong>{' '}
                            no podrá editarse. Para cambiarla tendrás que clonarla a una nueva versión.
                            Los informes llenados a partir de este momento usarán esta versión.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={publishing}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={e => { e.preventDefault(); handlePublish() }}
                            disabled={publishing}
                        >
                            {publishing ? 'Publicando…' : 'Sí, publicar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Sub-componente: fila de pregunta
// ─────────────────────────────────────────────────────────────

type PreguntaRowProps = {
    idx: number
    total: number
    pregunta: PreguntaEdit
    secciones: string[]
    readonly: boolean
    onUpdate: (patch: Partial<PreguntaEdit>) => void
    onMoveUp: () => void
    onMoveDown: () => void
    onRemove: () => void
    onAddOpcion: () => void
    onUpdateOpcion: (opcionId: string, patch: Partial<PreguntaEdit['opciones'][number]>) => void
    onRemoveOpcion: (opcionId: string) => void
}

function PreguntaRow(props: PreguntaRowProps) {
    const { idx, total, pregunta, secciones, readonly, onUpdate } = props
    const usaOpciones = pregunta.tipo === 'SELECCION_UNICA' || pregunta.tipo === 'SELECCION_MULTIPLE'

    return (
        <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 shrink-0 pt-1">
                    <Badge variant="secondary" className="text-xs font-mono h-6 justify-center">
                        {idx + 1}
                    </Badge>
                    {!readonly && (
                        <>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={idx === 0}
                                onClick={props.onMoveUp}
                                title="Subir"
                            >
                                <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={idx === total - 1}
                                onClick={props.onMoveDown}
                                title="Bajar"
                            >
                                <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Texto de la pregunta</Label>
                            <Textarea
                                value={pregunta.texto}
                                onChange={e => onUpdate({ texto: e.target.value })}
                                placeholder="Ej: ¿El extintor está en buenas condiciones?"
                                rows={2}
                                disabled={readonly}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Sección</Label>
                            <SeccionInput
                                value={pregunta.seccion}
                                sugerencias={secciones}
                                onChange={v => onUpdate({ seccion: v })}
                                readonly={readonly}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Tipo</Label>
                            <Select
                                value={pregunta.tipo}
                                onValueChange={v => {
                                    const tipoNuevo = v as TipoPregunta
                                    const patch: Partial<PreguntaEdit> = { tipo: tipoNuevo }
                                    if (tipoNuevo === 'SELECCION_UNICA' && pregunta.opciones.length === 0) {
                                        patch.opciones = DEFAULT_OPCIONES_SI_NO_NA.map(o => ({ id: uid(), ...o }))
                                    } else if (tipoNuevo !== 'SELECCION_UNICA' && tipoNuevo !== 'SELECCION_MULTIPLE') {
                                        patch.opciones = []
                                    }
                                    onUpdate(patch)
                                }}
                                disabled={readonly}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3">
                            <Label htmlFor={`req-${pregunta.id}`} className="text-sm cursor-pointer">Requerida</Label>
                            <Switch
                                id={`req-${pregunta.id}`}
                                checked={pregunta.requerida}
                                onCheckedChange={v => onUpdate({ requerida: v })}
                                disabled={readonly}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3">
                            <Label htmlFor={`nota-${pregunta.id}`} className="text-sm cursor-pointer">Permitir nota</Label>
                            <Switch
                                id={`nota-${pregunta.id}`}
                                checked={pregunta.permite_nota}
                                onCheckedChange={v => onUpdate({ permite_nota: v })}
                                disabled={readonly}
                            />
                        </div>
                    </div>

                    {usaOpciones && (
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Opciones</Label>
                            <div className="space-y-2">
                                {pregunta.opciones.map(opt => (
                                    <div key={opt.id} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Etiqueta (ej. SI)"
                                            value={opt.etiqueta}
                                            onChange={e => props.onUpdateOpcion(opt.id, { etiqueta: e.target.value })}
                                            className="flex-1"
                                            disabled={readonly}
                                        />
                                        <Input
                                            placeholder="Valor (ej. si)"
                                            value={opt.valor}
                                            onChange={e => props.onUpdateOpcion(opt.id, { valor: e.target.value.toLowerCase() })}
                                            className="w-32 font-mono text-sm"
                                            disabled={readonly}
                                        />
                                        <Select
                                            value={opt.es_conforme === true ? 'true' : opt.es_conforme === false ? 'false' : 'null'}
                                            onValueChange={v => props.onUpdateOpcion(opt.id, {
                                                es_conforme: v === 'true' ? true : v === 'false' ? false : null,
                                            })}
                                            disabled={readonly}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">✓ Conforme</SelectItem>
                                                <SelectItem value="false">✗ No conforme</SelectItem>
                                                <SelectItem value="null">— Neutral</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {!readonly && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 shrink-0"
                                                onClick={() => props.onRemoveOpcion(opt.id)}
                                                title="Eliminar opción"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {!readonly && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={props.onAddOpcion}
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" /> Agregar opción
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {!readonly && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={props.onRemove}
                        title="Eliminar pregunta"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}

// Input de sección con datalist (sugerencias)
function SeccionInput({
    value,
    sugerencias,
    onChange,
    readonly,
}: {
    value: string
    sugerencias: string[]
    onChange: (v: string) => void
    readonly: boolean
}) {
    const listId = React.useId()
    return (
        <>
            <Input
                list={listId}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Ej: INSPECCIÓN REALIZADA"
                disabled={readonly}
            />
            <datalist id={listId}>
                {sugerencias.map(s => <option key={s} value={s} />)}
            </datalist>
        </>
    )
}

function EstadoBadge({ estado }: { estado: 'BORRADOR' | 'PUBLICADA' | 'ARCHIVADA' }) {
    if (estado === 'PUBLICADA') return <Badge className="bg-green-600 hover:bg-green-600">Publicada</Badge>
    if (estado === 'BORRADOR') return <Badge variant="secondary">Borrador</Badge>
    return <Badge variant="outline" className="text-muted-foreground">Archivada</Badge>
}
