
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wioozisskjjgjjybsoqo.supabase.co';

/**
 * Normalizes a storage path or URL to a functional Supabase Storage public URL.
 * Handles:
 * - Relative paths: cise-peru-sac/... (assumes cotizaciones bucket if not specified)
 * - Already normalized Supabase URLs
 * - Legacy Bubble URLs (returns as is)
 */
export function getStorageUrl(path?: string | null, bucket: string = 'cotizaciones'): string {
    if (!path) return '';

    // If it's already a full URL (http/https), return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Clean leading slashes
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Check if the path already starts with the bucket name
    // This is a heuristic: if we have "cotizaciones/something.pdf", we don't want to double it
    const hasBucket = cleanPath.startsWith(`${bucket}/`);
    
    const finalPath = hasBucket ? cleanPath : `${bucket}/${cleanPath}`;

    // Construct public URL: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    // However, Supabase's simple construct is bucket/path
    return `${SUPABASE_URL}/storage/v1/object/public/${finalPath}`;
}

/**
 * Standardizes how we display/store file URLs.
 * Rule: Always store paths relative to the bucket or full URLs for external assets.
 */
export const storageStandard = {
    normalize: getStorageUrl,
    projectUrl: SUPABASE_URL,
};
