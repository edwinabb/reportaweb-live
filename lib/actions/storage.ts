'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Helper to get Context (similar to other actions)
async function getContext() {
    const cookieStore = await cookies()
    const managedTenantId = cookieStore.get('managed_tenant_id')?.value
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // We need admin client to fetch tenant details if RLS hides it or just for consistency
    const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    let tenantId = managedTenantId
    if (!tenantId && user) {
        const { data: profile } = await adminClient
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()
        tenantId = profile?.tenant_id
    }

    return { adminClient, tenantId }
}

function sanitizeAlias(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
        .substring(0, 30) // Max 30 chars
}

function getFormattedDate(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

// ... (keep sanitizeAlias, getFormattedDate helpers)

export async function uploadFile(formData: FormData) {
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'default'
    const subfolder = formData.get('subfolder') as string
    const customFilename = formData.get('customFilename') as string
    const pathStart = formData.get('pathStart') as string // Manual override for tenant folder name

    if (!file) {
        return { success: false, message: 'No file provided' }
    }

    const { adminClient, tenantId } = await getContext()
    if (!tenantId || !adminClient) {
        return { success: false, message: 'Unauthorized or Tenant not found' }
    }

    // Determine Tenant Folder Name
    let tenantFolder = 'tenant_' + tenantId.substring(0, 8)

    if (pathStart) {
        // User provided specific clean name
        tenantFolder = sanitizeAlias(pathStart)
    } else {
        // Attempt to get real name
        try {
            const { data: tenant } = await adminClient
                .from('tenants')
                .select('name')
                .eq('id', tenantId)
                .single()

            if (tenant?.name) {
                tenantFolder = sanitizeAlias(tenant.name)
            }
        } catch (e) {
            console.warn('Could not fetch tenant name for alias', e)
        }
    }

    // Determine Filename
    let finalFileName = ''
    const extension = file.name.split('.').pop() || 'png'

    if (customFilename) {
        // Clean custom filename but keep it recognizable
        const safeCustom = customFilename.replace(/[^a-zA-Z0-9._-]/g, '_')
        finalFileName = `${safeCustom}.${extension}`
    } else {
        const dateFolder = getFormattedDate()
        const timestamp = new Date().toTimeString().split(' ')[0].replace(/:/g, '') // HHMMSS
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        finalFileName = `${dateFolder}_${cleanFileName}_${timestamp}.${extension}`
    }

    // Construct Path
    // Format: tenant / [subfolder] / filename
    let filePathParts = [tenantFolder]
    if (subfolder) {
        filePathParts.push(sanitizeAlias(subfolder))
    }
    filePathParts.push(finalFileName)

    const filePath = filePathParts.join('/')

    // Use adminClient (service role) for the upload. We've already authenticated
    // the user and resolved their tenant via getContext(); bypassing storage RLS
    // here matches the pattern used by lib/actions/maquinarias.ts and others.
    const { error } = await adminClient
        .storage
        .from(bucket)
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type
        })

    if (error) {
        console.error('Upload Error:', error)
        return { success: false, message: error.message }
    }

    const { data: { publicUrl } } = adminClient
        .storage
        .from(bucket)
        .getPublicUrl(filePath)

    return {
        success: true,
        url: publicUrl,
        path: filePath
    }
}
