# Auditoría UI ↔ Datos — 07 · Informes

**Fecha:** 2026-09-07 · **Módulo:** 7/15 (Informes: Checklist · Maquinaria · Personal · Gastos)
**Formato de referencia:** `06-cotizaciones.md` (template v1.2)
**Screenshots Bubble:** `c:/tmp/screenshots/reportar/7 informes/` (submenú, listado checklist, PDF real, wizard de llenado, horas maquinaria, horas+gastos personal, exportar CSV)
**Tenant Bubble auditado:** GRÚAS DEL PACÍFICO (sesión `edwinb@reporta.la`, `reporta.la/version-test`)
**Datos BD PROD:** conteos verificados 2026-09-07 vía Supabase MCP directo (`fqwhagryqkkhbgznxtwf`), solo CISE + GRUAS.

---

## Resumen Ejecutivo

🔴 **Hallazgo crítico — el primero de esta magnitud en la auditoría (módulos 1-7):** el sistema de "Formatos" (checklists dinámicos) que sostiene el submenú **Informes** de Bubble tiene su **catálogo/schema migrado pero CERO informes reales migrados**. Bubble muestra **3.532 checklists** para el solo tenant GRUAS (73 en proceso + 22 suspendidos + 14 cancelados + 3.423 finalizados); en PROD, `formatos_informes` (y sus tablas satélite `_respuestas`/`_maquinarias`/`_personal`/`_comentarios`) están en **0 filas** para los dos tenants — y en general (`select count(*) from formatos_informes` = 0 sin filtrar tenant). Solo el catálogo de plantillas (`formatos`, 2 filas) y sus preguntas (`formatos_preguntas`, 136 filas) sí se migraron.

En contraste, **R. Maquinaria** y **R. Personal** (que en Bubble viven bajo el mismo submenú pero corresponden a un sistema de datos completamente distinto, `reportes_maquinaria`/`reportes_personal`) están en excelente estado: 24.352 y 27.170 filas respectivamente, ya confirmado en auditorías previas (Fase 2 módulo 5) que generan PDF correctamente. **R. Gastos** de reportaweb3 (`reportes_combustible`) también está en 0 filas — pendiente de aclarar con el usuario si tiene equivalente real en Bubble (ver DUDA-INF-002).

**Menú Bubble (4 sub-páginas bajo INFORMES):** Informes (listado de checklists) · Exportar CSV (herramienta genérica de export por formato) · Horas Maquinaria · Horas Personal (que en realidad se titula "REPORTE DE HORAS Y GASTOS DE PERSONAL" — combina horas y gastos de personal en una sola pantalla).
**Menú reportaweb3 (4 sub-páginas):** R. Checklist (`/informes`) · R. Maquinaria (`/informes/maquinaria`) · R. Personal (`/informes/personal`) · R. Gastos (`/informes/gastos`, en realidad combustible de maquinaria, no gastos de personal — nombres distintos, alcance distinto).

---

## 1. R. CHECKLIST — 🔴 CRÍTICO: datos históricos no migrados

**Path Bubble:** INFORMES → Informes (listado) — 3.532 ítems GRUAS (73 En Proceso / 22 Suspendidos / 14 Cancelados / 3.423 Finalizados)
**Path reportaweb3:** `/informes` → `app/(dashboard)/informes/page.tsx` + `components/informes/informes-list.tsx`
**Tablas:** `formatos` (catálogo de plantillas) · `formatos_preguntas` (ítems del checklist) · `formatos_informes` (cabecera de cada informe llenado) · `formatos_informes_respuestas` (respuesta SI/NO/NO APLICA por pregunta) · `formatos_informes_maquinarias`/`_personal`/`_comentarios`

### 1.1 Listado y wizard — inventario de opciones (Bubble)

