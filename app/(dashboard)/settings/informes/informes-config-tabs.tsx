'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    ConfigInformeMaquinaria,
    ConfigInformePersonal,
    ConfigChecklist,
    updateConfigInformeMaquinaria,
    updateConfigInformePersonal,
    updateConfigChecklist,
} from '@/lib/actions/informes-config'

interface TenantUser {
    id: string
    first_name: string | null
    last_name: string | null
    role: string | null
}

interface Props {
    configMaquinaria: ConfigInformeMaquinaria | null
    configPersonal: ConfigInformePersonal | null
    configChecklist: ConfigChecklist | null
    tenantUsers: TenantUser[]
}

export function InformesConfigTabs({ configMaquinaria, configPersonal, configChecklist, tenantUsers }: Props) {
    return (
        <Tabs defaultValue="maquinaria" className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="maquinaria">Maquinaria</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
            </TabsList>

            <TabsContent value="maquinaria" className="mt-4">
                <MaquinariaForm config={configMaquinaria} />
            </TabsContent>

            <TabsContent value="personal" className="mt-4">
                <PersonalForm config={configPersonal} />
            </TabsContent>

            <TabsContent value="checklist" className="mt-4">
                <ChecklistForm config={configChecklist} tenantUsers={tenantUsers} />
            </TabsContent>
        </Tabs>
    )
}

// ────────────────────────────────────────────────────────────────
// Maquinaria
// ────────────────────────────────────────────────────────────────

