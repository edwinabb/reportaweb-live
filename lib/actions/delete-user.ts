'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function deleteUser(userId: string) {
    if (!userId) return { message: 'ID de usuario requerido' }

    // Use Admin Client for deletion (requires service role to delete from auth.users)
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    // Soft Delete Logic
    // 1. Generate new email: YYYYMMDDhhmm_userId@mail.com
    // We append userId to ensure uniqueness if multiple users are deleted at the same time.
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 12) // YYYYMMDDHHmm
    const newEmail = `${timestamp}_${userId}@mail.com`

    try {
        // 2. Update Auth User: Change email to invalidate login
        // We wrap this in a sub-try/catch because if the user is already disabled or email exists (rare), we still want to disable the profile.
        let authError = null
        try {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email: newEmail,
                email_confirm: true,
                user_metadata: { is_active: false }
            })
            authError = error
        } catch (e) {
            console.error("Auth update exception (non-fatal):", e)
        }

        if (authError) {
            console.error('Error disabling auth user:', authError)
            // Continue to disable profile in DB so they don't show up in the app
        }

        // 3. Update Profiles and Details: Set is_active = false
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                is_active: false,
                email: newEmail // Sync email change to profile if possible
            })
            .eq('id', userId)

        if (profileError) {
            console.error('Error disabling profile:', profileError)
            return { message: 'Error al actualizar perfil' }
        }

        const { error: detailsError } = await supabaseAdmin
            .from('profile_details')
            .update({ is_active: false })
            .eq('id', userId)

        if (detailsError) {
            console.error('Error disabling profile details:', detailsError)
            // Non-critical if profile is already disabled
        }

        revalidatePath('/users')
        return { message: 'Usuario desactivado correctamente. Email cambiado.' }

    } catch (error) {
        return { message: 'Error inesperado al eliminar usuario' }
    }
}
