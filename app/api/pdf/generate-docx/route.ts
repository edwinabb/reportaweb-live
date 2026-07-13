import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        // 1. Load the template
        // Ensure you have "cotizacion_template.docx" in "public/templates/"
        const templatePath = path.join(process.cwd(), 'public', 'templates', 'cotizacion_template.docx');

        if (!fs.existsSync(templatePath)) {
            console.error('Template not found:', templatePath);
            return NextResponse.json({ error: 'Template file not found (cotizacion_template.docx)' }, { status: 404 });
        }

        const content = fs.readFileSync(templatePath, 'binary');

        // 2. Init Docxtemplater
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // 3. Render the document (replace {tags} with data)
        // Check for "detalles" loop or similar in your DOCX
        doc.render(data);

        // 4. Generate the filled DOCX buffer
        const generatedDocxBuffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // 5. Send to Gotenberg for PDF conversion
        const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host';

        // Construct FormData for Gotenberg
        // We need to import FormData from 'formdata-node' if Node environment doesnt support it fully, 
        // but Next.js usually has native FormData. However, passing a Buffer to native FormData might require a Blob.
        const form = new FormData();
        const docxBlob = new Blob([new Uint8Array(generatedDocxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        // Gotenberg expects the file(s) to convert. For LibreOffice, we send the file.
        // It converts all files to PDF and merges them.
        form.append('files', docxBlob, 'merged.docx');

        // LibreOffice specific: explicit format if needed, but usually auto-detected or defaults to PDF
        // Url: /forms/libreoffice/convert

        console.log('Sending filled DOCX to Gotenberg:', `${GOTENBERG_URL}/forms/libreoffice/convert`);

        let response: Response;
        try {
            response = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
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
            console.error('Gotenberg Error:', response.status, errorText);
            return NextResponse.json({ error: `Gotenberg conversion failed: ${errorText}` }, { status: 500 });
        }

        // 6. Return the PDF
        const pdfBuffer = await response.arrayBuffer();

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="cotizacion.pdf"',
            },
        });

    } catch (error: unknown) {
        console.error('API Error generating DOCX-PDF:', error);

        // Handle docxtemplater specific errors
        if (error && typeof error === 'object' && 'properties' in error) {
            const docxError = error as { properties?: { errors?: unknown[] } }
            if (docxError.properties?.errors) {
                docxError.properties.errors.forEach((e: unknown) => {
                    console.error('Docxtemplater Error:', e);
                });
            }
        }

        const errMsg = error instanceof Error ? error.message : 'Internal Server Error'
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
