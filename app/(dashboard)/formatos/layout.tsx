import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getActiveTenantId } from '@/lib/actions/tenants'

export default async function FormatosLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const tenantId = await getActiveTenantId()

    if (tenantId) {
        const { data: company } = await supabase
            .from('companies')
            .select('modulos_activos')
            .eq('id', tenantId)
            .single()

        // modulos_activos null = todos visibles (backwards compat)
        // Array no-null sin 'formatos' = módulo deshabilitado para este tenant
        if (company?.modulos_activos !== null && company?.modulos_activos !== undefined) {
            if (!company.modulos_activos.includes('formatos')) {
                redirect('/')
            }
        }
    }

    return <>{children}</>
}
