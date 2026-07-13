'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const updateUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email('Debe ser un correo electrónico válido'),
    firstName: z.string().min(1, 'El nombre es obligatorio'),
    lastName: z.string().min(1, 'El apellido es obligatorio'),
    role: z.enum(['admin_tenant', 'supervisor', 'member']).optional(),
    docNumber: z.string().min(1, 'El documento de identidad es obligatorio'),
    gender: z.enum(['Masculino', 'Femenino']).optional(),
    middleName: z.string().optional(),
    secondLastName: z.string().optional(),
    docType: z.enum(['DNI', 'CE', 'PASSPORT', 'RUC', 'OTHER']),
    nationality: z.string().optional(),
    birthDate: z.string().optional(),
    phone: z.string().optional(),
    jobTitleId: z.string().uuid().optional().or(z.literal('')),
    direccion: z.string().optional(),
    contactoEmergenciaNombre: z.string().optional(),
    contactoEmergenciaParentesco: z.string().optional(),
    contactoEmergenciaCelular: z.string().optional(),
})

export type UpdateUserState = {
    errors?: {
        [key: string]: string[] | undefined
    }
    message?: string
    success?: boolean
} | null

export async function updateUser(prevState: UpdateUserState, formData: FormData): Promise<UpdateUserState> {
    const validatedFields = updateUserSchema.safeParse({
        id: formData.get('id'),
        email: formData.get('email'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        role: formData.get('role') || undefined,
        docNumber: formData.get('docNumber'),
        gender: formData.get('gender'),
        middleName: formData.get('middleName'),
        secondLastName: formData.get('secondLastName'),
        docType: formData.get('docType'),
        nationality: formData.get('nationality'),
        birthDate: formData.get('birthDate'),
        phone: formData.get('phone'),
        jobTitleId: formData.get('jobTitleId'),
        direccion: formData.get('direccion'),
        contactoEmergenciaNombre: formData.get('contactoEmergenciaNombre'),
        contactoEmergenciaParentesco: formData.get('contactoEmergenciaParentesco'),
        contactoEmergenciaCelular: formData.get('contactoEmergenciaCelular'),
    })

    if (!validatedFields.success) {
        const fieldErrors = validatedFields.error.flatten().fieldErrors
        const invalidFields = Object.keys(fieldErrors).join(', ')
        return {
            errors: fieldErrors,
            message: `Datos inválidos en los campos: ${invalidFields}. Revise la información.`,
        }
    }

    const data = validatedFields.data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        return { message: 'Error de configuración del servidor (falta Service Key).' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    })

    try {
        // 0. Get Tenant Info for Storage Path
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', data.id).single()
        if (!profile) return { message: 'Usuario no encontrado' }

        const { data: tenant } = await supabase.from('companies').select('name').eq('id', profile.tenant_id).single()
        const tenantClean = (tenant?.name || 'unknown').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const userClean = `${data.firstName}_${data.lastName}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase()

        // 1. Process File Uploads
        let photoUrl = undefined
        let signatureUrl = undefined
        const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '')

        const photoFile = formData.get('photo') as File
        if (photoFile && photoFile.size > 0) {
            const ext = photoFile.name.split('.').pop()
            const fileName = `foto_${todayStr}.${ext}`
            const filePath = `${tenantClean}/${userClean}/${fileName}`
            const { error: uploadError } = await supabase.storage.from('usuarios').upload(filePath, photoFile, {
                upsert: true,
                contentType: photoFile.type
            })
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('usuarios').getPublicUrl(filePath)
                photoUrl = publicUrl
            }
        }

        const signatureFile = formData.get('signature') as File
        if (signatureFile && signatureFile.size > 0) {
            const ext = signatureFile.name.split('.').pop()
            const fileName = `firma_${todayStr}.${ext}`
            const filePath = `${tenantClean}/${userClean}/${fileName}`
            const { error: uploadError } = await supabase.storage.from('usuarios').upload(filePath, signatureFile, {
                upsert: true,
                contentType: signatureFile.type
            })
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('usuarios').getPublicUrl(filePath)
                signatureUrl = publicUrl
            }
        }

        // 2. Update Auth Email if changed
        const { error: authError } = await supabase.auth.admin.updateUserById(data.id, {
            email: data.email,
            user_metadata: {
                first_name: data.firstName,
                last_name: data.lastName,
            }
        })
        if (authError) return { message: `Error Auth: ${authError.message}` }

        // 3. Update Profiles
        const profileUpdate: Record<string, unknown> = {
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            doc_number: data.docNumber,
            direccion: data.direccion || null,
            contacto_emergencia_nombre: data.contactoEmergenciaNombre || null,
            contacto_emergencia_parentesco: data.contactoEmergenciaParentesco || null,
            contacto_emergencia_celular: data.contactoEmergenciaCelular || null,
        }
        // Sólo actualizar role si el admin lo envió (en self-service está oculto)
        if (data.role) profileUpdate.role = data.role
        // phone y gender viven en `profiles`, NO en `profile_details`
        if (data.gender) profileUpdate.gender = data.gender
        if (data.phone) profileUpdate.phone = data.phone || null
        // pin se edita en flujo separado — no incluir aquí

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', data.id)
        if (profileError) return { message: 'Error al actualizar perfil' }

        // 4. Update Profile Details
        const detailsUpdate: Record<string, string | null | undefined> = {
            id: data.id,
            tenant_id: profile.tenant_id,
            middle_name: data.middleName || null,
            second_last_name: data.secondLastName || null,
            doc_type: data.docType,
            nationality: data.nationality || null,
            birth_date: data.birthDate || null,
            job_title_id: data.jobTitleId || null,
        }
        if (photoUrl) detailsUpdate.photo_url = photoUrl
        if (signatureUrl) detailsUpdate.signature_url = signatureUrl

        const { error: detailsError } = await supabase
            .from('profile_details')
            .upsert(detailsUpdate)

        if (detailsError) {
            console.error('[updateUser] Error updating details:', detailsError)
            return { message: `Error al actualizar detalles: ${detailsError.message}` }
        }

    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        console.error('[updateUser] Exception:', error)
        return { message: `Error inesperado: ${errMsg}` }
    }

    const redirectTo = (formData.get('redirectTo') as string) || '/users'
    revalidatePath('/users')
    revalidatePath('/settings/perfil')
    revalidatePath(`/users/${data.id}/edit`)
    redirect(redirectTo)
}
