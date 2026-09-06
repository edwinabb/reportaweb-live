# Plan de Migración/Rediseño REPORTA (Bubble → v3) — Fase 2 del Cutover

**Fecha:** 2026-09-06
**Contexto:** Retoma el cutover CISE/GRUAS (`docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md`), congelado desde 2026-07-23 (~6 semanas sin actividad en el repo). Se agregan cuatro frentes nuevos que surgieron de la revisión con el usuario: (1) el cliente rechazó la UX del nuevo módulo de Planificación, (2) se sigue pagando un plugin de PDF en Bubble ($40/mes) que ya es reemplazable con infraestructura propia, (3) preocupación de costos de infraestructura dev/prod, (4) simplificación de la estrategia de email a un solo dominio.

**Alcance de este documento:** el plan maestro por fases (arquitectura del cutover ampliado). Cada fase, al ejecutarse, puede requerir su propio plan de implementación detallado (`superpowers:writing-plans`) si su tamaño lo justifica.

**Alcance del proyecto:** web admin (`reportaweb3`) ahora; la app móvil (`reporta-app`) se aborda en una fase posterior no cubierta por este documento, pero **los datos migrados en este plan deben quedar utilizables por ambas** (app y web comparten la misma base Supabase/tenants) — no se diseña un modelo de datos "solo para web".

---

## Restricción transversal de proceso (aplica a TODAS las fases)

1. **No se avanza a la fase siguiente sin corregir todo lo pendiente de la fase actual.** Un hallazgo nuevo dentro de una fase se corrige antes de cerrarla, no se pospone silenciosamente.
2. **No se puede romper lo que ya funcionaba.** Antes de dar una fase por cerrada se corre la suite de regresión completa de las fases anteriores (no solo los tests nuevos de la fase actual). Si algo que pasaba antes ahora falla, se corrige antes de continuar.
3. **Auditoría exhaustiva, no "lo principal"** (regla explícita del usuario, causa raíz de casi un año de rehacer trabajo en este proyecto): toda auditoría de datos debe cubrir **todas** las tablas de Bubble relacionadas al módulo (incluidos catálogos/opciones y tablas puente), y toda auditoría de UI/procesos debe cubrir **todas** las opciones de cada página (filtros, exportar XLS/PDF, menú de fila, bulk actions, orden/paginación, permisos por rol, estados vacíos) — no solo el flujo principal de alta/edición. Un módulo no se marca cerrado con una omisión silenciosa; solo con una DUDA explícita aceptada por el usuario por escrito.
4. **Fases independientes se pueden paralelizar entre sí**; fases/módulos con dependencia de datos (ej. catálogos de Configuración antes que los módulos que los consumen) van en serie.

---

## Fase 0 — Quick win: reemplazar el plugin de PDF de Bubble ($40/mes)

### Contexto
Bubble usa el plugin `docmaker.co` ($40/mes): llena una plantilla `.docx` con etiquetas vía API. `reportaweb3` ya tiene el mismo mecanismo en `app/api/pdf/generate-docx/route.ts` (docxtemplater + Gotenberg vía LibreOffice). Además, ya existe un diseño completo sin implementar para colas de reintento de PDF: `docs/superpowers/plans/2026-05-28-pdf-job-queue.md` (tabla `pdf_jobs`, cron de reintento) y su prerequisito `2026-05-28-pdf-cache-storage.md`. Ese diseño apunta a Vercel Crons — la infraestructura ya migró a Cloudflare Workers (ver deuda técnica "Migrar cron jobs de Vercel a Cloudflare"), así que hay que adaptar el disparador del cron, no la lógica de negocio.

Se identificaron picos de carga de generación de PDF a mediados de mes (13-18) y fin de mes (25-31), suficientes para saturar el Gotenberg actual.

