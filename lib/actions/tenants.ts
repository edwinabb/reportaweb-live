'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

async function assertSystemAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'reporta_admin') {
        redirect('/planificacion')
    }

    return user
}

export async function getTenants() {
    await assertSystemAdmin()

    const supabase = await createClient()

    const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name')

    if (error) {
        console.error('Error fetching companies:', error)
        return []
    }

    return companies
}

/**
 * Retorna el tenant_id activo del usuario autenticado.
 * Lee la cookie httpOnly server-side para que el cliente no necesite acceder a document.cookie.
 */
export async function getActiveTenantId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const cookieStore = await cookies()
    const managedTenantId = cookieStore.get('managed_tenant_id')?.value
    if (managedTenantId) return managedTenantId

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    return profile?.tenant_id ?? null
}

export async function selectTenant(formdata: FormData) {
    await assertSystemAdmin()

    const tenantId = formdata.get('tenantId') as string

    if (!tenantId) {
        throw new Error('Tenant ID es requerido')
    }

    // Verificar que el tenant solicitado existe y está activo
    const supabase = await createClient()
    const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', tenantId)
        .eq('is_active', true)
        .single()

    if (!company) {
        throw new Error('Empresa no encontrada o inactiva')
    }

    const cookieStore = await cookies()

    cookieStore.set('managed_tenant_id', tenantId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 día
    })

    redirect('/')
}
