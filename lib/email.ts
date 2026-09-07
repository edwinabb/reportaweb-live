
// Fase 4 (migración Resend → Postmark): dominio de envío aún no migrado, sin verificación en vivo todavía.
import { ServerClient } from 'postmark'

export interface EmailOptions {
    to: string | string[]
    subject: string
    html: string
    from?: string
    cc?: string | string[]
    replyTo?: string
}

export async function sendEmail({
    to,
    subject,
    html,
    from = 'Reportar <noreply@reportar.app>',
    cc,
    replyTo,
}: EmailOptions): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.POSTMARK_API_KEY

    if (!apiKey) {
        // Development fallback: log to console when key is not configured
        console.log('========================================')
        console.log('[EMAIL] POSTMARK_API_KEY not set — logging email')
        console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`)
        console.log(`Subject: ${subject}`)
        console.log('========================================')
        return { success: true }
    }

    const client = new ServerClient(apiKey)

    try {
        const result = await client.sendEmail({
            From: from,
            To: Array.isArray(to) ? to.join(',') : to,
            Subject: subject,
            HtmlBody: html,
            ...(cc ? { Cc: Array.isArray(cc) ? cc.join(',') : cc } : {}),
            ...(replyTo ? { ReplyTo: replyTo } : {}),
        })

        if (result.ErrorCode !== 0) {
            console.error('[Email] Postmark error:', result.Message)
            return { success: false, error: result.Message }
        }

        return { success: true }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al enviar correo'
        console.error('[Email] Postmark exception:', err)
        return { success: false, error: msg }
    }
}
