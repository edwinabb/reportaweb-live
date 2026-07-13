import type { SupabaseClient } from '@supabase/supabase-js'

export type PdfJobEntityType =
    | 'reporte_maquinaria'
    | 'reporte_personal'
    | 'inspeccion'
    | 'informe'
    | 'valorizacion'
    | 'cotizacion'

export interface EnqueuePdfJobParams {
    adminClient: SupabaseClient
    tenantId: string
    entityType: PdfJobEntityType
    entityId: string
    bucket: string
    storagePath: string
    htmlSnapshot?: string
}

/**
 * Inserts a pending PDF job. Silently ignores duplicate (partial unique index on pending).
 * Cannot use upsert with partial unique indexes — use insert with ignoreDuplicates.
 */
export async function enqueuePdfJob(params: EnqueuePdfJobParams): Promise<void> {
    const { adminClient, tenantId, entityType, entityId, bucket, storagePath, htmlSnapshot } = params
    const { error } = await adminClient
        .from('pdf_jobs')
        .insert({
            tenant_id: tenantId,
            entity_type: entityType,
            entity_id: entityId,
            bucket,
            storage_path: storagePath,
            html_snapshot: htmlSnapshot ?? null,
            status: 'pending',
            attempts: 0,
            updated_at: new Date().toISOString(),
        }, { ignoreDuplicates: true } as any)
    if (error && !error.message?.includes('duplicate') && error.code !== '23505') {
        console.error('[enqueuePdfJob] failed:', error.message)
    }
}

export function queuedPdfResponse(entityLabel: string): Response {
    return new Response(
        JSON.stringify({
            queued: true,
            message: `El PDF de ${entityLabel} está en cola. Se generará en los próximos minutos.`,
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
    )
}
