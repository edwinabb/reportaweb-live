# Auditoría módulo — Cotizaciones

**Fecha:** 2026-04-19
**Cutover objetivo:** 2026-04-26 (7 días)
**Screenshots referencia:** `6- Reporta Next - Cotizaciones.pdf` (del usuario)

El módulo Cotizaciones de Bubble tiene 3 sub-módulos: **Cotizaciones**, **Servicios**, **Tasas de Cambio** (+ panel). Se auditan por separado. Nota del usuario: **Euro/Sol no aplica en la nueva versión** (sólo USD↔PEN).

Severidad:
- 🔴 BLOQUEA-CUTOVER — sin esto no se puede hacer el cutover del 2026-04-26.
- 🟡 POST-CUTOVER — no crítico, puede ir a Fase 4.
- 🟢 MEJORA — opcional / nice-to-have.

Este módulo es **conectado** con Planificación (al aprobar genera Tarea) y con Ventas (cotización aprobada → valoraciones). Correcciones se coordinan cuando terminen todos los audits interconectados.

---

## 6.0 Panel Cotizaciones

**Archivos Next:** [app/(dashboard)/cotizaciones/panel/](../../app/(dashboard)/cotizaciones/panel/) (si existe) · listado principal redirige vista resumen

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Panel con período, Total, Cotizaciones por día (gráfico línea), Total por estado (pie), Cotizaciones por clientes, Top 15 servicios cotizados, bandejas En Desarrollo/Pendiente Respuesta/Aplazadas | ❌ Sin panel dedicado | Falta dashboard del módulo | 🟢 | 6h |

**Total esfuerzo Panel:** ~6h — se difiere post-cutover.

---

## 6.1 Cotizaciones (Listado + Wizard)

