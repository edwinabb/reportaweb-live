import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getCotizacionById } from '@/lib/actions/cotizaciones'
import { getTerceros } from '@/lib/actions/terceros'
import { getTerceroContactos, getTerceroSitios } from '@/lib/actions/terceros-modules'
import { getFormasPago, getPlazosPago } from '@/lib/actions/opciones'
import { getGlobalPDFConfig, getTenantInfo } from '@/lib/actions/cotizaciones-config'
import { CotizacionHeader } from '@/components/cotizaciones/cotizacion-header'
import { createClient } from '@/utils/supabase/server'
import { CotizacionPaso1Form } from '@/components/cotizaciones/cotizacion-paso1-form'
import { MatrizResponsabilidadForm } from '@/components/cotizaciones/matriz-responsabilidad-form'
import { CotizacionPreciosForm } from '@/components/cotizaciones/cotizacion-precios-form'
import { CotizacionPDFPreview } from '@/components/cotizaciones/cotizacion-pdf-preview'
import { CotizacionEnviarCliente } from '@/components/cotizaciones/cotizacion-enviar-cliente'
import { CotizacionRespuestaCliente } from '@/components/cotizaciones/cotizacion-respuesta-cliente'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent } from '@/components/ui/tabs'

async function CotizacionContent({ id, tab = 'paso1', readOnly = false, action }: { id: string, tab?: string, readOnly?: boolean, action?: string }) {
    const cotizacion = await getCotizacionById(id)

    if (!cotizacion) {
        notFound()
    }

    const terceros = await getTerceros()
    const contactos = await getTerceroContactos()
    const sitios = await getTerceroSitios()

    // Get tenantId for options
    // Assuming 'cotizacion.tenant_id' is available and reliable? 
    // Yes, for existing quote we should use its tenant_id ideally, or the user's current tenant.
    // Usually they match. safer to use user's tenant context? 
    // Let's use user's tenant from profile to be consistent with creating new.
    // Or simpler: use cotizacion.tenant_id if we trust it. 
    // Let's stick to profile lookup for consistency with "Nueva".

    // Actually, getCotizacionById returns 'companies' via reference? 
    // Let's fetch profile quickly.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let tenantId = ''
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()
        tenantId = profile?.tenant_id
    }

    const formasPagoList = await getFormasPago(tenantId)
    const plazosPagoList = await getPlazosPago(tenantId)

    const opcionesFormaPago = formasPagoList?.map((f: { nombre: string }) => f.nombre) || []
    const opcionesPlazoPago = plazosPagoList?.map((p: { nombre: string }) => p.nombre) || []


    const globalConfig = await getGlobalPDFConfig()
    const tenantInfo = await getTenantInfo()

    return (
        <>

            {/* Header Universal */}
            <div className="mb-6">
                <CotizacionHeader cotizacionId={cotizacion.id} readOnly={readOnly} />
            </div>

            <Tabs value={tab} className="space-y-0">
                {/* Space-y-0 because header is separate now, but TabsContent might need margin. 
                   Actually, CotizacionHeader has border-b and bg-background. 
                   We should ensure visual continuity. The tabs content usually has padding or borders.
                   Let's keep spacing normal.
               */}

                <TabsContent value="paso1" className="mt-6">
                    <CotizacionPaso1Form
                        cotizacion={cotizacion}
                        detalles={cotizacion.detalles || []}
                        terceros={terceros}
                        contactos={contactos}
                        sitios={sitios}
                        opcionesFormaPago={opcionesFormaPago}
                        opcionesPlazoPago={opcionesPlazoPago}
                        readOnly={readOnly}
                        defaultOpenServiceSelector={action === 'add-service'}
                    />
                </TabsContent>

                <TabsContent value="paso2" className="mt-6">
                    <MatrizResponsabilidadForm cotizacion_id={cotizacion.id} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="paso3" className="mt-6">
                    <CotizacionPreciosForm
                        cotizacion_id={cotizacion.id}
                        cotizacion_moneda={cotizacion.moneda}
                        cliente_id={cotizacion.cliente_id}
                        detalles={cotizacion.detalles || []}
                        opcionesFormaPago={opcionesFormaPago}
                        opcionesPlazoPago={opcionesPlazoPago}
                        readOnly={readOnly}
                    />
                </TabsContent>

                <TabsContent value="paso4" className="mt-6">
                    <CotizacionPDFPreview cotizacion={cotizacion} globalConfig={globalConfig} tenantInfo={tenantInfo} />
                </TabsContent>

                <TabsContent value="paso5" className="mt-6">
                    <CotizacionEnviarCliente cotizacion={cotizacion} />
                </TabsContent>

                <TabsContent value="paso6" className="mt-6">
                    <CotizacionRespuestaCliente
                        cotizacion_id={cotizacion.id}
                        moneda={cotizacion.moneda ?? 'USD'}
                    />
                </TabsContent>
            </Tabs>
        </>
    )
}

export default async function CotizacionPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tab?: string; mode?: string; action?: string }>
}) {
    const { id } = await params
    const { tab, mode, action } = await searchParams
    const isReadOnly = mode === 'view'

    return (
        <div className="w-full px-6 py-6">

            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <CotizacionContent id={id} tab={tab} readOnly={isReadOnly} action={action} />
            </Suspense>
        </div>
    )
}
