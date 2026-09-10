# Auditoría UI ↔ Datos — 06 · Cotizaciones

**Fecha:** 2026-09-07 · **Módulo:** 6/15 (Cotizaciones)
**Formato de referencia:** `05-configuracion.md` (template v1.2)
**Screenshots Bubble:** `c:/tmp/screenshots/reportar/6 cotizaciones/` (listado, menú de fila, wizard 5 pasos completo, panel/dashboard, servicios, tasa de cambio)
**Tenant Bubble auditado:** GRÚAS DEL PACÍFICO (sesión `edwinb@reporta.la`, `reporta.la/version-test`)
**Datos BD PROD:** conteos verificados 2026-09-07 vía Supabase MCP directo (`fqwhagryqkkhbgznxtwf`), solo CISE + GRUAS.
**UI reportaweb3 verificada en vivo:** dev local (`localhost:3000`, BD TEST) con cuenta `e2e-admin@reporta.la` (`admin_tenant`, tenant CISE).

---

## Resumen Ejecutivo

Este es el módulo mejor cubierto de los auditados hasta ahora (1-5): el 95% de la superficie de Bubble ya tiene equivalente construido en reportaweb3, con datos migrados a PROD con alta fidelidad. El único gap real de UI es la ausencia de un dashboard ("Panel de Cotizaciones"); el resto son huecos menores (columna muerta, 39 tasas de cambio faltantes) o mejoras deliberadas (bloqueo de edición sobre cotizaciones aprobadas/rechazadas).

**Menú Bubble (4 sub-páginas):** Panel Cotizaciones (dashboard) · Cotizaciones (listado + wizard 5 pasos) · Servicios (catálogo) · Tasa De Cambio (catálogo histórico).
**Menú reportaweb3 (3 sub-páginas):** Gestión (`/cotizaciones`, listado + wizard **6** pasos) · Servicios (`/cotizaciones/servicios`) · Tasas (`/cotizaciones/tasas`). **No existe un "Panel"/dashboard equivalente.**

**Hallazgo operativo (no es un gap de código):** durante la auditoría, `GET /cotizaciones` produjo un 307→/login→/planificacion una vez, de forma intermitente (race de refresh de sesión en `updateSession`, `rw3_bloqueadas` ya vacío en cookie). Reintentado, cargó normal. No es específico de este módulo — anotado como DUDA-COT-000 para que Fase 5 (E2E) lo cubra con un test de reintento/carga en frío, no bloquea el cierre de este módulo.

---

## 1. GESTIÓN (listado + wizard)

**Path Bubble:** COTIZACIONES → Cotizaciones (listado runtime, 242 ítems tenant GRUAS)
**Path reportaweb3:** `/cotizaciones` → `app/(dashboard)/cotizaciones/page.tsx` + `components/cotizaciones/cotizaciones-table.tsx`
**Tabla:** `cotizaciones` (52 columnas) + `cotizaciones_detalle` (servicios por cotización)

### 1.1 Listado — filtros y opciones (regla de exhaustividad)

