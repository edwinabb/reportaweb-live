/**
 * Helper server-side para generar PDFs vía Gotenberg.
 *
 * El proyecto ya tiene un API route en /api/pdf/generate que hace lo mismo pero
 * desde el browser. Este módulo permite generar PDFs desde server actions sin
 * pasar por un round-trip HTTP interno.
 */

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host'

export type PdfOptions = {
    marginTop?: string
    marginBottom?: string
    marginLeft?: string
    marginRight?: string
    emulatedMediaType?: 'screen' | 'print'
    scale?: string
}

const DEFAULT_OPTS: Required<PdfOptions> = {
    marginTop: '0.39in',
    marginBottom: '0.59in',
    marginLeft: '0.39in',
    marginRight: '0.39in',
    emulatedMediaType: 'screen',
    scale: '1.0',
}

export async function renderPdfFromHtml(html: string, footerHtml?: string, opts?: PdfOptions): Promise<ArrayBuffer> {
    const form = new FormData()
    const merged = { ...DEFAULT_OPTS, ...opts }

    form.append('files', new Blob([html], { type: 'text/html' }), 'index.html')
    if (footerHtml) form.append('files', new Blob([footerHtml], { type: 'text/html' }), 'footer.html')

    form.append('marginTop', merged.marginTop)
    form.append('marginBottom', merged.marginBottom)
    form.append('marginLeft', merged.marginLeft)
    form.append('marginRight', merged.marginRight)
    form.append('emulatedMediaType', merged.emulatedMediaType)
    form.append('scale', merged.scale)

    const res = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, { method: 'POST', body: form })
    if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Gotenberg failed (${res.status}): ${txt}`)
    }
    return res.arrayBuffer()
}
