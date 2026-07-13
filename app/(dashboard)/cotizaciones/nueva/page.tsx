import { Suspense } from 'react'
import { getTerceros } from '@/lib/actions/terceros'
import { getTerceroContactos, getTerceroSitios } from '@/lib/actions/terceros-modules'
import { getFormasPago, getPlazosPago } from '@/lib/actions/opciones'
import { CotizacionHeader } from '@/components/cotizaciones/cotizacion-header'
import { CotizacionPaso1Form } from '@/components/cotizaciones/cotizacion-paso1-form'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/utils/supabase/server'

async function NuevaCotizacionContent() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // We need tenant_id. Ideally we get it from profile.
    // For now let's fetch profile to be sure.
    let tenantId = ''
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()
        tenantId = profile?.tenant_id
    }

    // Parallel fetching
    const [terceros, contactos, sitios, formasPago, plazosPago] = await Promise.all([
        getTerceros(),
        getTerceroContactos(),
        getTerceroSitios(),
        getFormasPago(tenantId),
        getPlazosPago(tenantId)
    ])

    // Extract names for dropdowns
    const opcionesFormaPago = formasPago?.map((f: any) => f.nombre) || []
    const opcionesPlazoPago = plazosPago?.map((p: any) => p.nombre) || []

    return (
        <>
            {/* Header Universal */}
            <div className="mb-6">
                <CotizacionHeader /> {/* No ID passed, so tabs 2-5 disabled */}
            </div>

            <CotizacionPaso1Form
                terceros={terceros}
                contactos={contactos}
                sitios={sitios}
                opcionesFormaPago={opcionesFormaPago}
                opcionesPlazoPago={opcionesPlazoPago}
            />
        </>
    )
}

export default function NuevaCotizacionPage() {
    return (
        <div className="w-full px-6 py-6">



            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <NuevaCotizacionContent />
            </Suspense>
        </div>
    )
}