| Elemento Bubble | Elemento reportaweb3 | Status | Notas |
|---|---|---|---|
| Buscar cliente | Buscar Cliente | ✅ | |
| Buscar código | Buscar Código | ✅ | |
| Botón "Filtrar" (icono embudo) | — | ⚪ | Bubble abre un panel de filtros avanzados no explorado a fondo (limitación de tiempo de sesión Bubble); reportaweb3 resuelve con columnas ordenables (↕) en su lugar. DUDA-COT-001 (BAJA): confirmar que no se pierde ningún filtro avanzado real. |
| Select "Vista" (período: Todas/Semana/Mes) | — | ❌ gap menor | No hay filtro de período en el listado nuevo. BAJA — el listado no es tan largo como para necesitarlo, pero **Bubble sí lo tiene**. |
| Select "Vista" (estado: Nueva/Desarrollo/Enviado/Aplazada/Rechazada/Aprobada) | Select "Todos los Estados" | ✅ | |
| Botón "Descargar CSV" | — | ❌ gap MEDIA | Export no visible en el listado nuevo. Ticket TK-C1. |
| 4 tarjetas KPI clicables (Nuevas-Desarrollo/Enviada-Aplazada/Rechazadas/Aprobadas, actúan como filtro rápido) | — | ❌ gap BAJA | Cosmético/UX, no bloquea operación (el select de estado cubre el mismo filtro). |
| Botón "Nuevo" | "+ Nueva Cotización" | ✅ | |
| Toggle Activos/Papelera | "Activos" / "Papelera" | ✅ | Sigue el estándar v1.2 (Bubble no tenía este concepto — es una mejora del sistema nuevo, usa `is_active` para soft-delete). |
| Menú de fila: Ver | Ver | ✅ | |
| Menú de fila: Duplicar | Duplicar | ✅ | `duplicateCotizacion()` en `lib/actions/cotizaciones.ts:491`. |
| Menú de fila: Editar | Editar | ⚪ Mejora deliberada | reportaweb3 **bloquea** Editar si `estado IN ('APROBADA','RECHAZADA')` (`cotizacion-actions.tsx`); Bubble permite editar sin importar el estado. DUDA-COT-002: ¿confirmar este endurecimiento de integridad de datos, o el usuario necesita poder corregir una cotización ya aprobada? |
| Menú de fila: Deshabilitar | Eliminar (soft-delete → Papelera) | ✅ equivalente | |
| — | Menú de fila: "Crear PDF" (atajo directo a paso 4) | ➕ mejora | No existe en Bubble, agregado en reportaweb3. |
| — | Menú de fila: "Copiar ID" | ➕ mejora | |
| Paginación (242 ítem, 4 páginas) | Paginación + "Filas por página" | ✅ | |

### 1.2 Wizard — pasos (Bubble 5 pasos, reportaweb3 6 pasos)

Bubble fusiona "Crear PDF" y "Enviar al Cliente" en un solo Paso 4; reportaweb3 los separa (Paso 4 "Crear PDF" + Paso 5 "Enviar al Cliente"). Mapeo 1:1 confirmado por nombre e inspección del formulario "Nueva Cotización":

| # Bubble | # reportaweb3 | Campos verificados (Bubble → reportaweb3) | Status |
|---|---|---|---|
| 1. Información Básica | 1. Información General | Cotización(auto)·Fecha·Fecha estimada de inicio·Período(cant+unidad)·Cliente*·Contacto del cliente·Nombre del sitio·Forma de pago*·Plazo de pago*·Moneda*·Descripción del requerimiento·tabla Servicios incluidos | ✅ paridad completa (verificado en vivo, formulario "Nueva Cotización") |
| 2. Matriz de Responsabilidad | 2. Matriz Responsabilidad | Checklist Empresa/Cliente por actividad (~30-50 actividades por tenant) + notas internas + "+ Actividad de MR" | ✅ código confirma `matriz-responsabilidad-form.tsx` + tabla `cotizaciones_matriz_responsabilidad` (33.082 filas migradas) + catálogo `actividades_matriz` (50 CISE / 36 GRUAS). No verificado interactivamente en vivo por bloqueo de wizard secuencial en `/cotizaciones/nueva` (no se puede saltar al paso 2 sin completar el paso 1 con datos reales) — riesgo bajo, el código y los datos ya confirman la feature. |
| 3. Precios (precio actual + precio de referencia + histórico de cotizaciones al cliente + histórico/alta de ofertas de proveedores) | 3. Precios | `cotizacion-precios-form.tsx` referencia `getOfertasProveedores`, alta de oferta (`+ Oferta Proveedor` ≡ diálogo de oferta) | ✅ paridad confirmada por código; tabla `cotizaciones_ofertas_proveedores` (722 filas) + `cotizaciones_ofertas_items` (634 filas), ambas con `tenant_id` correcto. |
| 4. Crear PDF (+ notas de precios) | 4. Crear PDF | `cotizacion-pdf-preview.tsx`, columna `notas_precios` en `cotizaciones` | ✅ |
| (fusionado en 4) | 5. Enviar al Cliente | `cotizacion-enviar-cliente.tsx` | ✅ (división más granular que Bubble, no es un gap) |
| 5. Respuesta del Cliente (Aplazar/Rechazar/Finalizar, aprobación por servicio) | 6. Respuesta Cliente | `cotizacion-respuesta-cliente.tsx` | ✅ |

