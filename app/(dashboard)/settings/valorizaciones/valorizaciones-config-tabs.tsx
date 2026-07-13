'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    ConfigValorizacion,
    updateConfigValorizacionVenta,
    updateConfigValorizacionCompra,
} from '@/lib/actions/valorizaciones-config'

interface Props {
    configVenta: ConfigValorizacion | null
    configCompra: ConfigValorizacion | null
}

export function ValorizacionesConfigTabs({ configVenta, configCompra }: Props) {
    return (
        <Tabs defaultValue="venta" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="venta">Valorización de Venta</TabsTrigger>
                <TabsTrigger value="compra">Valorización de Compra</TabsTrigger>
            </TabsList>

            <TabsContent value="venta" className="mt-4">
                <ConfigForm
                    config={configVenta}
                    action={updateConfigValorizacionVenta}
                    tipo="venta"
                />
            </TabsContent>

            <TabsContent value="compra" className="mt-4">
                <ConfigForm
                    config={configCompra}
                    action={updateConfigValorizacionCompra}
                    tipo="compra"
                />
            </TabsContent>
        </Tabs>
    )
}

function ConfigForm({
    config, action, tipo,
}: {
    config: ConfigValorizacion | null
    action: typeof updateConfigValorizacionVenta
    tipo: 'venta' | 'compra'
}) {
    const [state, formAction, isPending] = useActionState(action, null)

    useEffect(() => {
        if (state?.success) toast.success(state.message)
        else if (state?.message) toast.error(state.message)
    }, [state])

    if (!config) {
        return (
            <Card>
                <CardContent className="p-6 text-muted-foreground">
                    No se encontró la configuración de tu tenant. Contactá al administrador.
                </CardContent>
            </Card>
        )
    }

    const titulo = tipo === 'venta'
        ? 'Valorización de Venta — emitida al cliente'
        : 'Valorización de Compra — soporte interno / pago proveedor'

    const descripcion = tipo === 'venta'
        ? 'Formato del PDF de valorización que va al cliente. Ej. G.PAC-04 V.05.'
        : 'Formato interno que documenta lo que se debe al proveedor. Normalmente no viaja fuera de la empresa.'

    return (
        <form action={formAction}>
            <Card>
                <CardHeader>
                    <CardTitle>{titulo}</CardTitle>
                    <CardDescription>{descripcion}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor={`${tipo}_codigo`}>Código del formato</Label>
                            <Input id={`${tipo}_codigo`} name="codigo_formato" defaultValue={config.codigo_formato} required />
                            <p className="text-xs text-muted-foreground mt-1">Ej. G.PAC-04</p>
                        </div>
                        <div>
                            <Label htmlFor={`${tipo}_version`}>Versión</Label>
                            <Input id={`${tipo}_version`} name="version_formato" defaultValue={config.version_formato} required />
                            <p className="text-xs text-muted-foreground mt-1">Ej. V.05</p>
                        </div>
                        <div>
                            <Label htmlFor={`${tipo}_fecha`}>Fecha del formato</Label>
                            <Input id={`${tipo}_fecha`} name="fecha_formato" defaultValue={config.fecha_formato} required />
                            <p className="text-xs text-muted-foreground mt-1">Ej. Sept-2025</p>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor={`${tipo}_igv`}>IGV por defecto (%)</Label>
                            <Input
                                id={`${tipo}_igv`}
                                name="igv_default"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                defaultValue={config.igv_default}
                                required
                            />
                            <p className="text-xs text-muted-foreground mt-1">Perú estándar: 18%.</p>
                        </div>
                        <div>
                            <Label htmlFor={`${tipo}_detr`}>Detracción por defecto (%)</Label>
                            <Input
                                id={`${tipo}_detr`}
                                name="detraccion_default"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                defaultValue={config.detraccion_default}
                                required
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Servicios de alquiler de maquinaria: 10% típico. Se puede ajustar en cada factura.
                            </p>
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
