
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { saveToStorage } from '@/lib/pdf-cache';

export async function POST(req: NextRequest) {
    try {
        const { html, footerHtml, cotizacionId } = await req.json();

        if (!html) {
            return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
        }

        // Use the URL provided by the user
        const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host';

        // Create FormData for the request
        const form = new FormData();

        // Append the index.html file
        const htmlBlob = new Blob([html], { type: 'text/html' });
        form.append('files', htmlBlob, 'index.html');

        // Append footer.html if provided
        if (footerHtml) {
            const footerBlob = new Blob([footerHtml], { type: 'text/html' });
            form.append('files', footerBlob, 'footer.html');
        }

        // Gotenberg Configuration Options
        // PDF/A requires specific fonts to be embedded, skipping explicitly for now unless needed

        // Margins (1cm = ~10mm / 0.39in, Bottom 1.5cm = ~15mm / 0.59in)
        form.append('marginTop', '0.39in');
        form.append('marginBottom', '0.59in');
        form.append('marginLeft', '0.39in');
        form.append('marginRight', '0.39in');

        // Emulate screen makes it look like the web view
        form.append('emulatedMediaType', 'screen');
        form.append('scale', '1.0');

        // Wait for network idle to ensure images load
        // form.append('waitDelay', '1s'); // Optional, implicit often works if content is static

        console.log('Sending request to Gotenberg:', `${GOTENBERG_URL}/forms/chromium/convert/html`);

        let response: Response;
        try {
            response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
                method: 'POST',
                body: form,
                signal: AbortSignal.timeout(30000),
            });
        } catch (fetchError: unknown) {
            const isTimeout = fetchError instanceof Error && (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError');
            console.error('Gotenberg connection error:', fetchError);
            return NextResponse.json({
                error: isTimeout
                    ? 'El servicio de PDF no respondió a tiempo. Por favor intenta nuevamente.'
                    : 'No se pudo conectar al servicio de PDF. Contacta al administrador.'
            }, { status: 503 });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gotenberg error:', response.status, errorText);
            return NextResponse.json({ error: `Gotenberg failed: ${errorText}` }, { status: response.status });
        }

        // Return the binary PDF
        const pdfArrayBuffer = await response.arrayBuffer();

        // Best-effort: save to storage if cotizacionId was provided
        if (cotizacionId) {
            try {
                const adminClient = createAdminClient();

                // Fetch tenant_id from cotizaciones
                const { data: cot } = await adminClient
                    .from('cotizaciones')
                    .select('tenant_id')
                    .eq('id', cotizacionId)
                    .single();

                if (cot?.tenant_id) {
                    const storagePath = `${cot.tenant_id}/${cotizacionId}.pdf`;
                    const publicUrl = await saveToStorage(adminClient, 'cotizaciones', storagePath, Buffer.from(pdfArrayBuffer));

                    if (publicUrl) {
                        await adminClient
                            .from('cotizaciones')
                            .update({ pdf_url: publicUrl, pdf_generado_at: new Date().toISOString() })
                            .eq('id', cotizacionId);
                    }
                }
            } catch (storageErr) {
                console.error('[pdf/generate] Storage save failed (non-fatal):', storageErr);
            }
        }

        return new NextResponse(pdfArrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="cotizacion.pdf"',
            },
        });

    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Internal Server Error'
        console.error('API Error generating PDF:', error);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
