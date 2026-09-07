import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { renderBubbleDocxPdf, BubbleTemplateNotFoundError } from '@/lib/bubble-docx-pdf'
import { saveToStorage } from '@/lib/pdf-cache'
import { enqueuePdfJob } from '@/lib/pdf-queue'
import type { DocCategory } from '@/lib/pdf-retry-schedule'

const BUCKET = 'bubble-pdfs'

// Scope de tenants confirmado (docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md § Global Constraints)
const ALLOWED_TENANT_IDS = new Set([
    '1cb97ec7-326c-4376-93ee-ed317d3da51b', // CISE
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73', // GRUAS
])

interface BubblePdfRequestBody {
    tenant_id: string
    template_key: string
    doc_category: DocCategory
    data: Record<string, unknown>
    entity_id: string
    callback_url: string
    filename?: string
}

export async function POST(req: NextRequest) {
    const expectedKey = process.env.BUBBLE_PDF_BRIDGE_API_KEY
    if (!expectedKey) {
        console.error('[POST /api/bubble/pdf/generate] BUBBLE_PDF_BRIDGE_API_KEY no configurada')
        return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
    }
    const auth = req.headers.get('authorization')
    if (!auth || auth !== `Bearer ${expectedKey}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let body: BubblePdfRequestBody
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const { tenant_id, template_key, doc_category, data, entity_id, callback_url, filename } = body

    if (!tenant_id || !template_key || !doc_category || !data || !entity_id || !callback_url) {
        return NextResponse.json(
            { error: 'Faltan campos requeridos: tenant_id, template_key, doc_category, data, entity_id, callback_url' },
            { status: 400 },
        )
    }
    if (!ALLOWED_TENANT_IDS.has(tenant_id)) {
        return NextResponse.json({ error: 'tenant_id no reconocido' }, { status: 400 })
    }
    if (doc_category !== 'comercial' && doc_category !== 'operativo') {
        return NextResponse.json({ error: 'doc_category debe ser "comercial" u "operativo"' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const storagePath = `bubble/${doc_category}/${entity_id}-${Date.now()}.pdf`

    try {
        const pdf = await renderBubbleDocxPdf(template_key, data)
        const publicUrl = await saveToStorage(adminClient, BUCKET, storagePath, Buffer.from(pdf))
        if (!publicUrl) throw new Error('No se pudo subir el PDF a Storage')
        return NextResponse.json({ status: 'done', pdf_url: publicUrl })
    } catch (e: unknown) {
        if (e instanceof BubbleTemplateNotFoundError) {
            return NextResponse.json({ error: e.message }, { status: 404 })
        }
        console.error('[POST /api/bubble/pdf/generate] intento inmediato falló, encolando:', e)
        await enqueuePdfJob({
            adminClient,
            tenantId: tenant_id,
            entityType: 'bubble_docx',
            entityId: entity_id,
            bucket: BUCKET,
            storagePath,
            docCategory: doc_category,
            templateKey: template_key,
            payload: data,
            callbackUrl: callback_url,
        })
        return NextResponse.json(
            { status: 'queued', message: `El PDF de ${filename ?? entity_id} está en cola y se notificará por webhook al completarse.` },
            { status: 202 },
        )
    }
}
