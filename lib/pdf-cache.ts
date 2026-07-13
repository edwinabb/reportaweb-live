import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SUPABASE_STORAGE_HOST_PATTERN = /\.supabase\.co\/storage\/v1\/object\/(public|sign)\//

/**
 * Returns true if the URL is already stored in Supabase Storage (not Bubble CDN or S3).
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
    if (!url) return false
    return SUPABASE_STORAGE_HOST_PATTERN.test(url)
}

/**
 * If the entity already has a valid Supabase Storage URL, returns a redirect response.
 * Otherwise returns null (caller should generate the PDF).
 */
export function tryServeFromCache(pdfUrl: string | null | undefined): NextResponse | null {
    if (!isSupabaseStorageUrl(pdfUrl)) return null
    return NextResponse.redirect(pdfUrl!, 302)
}

/**
 * Uploads PDF bytes to Supabase Storage and returns the public URL.
 * Returns null on failure (caller should still return the PDF bytes to the user).
 */
export async function saveToStorage(
    adminClient: SupabaseClient,
    bucket: string,
    storagePath: string,
    pdfBytes: ArrayBuffer | Buffer,
): Promise<string | null> {
    const bytes = pdfBytes instanceof Buffer ? pdfBytes : Buffer.from(new Uint8Array(pdfBytes))
    const { error } = await adminClient.storage
        .from(bucket)
        .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true })
    if (error) {
        console.error(`[saveToStorage] upload failed bucket=${bucket} path=${storagePath}:`, error.message)
        return null
    }
    const { data } = adminClient.storage.from(bucket).getPublicUrl(storagePath)
    return data.publicUrl
}
