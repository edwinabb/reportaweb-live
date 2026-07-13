import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
    title: 'Tu trial ha terminado — REPORTAR.APP',
}

export default async function TrialExpiradoPage({
    searchParams,
}: {
    searchParams: Promise<{ extended?: string }>
}) {
    const params = await searchParams
    const isExtended = params.extended === '1'

    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    let tenantId: string | null = null
    let stats = { reportes: 0, tareas: 0 }

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        tenantId = profile?.tenant_id ?? null

        if (tenantId) {
            const [{ count: reportes }, { count: tareas }] = await Promise.all([
                supabase
                    .from('reportes_maquinaria')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId),
                supabase
                    .from('tareas')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId),
            ])
            stats = { reportes: reportes ?? 0, tareas: tareas ?? 0 }
        }
    }

    const activarHref = tenantId
        ? `/contacto?origen=trial-expirado&tenant=${tenantId}`
        : `/contacto?origen=trial-expirado`

    const extendHref = tenantId
        ? `/api/trial/extend-request?tenant=${tenantId}`
        : `/api/trial/extend-request`

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg space-y-4">
                {/* Extended banner */}
                {isExtended && (
                    <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
                        ✅ Se extendió tu acceso 3 días adicionales. Te contactaremos pronto.
                    </div>
                )}

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-3xl">
                            ⏰
                        </div>
                    </div>

                    {/* Title & subtitle */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-black text-slate-900">
                            Tu período de prueba ha terminado
                        </h1>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Tus datos están seguros y disponibles al activar tu cuenta.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-4 text-center space-y-1">
                            <p className="text-2xl font-black text-orange-600">
                                {stats.reportes}
                            </p>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                Reportes
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-center space-y-1">
                            <p className="text-2xl font-black text-orange-600">
                                {stats.tareas}
                            </p>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                Tareas
                            </p>
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="space-y-3">
                        <a
                            href={activarHref}
                            className="block w-full text-center bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl py-3.5 transition-colors"
                        >
                            Activar mi cuenta →
                        </a>
                        <a
                            href={extendHref}
                            className="block w-full text-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl py-3 transition-colors"
                        >
                            Necesito más tiempo
                        </a>
                    </div>

                    {/* Help text */}
                    <p className="text-center text-xs text-slate-400">
                        ¿Preguntas? Escríbenos a{' '}
                        <a
                            href="mailto:info@reportar.app"
                            className="text-slate-600 hover:underline"
                        >
                            info@reportar.app
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
