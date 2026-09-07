import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import type { SupabaseClient } from '@supabase/supabase-js'

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host'
const TEMPLATES_BUCKET = 'system-templates'

export class BubbleTemplateNotFoundError extends Error {}

/**
 * Resuelve la plantilla ACTIVA para (tenantId, tipo) desde system_document_templates,
 * la descarga de Storage, la rellena con `data` y la convierte a PDF vía Gotenberg.
 *
 * Reemplaza la lectura previa vía fs.readFileSync(public/templates/bubble/...), que
 * no funciona en Cloudflare Workers (confirmado con smoke test real: 404 en producción).
 */
export async function renderBubbleDocxPdf(
    adminClient: SupabaseClient,
    tenantId: string,
    tipo: string,
    data: Record<string, unknown>,
): Promise<ArrayBuffer> {
    const { data: row, error: queryError } = await adminClient
        .from('system_document_templates')
        .select('storage_path')
        .eq('tenant_id', tenantId)
        .eq('tipo', tipo)
        .eq('is_active', true)
        .maybeSingle()

    if (queryError || !row) {
        throw new BubbleTemplateNotFoundError(`No hay plantilla activa para tenant=${tenantId} tipo=${tipo}`)
    }

    const { data: fileBlob, error: downloadError } = await adminClient.storage
        .from(TEMPLATES_BUCKET)
        .download(row.storage_path)

    if (downloadError || !fileBlob) {
        throw new BubbleTemplateNotFoundError(`No se pudo descargar la plantilla: ${row.storage_path}`)
    }

    const content = Buffer.from(await fileBlob.arrayBuffer())
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    doc.render(data)
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    const form = new FormData()
    form.append(
        'files',
        new Blob([new Uint8Array(docxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        'merged.docx',
    )

    const response = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gotenberg conversion failed (${response.status}): ${errText}`)
    }

    return response.arrayBuffer()
}
