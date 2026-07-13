'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Copy, Loader2, Mail, CheckCircle, RefreshCw } from 'lucide-react'
import { generateAprobacionToken, sendCotizacionEmail } from '@/lib/actions/cotizaciones'
import { Separator } from '@/components/ui/separator'

interface CotizacionEnviarClienteProps {
    cotizacion: any
}

export function CotizacionEnviarCliente({ cotizacion }: CotizacionEnviarClienteProps) {
    const [generating, setGenerating] = useState(false)
    const [sending, setSending] = useState(false)
    const [email, setEmail] = useState(cotizacion.contacto?.email || '')

    // Existing values
    const [token, setToken] = useState<string | null>(cotizacion.token_aprobacion)
    const [pin, setPin] = useState<string | null>(cotizacion.pin_aprobacion)

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const approvalUrl = token ? `${baseUrl}/aprobacion/${token}` : ''

    const handleGenerate = async () => {
        setGenerating(true)
        const result = await generateAprobacionToken(cotizacion.id)
        setGenerating(false)

        if (result.success) {
            setToken(result.token)
            setPin(result.pin)
            toast.success('Enlace de aprobación generado')
        } else {
            toast.error(result.message)
        }
    }

    const handleSendEmail = async () => {
        if (!email) {
            toast.error("Ingrese un correo electrónico")
            return
        }
        setSending(true)
        const result = await sendCotizacionEmail(cotizacion.id, email)
        setSending(false)

        if (result.success) {
            toast.success("Correo enviado correctamente")
            // Refresh local state if needed (token might have been generated server side)
            if (!token) handleGenerate()
        } else {
            toast.error(result.message)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copiado al portapapeles`)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Enviar a Cliente</CardTitle>
                <CardDescription>
                    Envía la cotización por correo o comparte el enlace seguro manualmente.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Method 1: Email Automation */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Opción 1: Envío Automático (Recomendado)</h3>
                    <div className="flex gap-2">
                        <Input
                            placeholder="correo@cliente.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button onClick={handleSendEmail} disabled={sending}>
                            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Enviar Correo
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Esto generará automáticamente el PIN si no existe y enviará un correo con el acceso.
                    </p>
                </div>

                <Separator />

                {/* Method 2: Manual Link */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Opción 2: Enlace Manual</h3>
                        {!token && (
                            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Generar Enlace
                            </Button>
                        )}
                    </div>

                    {token && pin ? (
                        <div className="grid gap-4 border p-4 rounded-lg bg-slate-50">
                            <div className="grid gap-2">
                                <Label>Enlace de Aprobación</Label>
                                <div className="flex gap-2">
                                    <Input readOnly value={approvalUrl} />
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(approvalUrl, 'Enlace')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>PIN de Acceso</Label>
                                <div className="flex gap-2">
                                    <div className="flex h-14 w-full items-center justify-center rounded-md border border-input bg-background font-mono font-bold tracking-widest" style={{ fontSize: '1.875rem' }}>
                                        {pin}
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(pin, 'PIN')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                                <CheckCircle className="h-4 w-4" />
                                <span>Credenciales activas y listas para compartir</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                            Genera un enlace para compartirlo manualmente por WhatsApp u otro medio.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