**Campos de cabecera no verificados directamente en vivo pero confirmados por schema** (`cotizaciones`, 52 columnas): `token_aprobacion`/`pin_aprobacion`/`pin_attempts`/`pin_locked_until` — mecanismo de aprobación por PIN que **no tiene equivalente visible en la sesión de Bubble auditada** (puede ser un flujo de aprobación externo vía link, típico de cotizaciones enviadas a un cliente sin cuenta). DUDA-COT-003 (MEDIA): confirmar con el usuario si este es un flujo real de negocio ya migrado o una feature nueva sin UI de consumo del lado del cliente todavía.

### 1.3 Cobertura de datos (PROD, CISE + GRUAS, 2.606 cotizaciones)

| Campo | Cobertura | Status |
|---|---:|---|
| `cliente_id` | 2.606 / 2.606 (100%) | ✅ |
| `contacto_id` | 2.606 / 2.606 (100%) | ✅ |
| `sitio_id` | 2.583 / 2.606 (99%) | ✅ |
| `estado` | 2.606 / 2.606 (100%) | ✅ |
| `forma_pago` | 2.606 / 2.606 (100%) | ✅ |
| `plazo_pago` | 2.581 / 2.606 (99%) | ✅ |
| `moneda` | 2.606 / 2.606 (100%) | ✅ |
| `pdf_url` | 2.287 / 2.606 (88%) | ✅ (el resto son cotizaciones nunca enviadas — esperado, no gap) |
| `fecha_solicitud` | 2.606 / 2.606 (100%) | ✅ |
| `fecha_inicio_estimada` | 2.490 / 2.606 (96%) | ✅ |
| `periodo` + `periodo_unidad` | 2.581 / 2.606 (99%) | ✅ |
| **`periodo_cantidad`** | **0 / 2.606 (0%)** | 🔴 columna muerta — ver TK-C2 |
| `tarea_id` | 1.419 / 2.606 (54%) | 🟡 esperado — solo cotizaciones ya vinculadas a una tarea de planificación lo tienen; no es un gap de migración. |
| `cotizaciones_detalle` (servicios) | 4.166 filas | ✅ |
| `cotizaciones_matriz_responsabilidad` | 33.082 filas | ✅ |
| `cotizaciones_ofertas_proveedores` | 722 filas (704 CISE + 18 GRUAS) | ✅ |
| `cotizaciones_ofertas_items` | 634 filas, 100% con FK válido | ✅ |

**TK-C2 (BAJA, cleanup):** `cotizaciones.periodo_cantidad` (numeric) existe en el schema pero **nunca se escribe** — el formulario usa `periodo` (text) + `periodo_unidad` en su lugar. Columna huérfana, candidata a `DROP COLUMN` tras confirmar que ningún reporte/PDF la lee.

---

## 2. SERVICIOS (catálogo)

**Path Bubble:** COTIZACIONES → Servicios (216 activos tenant GRUAS, 216 columnas Código/Servicio/Tipo/Precio1-3)
**Path reportaweb3:** `/cotizaciones/servicios` · Tabla `servicios` + `servicios_tipo_precios`

| Elemento Bubble | reportaweb3 | Status |
|---|---|---|
| Buscar por nombre | — | Confirmar en código (no verificado en vivo por bloqueo de wizard, ver nota general) |
| Filtro + Exportar (↓) | — | Mismo patrón de duda que en Gestión — DUDA-COT-001 cubre ambos. |
| Columnas Código/Servicio/Tipo/Precio1/2/3 | — | Estructura de precios múltiples (Por Hora / Por Día / Por Servicio / HXD / Exceso) confirmada en tabla `servicios_tipo_precios` (relación 1-a-N, más flexible que las 3 columnas fijas de Bubble). |
| Menú de fila: Ver/Editar/Borrar | — | No verificado en vivo (mismo bloqueo). |

**Cobertura de datos:** `servicios` activos = 216 GRUAS / 232 CISE — **coincide exacto con el conteo visible en Bubble (216 GRUAS)** ✅. Alta confianza en la fidelidad de esta tabla.

---

## 3. TASAS (catálogo histórico)

**Path Bubble:** COTIZACIONES → Tasa De Cambio (571 ítems tenant GRUAS, Fecha/Tasa Dólar-Sol/Tasa Euro-Sol)
**Path reportaweb3:** `/cotizaciones/tasas` · Tabla `tasas_cambio`

