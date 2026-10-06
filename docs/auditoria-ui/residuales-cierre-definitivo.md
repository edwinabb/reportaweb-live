# DT-RES-001 — Cierre definitivo de residuales de la migración Bubble→Supabase

**Fecha:** 2026-10-05
**Plan origen:** `docs/superpowers/plans/2026-10-05-cierre-pendientes-y-deudas.md` (Tarea B4)
**Deuda técnica:** DT-RES-001 (ver `docs/TECHNICAL_DEBTS.md`)
**Objetivo:** Enumerar los 5 bloques de residuales no recuperables para firma de wontfix por el usuario.

Toda la información proviene de documentos previos del repo. No se corrieron queries nuevas contra la BD en esta tarea; cuando una cifra requiere re-verificación en vivo, se marca como "pendiente de verificar".

---

## 1. GRUAS — `cotizaciones_configuracion.imagen_banco` e `imagen_firma` vacíos

- **Descripción:** El único registro de `cotizaciones_configuracion` del tenant GRUAS DEL PACÍFICO no tiene cargada ni la imagen de datos bancarios ni la firma autorizada.
- **Cantidad:** 2 campos vacíos (1 fila afectada).
- **IDs exactos:**
  - Tenant GRUAS = `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
  - Registro Bubble `cotizaciones_configuracion` = `1693455680001x159750058880938620` (creado 2023-08-31, nunca modificado tras creación).
  - Para contraste, CISE (`1596739476957x373529478922312450`) sí tiene ambos poblados.
- **Evidencia:**
  - `docs/auditoria-ui/residuales-gruas-imagen-banco-firma.md` (verificación directa contra API Bubble LIVE).
  - `docs/auditoria-ui/14-opciones-internas.md:60` nota del 2026-09-13.
  - Screenshot: `screenshots/14-opciones-internas/07-empresa-tab6-formato-cotizacion.png`.
- **Razón "no recuperable":** Confirmado en Bubble LIVE — los archivos nunca se cargaron en origen. Las URLs rotas apuntando al proyecto muerto `wioozisskjjgjjybsoqo.supabase.co` ya fueron limpiadas a `NULL` el 2026-09-09.
- **Impacto en UI:** En `Opciones Internas → Empresa → tab 6` de GRUAS, los campos muestran placeholder vacío. PDF de cotización GRUAS saldrá sin banco ni firma hasta que el cliente aporte los archivos.

---

## 2. 685 PDFs de `facturas_venta` / `facturas_compra` sin fuente real

- **Descripción:** 685 instancias de columna de PDF (`pdf_valorizacion`, `pdf_factura`) que apuntan al proyecto Supabase muerto, para las cuales el campo de archivo correspondiente en Bubble está vacío. Nunca existió el archivo en origen.
- **Cantidad:** 685 instancias (633 filas: 186 `facturas_venta` + 447 `facturas_compra`).
- **Desglose:**

  | Columna | Tenant | Count |
  |---|---|---:|
  | `facturas_venta.pdf_valorizacion` | GRUAS | 185 |
  | `facturas_venta.pdf_valorizacion` | CISE | 1 |
  | `facturas_compra.pdf_factura` | GRUAS | 235 |
  | `facturas_compra.pdf_valorizacion` | GRUAS | 242 |
  | `facturas_compra.pdf_valorizacion` | CISE | 22 |
  | **Total** |  | **685** |

- **Evidencia:** `docs/auditoria-ui/residuales-685-pdfs-facturacion.md` (verificación 2026-09-09, Fase 9). 3.854 casos sí se recuperaron por `scripts/fase9-finanzas-archivos.ts`; estos 685 son residual sin fuente.
- **Razón "no recuperable":** Campo vacío en Bubble. Opción B aceptada por el usuario 2026-09-09.
- **Impacto en UI:** Listado de Facturación muestra enlace de descarga roto (404) en vez de "sin PDF". Recomendación operativa: `UPDATE … SET pdf_url = NULL` sobre esas 633 filas identificadas.

---

## 3. `reportes_maquinaria` con `maquinaria_id` no resoluble

- **Descripción:** Reportes de maquinaria con `bubble_id` presente pero `maquinaria_id` NULL porque la máquina referenciada en Bubble no existe o no fue migrada. Huérfanos de origen, no de migración.
- **Cantidad — DISCREPANCIA documentada:**
  - **149** = lote nuevo del delta-sync del 2026-09-08 (34 CISE + 115 GRUAS). Cifra que menciona `TECHNICAL_DEBTS.md`.
  - **1.601** = universo histórico total (433 CISE + 1.168 GRUAS). Incluye los 149 + ~1.452 preexistentes (hasta 2022-05-25).
- **Query reproducible:**
  ```sql
  SELECT id, tenant_id, bubble_id, fecha_reporte, created_at
  FROM reportes_maquinaria
  WHERE bubble_id IS NOT NULL AND maquinaria_id IS NULL
  ORDER BY tenant_id, fecha_reporte;
  ```
- **Evidencia:** `docs/auditoria-ui/residuales-reportes-maquinaria-huerfanos.md`.
- **Razón "no recuperable":** FK `maquinaria_id → maquinarias.id` no se resuelve porque el `bubble_id` referenciado no existe en `maquinarias`.
- **Impacto en UI:** Reporte íntegro y consultable; solo falta vínculo visual a ficha de máquina.
- **🔸 Decisión del usuario pendiente:** ¿firmás wontfix por 149 (lote) o 1.601 (histórico total)?

---

## 4. `CT 233-2025` + 1 reporte_maquinaria con literal corrupto en vez de URL

- **Descripción:** 2 filas donde el campo PDF en Bubble no contiene URL sino un literal de texto. Dato corrupto en origen.
- **IDs exactos:**

  | # | Tabla | id Supabase | bubble_id | Columna | Literal |
  |---|---|---|---|---|---|
  | 1 | `cotizaciones` | `2c9858f9-3145-4a6b-8544-a0c40327f8ff` (`numero='CT 233-2025'`) | `1751671142615x551586952478457860` | `pdf_url` | `"pdf.pdf"` |
  | 2 | `reportes_maquinaria` | `8f2005cc-c0ea-47c5-ae6a-4d47806ea412` | — | `pdf_url` | `"It wasn't possible to find the uploaded file URL"` |

- **Estado actual:**
  - Caso 1: `cotizaciones.pdf_url = NULL` (limpiado).
  - Caso 2: `reportes_maquinaria.pdf_url` conserva el literal textual.
- **Evidencia:** `docs/auditoria-ui/residuales-dato-corrupto-bubble.md`.
- **Impacto UI:**
  - `CT 233-2025`: sin enlace de descarga ("sin PDF").
  - Reporte `8f2005cc…`: muestra literal textual. **Recomendación:** `UPDATE reportes_maquinaria SET pdf_url=NULL WHERE id='8f2005cc-c0ea-47c5-ae6a-4d47806ea412'`.

---

## 5. 3.327 + 2.527 items de facturación + 6 pagos de venta "huérfanos" en Bubble

- **Descripción:** Registros que existen como `facturas_venta_item` / `facturas_compra_item` / `factura_venta_pagos` en Bubble pero cuyo `bubble_id` no aparece en el array `lista_items`/`lista_cobros` de ninguna factura padre. **Nunca llegaron a Supabase** — no son filas con FK NULL, son filas que no se migraron.
- **Cantidades:**
  - `facturas_venta_item`: 1.215 CISE + 2.112 GRUAS = **3.327**
  - `facturas_compra_item`: 638 CISE + 1.889 GRUAS = **2.527**
  - `factura_venta_pagos`: 3 CISE + 3 GRUAS = **6**
- **Verificación en Supabase hoy (2026-09-09):**
  - `facturas_venta_item` con `bubble_id IS NOT NULL AND factura_venta_id IS NULL` → **0 filas**.
  - `factura_venta_pagos` con FK nula → **0 filas**.
  - `facturas_compra_item` con `factura_id IS NULL` → **13.774 filas**, pero 13.766 son estado `NA`/`P` (ítems pendientes de facturar — legítimo); solo **8 anómalas** (estado `F`/`V`/NULL sin FK).
- **Evidencia:** `docs/auditoria-ui/residuales-facturacion-huerfanos.md`.
- **Razón "no recuperable":** Sin FK padre en origen. Residual real del origen Bubble.
- **Impacto en UI:** **0 impacto** — nunca pertenecieron a ninguna factura visible.

---

## Tabla resumen — checkbox de aprobación

| # | Residual | Cantidad | Impacto UI | Aprobado wontfix |
|---|---|---|---|:---:|
| 1 | GRUAS `imagen_banco`/`imagen_firma` vacíos | 2 campos (1 fila) | PDF cotización GRUAS sin banco/firma | [ ] |
| 2 | 685 PDFs faltantes facturación | 685 URLs (633 filas) | Enlaces 404 en listados Facturación | [ ] |
| 3 | `reportes_maquinaria` `maquinaria_id` NULL | 149 (lote) / 1.601 (histórico) | Reporte sin vínculo a ficha de máquina | [ ] |
| 4 | `CT 233-2025` + 1 reporte con literal corrupto | 2 filas | 1 sin PDF; 1 con literal textual | [ ] |
| 5 | Items/pagos huérfanos en Bubble sin FK padre | ~5.860 nunca insertados | 0 impacto UI | [ ] |

**Instrucciones:** firmar cada checkbox cuando el usuario confirme wontfix. Tras firma, actualizar `docs/TECHNICAL_DEBTS.md` DT-RES-001 de 🟡 a 🟢 cerrado, con link a este documento.

## Observación — otros gaps NO incluidos en DT-RES-001

`docs/auditoria-ui/residuales-pagos-facturacion.md` (2026-09-10) tiene 4 hallazgos CRÍTICOS adicionales:

1. `cobros_venta` vacía en PROD (521 pagos en `factura_venta_pagos` sin leer).
2. `bancos` tabla vacía — bloquea registrar cobros nuevos.
3. `valorizaciones`: GRUAS=0, CISE=752 — asimetría sin explicación.
4. `facturas_compra_pagos` cobertura 1,4% sin verificar.

**No son wontfix** — están cubiertos por FASE B del plan maestro (B1 = plan P-005-A ya listo; B2 cubre `bancos` + pagos GRUAS; resto = P-005-B).
