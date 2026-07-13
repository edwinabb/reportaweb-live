---
name: feedback-gotenberg-pdf
description: Todos los PDFs en reportaweb3/reporta-app se generan vía Gotenberg instalado en un VPS — nunca usar librerías PDF de Node.js
metadata:
  type: feedback
---

Todos los PDFs del ecosistema Reporta se generan usando **Gotenberg** instalado en un VPS externo, referenciado con la variable de entorno `GOTENBERG_URL`.

**Why:** Es el stack en uso. El patrón está documentado en la generación de PDF de cotizaciones (ver `app/api/valorizaciones/[codigo]/pdf/` y el flujo de cotizaciones). Cualquier nuevo endpoint de PDF debe replicar ese patrón: generar HTML → enviar a Gotenberg → retornar el PDF.

**How to apply:**
- Al implementar cualquier `generate-pdf` route en reportaweb3, usar `fetch(process.env.GOTENBERG_URL + '/forms/chromium/convert/html', ...)` con el HTML del reporte
- No usar `puppeteer`, `pdf-lib`, `pdfmake` ni ninguna librería Node.js de PDF
- Los stubs de endpoint deben comentar explícitamente: "TODO: implementar con Gotenberg (ver cotizaciones PDF)"
- Aplica también a: reportes_maquinaria, reportes_personal, facturas, valorizaciones
