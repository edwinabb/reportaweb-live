# Pendientes por resolver — Campos con comportamiento inesperado
**Uso:** Revisar uno a uno con el desarrollador antes del cutover.

---

## P-001 · `terceros.logo_url` — Script reportó "Rows with URL: 0" en Bubble

| Campo | Detalle |
|-------|---------|
| **Tabla Supabase** | `terceros` |
| **Columna** | `logo_url` |
| **Script** | `migrate-files-to-storage.ts --table=terceros_logo` |
| **Evidencia** | Log 2026-05-23: `Rows with URL: 0 / Pending: 0` — terminó en 2 segundos |
| **Causa raíz** | `migrate-terceros-bubble.ts` leía `t.logo` pero el campo Bubble se llama `logo_url` (tipo file). Nunca se pobló `terceros.logo_url` en Supabase. |
| **Resultado** | CISE: 247 logos migrados ✅. GRUAS: 1 tercero tenía texto placeholder en lugar de URL — sin logo real. |
| **Estado** | ✅ Resuelto |

---

## P-002 · `facturas_venta.pdf_factura_url` — Sin poblar

| Campo | Detalle |
|-------|---------|
| **Tabla** | `facturas_venta` |
| **Columna** | `pdf_factura_url` |
| **Columnas OK** | `facturas_venta.pdf_valorizacion` ✅ (2,610 filas — fixDbFromLog), `facturas_compra.pdf_factura` ✅ (1,235), `facturas_compra.pdf_valorizacion` ✅ (1,264) |
| **Resultado** | CISE: 716 PDFs ✅. GRUAS: 1,434 PDFs ✅. Total: 2,150 migrados, 0 errores. |
| **Script** | `patch-facturas-venta-pdf.ts` — campo Bubble: `pdf_factura`. Integrado en fase `patches` del orchestrator. |
| **Estado** | ✅ Resuelto |

---

## P-003 · `reportes_maquinaria` — `valorizacion_compra` y `valorizacion_venta` como Bubble IDs

| Campo | Detalle |
|-------|---------|
| **Tabla** | `reportes_maquinaria` |
| **Columnas** | `valorizacion_compra` (TEXT), `valorizacion_venta` (TEXT) |
| **Evidencia** | Contienen strings tipo `1705956236024x111563751262257150` — Bubble IDs, no UUIDs de Supabase |
| **Afectados** | GRUAS: 8,465 / 15,462 registros. CISE: 269 / 4,376 registros |
| **Estado app** | App móvil NO usa valorizaciones ✅ |
| **Estado web** | Analizado 2026-05-23. Los IDs son `facturas_compra/venta.bubble_id` — semántica diferente al nuevo sistema. |
| **Resolución** | Sin fix necesario. Paradigma cambió: Bubble = ID de factura ya existente; nuevo web = código de lote previo a factura. Reportes históricos quedan "congelados" como VALORADO, no reingresables al flujo nuevo (correcto). Único efecto: mensajes de error muestran Bubble ID crudo si alguien intenta re-valorizar (UX menor, no es blocker). |
| **Estado** | ✅ Resuelto — comportamiento esperado por cambio de paradigma |

---

## P-004 · `maquinarias.foto_url` — 5.6% cobertura

| Campo | Detalle |
|-------|---------|
| **Tabla** | `maquinarias` |
| **Columna** | `foto_url` |
| **Evidencia** | 15/267 maquinarias con foto (5.6%) |
| **Conclusión** | ✅ Confirmado en Bubble: solo 15 maquinarias tenían foto cargada. Dato correcto. |
| **Estado** | ✅ Resuelto — sin acción |

---

## Cómo revisar

Para cada pendiente, verificar directamente en el panel de Bubble:
1. Ir al tipo de dato correspondiente
2. Ver el nombre exacto del campo y su tipo
3. Ver si tiene datos en registros reales de CISE/GRUAS
4. Actualizar este archivo con la conclusión y acción a tomar