| Elemento | Status | Notas |
|---|---|---|
| Buscar por código | — | No verificado en reportaweb3 (bloqueado por falta de datos, ver §1.3) |
| Selector de formato ("CHECKLIST DE GRÚAS V2") | — | Confirma que Bubble ya soporta múltiples formatos de checklist por tenant (2 en `formatos`) |
| Botón "Filtrar" | — | No explorado a fondo (mismo patrón de duda que en Cotizaciones, DUDA-COT-001) |
| Select "Vista" (Todos/Semana/Mes) | — | |
| Botón "Descargar CSV" | — | Distinto del "Exportar CSV" del submenú — este exporta solo la vista filtrada actual |
| Botón "Nuevo" | — | |
| 4 tarjetas KPI (En Proceso/Suspendidos/Cancelados/Finalizados) | — | |
| Checkbox de selección masiva (header + por fila) | ⚪ | Se probó seleccionar "todos" — **no apareció ninguna barra de acción masiva visible**. DUDA-INF-001: ¿el checkbox tiene una función real (bulk delete/export) no descubierta, o es un remanente de UI sin uso? |
| Menú de fila: Ver | — | Abre el **PDF real** en pestaña nueva (no una vista de detalle in-app) — confirmado con `INF-3693`: cabecera Empresa/RUC/Domicilio/Cliente/Cotización/Solicitado por/Tarea/Sitio/Grúa/Fecha, tabla de 33 ítems inspeccionados con columna ¿Cumple? (SI/NO/NO APLICA), versión de formato impresa en el PDF ("V.03 JUN-2025"). |
| Menú de fila: Editar | — | Abre el wizard de llenado real: selector de Grúa (maquinaria), Fecha del Reporte (automática, no editable), preguntas SI/NO/NO APLICA paginadas, botones Suspender/Siguiente. |
| Menú de fila: Compartir PDF | — | Sin explorar en detalle (probable share link) |
| Menú de fila: Descargar | — | |
| Menú de fila: Borrar | — | |

### 1.2 reportaweb3 — código confirmado

`components/informes/informe-fill-form.tsx` (wizard de llenado dinámico, coincide con el patrón SI/NO/NO APLICA de Bubble) + `informe-read-view.tsx` (vista de solo lectura) + `signature-canvas.tsx` (captura de firma — **no vista en la sesión de Bubble auditada**, DUDA-INF-003: ¿la firma es una mejora nueva o Bubble la tiene en otro paso no alcanzado?) + `lib/actions/formatos-informes.ts` (CRUD completo contra las 6 tablas del modelo). El código está construido con la misma arquitectura de "formato dinámico" que Bubble (preguntas parametrizadas por plantilla, no hardcodeadas) — **la estructura es correcta, el problema es exclusivamente de datos**.

### 1.3 Cobertura de datos (PROD) — el hallazgo

| Tabla | Filas (global, no solo CISE/GRUAS) | Status |
|---|---:|---|
| `formatos` (catálogo de plantillas) | 2 | ✅ migrado |
| `formatos_preguntas` (ítems por plantilla) | 136 | ✅ migrado |
| `config_checklist` (config por tenant) | 14 (CISE+GRUAS) | ✅ migrado |
| **`formatos_informes`** (cabecera de cada checklist llenado) | **0** | 🔴 **sin migrar** — Bubble tiene 3.532 solo para GRUAS |
| `formatos_informes_respuestas` | 0 | 🔴 sin migrar |
| `formatos_informes_maquinarias` | 0 | 🔴 sin migrar |
| `formatos_informes_personal` | 0 | 🔴 sin migrar |
| `formatos_informes_comentarios` | 0 | 🔴 sin migrar |

**TK-I1 (CRÍTICA):** migrar el histórico de `formatos_informes` + tablas satélite desde Bubble Data API (patrón ya usado en el resto del proyecto: script `tsx` idempotente por `bubble_id`). Volumen estimado: **miles de registros** (3.532 solo en GRUAS; falta contar CISE). Esto bloquea que cualquier cliente vea su historial de checklists al cortar Bubble — es, hasta ahora, el gap de datos más grande encontrado en toda la auditoría (módulos 1-7).

---

## 2. R. MAQUINARIA / R. PERSONAL — ✅ en buen estado

**Path Bubble:** INFORMES → Horas Maquinaria / Horas Personal (título real: "REPORTE DE HORAS Y GASTOS DE PERSONAL")
**Path reportaweb3:** `/informes/maquinaria` → `getAllReportesMaquinaria()` (`reportes_maquinaria`) · `/informes/personal` → `getAllReportesPersonal()` (`reportes_personal`)

| Tabla | Filas (CISE+GRUAS) | Status |
|---|---:|---|
| `reportes_maquinaria` | 24.352 | ✅ (22.528 con PDF generado, confirmado en auditoría de Fase 2 módulo 5) |
| `reportes_personal` | 27.170 | ✅ |

No se pudo confirmar el conteo exacto de Bubble para estas dos pantallas por límite de tiempo de sesión (el rango de fechas por defecto de Bubble es el mes en curso, sin datos de 2026-09; retroceder manualmente mes a mes hasta 2023 no era viable dentro de esta sesión — DUDA-INF-004, BAJA: confirmar conteos exactos en una sesión dedicada). La evidencia indirecta (volumen migrado + PDFs ya generados en producción) es sólida.