### Diseño
- **Endpoint bridge** (`/api/bubble/pdf/generate` o similar, con su propia autenticación — no las keys internas de la v3) que recibe de Bubble el mismo payload de tags/valores que hoy recibe docmaker.
- **Todo pasa por cola asíncrona** (`pdf_jobs`, extendiendo el diseño existente con `doc_category: 'comercial' | 'operativo'` y `next_retry_at`):
  1. Se intenta Gotenberg una vez de inmediato.
  2. Si falla, se encola y se responde a Bubble con un ack inmediato (200/202).
  3. Un **Cloudflare Cron Trigger** (mínimo 1 minuto de granularidad) revisa jobs con `next_retry_at <= now()` y reintenta.
- **Cronogramas de reintento** (5 intentos cada uno):
  - Comercial (cotizaciones, valorización venta/compra): +10s, +20s, +30s, +1min, +2min (tope ~4 min). *Nota de implementación: como el cron corre cada 1 min, los pasos sub-minuto se agrupan al siguiente tick — no son exactos al segundo, son para escalonar la carga, no un temporizador preciso.*
  - Operativo (reporte de maquinaria, horas de maquinaria, reporte de personal): +1min, +2min, +5min, +10min, +12min (tope ~30 min).
- **Notificación de éxito:** al generar el PDF (en cualquier intento), el sistema llama a un **API Workflow público de Bubble** (webhook) con `entity_id` + URL del PDF, para que Bubble actualice el registro sin intervención manual.
- **Falla total (5 intentos agotados):** el job se marca `failed` y se dispara una alerta (mínimo log + email) para seguimiento manual — prioritario en comercial por ser de cara al cliente.
- Una vez validado en producción, se reconfiguran los workflows de Bubble (API Connector) para apuntar al endpoint nuevo y se cancela la suscripción a docmaker.co.

### Agentes / skills
- Implementación directa (no requiere skill de diseño de UI); `superpowers:test-driven-development` para la lógica de cola/reintento; `code-review` antes de mergear.

### Criterios de salida (bloquean cerrar la fase)
- Comparación campo a campo entre el PDF generado por docmaker y por el endpoint nuevo, en al menos 3 plantillas distintas, 0 discrepancias.
- Simulación de falla de Gotenberg: verificar que el job se encola, que el cron lo reintenta en los tiempos definidos por categoría, y que el webhook a Bubble se dispara al éxito.
- Prueba del workflow de Bubble apuntando al endpoint nuevo en `version-test` durante al menos una semana antes de cancelar docmaker en producción.
- El endpoint bridge tiene su propia autenticación/rate-limit, independiente de las rutas internas de la v3 (una falla o abuso desde Bubble no debe poder tumbar el servicio interno).

---

## Fase 1 — Fix urgente UX Planificación (popup sin tabs)

### Contexto
El cliente prefiere el detalle de tarea de Bubble: toda la información en un solo popup con scroll vertical, agrupada por secciones con separadores — sin pestañas. Se auditó Bubble (tarea T-7809, versión-test, junio 2026) y se confirmó el orden: Fecha/Hora → Cliente → Cotización → Sitio → Prioridad/Confirmada → Comentarios → Personal (chips) → Maquinaria (chips) → accesos rápidos (Personal/Maquinaria/P. Acción) → Selector de formato → Reportes del día → footer (Cerrar/Editar).

En la v3 (`components/tareas/tarea-detail-dialog.tsx`), el componente **ya carga todos los datos de una sola vez** (`loadDetails` trae todo en paralelo vía `Promise.allSettled`, no por tab) — el problema es 100% de presentación: hoy están repartidos en 4 `<Tabs>` (General / Recursos / Formatos / Reportes).

### Diseño
- Eliminar el wrapper `<Tabs>`/`<TabsList>`/`<TabsContent>` de `tarea-detail-dialog.tsx`.
- Renderizar las 4 secciones actuales en un solo `<ScrollArea>` continuo, en el mismo orden que Bubble, con separadores (`<Separator />`) entre secciones y encabezados en mayúsculas (mismo patrón visual que ya usa el componente en `InfoRow`/`RecursosColumn`).
- No se toca el wizard de creación de tarea (es un componente distinto, no forma parte de la queja del cliente).
- No se toca la lógica de datos (`loadDetails`, `getTareaWithDetails`, etc.) — es puramente de layout.

