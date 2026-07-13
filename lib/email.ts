
import { Resend } from 'resend'

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
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
        // Development fallback: log to console when key is not configured
        console.log('========================================')
        console.log('[EMAIL] RESEND_API_KEY not set — logging email')
        console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`)
        console.log(`Subject: ${subject}`)
        console.log('========================================')
        return { success: true }
    }

    const resend = new Resend(apiKey)

    try {
        const { error } = await resend.emails.send({
            from, to, subject, html,
            ...(cc ? { cc } : {}),
            ...(replyTo ? { reply_to: replyTo } : {}),
        })

        if (error) {
            console.error('[Email] Resend error:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al enviar correo'
        console.error('[Email] Resend exception:', err)
        return { success: false, error: msg }
    }
}