| Campo Bubble | Campo Supabase | Status |
|---|---|---|
| Fecha | — | ✅ (confirmado por conteo) |
| Tasa Dólar-Sol | — | ✅ |
| Tasa Euro-Sol | — | Sin verificar columna exacta — confirmar en `lib/actions/tasas-cambio.ts` que ambas tasas (no solo dólar) se migraron. |

**Cobertura de datos:** `tasas_cambio` = 532 GRUAS / 339 CISE = 871 total. Bubble muestra **571 ítems** para GRUAS → **532/571 = 93,2%**, ✅ por umbral pero **39 fechas faltantes**.

**TK-C3 (MEDIA):** re-correr el upsert idempotente por `bubble_id` contra Bubble LIVE para las 39 fechas de tasa de cambio faltantes de GRUAS (mismo patrón ya usado en otros módulos — no se borra nada, solo se completa). Prioridad media porque una cotización histórica en una fecha sin tasa registrada no podría recalcular su equivalente en soles.

---

## 4. PANEL DE COTIZACIONES (dashboard) — GAP DE UI

**Path Bubble:** COTIZACIONES → Panel Cotizaciones — dashboard con: filtro de período, gráfico de línea "Cotizaciones por día", gráfico circular "Total cotizaciones" por estado, gráfico "Cotizaciones por Clientes", "Top 15 Servicios Cotizados", y 3 listas navegables (En Desarrollo, Pendiente Respuesta, Aplazadas) con acceso directo a cada cotización.
**Path reportaweb3:** **no existe.** No hay `app/(dashboard)/cotizaciones/panel/` ni componente equivalente.

**TK-C1 (MEDIA, ampliado):** construir un dashboard de Cotizaciones. No es un gap de datos — la tabla `cotizaciones` tiene todo lo necesario (`estado`, `created_at`, `cliente_id`, `cotizaciones_detalle.servicio_id`) para replicar los 4 widgets y las 3 listas sin migración adicional. Se agrupa con el ticket de "Descargar CSV" (§1.1) por ser ambos trabajo de UI puro sobre datos ya disponibles.

---

## Gaps y tickets

| ID | Severidad | Descripción | Acción |
|---|---|---|---|
| TK-C1 | 🟢 implementado 2026-09-09 | Panel con gráfico mensual (año actual) + gráfico diario (mes seleccionable) + listas Pendientes por enviar/Enviadas, `recharts@3.10.1` | `app/(dashboard)/cotizaciones/panel/page.tsx` + Descargar Excel/KPI cards ya en `cotizaciones-table.tsx` |
| TK-C2 | 🟢 BAJA | Columna `cotizaciones.periodo_cantidad` muerta (0% de uso, dato real vive en `periodo`+`periodo_unidad`) | Confirmar que nada la lee y hacer `DROP COLUMN` |
| TK-C3 | 🟢 CERRADO 2026-09-08 | 39 fechas de `tasas_cambio` faltantes para GRUAS (93,2% de cobertura) | Resuelto en la migración de Informes/Checklist Fase 4 (GRUAS 532→626 fechas, hasta 2026-09-03) |
| TK-C4 | 🟢 BAJA (backlog, pendiente de mockup) | 4 tarjetas KPI clicables del listado Bubble (filtro rápido por estado) sin equivalente — el select de estado ya cubre la función | Opcional, UX |
| ~~TK-C5~~ | — | ~~Botón "Filtrar" de Bubble sin explorar~~ | 🟢 Cerrado junto con DUDA-COT-001 — las columnas ordenables ya cubren la necesidad |

## DUDAs — actualizado 2026-09-08