### Agentes / skills
- Implementación directa siguiendo el patrón visual ya establecido (template v1.2 de listados no aplica aquí por ser un modal, pero sí sus convenciones de espaciado/tipografía).

### Criterios de salida
- Playwright: abrir detalle de tarea, verificar que las 4 secciones son visibles con scroll (sin necesidad de clicks) y que todas las acciones (editar recursos, agregar reporte, nuevo informe) siguen funcionando igual que antes.
- Regresión: specs existentes de planificación/tareas no se rompen.
- **Validación del cliente** (no solo tests automatizados): mostrarle el nuevo modal y confirmar que resuelve la queja antes de cerrar la fase.

---

## Fase 2 — Auditoría exhaustiva + re-migración de datos (módulos 5-15)

### Contexto
El plan de cutover de 2026-07-22 ya cerró Usuarios, Maquinaria, Terceros y Planificación (4/15 módulos). Quedan 11 módulos sin auditar (Configuración/Catálogos, Cotizaciones, Informes, Planes de Acción, EPP, Ventas, Compras, Soporte, Dashboard, Gestión Formatos) — a la fecha de este documento ni siquiera tienen screenshots.

### Corte de datos (confirmado con evidencia, no con memoria)
Se consultó PROD directamente (`fqwhagryqkkhbgznxtwf`) y el último lote de migración masiva (creación de registros vía `bubble_id`) fue entre el **3 y el 7 de junio de 2026**:

| Tabla | Última migración masiva |
|---|---|
| reportes_maquinaria | 2026-06-03 |
| reportes_personal | 2026-06-03 |
| cotizaciones | 2026-06-02 |
| tareas | 2026-06-07 |
| terceros (base) | 2026-06-07 |

Después de esa fecha solo hubo parches de campos puntuales (Terceros, cotizaciones, tareas_fechas), no un re-sync completo. **Corte adoptado: 2026-06-07.** No se borra nada a ciegas: se re-corre el upsert idempotente por `bubble_id` contra Bubble LIVE, que actualiza si cambió y no duplica.

### Método de auditoría (ampliado por la regla de exhaustividad — ver Restricción transversal #3)
Se mantiene el proceso de 10 pasos ya validado en los módulos piloto (`docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md`), con los Pasos 2 y 3 explícitamente ampliados:

- **Paso 2 (tablas):** listar TODAS las tablas de Bubble que tocan el módulo, incluidos catálogos/opciones y tablas puente/relación — no solo las tablas "principales" a simple vista.
- **Paso 3 (procesos):** para cada página del módulo, inventariar TODAS las opciones — filtros, exportar (XLS/PDF), menú de fila (tres puntos), bulk actions, orden/paginación, permisos por rol, estados vacíos — no solo alta/edición.
- Un módulo se cierra 🟢 solo si ese inventario completo está documentado; cualquier omisión queda como DUDA explícita aceptada por el usuario, nunca implícita.

