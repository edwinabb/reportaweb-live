'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { UserDocument } from '@/types/user-documents'

export type ActionState = {
    errors?: { [key: string]: string[] | undefined }
    message?: string
    success?: boolean
} | null

/**
 * Fetch documents for a specific user
 */
export async function getUserDocuments(userId: string): Promise<{ data: UserDocument[] | null, error: string | null }> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('user_documents')
            .select(`
                *,
                document_type:document_types(*)
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getUserDocuments] Error:', error)
            return { data: null, error: error.message }
        }

        return { data: data as UserDocument[], error: null }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { data: null, error: errMsg }
    }
}

/**
 * Helper to normalize strings for paths (e.g. "Juan Pérez" -> "juan_perez")
 */
function cleanString(str: string): string {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/gi, '_')     // replace non-alphanumeric with underscore
        .replace(/_+/g, '_')             // collapse multiple underscores
        .replace(/^_+|_+$/g, '')         // trim underscores
        .toLowerCase()
}

/**
 * Upload a document (File + Metadata)
 */
export async function uploadUserDocument(
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    const supabase = await createClient()

    try {
        // 1. Auth & Context Validation
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) return { message: 'No autenticado', success: false }

        const targetUserId = formData.get('user_id') as string
        const documentTypeId = formData.get('document_type_id') as string
        const file = formData.get('file') as File
        const validFrom = formData.get('valid_from') as string // YYYY-MM-DD
        const validUntil = formData.get('valid_until') as string // YYYY-MM-DD

        if (!targetUserId || !documentTypeId) {
            return { message: 'Faltan datos obligatorios (Usuario o Tipo de Documento)', success: false }
        }
        if (!file || file.size === 0) {
            return { message: 'Debe seleccionar un archivo válido', success: false }
        }

        // 2. Fetch necessary metadata for path construction
        // Need Tenant Name, Target User Name, Document Type Name

        // A. Target User Profile (and their tenant)
        const { data: targetProfile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, tenant_id')
            .eq('id', targetUserId)
            .single()

        if (profileError || !targetProfile) return { message: 'Usuario destino no encontrado', success: false }

        // B. Tenant Info (Company Name)
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', targetProfile.tenant_id)
            .single()

        if (companyError || !company) return { message: 'Empresa/Tenant no encontrado', success: false }

        // C. Document Type Info
        const { data: docType, error: docTypeError } = await supabase
            .from('document_types')
            .select('name, code')
            .eq('id', documentTypeId)
            .single()

        if (docTypeError || !docType) return { message: 'Tipo de documento no encontrado', success: false }

        // 3. Construct Storage Path
        // Pattern: {tenant_clean}/{user_clean}/{doc_type_clean}/{filename_clean}
        // Filename: {doc_type_clean} - {original_name_clean} - {vence_YYYYMMDD}.{ext}

        const tenantClean = cleanString(company.name)
        const userClean = cleanString(`${targetProfile.first_name} ${targetProfile.last_name}`)
        const docClean = cleanString(docType.name)

        const dateSuffix = validUntil ? validUntil.replace(/-/g, '') : 'sin_vencimiento'

        const ext = file.name.split('.').pop()
        const originalNameClean = cleanString(file.name.replace(`.${ext}`, ''))

        const fileNameSanitized = `${docClean}_-_${originalNameClean}_-_${dateSuffix}.${ext}`
        const storagePath = `${tenantClean}/${userClean}/${docClean}/${fileNameSanitized}`

        // 4. Upload File
        const { error: uploadError } = await supabase.storage
            .from('doc_usuarios')
            .upload(storagePath, file, {
                upsert: true,
                contentType: file.type
            })

        if (uploadError) {
            console.error('[uploadUserDocument] Storage Error:', uploadError)
            return { message: `Error al subir archivo: ${uploadError.message}`, success: false }
        }

        // 5. Save Record in DB
        const payload = {
            tenant_id: targetProfile.tenant_id,
            user_id: targetUserId,
            document_type_id: documentTypeId,
            file_path: storagePath,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
            valid_from: validFrom || null,
            valid_until: validUntil || null,

            created_by: currentUser.id,
            is_active: true
        }

        // --- NEW DATE LOGIC START ---
        // 2. Si el documento tiene fecha de vencimiento, y no se cuenta con la fecha de inicio (carga la fecha actual como fecha de inicio).
        if (payload.valid_until && !payload.valid_from) {
            payload.valid_from = new Date().toISOString().split('T')[0]
        }
        // 3. Si el documento que se esta subiendo ya esta vencido y no tiene la fecha desde (carga la misma fecha de vencimiento).
        if (payload.valid_until && !payload.valid_from) {
            const until = new Date(payload.valid_until)
            const today = new Date()
            if (until < today) {
                payload.valid_from = payload.valid_until
            }
        }
        // 4. Revisa que la fecha de vencimiento hasta, sea posterior o al menos igual a la fecha desde.
        if (payload.valid_from && payload.valid_until) {
            if (new Date(payload.valid_until) < new Date(payload.valid_from)) {
                return { message: 'La fecha de vencimiento debe ser posterior o igual a la fecha de inicio.', success: false }
            }
        }
        // --- NEW DATE LOGIC END ---

        const { error: dbError } = await supabase
            .from('user_documents')
            .insert(payload)

        if (dbError) {
            // Ideally we should rollback storage, but simplified for now
            console.error('[uploadUserDocument] DB Insert Error:', dbError)
            return { message: `Archivo subido pero error al guardar registro: ${dbError.message}`, success: false }
        }

        revalidatePath(`/users/${targetUserId}`)
        return { message: 'Documento subido exitosamente', success: true }

    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        console.error('[uploadUserDocument] Exception:', error)
        return { message: `Error inesperado: ${errMsg}`, success: false }
    }
}

/**
 * Delete (Soft Delete) a User Document
 */
export async function deleteUserDocument(id: string, userId: string): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { message: 'No autenticado', success: false }

    try {
        const { error } = await supabase
            .from('user_documents')
            .update({
                is_active: false,
                modified_by: user.id,
                modified_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            return { message: 'Error al eliminar documento', success: false }
        }

        revalidatePath(`/users/${userId}`)
        return { message: 'Documento eliminado', success: true }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { message: `Error: ${errMsg}`, success: false }
    }
}

/**
 * Update document metadata (valid_from, valid_until)
 */
/**
 * Update document metadata and optionally replace file
 */
export async function updateUserDocument(
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { message: 'No autenticado', success: false }

    const id = formData.get('id') as string
    const userId = formData.get('user_id') as string
    const validFrom = formData.get('valid_from') as string
    const validUntil = formData.get('valid_until') as string
    const documentTypeId = formData.get('document_type_id') as string
    const file = formData.get('file') as File | null

    if (!id || !userId) {
        return { message: 'ID de documento y usuario son requeridos', success: false }
    }

    try {
        const payload: any = {
            valid_from: validFrom || null,
            valid_until: validUntil || null,
            modified_by: user.id,
            modified_at: new Date().toISOString()
        }

        if (documentTypeId) {
            payload.document_type_id = documentTypeId
        }

        // Handle File Replacement
        if (file && file.size > 0) {
            // Fetch necessary metadata to construct new path (similar to upload)
            // 1. Get Tenant & User Profile
            const { data: targetProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name, tenant_id')
                .eq('id', userId)
                .single()

            if (!targetProfile) return { message: 'Perfil de usuario no encontrado', success: false }

            // 2. Get Company/Tenant Name
            const { data: company } = await supabase
                .from('companies')
                .select('name')
                .eq('id', targetProfile.tenant_id)
                .single()

            if (!company) return { message: 'Empresa no encontrada', success: false }

            // 3. Get Document Type Name (New or Existing)
            // If documentTypeId changed, fetch new name. If not, fetch existing doc type from DB or pass it.
            // Safer to just fetch the one we are setting (or keeping).
            let targetTypeId = documentTypeId
            if (!targetTypeId) {
                // If not changing type, get current one
                const { data: currentDoc } = await supabase.from('user_documents').select('document_type_id').eq('id', id).single()
                targetTypeId = currentDoc?.document_type_id
            }

            const { data: docType } = await supabase
                .from('document_types')
                .select('name')
                .eq('id', targetTypeId)
                .single()

            if (!docType) return { message: 'Tipo de documento no encontrado', success: false }

            // 4. Construct Path
            const tenantClean = cleanString(company.name)
            const userClean = cleanString(`${targetProfile.first_name} ${targetProfile.last_name}`)
            const docClean = cleanString(docType.name)
            const dateSuffix = validUntil ? validUntil.replace(/-/g, '') : 'sin_vencimiento'
            const ext = file.name.split('.').pop()
            const originalNameClean = cleanString(file.name.replace(`.${ext}`, ''))
            const fileNameSanitized = `${docClean}_-_${originalNameClean}_-_${dateSuffix}.${ext}`
            const storagePath = `${tenantClean}/${userClean}/${docClean}/${fileNameSanitized}`

            // 5. Upload New File
            const { error: uploadError } = await supabase.storage
                .from('doc_usuarios')
                .upload(storagePath, file, {
                    upsert: true,
                    contentType: file.type
                })

            if (uploadError) {
                return { message: `Error al subir nuevo archivo: ${uploadError.message}`, success: false }
            }

            // Update Payload with New File Info
            payload.file_path = storagePath
            payload.file_name = file.name
            payload.file_size = file.size
            payload.content_type = file.type
        }

        const { error } = await supabase
            .from('user_documents')
            .update(payload)
            .eq('id', id)

        if (error) {
            console.error('[updateUserDocument] Error:', error)
            return { message: 'Error al actualizar documento', success: false }
        }

        revalidatePath(`/users/${userId}`)
        revalidatePath('/users/documents')
        return { message: 'Documento actualizado exitosamente', success: true }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { message: `Error: ${errMsg}`, success: false }
    }
}

/**
 * Upload a document to multiple users (Bulk)
 */
export async function uploadBulkUserDocument(
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    const supabase = await createClient()

    try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) return { message: 'No autenticado', success: false }

        const userIdsJson = formData.get('user_ids') as string
        const documentTypeId = formData.get('document_type_id') as string
        const file = formData.get('file') as File
        const validFrom = formData.get('valid_from') as string
        const validUntil = formData.get('valid_until') as string

        const userIds: string[] = JSON.parse(userIdsJson || '[]')

        if (!userIds.length || !documentTypeId) {
            return { message: 'Faltan datos obligatorios (Usuarios o Tipo de Documento)', success: false }
        }
        if (!file || file.size === 0) {
            return { message: 'Debe seleccionar un archivo válido', success: false }
        }

        // 1. Get Tenant Info from currentUser profile (assuming all users belong to same tenant)
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('tenant_id, companies(name)')
            .eq('id', currentUser.id)
            .single()

        if (!currentProfile?.tenant_id) return { message: 'Contexto de empresa no encontrado', success: false }
        const tenantId = currentProfile.tenant_id
        const companyName = (currentProfile as any).companies?.name || 'global'

        // 2. Get Doc Type info
        const { data: docType } = await supabase
            .from('document_types')
            .select('name')
            .eq('id', documentTypeId)
            .single()

        if (!docType) return { message: 'Tipo de documento no encontrado', success: false }

        // 3. Construct Path
        // Pattern: {tenant_clean}/{user_clean}/{doc_type_clean}/{filename_clean}
        // For bulk, since files are per-user in this schema version to fulfill the requested path,
        // we will upload the file for EACH user to their respective folder.

        const tenantClean = cleanString(companyName)
        const docClean = cleanString(docType.name)
        const dateSuffix = validUntil ? validUntil.replace(/-/g, '') : 'sin_vencimiento'
        const ext = file.name.split('.').pop()
        const originalNameClean = cleanString(file.name.replace(`.${ext}`, ''))
        const fileNameSanitized = `${docClean}_-_${originalNameClean}_-_${dateSuffix}.${ext}`

        // 4. Prepare Date Logic
        let effectiveValidFrom = validFrom || null
        if (validUntil && !effectiveValidFrom) {
            const until = new Date(validUntil)
            const today = new Date()
            effectiveValidFrom = (until < today) ? validUntil : today.toISOString().split('T')[0]
        }

        if (effectiveValidFrom && validUntil && new Date(validUntil) < new Date(effectiveValidFrom)) {
            return { message: 'La fecha de vencimiento es inválida.', success: false }
        }

        // 5. Insert for each user
        const results = await Promise.all(userIds.map(async (id) => {
            const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', id).single()
            const userClean = cleanString(`${profile?.first_name || ''} ${profile?.last_name || ''}`)
            const storagePath = `${tenantClean}/${userClean}/${docClean}/${fileNameSanitized}`

            // Upload to user-specific folder
            await supabase.storage.from('doc_usuarios').upload(storagePath, file, { upsert: true, contentType: file.type })

            return {
                tenant_id: tenantId,
                user_id: id,
                document_type_id: documentTypeId,
                file_path: storagePath,
                file_name: file.name,
                file_size: file.size,
                content_type: file.type,
                valid_from: effectiveValidFrom,
                valid_until: validUntil || null,
                created_by: currentUser.id,
                is_active: true
            }
        }))

        const { error: dbError } = await supabase.from('user_documents').insert(results)

        if (dbError) return { message: `Error al guardar registros: ${dbError.message}`, success: false }

        revalidatePath('/users/documents')
        return { message: `Documento asignado exitosamente a ${userIds.length} usuarios.`, success: true }

    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { message: `Error inesperado: ${errMsg}`, success: false }
    }
}
/**
 * Toggle active status of a user document
 */
export async function toggleUserDocumentStatus(id: string, currentStatus: boolean, userId: string): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { message: 'No autenticado', success: false }

    try {
        const { error } = await supabase
            .from('user_documents')
            .update({
                is_active: !currentStatus,
                modified_by: user.id,
                modified_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            return { message: 'Error al cambiar estado del documento', success: false }
        }

        revalidatePath(`/users/${userId}`)
        revalidatePath('/users/documents')
        return { message: `Documento ${!currentStatus ? 'habilitado' : 'deshabilitado'}`, success: true }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Error desconocido'
        return { message: `Error: ${errMsg}`, success: false }
    }
}
