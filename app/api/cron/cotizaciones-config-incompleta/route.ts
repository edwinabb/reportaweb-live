// app/api/cron/cotizaciones-config-incompleta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { renderCotizacionesConfigIncompletaEmailHtml } from '@/lib/notificaciones-email-templates'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reportar.app'

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    // Nota: `companies` no tiene columna `nombre_comercial` (verificado vía information_schema
    // contra TEST y PROD) — usa `name` como nombre comercial, con `razon_social` de fallback.
    const { data: tenants, error: tenantsError } = await supabase
        .from('companies')
        .select('id, name, razon_social')

    if (tenantsError) {
        console.error('[cotizaciones-config-incompleta] Error fetching tenants:', tenantsError.message)
        return NextResponse.json({ ok: false, error: tenantsError.message }, { status: 500 })
    }

    if (!tenants?.length) {
        return NextResponse.json({ ok: true, message: 'No tenants found' })
    }

    const diaSemanaHoy = new Date().getUTCDay()
    const summary: Record<string, { faltaBanco: boolean; faltaFirma: boolean; emailsTo: number; emailsCc: number }> = {}

    for (const tenant of tenants) {
        try {
            const tenantId = tenant.id
            const tenantNombre = tenant.name || tenant.razon_social || tenantId

            const { data: config } = await supabase
                .from('cotizaciones_configuracion')
                .select('imagen_banco, imagen_firma')
                .eq('tenant_id', tenantId)
                .maybeSingle()

            const faltaBanco = !config?.imagen_banco
            const faltaFirma = !config?.imagen_firma

            if (!faltaBanco && !faltaFirma) continue

            const { data: receptores } = await supabase
                .from('notificaciones_receptores')
                .select('email, nombre, tipo_correo, tipo_destinatario, frecuencia, dia_semana')
                .eq('tenant_id', tenantId)
                .eq('tipo_correo', 'COTIZACIONES_CONFIG_INCOMPLETA')
                .eq('is_active', true)

            const activos = (receptores ?? []).filter((r) => {
                if (r.frecuencia !== 'SEMANAL') return true
                return r.dia_semana === diaSemanaHoy
            })

            const toList = activos.filter((r) => r.tipo_destinatario === 'TO').map((r) => r.email)
            const ccList = activos.filter((r) => r.tipo_destinatario === 'CC').map((r) => r.email)

            summary[tenantNombre] = { faltaBanco, faltaFirma, emailsTo: toList.length, emailsCc: ccList.length }

            if (toList.length === 0) continue // no hay a quién dirigirlo, no se envía (CC solo no alcanza)

            const nombreSaludo = activos.find((r) => r.tipo_destinatario === 'TO')?.nombre ?? ''
            const html = renderCotizacionesConfigIncompletaEmailHtml({
                nombre: nombreSaludo,
                tenantNombre,
                faltaImagenBanco: faltaBanco,
                faltaImagenFirma: faltaFirma,
                siteUrl: SITE_URL,
            })

            await sendEmail({
                to: toList,
                cc: ccList.length > 0 ? ccList : undefined,
                subject: `⚠️ Cotizaciones — configuración incompleta · ${tenantNombre}`,
                html,
            })
        } catch (err) {
            console.error(`[cotizaciones-config-incompleta] Error tenant ${tenant.id}:`, err)
        }
    }

    return NextResponse.json({ ok: true, summary })
}