### Orden de ejecución
1. **Configuración/Catálogos (#5)** primero y en serie — define las FKs que consumen los demás módulos.
2. El resto (Cotizaciones, Informes, Planes de Acción, EPP, Ventas, Compras, Soporte, Dashboard, Gestión Formatos) se puede **paralelizar entre sí** — no comparten tablas críticas entre ellos.

### Agentes / skills
- `superpowers:subagent-driven-development` para repartir los módulos independientes entre sub-agentes en paralelo tras cerrar Configuración. Cada uno produce `docs/auditoria-ui/NN-<modulo>.md`.

### Criterios de salida por módulo
- Conteos Supabase vs Bubble LIVE coincidentes por **cada** tabla listada (no solo las principales).
- Apertura real de cada página + cada opción secundaria inventariada, confirmada funcional.
- Cierre firmado por el usuario (§4 del template de validación), incluyendo el checklist exhaustivo de tablas y opciones de UI.

---

## Fase 3 — Costos e infraestructura (dev local vs nube)

### Contexto
El usuario ya viene pagando Bubble + plugins (a extinguir con el cutover) más los servicios de dev/prod del sistema nuevo, con un solo cliente real. No se identificó un único servicio responsable del gasto — es la suma de varias suscripciones.

### Diseño
- **No se decide nada de infraestructura sin datos.** Primero: auditoría de facturas reales (Cloudflare Workers, los 2 proyectos Supabase test+prod, EasyPanel/Gotenberg, Resend, dominios) para identificar qué mover tiene impacto real.
- Con ese desglose, se evalúa si conviene mover el entorno de **desarrollo/test** a local (Supabase local vía Docker + Next dev local), manteniendo demo y prod en la nube tal como están.

### Agentes / skills
- Naturaleza de "spike" (investigación + recomendación), no desarrollo, hasta que se decida.

### Criterios de salida
- Desglose de costos documentado con el origen real de cada gasto.
- Si se adopta un entorno local: la suite E2E completa corre en verde contra ese entorno antes de dar de baja cualquier recurso en la nube.

---

## Fase 4 — Email sobre dominio único `reporta.la`

### Contexto
Definición final del usuario: una sola marca, un solo dominio (`reporta.la`) — no hay múltiples marcas ni dominios adicionales que verificar.

### Diseño
- Verificar `reporta.la` en Resend (SPF/DKIM/DMARC).
- En `lib/email.ts`, permitir parametrizar el `from` según el tipo de correo (ej. `noreply@reporta.la`, `importar@reporta.la`, `alo@reporta.la`) — son casillas/alias dentro del mismo dominio verificado, no una integración multi-dominio.

### Agentes / skills
- Implementación directa (cambio acotado en `lib/email.ts`) + configuración DNS del dominio en el proveedor.

### Criterios de salida
- Envío de prueba desde cada casilla usada, verificar entrega (no spam, ej. con mail-tester) y que el Reply-To llegue a la casilla correcta.

---

## Fase 5 — Hardening + E2E completo (gate final antes de apagar Bubble)

### Diseño
Batería completa con **Playwright** (web) + **BlueStacks** (app Android, manual/asistido) cubriendo:
- **CRUD:** alta/edición/borrado en cada módulo migrado (no solo lectura).
- **Usuario:** flujos por rol (admin, operador, viewer, personal externo) — permisos correctos, no solo "carga la página".
- **Backend:** validaciones de server actions, RLS por tenant (CISE no debe ver datos de GRUAS y viceversa), manejo de errores.
- **Seguridad:** skill `security-review` — inyección, auth bypass, secrets expuestos, headers, rate limiting de endpoints públicos (incluido el bridge de PDF de la Fase 0, que es el único endpoint nuevo expuesto a un sistema externo).

### Agentes / skills
- `superpowers:test-driven-development` para specs nuevos; `security-review` para la pasada de seguridad.

### Gate de Go-Live (no se apaga Bubble sin esto)
- Los 15 módulos auditados y firmados (o su gap explícitamente aceptado por el usuario).
- Fases 0-4 cerradas con sus criterios de salida cumplidos.
- Suite E2E completa en verde (CRUD + usuario + backend + seguridad).
- Corte comunicado a CISE y GRUAS (fecha, congelamiento de Bubble, ventana).

---

## Self-review

- Sin placeholders/TBD: todas las secciones tienen diseño concreto o, donde falta información (ej. desglose de costos de Fase 3), está explícitamente marcado como "a levantar durante la fase", no como decisión pendiente de este documento.
- Consistencia: Fase 0 y Fase 5 comparten el mismo endpoint bridge como superficie de ataque a revisar en seguridad; Fase 2 hereda el corte de datos (2026-06-07) usado también como referencia en la Restricción transversal.
- Alcance: cada fase es ejecutable como su propio ciclo de implementación; Fase 2 es la más grande y ya tiene su propio proceso de 10 pasos por módulo definido en el plan de cutover previo (no se duplica aquí, se referencia).
- Ambigüedad resuelta: el mecanismo de reintento de Fase 0 quedó explícitamente definido como "todo va a la cola" (no hay camino síncrono bloqueante) tras confirmarlo con el usuario.
