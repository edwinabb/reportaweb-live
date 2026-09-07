# Plantillas .docx para el bridge de PDF de Bubble

Cada archivo `<template_key>.docx` en esta carpeta corresponde a un `template_key`
que Bubble envía en el body de `POST /api/bubble/pdf/generate`.

**Paso manual pendiente (no lo puede hacer un agente):** exportar desde
docmaker.co (o desde donde estén hoy) las plantillas `.docx` actuales de
Bubble y copiarlas aquí, una por tipo de documento:

- `cotizacion-bubble.docx`
- `valorizacion-venta.docx`
- `valorizacion-compra.docx`
- `reporte-maquinaria.docx`
- `reporte-horas-maquinaria.docx`
- `reporte-personal.docx`

Los tags dentro del `.docx` deben usar la sintaxis de docxtemplater: `{nombre_tag}`
para texto simple, `{#lista}...{/lista}` para tablas/repeticiones. Ver
https://docxtemplater.com/docs/tag-types/ para la sintaxis completa.

Sin estos archivos, `renderBubbleDocxPdf()` lanza `BubbleTemplateNotFoundError`.