**Archivos Next:** [app/(dashboard)/cotizaciones/page.tsx](../../app/(dashboard)/cotizaciones/page.tsx) · [cotizaciones-table.tsx](../../app/(dashboard)/cotizaciones/cotizaciones-table.tsx) · [[id]/page.tsx](../../app/(dashboard)/cotizaciones/[id]/page.tsx) · [nueva/page.tsx](../../app/(dashboard)/cotizaciones/nueva/page.tsx) · [components/cotizaciones/*](../../components/cotizaciones/) · [lib/actions/cotizaciones.ts](../../lib/actions/cotizaciones.ts)

### 6.1.1 Listado principal

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 2 | 4 bandejas numeradas: NUEVAS-DESARROLLO (29), ENVIADA-APLAZADA (2), RECHAZADAS (1), APROBADAS (199) | Filtro SELECT simple por estado | Falta el header con 4 contadores visuales (UX clave para comercial) | 🟡 | 3h |
| 3 | Columnas: cotización, fecha solicitud, estado, **fecha envío**, cliente, **lugar/sitio**, servicio, **respuesta del cliente**, **proveedor** | código, cliente, estado, fecha emisión, total, acciones | Faltan: fecha envío, sitio, servicio principal, fecha respuesta, proveedor asignado | 🟡 | 2h |
| 4 | Avatar del autor (iniciales en círculo) al inicio de la fila | ❌ | UX menor | 🟢 | 30 min |
| 5 | Descargar Excel | ❌ | Export Excel (seguimiento comercial) | 🟡 | 1.5h |
| 6 | Filtros: habilitadas/deshabilitadas, rango fechas, select estado, buscar cliente, buscar código | Buscar por código/cliente, select estado, tab activas/papelera | Falta **rango fechas** y **toggle hab/deshab** explícito | 🟡 | 1.5h |
| 7 | Paginación (231 items, 20 por página) | Client-side (react-table) | ✅ equivalente | ✅ | — |

### 6.1.2 Wizard 5 pasos (Info → Matriz → Precios → PDF → Respuesta)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 8 | Stepper visual horizontal numerado (1→2→3→4→5) con pasos activos/completados/pendientes | 5 Tabs (via `cotizacion-header.tsx`) | Equivalente funcional. UX Bubble es más guiada; Next permite saltar | 🟢 | 2h (si se quiere paridad visual) |
| 9 | **Paso 1** — cotización (número), fecha, cliente, contacto, sitio, fecha estimada inicio, período + unidad, forma pago, moneda, plazo pago, descripción, servicios (cantidad + nombre + botón agregar) | ✓ Todos los campos presentes | ✅ OK | ✅ | — |
| 10 | **Paso 2** Matriz: tabla con descripción actividad + dropdown Empresa/Cliente por actividad. Botón "+ Actividad de MR" abre dialog con descripción corta (APP) + larga (documento). Notas internas (no van al PDF) | ✓ Matriz implementada con EMPRESA/CLIENTE/AMBOS | Revisar si existe **descripción corta (APP) vs descripción larga (documento)** — Bubble separa ambas porque la app móvil muestra corta y el PDF muestra larga | 🟡 | 1h (verificar) |
| 11 | **Paso 2** Notas internas separadas del PDF | Revisar si existe campo diferenciado | Posible gap | 🟡 | 30 min (verificar) |
| 12 | **Paso 3** Precios: servicio + cantidad + moneda + precio por hora + HxD (horas por día). Muestra Precios de referencia del servicio, Histórico de cotizaciones al cliente, Histórico de ofertas recibidas. Botón "+ Oferta Proveedor" | ✓ Precios + oferta proveedor embebida | Verificar que muestre **históricos** de cotizaciones del cliente e históricos de ofertas — son decisivos para negociar precio | 🔴 | 3h |
| 13 | **Paso 3** Oferta Proveedor modal: ID, fecha, proveedor, contacto, moneda, forma/plazo pago, servicio solicitado, condiciones adicionales | ✓ Modal existe (`cotizacion-ofertas-proveedor`) | ✅ OK si carga los campos equivalentes | ✅ | — |
| 14 | **Paso 4** Preview PDF con botón "Crear PDF" (genera) + notas relacionadas a los precios + nota 1 fija ("precios en USD no incluyen…") | ✓ Gotenberg + pdf-config (saludo/banco/despedida/firma por tenant) | ✅ parity funcional | ✅ | — |
| 15 | **Paso 5** Respuesta cliente: lista de servicios con estado APROBADA por línea, precio 1/2/3, HxD, **TAREA T-8421** al lado del servicio aprobado, botones Anterior/Aplazar/Rechazar/Finalizar | Paso 5 envía link de aprobación vía token, cliente responde on-line (fuera del panel). NO muestra TAREA generada post-aprobación | Falta **mostrar ID de tarea generada** tras aprobación (trazabilidad Cotización→Planificación). Falta también botón "Aplazar" explícito si el estado APLAZADA se mantiene en enum | 🔴 | 2h |
| 16 | **Estado APLAZADA** existe en Bubble (bandeja dedicada) | Existe en enum pero no se usa en UI | Decidir: mantener APLAZADA como estado activo o unificar con ENVIADA | 🟡 | 1h (decisión + wire) |

### 6.1.3 Acciones/menú

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 17 | Menú fila: Ver, **Duplicar**, Editar, Deshabilitar | Ver, Editar, Duplicar, Crear PDF, Deshabilitar, Restaurar | ✅ parity + mejoras (Restaurar, Crear PDF) | ✅ | — |
| 18 | Botón "Nuevo" en header | ✓ | ✅ | ✅ | — |

### 6.1.4 Respuesta cliente (flujo on-line)

El flujo Next (token + link público `/aprobacion/[token]`) es **superior** al Bubble (respuesta manual en el panel). No es gap.

**Falta** (🟡): email de notificación al cliente con template Resend — bloqueado por 2.2 Templates.

### 6.1.5 Integración Cotización → Tarea

**[lib/actions/cotizaciones.ts:1206](../../lib/actions/cotizaciones.ts) `finalizeAprobacion`** crea tarea con prioridad ALTA al aprobar. **Falta:**
- Mostrar T-XXXX en respuesta del cliente (gap #15).
- Verificar que el cliente_id, cotizacion_id, sitio_id y servicio_id de la cotización se copien correctamente al header de la tarea.

**Total esfuerzo Cotizaciones (6.1):** ~14h si se hacen los 🔴 + verificaciones.

---

## 6.2 Ofertas de Proveedor (pantalla independiente)

Nota del usuario en el PDF (pág. 9):
> "Debemos agregar una opción de menú que liste las Ofertas de Proveedor. Con las opciones Ver, Editar, Deshabilitar/Habilitar. Filtro por fecha, por proveedor."

**Archivos Next:** ❌ No existe pantalla independiente. Ofertas sólo accesibles desde dentro del wizard de la cotización a la que pertenecen.

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 19 | Pantalla que lista todas las ofertas de proveedor (agregadas desde el paso 3 de cualquier cotización) | ❌ Sólo accesibles por cotización | Necesario para visibilidad histórica de ofertas (cruzar precios entre cotizaciones del mismo proveedor) | 🟡 | 4h (listado + CRUD + filtros) |
| 20 | Filtros: por fecha, por proveedor, hab/deshab | ❌ | — | 🟡 | incluido |

**Decisión:** post-cutover. La funcionalidad está; sólo falta la vista agregada.

**Total esfuerzo Ofertas:** ~4h — diferido.

---

## 6.3 Servicios (CRUD)

**Archivos Next:** [app/(dashboard)/cotizaciones/servicios/](../../app/(dashboard)/cotizaciones/servicios/)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 21 | Listado: código, servicio, tipo, Precio 1, Precio 2, Precio 3 | ✓ listado implementado | ✅ parity OK | ✅ | — |
| 22 | Formulario editar: código único, tipo de servicio, nombre, **toneladas**, moneda, cantidad de precios, foto (600×240), Precio 1 (valor + HxD), Precio 2, Precio 3 | ✓ CRUD con 3 precios, campos tipo/valor/campo adicional | ✅ OK | ✅ | — |
| 23 | Acciones: Nuevo, Ver, Editar, Deshabilitar (soft-delete) | ✓ | ✅ OK | ✅ | — |
| 24 | Filtros: empresa, tipo servicio, tipo precio 1/2/3 | Verificar si `filtros cotizaciones/servicios` incluye los 3 tipos de precio | Posible gap | 🟢 | 1h |
| 25 | Imagen del servicio (opcional) | Verificar si se upload a storage | Posible gap (usado en PDF?) | 🟢 | 1h |

**Total esfuerzo Servicios:** ~2h — todos 🟢. Se difiere.

---

## 6.4 Tasas de Cambio

**Archivos Next:** [app/(dashboard)/cotizaciones/tasas/](../../app/(dashboard)/cotizaciones/tasas/)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 26 | Listado: fecha, tasa DOLAR→SOL, tasa EURO→SOL | Listado con tasa USD↔PEN | **Euro/Sol descontinuado** — decisión del usuario | ✅ | — |
| 27 | Detail: fecha, tasa DOLAR-SOL, tasa EURO-SOL | Dialog con USD↔PEN | Quitar campo Euro si quedó (limpieza) | 🟢 | 15 min |
| 28 | Formulario editar: fecha + tasa dólar + tasa euro | ✓ Solo USD | ✅ OK | ✅ | — |
| 29 | Acciones: Nuevo, Ver, Editar, Deshabilitar | ✓ | ✅ OK | ✅ | — |
| 30 | Búsqueda por fecha | Verificar | Posible gap | 🟢 | 30 min |

**Total esfuerzo Tasas:** ~45 min — todos 🟢.

---

## Resumen y recomendación pre-cutover

### 🔴 BLOQUEA-CUTOVER (~5h)

1. **Gap #12 — Históricos de cotizaciones al cliente + ofertas recibidas en Paso 3** (3h). Son decisivos para fijar precio. Sin esto el comercial pierde una ayuda crítica que sí tenía en Bubble.
2. **Gap #15 — Mostrar T-XXXX tras aprobación** (2h). Trazabilidad cotización→tarea rota si no se ve el ID generado.

### 🟡 POST-CUTOVER (~14h — diferidos)

- Panel Cotizaciones (dashboard del módulo)
- Bandejas de header con contadores numerados
- Columnas faltantes en listado (fecha envío, sitio, servicio, respuesta, proveedor)
- Export Excel
- Rango de fechas en filtros
- Notas internas separadas del PDF / descripción corta vs larga en matriz
- Estado APLAZADA (decisión + wire)
- Pantalla independiente de Ofertas de Proveedor con filtros

### 🟢 MEJORAS (~5h — opcionales)

- Stepper visual numerado (UX Bubble era más guiada)
- Avatar del autor en listado
- Filtros por tipo de precio en Servicios
- Imagen del servicio (si se usa en PDF)
- Limpieza del campo Euro en Tasas
- Búsqueda por fecha en Tasas

### Plan sugerido

Hacer los 2 🔴 (~5h) junto con los 🔴 de Planificación/Informes/Ventas/Compras cuando estén auditados. Todo 🟡/🟢 de Cotizaciones → Fase 4 post-cutover.
