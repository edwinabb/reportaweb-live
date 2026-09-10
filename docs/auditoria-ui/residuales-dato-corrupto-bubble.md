# Residuales: dato corrupto en origen Bubble (no recuperable vía migración)

**Fecha de verificación:** 2026-09-09
**Contexto:** durante el recorrido completo Fases 1-9 (delta-sync + migración de archivos,
`docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md`), se detectaron 2 filas donde
el campo de archivo en Bubble no contenía una URL real sino un literal de texto. No son bugs de
migración: el dato de origen en Bubble ya estaba corrupto/perdido antes de que existiera esta
migración. Ambos casos quedaron registrados en `file_migration_log` con `status = 'error'` y no son
recuperables sin que el cliente aporte el archivo original.

Este documento centraliza los 2 casos para seguimiento; no requiere ninguna acción de código.

---

## Caso 1 — Cotizaciones (Fase 6)

| Campo | Valor |
|---|---|
| Tabla afectada | `cotizaciones` |
| Fila | `id = 2c9858f9-3145-4a6b-8544-a0c40327f8ff` |
| Identificador de negocio | `numero = 'CT 233-2025'` |
| `bubble_id` | `1751671142615x551586952478457860` |
| Columna afectada | `pdf_url` |
| Literal encontrado en Bubble | `"pdf.pdf"` |
| Estado actual en `cotizaciones.pdf_url` | `NULL` (verificado 2026-09-09) |

**Registro en `file_migration_log`:**

```json
{
  "table_name": "cotizaciones",
  "row_id": "2c9858f9-3145-4a6b-8544-a0c40327f8ff",
  "field": "pdf_url",
  "bubble_url": "pdf.pdf",
  "status": "error",
  "error": "Failed to parse URL from pdf.pdf",
  "created_at": "2026-09-08 16:48:45.904835"
}
```

**Conclusión:** el campo de archivo de Bubble para esta cotización nunca contuvo una URL válida,
solo el literal `"pdf.pdf"` (nombre de archivo sin ruta ni host). No hay forma de reconstruir el
PDF original a partir de este dato — no es recuperable sin que el cliente (CISE/GRUAS, según
corresponda al tenant de esta fila) aporte el archivo original.

---

## Caso 2 — Reportes de Maquinaria (Fase 7)

| Campo | Valor |
|---|---|
| Tabla afectada | `reportes_maquinaria` |
| Fila | `id = 8f2005cc-c0ea-47c5-ae6a-4d47806ea412` |
| Columna afectada | `pdf_url` |
| Literal encontrado en Bubble | `"It wasn't possible to find the uploaded file URL"` |
| Estado actual en `reportes_maquinaria.pdf_url` | mismo literal de texto (verificado 2026-09-09) |

**Registro en `file_migration_log`:**

```json
{
  "table_name": "reportes_maquinaria",
  "row_id": "8f2005cc-c0ea-47c5-ae6a-4d47806ea412",
  "field": "pdf_url",
  "bubble_url": "It wasn't possible to find the uploaded file URL",
  "status": "error",
  "error": "Failed to parse URL from It wasn't possible to find the uploaded file URL",
  "created_at": "2026-05-28 04:02:54.154247"
}
```

**Conclusión:** este literal es un mensaje de error propio de Bubble (probablemente generado por
el propio motor de Bubble al no encontrar el archivo subido en su storage interno), guardado tal
cual en el campo de archivo en lugar de una URL. El dato de origen ya estaba perdido en Bubble
antes del cutover — no es recuperable sin que el cliente aporte el archivo original.

---

## Resumen

| # | Tabla | Fila | Literal en Bubble | Recuperable |
|---|---|---|---|---|
| 1 | `cotizaciones` | `2c9858f9-3145-4a6b-8544-a0c40327f8ff` (CT 233-2025) | `"pdf.pdf"` | No — pedir al cliente |
| 2 | `reportes_maquinaria` | `8f2005cc-c0ea-47c5-ae6a-4d47806ea412` | `"It wasn't possible to find the uploaded file URL"` | No — pedir al cliente |

Ambos casos están cerrados a nivel de investigación: son datos de origen corruptos en Bubble, no
bugs de la migración ni de la app v3. No se requiere ninguna corrección de código; si el cliente
llega a aportar el archivo original en el futuro, se puede resubir manualmente al bucket
correspondiente y actualizar la fila con un `UPDATE` puntual.
