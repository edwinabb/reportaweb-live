import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host'

export class BubbleTemplateNotFoundError extends Error {}

/**
 * Rellena la plantilla public/templates/bubble/<templateKey>.docx con `data`
 * y la convierte a PDF vía Gotenberg (LibreOffice). Mismo mecanismo que
 * app/api/pdf/generate-docx/route.ts, parametrizado por templateKey.
 */
export async function renderBubbleDocxPdf(templateKey: string, data: Record<string, unknown>): Promise<ArrayBuffer> {
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'bubble', `${templateKey}.docx`)
    if (!fs.existsSync(templatePath)) {
        throw new BubbleTemplateNotFoundError(`Plantilla no encontrada: ${templateKey}.docx`)
    }

    const content = fs.readFileSync(templatePath, 'binary')
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