function MaquinariaForm({ config }: { config: ConfigInformeMaquinaria | null }) {
    const [state, formAction, isPending] = useActionState(updateConfigInformeMaquinaria, null)
    const [fotosAdicionales, setFotosAdicionales] = useState(
        (config as (ConfigInformeMaquinaria & { incluye_fotos_adicionales?: boolean }) | null)
            ?.incluye_fotos_adicionales ?? false
    )
    const [etiquetas, setEtiquetas] = useState<string[]>(
        (() => {
            try {
                const raw = (config as Record<string, unknown> | null)?.etiquetas_fotos_adicionales
                return Array.isArray(raw) ? raw : []
            } catch { return [] }
        })()
    )

    useEffect(() => {
        if (state?.success) toast.success(state.message)
        else if (state?.message) toast.error(state.message)
    }, [state])

    if (!config) {
        return <ConfigNotFound />
    }

    return (
        <form action={formAction}>
            <input type="hidden" name="etiquetas_fotos_adicionales" value={JSON.stringify(etiquetas)} />
            <Card>
                <CardHeader>
                    <CardTitle>Reporte de Alquiler de Maquinaria y Equipos</CardTitle>
                    <CardDescription>
                        Configura las secciones variables del formato. Los cambios se aplican al próximo reporte creado.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="m_codigo">Código del formato</Label>
                            <Input id="m_codigo" name="codigo_formato" defaultValue={config.codigo_formato} required />
                            <p className="text-xs text-muted-foreground mt-1">Ej. G.PAC-04</p>
                        </div>
                        <div>
                            <Label htmlFor="m_version">Versión</Label>
                            <Input id="m_version" name="version_formato" defaultValue={config.version_formato} required />
                            <p className="text-xs text-muted-foreground mt-1">Ej. V.04</p>
                        </div>
                        <div>
                            <Label htmlFor="m_fecha">Fecha del formato</Label>
                            <Input id="m_fecha" name="fecha_formato" defaultValue={config.fecha_formato} required />
                            <p className="text-xs text-muted-foreground mt-1">Ej. Nov-2024</p>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="m_turnos">Cantidad de turnos</Label>
                            <Select name="cantidad_turnos" defaultValue={String(config.cantidad_turnos)}>
                                <SelectTrigger id="m_turnos"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 turno</SelectItem>
                                    <SelectItem value="2">2 turnos</SelectItem>
                                    <SelectItem value="3">3 turnos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="m_riggers">Riggers / auxiliares</Label>
                            <Select name="cantidad_riggers" defaultValue={String(config.cantidad_riggers)}>
                                <SelectTrigger id="m_riggers"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Ninguno</SelectItem>
                                    <SelectItem value="1">1 rigger</SelectItem>
                                    <SelectItem value="2">2 riggers</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">Secciones visibles</h3>
                        <ToggleRow name="incluye_tonelaje_placa" checked={config.incluye_tonelaje_placa}
                            label="Placa y tonelaje solicitado"
                            hint="Añade columnas al encabezado fecha/sitio/maquinaria." />
                        <ToggleRow name="incluye_salida_autorizada" checked={config.incluye_salida_autorizada}
                            label="Salida autorizada por"
                            hint="Nombre del supervisor que autorizó la salida del equipo." />
                        <ToggleRow name="incluye_tipo_recorrido" checked={config.incluye_tipo_recorrido}
                            label="Tipo de recorrido + horas de recorrido"
                            hint="Ida / Ida y vuelta / No aplica + campo de horas." />
                        <ToggleRow
                            name="incluye_guia_transporte"
                            checked={(config as Record<string, unknown>).incluye_guia_transporte as boolean ?? true}
                            label="Guía de transporte"
                            hint="Área de texto para número o descripción de la guía de remisión." />
                        <ToggleRow name="incluye_firma_cliente" checked={config.incluye_firma_cliente}
                            label="Firma del representante del cliente"
                            hint="Canvas + nombre + cargo. Sustenta facturación cuando aplica." />
                        <ToggleRow name="incluye_foto_trabajo" checked={config.incluye_foto_trabajo}
                            label="Foto de la actividad realizada"
                            hint="Evidencia visual para el cliente." />
                        <ToggleRow name="incluye_foto_reporte_escrito" checked={config.incluye_foto_reporte_escrito}
                            label="Foto del reporte escrito físico"
                            hint="Backup del parte diario manuscrito — se agrega como página 2 del PDF." />

                        {/* Fotos adicionales con editor de subtítulos */}
                        <div className="border rounded-md p-3 bg-muted/20 space-y-3">
                            <div className="flex items-start gap-3">
                                <Switch
                                    id="incluye_fotos_adicionales"
                                    name="incluye_fotos_adicionales"
                                    checked={fotosAdicionales}
                                    onCheckedChange={setFotosAdicionales}
                                />
                                <div className="flex-1">
                                    <Label htmlFor="incluye_fotos_adicionales" className="font-medium cursor-pointer">
                                        Fotos adicionales con subtítulos
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Sección de fotos opcionales con etiqueta personalizada (ej. FMT, Guía de remisión).
                                    </p>
                                </div>
                            </div>
                            {fotosAdicionales && (
                                <div className="ml-9 space-y-2">
                                    {etiquetas.map((etq, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Input
                                                value={etq}
                                                onChange={e => {
                                                    const next = [...etiquetas]
                                                    next[i] = e.target.value
                                                    setEtiquetas(next)
                                                }}
                                                placeholder="Ej. FMT"
                                                className="max-w-xs text-sm h-8"
                                            />
                                            <button
                                                type="button"
                                                title="Eliminar subtítulo"
                                                aria-label="Eliminar subtítulo"
                                                onClick={() => setEtiquetas(etiquetas.filter((_, j) => j !== i))}
                                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setEtiquetas([...etiquetas, ''])}
                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        <Plus className="h-3 w-3" /> Agregar subtítulo
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </CardContent>
                <div className="flex justify-end gap-2 p-6 pt-0">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                </div>
            </Card>
        </form>
    )
}

// ────────────────────────────────────────────────────────────────
// Personal
// ────────────────────────────────────────────────────────────────

function PersonalForm({ config }: { config: ConfigInformePersonal | null }) {
    const [state, formAction, isPending] = useActionState(updateConfigInformePersonal, null)

    useEffect(() => {
        if (state?.success) toast.success(state.message)
        else if (state?.message) toast.error(state.message)
    }, [state])

    if (!config) {
        return <ConfigNotFound />
    }

    return (
        <form action={formAction}>
            <Card>
                <CardHeader>
                    <CardTitle>Reporte de Personal</CardTitle>
                    <CardDescription>
                        Configura las columnas y bloques del formato. Los cambios se aplican al próximo reporte creado.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="p_codigo">Código del formato</Label>
                            <Input id="p_codigo" name="codigo_formato" defaultValue={config.codigo_formato} required />
                            <p className="text-xs text-muted-foreground mt-1">Ej. G.PAC-02</p>
                        </div>
                        <div>
                            <Label htmlFor="p_version">Versión</Label>
                            <Input id="p_version" name="version_formato" defaultValue={config.version_formato} required />
                        </div>
                        <div>
                            <Label htmlFor="p_fecha">Fecha del formato</Label>
                            <Input id="p_fecha" name="fecha_formato" defaultValue={config.fecha_formato} required />
                        </div>
                    </section>

                    <section>
                        <Label htmlFor="p_turnos">Cantidad de jornadas</Label>
                        <Select name="cantidad_turnos" defaultValue={String(config.cantidad_turnos)}>
                            <SelectTrigger id="p_turnos" className="max-w-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 jornada</SelectItem>
                                <SelectItem value="2">2 jornadas</SelectItem>
                                <SelectItem value="3">3 jornadas</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            GRUAS usa 3 aunque la tercera suela quedar vacía, porque el formato impreso la incluye.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">Columnas de horas</h3>
                        <ToggleRow name="incluye_horas_extras" checked={config.incluye_horas_extras}
                            label="Horas extras (recargo 25%)" hint="Columna adicional en la tabla de horas." />
                        <ToggleRow name="incluye_horas_extras_extraord" checked={config.incluye_horas_extras_extraord}
                            label="Horas extras extraordinarias (recargo 35%)" />
                        <ToggleRow name="incluye_horas_dominicales" checked={config.incluye_horas_dominicales}
                            label="Horas dominicales" />
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">Bloques adicionales</h3>
                        <ToggleRow name="incluye_gastos" checked={config.incluye_gastos}
                            label="Bloque de gastos personales"
                            hint="Desayuno / Almuerzo / Cena / Movilidad." />
                        <ToggleRow name="incluye_firma_trabajador" checked={config.incluye_firma_trabajador}
                            label="Firma del trabajador"
                            hint="Se toma de signature_url del perfil del usuario." />
                        <ToggleRow name="incluye_firma_cliente_horas" checked={config.incluye_firma_cliente_horas}
                            label="Firma del cliente validando horas" />
                        <ToggleRow name="incluye_foto_trabajo" checked={config.incluye_foto_trabajo}
                            label="Foto del trabajo realizado" />
                    </section>
                </CardContent>
                <div className="flex justify-end gap-2 p-6 pt-0">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                </div>
            </Card>
        </form>
    )
}

// ────────────────────────────────────────────────────────────────
// Checklist
// ────────────────────────────────────────────────────────────────

function ChecklistForm({ config, tenantUsers }: { config: ConfigChecklist | null; tenantUsers: TenantUser[] }) {
    const [state, formAction, isPending] = useActionState(updateConfigChecklist, null)
    const [notificar, setNotificar] = useState<string[]>(config?.planes_accion_notificar_a ?? [])

    useEffect(() => {
        if (state?.success) toast.success(state.message)
        else if (state?.message) toast.error(state.message)
    }, [state])

    const defaults: ConfigChecklist = config ?? {
        tenant_id: '',
        mostrar_empresa: true,
        mostrar_cliente: true,
        mostrar_tarea: true,
        mostrar_medidores: false,
        mostrar_observaciones: true,
        texto_declaracion: null,
        label_footer: 'Registrado por',
        planes_accion_notificar_a: [],
    }

    return (
        <form action={formAction}>
            <input type="hidden" name="planes_accion_notificar_a" value={JSON.stringify(notificar)} />
            <Card>
                <CardHeader>
                    <CardTitle>Checklist / Inspecciones</CardTitle>
                    <CardDescription>
                        Configura qué secciones aparecen en el checklist, el texto de declaración y los destinatarios de notificación.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">Secciones visibles</h3>
                        <ToggleRow name="mostrar_empresa" checked={defaults.mostrar_empresa}
                            label="Bloque empresa (nombre, RUC, domicilio)" />
                        <ToggleRow name="mostrar_cliente" checked={defaults.mostrar_cliente}
                            label="Bloque cliente (nombre, RUC, cotización)" />
                        <ToggleRow name="mostrar_tarea" checked={defaults.mostrar_tarea}
                            label="Bloque tarea (código, descripción, sitio)" />
                        <ToggleRow name="mostrar_medidores" checked={defaults.mostrar_medidores}
                            label="Sección medidores (horómetro + km + fotos antes/después)"
                            hint="Requerida para equipos con horómetro (ej. CISE). Desactivar en GRUAS." />
                        <ToggleRow name="mostrar_observaciones" checked={defaults.mostrar_observaciones}
                            label="Sección observaciones (texto libre al pie)" />
                    </section>

                    <section className="space-y-2">
                        <Label htmlFor="texto_declaracion">Texto de declaración al pie</Label>
                        <Textarea
                            id="texto_declaracion"
                            name="texto_declaracion"
                            defaultValue={defaults.texto_declaracion ?? ''}
                            placeholder="Ej: Realicé la inspección diaria de la grúa antes de iniciar su operación. (vacío = no mostrar)"
                            rows={3}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">Dejar vacío para no mostrar declaración.</p>
                    </section>

                    <section>
                        <Label htmlFor="label_footer">Label del pie (nombre del firmante)</Label>
                        <Input
                            id="label_footer"
                            name="label_footer"
                            defaultValue={defaults.label_footer}
                            className="max-w-xs mt-1"
                            placeholder="Ej: Registrado por"
                        />
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">Planes de acción — destinatarios de notificación</h3>
                        <p className="text-xs text-muted-foreground">
                            Estas personas recibirán un email cuando se genere un plan de acción automático desde el checklist (ítem respondido NO).
                        </p>
                        <div className="space-y-2">
                            {tenantUsers.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No hay usuarios en este tenant.</p>
                            ) : (
                                tenantUsers.map(u => {
                                    const checked = notificar.includes(u.id)
                                    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.id
                                    return (
                                        <div key={u.id} className="flex items-center gap-3 border rounded-md p-3 bg-muted/20">
                                            <Switch
                                                id={`notif-${u.id}`}
                                                checked={checked}
                                                onCheckedChange={val =>
                                                    setNotificar(val
                                                        ? [...notificar, u.id]
                                                        : notificar.filter(id => id !== u.id)
                                                    )
                                                }
                                            />
                                            <Label htmlFor={`notif-${u.id}`} className="cursor-pointer font-medium flex-1">
                                                {name}
                                                {u.role && (
                                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                        ({u.role === 'admin_tenant' ? 'Administrador' : u.role === 'supervisor' ? 'Supervisor' : u.role})
                                                    </span>
                                                )}
                                            </Label>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </section>
                </CardContent>
                <div className="flex justify-end gap-2 p-6 pt-0">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                </div>
            </Card>
        </form>
    )
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function ToggleRow({ name, checked, label, hint }: { name: string; checked: boolean; label: string; hint?: string }) {
    return (
        <div className="flex items-start gap-3 border rounded-md p-3 bg-muted/20">
            <Switch id={name} name={name} defaultChecked={checked} />
            <div className="flex-1">
                <Label htmlFor={name} className="font-medium cursor-pointer">{label}</Label>
                {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
            </div>
        </div>
    )
}

function ConfigNotFound() {
    return (
        <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">
                No se encontró la configuración de tu tenant. Contactá al administrador del sistema.
            </CardContent>
        </Card>
    )
}
