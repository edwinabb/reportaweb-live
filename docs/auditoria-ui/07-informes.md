# Auditoría UI ↔ Datos — 07 · Informes

**Fecha:** 2026-09-07 · **Módulo:** 7/15 (Informes: Checklist · Maquinaria · Personal · Gastos)
**Formato de referencia:** `06-cotizaciones.md` (template v1.2)
**Screenshots Bubble:** `c:/tmp/screenshots/reportar/7 informes/` (submenú, listado checklist, PDF real, wizard de llenado, horas maquinaria, horas+gastos personal, exportar CSV)
**Tenant Bubble auditado:** GRÚAS DEL PACÍFICO (sesión `edwinb@reporta.la`, `reporta.la/version-test`)
**Datos BD PROD:** conteos verificados 2026-09-07 vía Supabase MCP directo (`fqwhagryqkkhbgznxtwf`), solo CISE + GRUAS.

---

## Resumen Ejecutivo

🟢 **TK-I1 CERRADO (2026-09-08):** el hallazgo crítico original (checklists sin migrar) fue investigado, ampliado y resuelto en `docs/superpowers/plans/2026-09-07-migracion-historica-informes-checklist.md`. Causa raíz confirmada: los 6.507 informes migrados el 2026-05-25 se perdieron en un reset completo de PROD del 2026-05-26, y el orquestador de recuperación del cutover (30-may) nunca incluyó una fase de formatos/informes. Además, el catálogo real de Bubble no eran 2 formatos sino **8** (4 formatos nuevos + 2 versiones adicionales de los 2 ya conocidos) — se catalogaron todos (Fase 0), se migraron **13.402 informes Finalizado** con sus respuestas (solo para `fecha_reporte >= 2026-01-01`, por decisión explícita del usuario; años anteriores llevan cabecera+PDF completos sin respuestas) (Fase 1), y se migraron **14.196/14.197 archivos** (PDFs + fotos + evidencias de planes de acción) a Supabase Storage con las columnas de URL actualizadas (Fase 2). Detalle completo de conteos en `docs/superpowers/plans/2026-09-07-migracion-historica-informes-checklist.md` § Fase 3.

<details>
<summary>Hallazgo original (2026-09-07), para contexto histórico</summary>

🔴 **Hallazgo crítico — el primero de esta magnitud en la auditoría (módulos 1-7):** el sistema de "Formatos" (checklists dinámicos) que sostiene el submenú **Informes** de Bubble tiene su **catálogo/schema migrado pero CERO informes reales migrados**. Bubble muestra **3.532 checklists** para el solo tenant GRUAS (73 en proceso + 22 suspendidos + 14 cancelados + 3.423 finalizados); en PROD, `formatos_informes` (y sus tablas satélite `_respuestas`/`_maquinarias`/`_personal`/`_comentarios`) están en **0 filas** para los dos tenants — y en general (`select count(*) from formatos_informes` = 0 sin filtrar tenant). Solo el catálogo de plantillas (`formatos`, 2 filas) y sus preguntas (`formatos_preguntas`, 136 filas) sí se migraron.

</details>

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

### 1.3 Cobertura de datos (PROD) — actualizado 2026-09-08, post cierre TK-I1

| Tabla | Filas (CISE+GRUAS) | Status |
|---|---:|---|
| `formatos` (catálogo de plantillas) | 6 (2 originales + 4 nuevos) | ✅ migrado |
| `formatos_versiones` | 8 (incluye 2 versiones adicionales de formatos ya existentes) | ✅ migrado |
| `formatos_preguntas` | ~354 (8 formatos) | ✅ migrado |
| `config_checklist` (config por tenant) | 14 (CISE+GRUAS) | ✅ migrado |
| **`formatos_informes`** (cabecera de cada checklist llenado) | **13.402** | ✅ migrado (100% de los `Finalizado` en Bubble para los 8 formatos) |
| `formatos_informes_respuestas` | ~55.342 | ✅ migrado (solo informes con `fecha_reporte >= 2026-01-01`, por decisión explícita del usuario — años anteriores no llevan respuestas, solo cabecera+PDF) |
| `formatos_informes_maquinarias` | ~4.449 | ✅ migrado (solo cuando Bubble traía `id_maquinaria` en el informe) |
| `formatos_informes_personal` | 0 | — sin campo de origen en Bubble para los 8 formatos migrados (no es un gap, se confirmó que no existe el vínculo en el modelo de datos de origen) |
| `formatos_informes_comentarios` | 0 | fuera de alcance de esta migración (no tiene equivalente confirmado en Bubble) |
| PDFs re-subidos a Supabase Storage (`formatos_informes.pdf_url`) | 12.906/12.906 (menos 1 archivo irrecuperable, ver nota) | ✅ |
| Fotos de respuestas re-subidas (`formatos_informes_respuestas.valor_foto_url`) | 1.258/1.258 | ✅ |

**TK-I1 CERRADO.** Único residual: 1 PDF de 2021 (`INF-2189`) cuyo archivo original en el S3 de Bubble ya no existe (devuelve un error HTML, no el PDF) — el informe conserva todos sus datos y respuestas, solo sin PDF descargable. No se considera bloqueante.

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
| TK-I1 | 🟢 CERRADO 2026-09-08 | `formatos_informes` y tablas satélite estaban en 0 filas (causa: reset de PROD 2026-05-26 borró la migración de mayo, nunca re-corrida) | Migrado: 13.402 informes + ~55.342 respuestas (solo 2026+) + ~4.449 vínculos de maquinaria + 12.906 PDFs + 1.258 fotos re-subidos a Supabase Storage. Ver plan `2026-09-07-migracion-historica-informes-checklist.md` |
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

**Estado:** 🟢 **CERRADO 2026-09-08** — TK-I1 (el hallazgo crítico de datos) resuelto: 13.402 informes históricos migrados con respuestas (2026+), archivos re-subidos a Supabase Storage. R. Maquinaria y R. Personal ya estaban en buen estado (✅). Quedan abiertos como no bloqueantes: TK-I2 (`reportes_combustible` en 0 filas, pendiente confirmar con el usuario si tiene origen en Bubble), TK-I3 (sin herramienta de Exportar CSV por formato) y las DUDAs INF-001 a 004 (UI, no de datos).
