'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
})

export async function login(prevState: any, formData: FormData) {
    const result = loginSchema.safeParse(Object.fromEntries(formData))

    if (!result.success) {
        return {
            error: 'Datos inválidos',
        }
    }

    const { email, password } = result.data
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return {
            error: 'Credenciales inválidas', // Keep it generic for security, or use error.message
        }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // Check if user is an admin of the main tenant (REPORTA)
        // We use the service role client here (createClient from utils/supabase/admin.ts?)
        // Or actually, we can try with the current client but might hit RLS if policy relies on tenant_id cookie which isn't set yet.
        // Let's assume we can read our own profile.

        // Wait! We can't easily see "REPORTA" name without joining table.
        // Let's do a quick check on the profile using admin client for safety/robustness.
    }

    // Since we are inside a server action, let's just use the server client we have.
    // If it fails to read, we just go to dashboard.

    // HOWEVER, to reliably know if it's "REPORTA", we need to query.
    // Let's create an admin client here just for the check? 
    // Importing from '@/utils/supabase/admin' might expose SERVICE KEY logic which is fine in server action.

    // Better: use the current client. RLS "users can view own profile".

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            role,
            companies ( name )
        `)
        .eq('id', user?.id)
        .single()

    // Type definition for the joined query result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyName = (profile?.companies as any)?.name

    if (profile?.role === 'admin_tenant' && companyName === 'REPORTA') {
        redirect('/select-tenant')
    }

    revalidatePath('/', 'layout')
    redirect('/planificacion')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    const parsed = z.string().email().safeParse(email)
    if (!parsed.success) {
        return { success: false, error: 'Ingresa un correo válido' }
    }

    const headerStore = await headers()
    const origin = headerStore.get('origin') ?? headerStore.get('x-forwarded-host') ?? 'http://localhost:3000'

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${origin}/auth/reset-password`,
    })

    if (error) {
        return { success: false, error: 'No se pudo enviar el correo. Intenta de nuevo.' }
    }

    return { success: true }
}

export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const parsed = z.string().min(8, 'Mínimo 8 caracteres').safeParse(newPassword)
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password: parsed.data })

    if (error) {
        return { success: false, error: 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' }
    }

    return { success: true }
}
