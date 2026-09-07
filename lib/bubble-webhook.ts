interface BubbleCallbackPayload {
    entity_id: string
    status: 'done' | 'failed'
    pdf_url?: string
}

/**
 * Notifica a un API Workflow público de Bubble que un PDF terminó (o falló).
 * Best-effort: un solo intento, no reintenta (Bubble es responsable de su
 * propia resiliencia si necesita confirmar la recepción).
 */
export async function notifyBubbleCallback(callbackUrl: string, payload: BubbleCallbackPayload): Promise<boolean> {
    try {
        const res = await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) {
            console.error(`[notifyBubbleCallback] ${callbackUrl} respondió ${res.status}`)
            return false
        }
        return true
    } catch (e: unknown) {
        console.error('[notifyBubbleCallback] fetch failed:', e)
        return false
    }
}