**Bubble combina "Horas Personal" y "Gastos de Personal" en una sola pantalla** ("REPORTE DE HORAS Y GASTOS DE PERSONAL", con selector de trabajador + rango de fechas + exportar). reportaweb3 separa "R. Personal" y "R. Gastos" en 2 páginas distintas — pero **"R. Gastos" de reportaweb3 no es gastos de personal, es combustible de maquinaria** (`reportes_combustible`). DUDA-INF-002 (MEDIA): confirmar con el usuario si "gastos de personal" (viáticos, adelantos, etc., visible en la pantalla combinada de Bubble) tiene una tabla/pantalla propia en reportaweb3 que no se identificó, o si es un gap real de alcance.

---

## 3. R. GASTOS (combustible) — 🔴 sin datos migrados

**Path reportaweb3:** `/informes/gastos` → `getAllReportesGastos()` → tabla `reportes_combustible`
**Cobertura:** **0 filas en total** (no solo CISE/GRUAS — la tabla está completamente vacía en PROD).

**TK-I2 (CRÍTICA si el negocio realmente usa reportes de combustible; BAJA si es una función nueva sin uso histórico):** confirmar con el usuario si Bubble registra consumo de combustible en algún lugar no explorado en esta sesión (no apareció en el submenú INFORMES ni se mencionó en la auditoría previa de Maquinaria, `02-maquinaria.md`). Si existe, migrar; si es una función nueva de reportaweb3 sin origen en Bubble, no es un gap — es simplemente una feature todavía sin usar.

---

## 4. EXPORTAR CSV — herramienta genérica, sin equivalente identificado

**Path Bubble:** INFORMES → Exportar CSV — wizard independiente: "Escriba algunas letras del título del formato, seleccione una de las opciones listadas y haga clic en Siguiente" → exporta las respuestas acumuladas de un formato completo (no solo la vista filtrada de la lista).
**Path reportaweb3:** no se encontró una herramienta equivalente de export masivo por formato.

**TK-I3 (BAJA):** función de analítica/export, no bloqueante — depende de que TK-I1 (migración de datos) se resuelva primero, ya que hoy no habría nada que exportar.

---

## Gaps y tickets

| ID | Severidad | Descripción | Acción |
|---|---|---|---|
| TK-I1 | 🔴 CRÍTICA | `formatos_informes` y tablas satélite (respuestas/maquinarias/personal/comentarios) en 0 filas — 3.532+ checklists históricos de GRUAS (falta contar CISE) nunca migrados | Migrar desde Bubble Data API, mismo patrón idempotente por `bubble_id` ya usado en el resto del proyecto |
| TK-I2 | 🔴/🟢 según respuesta de DUDA-INF-002/③ | `reportes_combustible` en 0 filas | Confirmar con el usuario si hay datos reales de Bubble para migrar |
| TK-I3 | 🟢 BAJA | Sin herramienta de "Exportar CSV" por formato completo | Depende de TK-I1; construir después |
| TK-MAQ-HORAS (ya existía, confirmado aquí) | 🟡 MEDIA | `maquinaria_horas` (1.917 filas CISE, 0 GRUAS) sigue sin ningún consumidor en código — ni Maquinaria ni Informes la usan | Ver `docs/TECHNICAL_DEBTS.md` DUDA-MAQ-HORAS — este módulo confirma que la deuda sigue abierta, "Horas Maquinaria" usa `reportes_maquinaria`, no esta tabla |

## DUDAs abiertas

| ID | Pregunta |
|---|---|
| DUDA-INF-001 | El checkbox de selección masiva en el listado de Checklist de Bubble no mostró ninguna barra de acción al seleccionar todo — ¿tiene una función real no descubierta? |
| DUDA-INF-002 | "Gastos de personal" (viáticos/adelantos) de la pantalla combinada de Bubble — ¿existe en reportaweb3 en otro lugar, o es un gap de alcance? |
| DUDA-INF-003 | `signature-canvas.tsx` (captura de firma) en el wizard de checklist de reportaweb3 — ¿corresponde a un paso de Bubble no alcanzado en esta sesión, o es una mejora nueva? |
| DUDA-INF-004 | Conteos exactos de Bubble para Horas Maquinaria/Personal — no verificados por límite de navegación de fechas en la sesión; confirmar en una sesión dedicada si se quiere el dato exacto (la evidencia indirecta ya es sólida). |

## Cierre

**Estado:** 🔴 **NO se cierra** — hallazgo crítico de datos (TK-I1) requiere decisión y priorización del usuario antes de continuar. R. Maquinaria y R. Personal están en buen estado (✅), pero el módulo como conjunto no puede marcarse verde mientras el checklist (la funcionalidad más usada según el volumen — 3.532 solo en GRUAS) no tenga sus datos históricos.
