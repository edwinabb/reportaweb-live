// lib/pdf-queue.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeNextRetryAt, type DocCategory } from './pdf-retry-schedule'

export type PdfJobEntityType =
    | 'reporte_maquinaria'
    | 'reporte_personal'
    | 'inspeccion'
    | 'informe'
    | 'valorizacion'
    | 'cotizacion'
    | 'bubble_docx'

export interface EnqueuePdfJobParams {
    adminClient: SupabaseClient
    tenantId: string
    entityType: PdfJobEntityType
    entityId: string
    bucket: string
    storagePath: string
    htmlSnapshot?: string
    // Campos exclusivos de bubble_docx:
    docCategory?: DocCategory
    templateKey?: string
    payload?: Record<string, unknown>
    callbackUrl?: string
}

/**
 * Inserta un job pendiente. Ignora duplicados (índice único parcial en 'pending').
 * No se puede usar upsert con índices únicos parciales — se usa insert con ignoreDuplicates.
 */
export async function enqueuePdfJob(params: EnqueuePdfJobParams): Promise<void> {
    const {
        adminClient, tenantId, entityType, entityId, bucket, storagePath, htmlSnapshot,
        docCategory, templateKey, payload, callbackUrl,
    } = params

    const row: Record<string, unknown> = {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        bucket,
        storage_path: storagePath,
        html_snapshot: htmlSnapshot ?? null,
        status: 'pending',
        attempts: 0,
        updated_at: new Date().toISOString(),
    }

    if (docCategory) {
        row.doc_category = docCategory
        row.max_attempts = 5
        row.template_key = templateKey ?? null
        row.payload = payload ?? null
        row.callback_url = callbackUrl ?? null
        const nextRetry = computeNextRetryAt(docCategory, 0)
        row.next_retry_at = (nextRetry ?? new Date()).toISOString()
    }

    const { error } = await adminClient
        .from('pdf_jobs')
        .insert(row, { ignoreDuplicates: true } as any)
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