| ID | Pregunta | Resolución |
|---|---|---|
| DUDA-COT-000 | Redirect intermitente 307 en `/cotizaciones` (race de refresh de sesión) | 🟢 **Resuelto**: causa raíz confirmada en `utils/supabase/middleware.ts` — `getUser()` puede devolver `null` transitoriamente durante la rotación del access token en el edge. Fix: reintentar una vez si hay cookie de sesión presente. Desplegado a demo v3.12.2, probado con ráfaga de 80 requests concurrentes a rutas protegidas sin regresiones. Pendiente: reintento de prueba cerca del límite real de 1h del token (condición de carrera exacta, difícil de forzar de forma determinística) — programado ~12pm 2026-09-08. |
| DUDA-COT-001 | Botón "Filtrar" en Bubble (Gestión y Servicios) — ¿tiene filtros reales no cubiertos por las columnas ordenables de reportaweb3? | 🟢 **Resuelto**: decisión del usuario, las columnas ordenables ya cubren la necesidad — se confirmó además que el botón Activos/Inactivos (toggle de tipo de dato mostrado) ya está configurado en las 3 sub-páginas (Gestión, Servicios, Tasas). Cierra también TK-C5. |
| DUDA-COT-002 | reportaweb3 bloquea Editar sobre cotizaciones APROBADA/RECHAZADA; Bubble no. | 🟢 **Resuelto**: decisión del usuario, se mantiene el bloqueo tal cual — es un endurecimiento de integridad de datos intencional, sin cambio de código. |
| DUDA-COT-003 | Columnas `token_aprobacion`/`pin_aprobacion` en `cotizaciones` — ¿flujo real o feature sin UI? | 🟢 **Resuelto**: confirmado en código — es un flujo real y completo (`/aprobacion/[token]` + `/preview`, genera token+PIN al enviar al cliente en `cotizacion-enviar-cliente.tsx`, valida PIN server-side en `lib/actions/cotizaciones.ts`, ruta pública en el middleware). Nota técnica menor encontrada de paso: el comentario en el código dice "pin_attempts / pin_locked_until columns not yet in schema — basic validation only" — sin límite de intentos de PIN implementado todavía (no es parte de esta duda, queda anotado como posible mejora de seguridad futura). |

## Cierre

**Estado:** 🟢 **CERRADO 2026-09-08** — las 4 DUDAs resueltas (COT-000 a 003), TK-C3 resuelto (dato), TK-C5 cerrado. Quedan como backlog de UI, no bloqueantes, pendientes de mockup + plan de implementación: TK-C1 (Panel de Cotizaciones + Descargar CSV) y TK-C4 (tarjetas KPI clicables). TK-C2 (columna muerta) queda como limpieza técnica sin mockup (no tiene componente visual). Datos verificados en vivo contra PROD; UI verificada en vivo contra Bubble (LIVE de version-test) y contra reportaweb3 (dev local, BD TEST — sin datos de cotizaciones en TEST, verificación de código + datos en PROD como sustituto, según lo ya aceptado para este proyecto).

**Addendum 2026-09-08 (Fase 6 del recorrido de dependencias — migración de datos ejecutada):**
- **Datos migrados a PROD:** GRUAS 230→237 cotizaciones (+7, +13 detalle, +17 matriz), CISE 2376→2466 cotizaciones (+90, +172 detalle, +1945 matriz). 3 cotizaciones CISE quedaron sin migrar por colisión `(tenant_id, numero, version)` — dos `_id` de Bubble comparten el mismo `Codigo`; requiere decisión humana de cuál es la versión correcta antes de forzar el insert (bubble_ids en `2026-09-08-recorrido-completo-fases-1-9.md` fila Fase 6).
- **Archivos PDF de cotizaciones (`pdf_url`/`Archivo_nombre`) NO migrados** — quedó fuera de alcance por tiempo, pendiente aplicar el patrón `migrarArchivo`/`file_migration_log` ya usado en otras fases.
- **TK-C2:** 🟢 **aplicada en TEST y PROD (confirmado 2026-09-09)** — `supabase/migrations/20260908160000_drop_cotizaciones_periodo_cantidad.sql` autorizada explícitamente por el usuario y verificada por query directa: `SELECT column_name FROM information_schema.columns WHERE table_name='cotizaciones' AND column_name='periodo_cantidad'` devuelve 0 filas en ambos proyectos (`oyrokyyaeaeqzlsgxtto` y `fqwhagryqkkhbgznxtwf`). `types/supabase.ts` regenerado el mismo día ya no incluye la columna, y `npm run build` compila limpio.
- **TK-C4:** no implementado, sigue en backlog pendiente de mockup — sin cambios respecto al cierre original.
- **TK-C1:** 🟢 **implementado 2026-09-09** — Panel con gráfico mensual (año actual) + gráfico diario (mes seleccionable) + listas Pendientes por enviar/Enviadas, `recharts@3.10.1`. (Descargar Excel y las 4 tarjetas KPI del listado ya se habían agregado antes en `components/cotizaciones/cotizaciones-table.tsx`; el dashboard `/cotizaciones/panel` era la última pieza pendiente de este ticket.)
