'use client'

import { useState } from 'react'
import { Cotizacion, CotizacionDetalleWithRelations, MatrizResponsabilidad, CotizacionPDFConfig } from '@/types/cotizaciones'
import { updateNotasPrecios } from '@/lib/actions/cotizaciones'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { FileText, Save } from 'lucide-react'

interface CotizacionPDFPreviewProps {
    cotizacion: Cotizacion & {
        cliente?: { razon_social: string; numero_documento?: string; logo_url?: string }
        contacto?: { nombre_completo: string; cargo?: string; email?: string }
        detalles?: CotizacionDetalleWithRelations[]
        matriz_responsabilidad?: MatrizResponsabilidad[]
    }
    globalConfig?: Partial<CotizacionPDFConfig> & {
        saludo?: string;
        banco?: string;
        despedida?: string;
        mostrar_firma?: boolean;
        imagen_banco?: string;
        imagen_firma?: string;
        introduccion?: string;
        terminos_condiciones?: string;
        forma_pago1?: string;
        forma_pago2?: string;
        texto_aceptacion?: string;
    }
    tenantInfo?: { logo_url: string; nombre_comercial?: string; razon_social?: string } | null
}

export function CotizacionPDFPreview({ cotizacion, globalConfig, tenantInfo }: CotizacionPDFPreviewProps) {
    const [notas, setNotas] = useState(cotizacion.notas_precios || '')

    // Initial config merging logic
    const [config] = useState<CotizacionPDFConfig>(() => {
        // Start with saved config of the quote
        const base = cotizacion.pdf_config || {}

        // Merge with defaults from Global Config if missing
        return {
            ...base,
            saludo: base.saludo || globalConfig?.saludo || 'Estimados,',
            banco: base.banco || globalConfig?.banco || 'BCP Soles',
            despedida: base.despedida || globalConfig?.despedida || 'Atentamente,',
            mostrar_firma: base.mostrar_firma ?? globalConfig?.mostrar_firma ?? true,

            // Map Global Config keys (imagen_banco -> imagen_banco_url)
            imagen_banco_url: base.imagen_banco_url || globalConfig?.imagen_banco || globalConfig?.imagen_banco_url,
            firma_imagen_url: base.firma_imagen_url || globalConfig?.imagen_firma || globalConfig?.firma_imagen_url,

            // Map text areas
            texto_introduccion: base.texto_introduccion || globalConfig?.introduccion || globalConfig?.texto_introduccion,
            texto_notas_precios: base.texto_notas_precios || globalConfig?.terminos_condiciones || globalConfig?.texto_notas_precios,

            forma_pago1: base.forma_pago1 || globalConfig?.forma_pago1,
            forma_pago2: base.forma_pago2 || globalConfig?.forma_pago2,
            texto_aceptacion: base.texto_aceptacion || globalConfig?.texto_aceptacion,
        }
    })

    const [saving, setSaving] = useState(false)

    const handleSaveNotas = async () => {
        setSaving(true)
        const result = await updateNotasPrecios(cotizacion.id, notas)
        setSaving(false)

        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
    }

    const handleGeneratePDF = async () => {
        const input = document.getElementById('pdf-preview')
        if (!input) {
            toast.error('No se encontró el contenido del PDF. Recarga la página.')
            return
        }

        setSaving(true)
        try {
            // Get the full HTML content
            // We need to inject styles to ensure it looks right on the server
            // Since we can't easily inline all styles, we'll assume Gotenberg can access basic styles 
            // OR we rely on standard Tailwind classes being present in the HTML if we send the full page structure?
            // Actually, for simplicity in this "Snippet" approach, we will extract the innerHTML
            // AND wrap it in a basic HTML structure with Tailwind CDN or inline styles.
            // A better approach for Gotenberg is usually sending the URL of the page, but that requires public access/auth.
            // Sending HTML string is safer for internal apps.

            // To ensure styles are applied, we need to clone the node and inline computed styles OR
            // include the stylesheet link. Since we are in Dev/Local, external links might not work for localhost.
            // However, we can try to inject a Tailwind CDN link into the head of the HTML we send.

            // Construct the complete HTML document
            // Uses a CDN for Tailwind to ensure classes render correctly in Gotenberg
            // NOTE: This requires the container to have internet access. If not, we'd need to inline the CSS.
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Cotización</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script>
                        tailwind.config = {
                            theme: {
                                extend: {
                                    colors: {
                                        border: "hsl(var(--border))",
                                        input: "hsl(var(--input))",
                                        ring: "hsl(var(--ring))",
                                        background: "hsl(var(--background))",
                                        foreground: "hsl(var(--foreground))",
                                        primary: {
                                            DEFAULT: "hsl(var(--primary))",
                                            foreground: "hsl(var(--primary-foreground))",
                                        },
                                        secondary: {
                                            DEFAULT: "hsl(var(--secondary))",
                                            foreground: "hsl(var(--secondary-foreground))",
                                        },
                                        destructive: {
                                            DEFAULT: "hsl(var(--destructive))",
                                            foreground: "hsl(var(--destructive-foreground))",
                                        },
                                        muted: {
                                            DEFAULT: "hsl(var(--muted))",
                                            foreground: "hsl(var(--muted-foreground))",
                                        },
                                        accent: {
                                            DEFAULT: "hsl(var(--accent))",
                                            foreground: "hsl(var(--accent-foreground))",
                                        },
                                        popover: {
                                            DEFAULT: "hsl(var(--popover))",
                                            foreground: "hsl(var(--popover-foreground))",
                                        },
                                        card: {
                                            DEFAULT: "hsl(var(--card))",
                                            foreground: "hsl(var(--card-foreground))",
                                        },
                                    },
                                }
                            }
                        }
                    </script>
                    <style>
                        /* Essential overrides for print/pdf */
                        body { background: white; font-family: sans-serif; }
                        /* Re-apply critical Shadcn variables just in case Tailwind config above isn't enough */
                        :root {
                            --background: 0 0% 100%;
                            --foreground: 222.2 84% 4.9%;
                            --card: 0 0% 100%;
                            --card-foreground: 222.2 84% 4.9%;
                            --popover: 0 0% 100%;
                            --popover-foreground: 222.2 84% 4.9%;
                            --primary: 222.2 47.4% 11.2%;
                            --primary-foreground: 210 40% 98%;
                            --secondary: 210 40% 96.1%;
                            --secondary-foreground: 222.2 47.4% 11.2%;
                            --muted: 210 40% 96.1%;
                            --muted-foreground: 215.4 16.3% 46.9%;
                            --accent: 210 40% 96.1%;
                            --accent-foreground: 222.2 47.4% 11.2%;
                            --destructive: 0 84.2% 60.2%;
                            --destructive-foreground: 210 40% 98%;
                            --border: 214.3 31.8% 91.4%;
                            --input: 214.3 31.8% 91.4%;
                            --ring: 222.2 84% 4.9%;
                            --radius: 0.5rem;
                        }
                    </style>
                </head>
                <body class="p-[10mm]">
                    ${input.outerHTML}
                </body>
                </html>
            `;

            // Footer HTML for Gotenberg
            // Gotenberg automatically replaces <span class="pageNumber"></span> and <span class="totalPages"></span>
            const footerHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; font-size: 10px; margin: 0; padding: 0 10mm; color: #666; width: 100%; }
                        .footer { display: flex; justify-content: flex-end; width: 100%; border-top: 1px solid #ddd; padding-top: 10px; }
                        .page-info { margin-left: auto; }
                    </style>
                </head>
                <body>
                    <div class="footer">
                        <div class="page-info">
                            www.reporta.la - Página <span class="pageNumber"></span> de <span class="totalPages"></span>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const response = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ html: htmlContent, footerHtml, cotizacionId: cotizacion.id }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error en el servidor de PDF');
            }

            // Get the blob from response
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cotizacion-${cotizacion.numero}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('PDF generado exitosamente')
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Error desconocido'
            console.error('Error generating PDF:', error)
            toast.error(`Error al generar el PDF: ${errMsg}`)
        } finally {
            setSaving(false)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('es-PE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    const formatPrecio = (valor?: number) => {
        if (!valor) return '-'
        return valor.toFixed(2)
    }

    const handleGenerateDocx = async () => {
        setSaving(true)
        try {
            // Prepare data for DOCX template
            // We flat-map or format specific fields to be template-friendly
            const data = {
                ...cotizacion,
                fecha_emision_larga: formatDate(cotizacion.fecha_emision),
                cliente_razon_social: cotizacion.cliente?.razon_social || 'CLIENTE',
                cliente_ruc: cotizacion.cliente?.numero_documento || '',
                contacto_nombre: cotizacion.contacto?.nombre_completo || 'CONTACTO',
                contacto_cargo: cotizacion.contacto?.cargo || '',

                // Details loop (standardized keys for template)
                items: cotizacion.detalles?.map((d: CotizacionDetalleWithRelations) => ({
                    servicio: d.servicio?.nombre,
                    descripcion: d.servicio?.descripcion,
                    cantidad: d.cantidad,
                    precio: formatPrecio(d.precio_valor),
                    total: formatPrecio((d.cantidad || 0) * (d.precio_valor || 0)),
                    // Add other fields if matched in user's docx
                })),

                // Totals
                subtotal_formateado: formatPrecio(cotizacion.subtotal || 0),
                impuesto_formateado: formatPrecio(cotizacion.igv || 0),
                total_formateado: formatPrecio(cotizacion.total || 0),
            }

            const response = await fetch('/api/pdf/generate-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.error || 'Error generando PDF desde plantilla')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Cotizacion-${cotizacion.numero}-word.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success('PDF generado desde Plantilla Word')
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Error desconocido'
            console.error('Error generating DOCX PDF:', error)
            toast.error(errMsg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Controles */}
            <Card>
                <CardHeader>
                    <CardTitle>Generar PDF</CardTitle>
                    <CardDescription>
                        Revisa la vista previa y genera el PDF de la cotización
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="notas">Notas Adicionales</Label>
                        <Textarea
                            id="notas"
                            placeholder="Notas adicionales que aparecerán en el PDF..."
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSaveNotas} disabled={saving} variant="outline">
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? 'Guardando...' : 'Guardar Notas'}
                        </Button>
                        <a href={`/cotizaciones/${cotizacion.id}/preview`} target="_blank" rel="noopener noreferrer">
                            <Button>
                                <FileText className="mr-2 h-4 w-4" />
                                Vista Previa / Imprimir
                            </Button>
                        </a>
                        <Button onClick={handleGenerateDocx} disabled={saving} variant="secondary">
                            <FileText className="mr-2 h-4 w-4" />
                            PDF (Plantilla Word)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Vista Previa del PDF */}
            <Card>
                <CardHeader>
                    <CardTitle>Vista Previa</CardTitle>
                </CardHeader>
                <CardContent>
                    <div id="pdf-preview" className="bg-white p-[10mm] border rounded-lg shadow-sm text-black font-sans text-sm leading-relaxed max-w-[210mm] min-h-[297mm] mx-auto">

                        {/* Header Refined Layout */}
                        <div className="mb-8">
                            {/* Row 1: Logo Left */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex flex-col items-start gap-4">
                                    {/* 1. Tenant Logo */}
                                    <div className="h-16 flex items-center">
                                        {tenantInfo?.logo_url ? (
                                            <img src={tenantInfo.logo_url} alt="Logo" className="h-full object-contain max-w-[200px]" />
                                        ) : (
                                            <span className="text-3xl font-bold text-orange-500">CISE</span>
                                        )}
                                    </div>

                                    {/* 2. Quote Number */}
                                    <div className="font-bold text-lg uppercase tracking-wide">
                                        COTIZACIÓN {cotizacion.numero}
                                    </div>
                                </div>

                                {/* 3. Date Right (Aligned roughly with Quote Number logic or just top right below logo level? 
                                    Looking at image, date is far right, roughly aligned with the quote line or slightly below logo.
                                    We'll put it in the flex container top right, but maybe pushed down a bit to match if needed.
                                    For now, justified between handles it.
                                 */}
                                <div className="text-sm pt-20"> {/* Added padding to push it down if needed, or remove ppt-20 */}
                                    <span className="capitalize">{formatDate(cotizacion.fecha_emision)}</span>
                                </div>
                            </div>

                            {/* Row 2: Client Info stacked below Left side */}
                            <div className="flex flex-col items-start gap-1 mt-8">
                                {/* 4. Contact Name */}
                                <div className="font-bold uppercase text-sm">
                                    {cotizacion.contacto?.nombre_completo || 'CLIENTE'}
                                </div>

                                {/* 5. Contact Position */}
                                <div className="uppercase text-xs font-semibold tracking-wide mb-3">
                                    {cotizacion.contacto?.cargo || 'CARGO'}
                                </div>

                                {/* 6. Client Logo */}
                                {cotizacion.cliente?.logo_url && (
                                    <div className="h-12 mt-1">
                                        <img src={cotizacion.cliente.logo_url} alt="Cliente" className="h-full object-contain max-w-[150px]" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Intro */}
                        <div className="mb-6">
                            <p className="text-sm">
                                {config.texto_introduccion || config.saludo || 'De acuerdo a su solicitud tenemos a bien alcanzar nuestra cotización por concepto de:'}
                            </p>
                            <p className="text-sm font-bold mt-1">
                                {cotizacion.descripcion_requerimiento || 'Alquiler de equipos'}
                            </p>
                        </div>

                        {/* Tabla de Servicios */}
                        {/* Tabla de Servicios */}
                        <table className="w-full border-collapse border border-black mb-6 text-xs bg-white">
                            <thead>
                                <tr className="bg-gray-200 text-black font-bold uppercase">
                                    <th className="border border-black p-2 text-left">SERVICIO</th>
                                    <th className="border border-black p-2 text-center w-24">CANTIDAD</th>
                                    <th className="border border-black p-2 text-left w-48">PRECIOS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cotizacion.detalles && cotizacion.detalles.length > 0 ? (
                                    cotizacion.detalles.map((detalle, index) => (
                                        <tr key={index}>
                                            <td className="border border-black p-2 align-top">
                                                <div className="font-bold mb-2 uppercase">{detalle.servicio?.nombre}</div>
                                                <div className="text-gray-600 mb-2">{detalle.servicio?.descripcion}</div>
                                                {detalle.servicio?.imagen_url && (
                                                    <div className="flex justify-start">
                                                        <img
                                                            src={detalle.servicio.imagen_url}
                                                            alt={detalle.servicio.nombre}
                                                            className="h-24 object-contain"
                                                        />
                                                    </div>
                                                )}
                                                {/* Eliminated detailed notes not present in types */}
                                            </td>
                                            <td className="border border-black p-2 text-center font-bold align-top pt-4">
                                                {detalle.cantidad}
                                            </td>
                                            <td className="border border-black p-2 align-top">
                                                <div className="space-y-2">
                                                    {(detalle.servicio?.cantidad_precios ?? 0) >= 1 && detalle.servicio?.precio_1_valor != null && (
                                                        <div>
                                                            <div className="font-bold text-gray-600 uppercase text-[10px]">{detalle.servicio.precio_1_tipo_nombre || detalle.servicio.precio_1_tipo || 'PRECIO 1'}</div>
                                                            <div className="font-bold">{detalle.servicio.moneda || 'USD'} {formatPrecio(detalle.servicio.precio_1_valor)}</div>
                                                        </div>
                                                    )}
                                                    {(detalle.servicio?.cantidad_precios ?? 0) >= 2 && detalle.servicio?.precio_2_valor != null && (
                                                        <div className="pt-1 border-t border-dashed border-gray-300">
                                                            <div className="font-bold text-gray-600 uppercase text-[10px]">{detalle.servicio.precio_2_tipo_nombre || detalle.servicio.precio_2_tipo || 'PRECIO 2'}</div>
                                                            <div className="font-bold">{detalle.servicio.moneda || 'USD'} {formatPrecio(detalle.servicio.precio_2_valor)}</div>
                                                        </div>
                                                    )}
                                                    {(detalle.servicio?.cantidad_precios ?? 0) >= 3 && detalle.servicio?.precio_3_valor != null && (
                                                        <div className="pt-1 border-t border-dashed border-gray-300">
                                                            <div className="font-bold text-gray-600 uppercase text-[10px]">{detalle.servicio.precio_3_tipo_nombre || detalle.servicio.precio_3_tipo || 'PRECIO 3'}</div>
                                                            <div className="font-bold">{detalle.servicio.moneda || 'USD'} {formatPrecio(detalle.servicio.precio_3_valor)}</div>
                                                        </div>
                                                    )}
                                                    {/* Fallback: show precio_valor if no catalog prices */}
                                                    {!detalle.servicio?.precio_1_valor && detalle.precio_valor && (
                                                        <div>
                                                            <div className="font-bold text-gray-600 uppercase text-[10px]">{detalle.precio_tipo}</div>
                                                            <div className="font-bold">USD {formatPrecio(detalle.precio_valor)}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="border border-black p-4 text-center text-gray-500">
                                            No hay servicios en esta cotización
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Notas Precios */}
                        <div className="mb-8 text-xs font-semibold leading-relaxed">
                            {config.texto_notas_precios ? (
                                <div className="whitespace-pre-wrap">{config.texto_notas_precios}</div>
                            ) : (
                                <>
                                    <p>Nota 1: Los precios están expresados en dólares americanos y no incluyen I.G.V.</p>
                                    <p>Nota 2: La cotización tiene una vigencia de 30 días.</p>
                                    <p>Nota 3: Estos precios fueron adecuados para un período de servicio mínimo de una jornada.</p>
                                    <p>Servicio mínimo de 8 horas.</p>
                                </>
                            )}

                            {notas && (
                                <div className="mt-2 text-blue-800 whitespace-pre-wrap">{notas}</div>
                            )}
                        </div>

                        {/* 1. ACEPTACION */}
                        <div className="mb-8 border border-black avoid-break">
                            <div className="bg-gray-200 border-b border-black p-2 font-bold uppercase text-sm">
                                1. ACEPTACIÓN DE LA OFERTA
                            </div>
                            <div className="p-4 text-xs">
                                {config.texto_aceptacion ? (
                                    <div className="whitespace-pre-wrap">{config.texto_aceptacion}</div>
                                ) : (
                                    <ul className="list-none space-y-2">
                                        <li>- El Cliente enviará la Orden de Compra de conformidad con la aceptación de la cotización firmada en cada una de las hojas.</li>
                                        <li>- Alquiler sustentado con Orden de Servicio previa a la movilización.</li>
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* 2. FACTURACION Y FORMA DE PAGO */}
                        <div className="mb-8 border border-black avoid-break">
                            <div className="bg-gray-200 border-b border-black p-2 font-bold uppercase text-sm">
                                2. FACTURACIÓN Y FORMA DE PAGO
                            </div>
                            <div className="p-4 text-xs">
                                <div className="mb-4 whitespace-pre-wrap font-semibold">
                                    {config.forma_pago1 || '- El pago de la factura comercial...'}
                                </div>

                                <div className="mb-4 font-bold">
                                    A continuación, la información de nuestras cuentas bancarias:
                                </div>

                                {config.imagen_banco_url ? (
                                    <img src={config.imagen_banco_url} alt="Bancos" className="w-full max-w-[500px] h-auto border border-gray-300 mb-4" />
                                ) : (
                                    <div className="w-full max-w-[500px] border border-dashed border-gray-400 bg-gray-50 p-4 mb-4 text-center text-xs text-gray-500 italic">
                                        Imagen de bancos no configurada — subila en <span className="font-semibold">/settings/cotizaciones</span> (campo <span className="font-mono">imagen_banco</span>).
                                    </div>
                                )}

                                {config.forma_pago2 && (
                                    <div className="whitespace-pre-wrap pt-2">{config.forma_pago2}</div>
                                )}
                            </div>
                        </div>

                        {/* 3. MATRIZ DE RESPONSABILIDADES */}
                        {cotizacion.matriz_responsabilidad && cotizacion.matriz_responsabilidad.length > 0 && (
                            <div className="mb-8 border border-black page-break-inside-avoid avoid-break">
                                <div className="bg-gray-200 border-b border-black p-2 font-bold uppercase text-sm">
                                    3. MATRIZ DE RESPONSABILIDADES
                                </div>
                                <div className="p-4">
                                    <div className="mb-4">
                                        <div className="font-bold text-xs uppercase mb-1">
                                            RESPONSABILIDADES DE {tenantInfo?.nombre_comercial || tenantInfo?.razon_social || 'EMPRESA'}
                                        </div>
                                        <ul className="text-xs text-justify list-disc pl-4 space-y-1">
                                            {cotizacion.matriz_responsabilidad
                                                .filter(m => m.responsable === 'EMPRESA')
                                                .map((m, i) => (
                                                    <li key={i}>{m.descripcion || m.actividad}</li>
                                                ))
                                            }
                                        </ul>
                                    </div>

                                    <div>
                                        <div className="font-bold text-xs uppercase mb-1">
                                            RESPONSABILIDADES DE {cotizacion.cliente?.razon_social || 'CLIENTE'}
                                        </div>
                                        <ul className="text-xs text-justify list-disc pl-4 space-y-1">
                                            {cotizacion.matriz_responsabilidad
                                                .filter(m => m.responsable === 'CLIENTE')
                                                .map((m, i) => (
                                                    <li key={i}>{m.descripcion || m.actividad}</li>
                                                ))
                                            }
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Firma */}
                        <div className="mt-16 mb-8 text-center page-break-inside-avoid avoid-break">
                            <div className="text-sm font-bold mb-6">{config.despedida}</div>

                            {config.mostrar_firma !== false && (
                                <div className="flex flex-col items-start px-8">
                                    {config.firma_imagen_url ? (
                                        <img src={config.firma_imagen_url} alt="Firma" className="w-full max-w-[250px] h-auto mb-[-20px] ml-4 z-10" />
                                    ) : (
                                        <div className="w-full max-w-[250px] border border-dashed border-gray-400 bg-gray-50 px-3 py-5 mb-[-20px] ml-4 text-center text-[10px] text-gray-500 italic leading-tight">
                                            Firma no configurada — subila en <span className="font-semibold">/settings/cotizaciones</span> (campo <span className="font-mono">imagen_firma</span>).
                                        </div>
                                    )}
                                    <div className="border-t border-black px-4 pt-1 text-left min-w-[250px]">
                                        <div className="font-bold text-sm">MIGUEL ÁNGEL PONS MARTÍNEZ</div>
                                        <div className="text-xs font-bold">GERENTE GENERAL</div>
                                    </div>
                                </div>
                            )}
                        </div>



                    </div>
                </CardContent>
            </Card>

            <style jsx global>{`
                /* Override global styles that use modern color spaces (oklch/lab) which html2canvas doesn't support */
                #pdf-preview {
                    /* Redefine variables to safe HEX values */
                    --background: #ffffff;
                    --foreground: #000000;
                    --card: #ffffff;
                    --card-foreground: #000000;
                    --popover: #ffffff;
                    --popover-foreground: #000000;
                    --primary: #f97316;
                    --primary-foreground: #ffffff;
                    --secondary: #0f172a;
                    --secondary-foreground: #ffffff;
                    --muted: #f3f4f6;
                    --muted-foreground: #6b7280;
                    --accent: #f3f4f6;
                    --accent-foreground: #111827;
                    --destructive: #ef4444;
                    --destructive-foreground: #ffffff;
                    --border: #e5e5e5;
                    --input: #e5e5e5;
                    --ring: #f97316;
                    
                    background-color: #ffffff !important;
                    color: #000000 !important;
                }
                #pdf-preview * {
                    border-color: #e5e5e5 !important; /* Safe hex color for default borders */
                    box-shadow: none !important; /* Remove shadows which might use complex colors */
                }
                #pdf-preview .border-black {
                    border-color: #000000 !important;
                }
                
                /* Pagination Controls */
                tr, .avoid-break {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                
                /* Keep specific overrides just in case */
                #pdf-preview .bg-white { background-color: #ffffff !important; }
                #pdf-preview .text-black { color: #000000 !important; }
                #pdf-preview .bg-gray-200 { background-color: #e5e7eb !important; }
                #pdf-preview .text-gray-600 { color: #4b5563 !important; }
                #pdf-preview .text-gray-500 { color: #6b7280 !important; }
                #pdf-preview .text-gray-400 { color: #9ca3af !important; }
                #pdf-preview .border-gray-300 { border-color: #d1d5db !important; }
                
                #pdf-preview .text-orange-500 { color: #f97316 !important; }
                #pdf-preview .bg-yellow-400 { background-color: #facc15 !important; }
                #pdf-preview .text-blue-900 { color: #1e3a8a !important; }
                #pdf-preview .text-blue-800 { color: #1e40af !important; }

                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #pdf-preview, #pdf-preview * {
                        visibility: visible;
                    }
                    #pdf-preview {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    )
}

