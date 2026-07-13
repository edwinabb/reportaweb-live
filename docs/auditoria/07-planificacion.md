# Auditoría módulo — Planificación (incluye Tareas)

**Fecha:** 2026-04-19
**Cutover objetivo:** 2026-04-26 (7 días)
**Screenshots referencia:** `7- Reporta Next - Planificacion.pdf` (del usuario)

El módulo Planificación de Bubble tiene 3 vistas: **Listado**, **Plan de Personal**, **Plan de Maquinaria**. Dentro de cada tarea se registran **Reportes de Personal**, **Reportes de Maquinaria**, **Checklists/Inspecciones**, y los enlaces a **Planes de Acción**. Este módulo es el corazón operativo — errores aquí impactan nómina, cliente y seguridad.

Severidad:
- 🔴 BLOQUEA-CUTOVER — sin esto no se puede hacer el cutover del 2026-04-26.
- 🟡 POST-CUTOVER — no crítico, puede ir a Fase 4.
- 🟢 MEJORA — opcional / nice-to-have.

**Módulo conectado** con Cotizaciones (origen de tareas), Informes (consume reportes), Ventas/Compras (horas → valoración). Correcciones se coordinan con el resto de audits conectados.

---

## 7.1 Listado (vista principal)

**Archivos Next:** [app/(dashboard)/planificacion/page.tsx](../../app/(dashboard)/planificacion/page.tsx) · [planificacion-table.tsx](../../app/(dashboard)/planificacion/planificacion-table.tsx) · [lib/actions/planificacion.ts](../../lib/actions/planificacion.ts)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | **Agrupación por día** de la semana (Domingo → Sábado) con encabezados de sección | Tabla plana sin agrupación por día | Sin agrupación es difícil leer la semana. UX clave para despacho diario | 🔴 | 3h |
| 2 | Dentro del día, orden por **hora de inicio** (más temprano primero) | Orden no garantizado | Despacho lee de arriba-abajo en orden cronológico | 🔴 | 30 min |
| 3 | Columnas: HORARIO (HH:MM-HH:MM), TAREA (T-XXXX), DESCRIPCIÓN, PERSONAL (nombres), MAQUINARIA (código+modelo), **INFORMES** (íconos con badge numérico: personal/maquinaria/checklist/plan-acción), CLIENTE, **COTIZACIÓN** (CT-XXX), **SITIO**, **AUTOR** | FECHAS, TAREA, DESCRIPCIÓN, PERSONAL (IDs), MAQUINARIA (IDs), CLIENTE, PRIORIDAD | Faltan: INFORMES con badges, COTIZACIÓN, SITIO, AUTOR, HORARIO diferenciado | 🔴 (informes/cotización/sitio/horario) · 🟡 (autor) | 4h |
| 4 | **Badges numéricos de informes** (ej. "1 2 1" para 1 maquinaria + 2 personal + 1 checklist) directo en la fila | ❌ | Permite ver desde el listado qué tareas tienen reportes incompletos | 🔴 | 2h |
| 5 | Menú contextual por fila: **Ver** + **Borrar** (soft-delete) + botones de ojo y tacho rojo | Botón editar fechas, sin papelera/ver | Falta soft-delete UI desde listado | 🔴 | 1h |
| 6 | Header: botón "Hoy", navegación **‹ Febrero 15 - Febrero 21, 2026 ›** (semana), botón flecha descargar Excel, buscar (ícono lupa), calendario (rango/fecha), select Vista (Listado/Personal/Maquinaria), botón "Nueva Tarea" | Navegación semanal + botón Hoy + selector vista + Nueva Tarea | Faltan: **descargar Excel** + **buscar tarea** (lupa) | 🟡 | 2.5h |

**Total esfuerzo Listado:** ~13h (gran parte 🔴).

---

## 7.2 Plan de Personal / Plan de Maquinaria

**Archivos Next:** [resource-timeline.tsx](../../app/(dashboard)/planificacion/resource-timeline.tsx) (o equivalente)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 7 | Grid: filas = usuario (con cargo debajo), columnas = 7 días. Celdas con tarea(s) asignada(s) mostrando T-XXXX, horario, cliente, sitio, nombre personal | ✓ ResourceTimeline con rows=usuario, cols=7 días | Verificar que celda renderice T-XXXX + horario + cliente + sitio | 🟡 | 1h (verificar) |
| 8 | Plan de Maquinaria idéntico pero filas=equipo | ✓ implementado | Verificar paridad | 🟡 | 30 min |
| 9 | Header: "Plan de Personal: Febrero 15 a Febrero 21, 2026" con navegación | ✓ | ✅ | ✅ | — |
| 10 | Usuarios ordenados alfabéticamente, con cargo debajo (OPERADOR DE GRÚA1, CONDUCTOR…) | Verificar orden + renderizado de cargo | Posible gap | 🟡 | 30 min |

**Total esfuerzo Plan Personal/Maq:** ~2h — verificaciones.

---

## 7.3 Detalle de tarea (dialog)

**Archivos Next:** [components/tareas/tarea-detail-dialog.tsx](../../components/tareas/tarea-detail-dialog.tsx)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 11 | Header: "TAREA T-7921 ANTAMINA" + X | ✓ Badge T-XXXX + título genérico "Detalle de Tarea" | Título Bubble usa nombre de la tarea — más informativo | 🟡 | 15 min |
| 12 | Bloque datos: FECHA Y HORA, CLIENTE, COTIZACIÓN, SITIO, PRIORIDAD, ¿CONFIRMADA?, COMENTARIOS | Tab "General" **sólo muestra contadores**, no muestra metadatos de la tarea | Gap crítico — operador abre detalle y no ve fecha/cliente/sitio/prioridad | 🔴 | 2h |
| 13 | Chips PERSONAL (nombres) y EQUIPOS-MAQUINARIA (código+modelo) | Contador | Falta lista de recursos asignados con nombres legibles | 🔴 | 1.5h |
| 14 | Fila de íconos grandes: PERSONAL (badge N), MAQUINARIA (badge N), P. ACCIÓN (badge N) al mismo nivel | Tabs (General/Reportes/Formatos) con contador sólo en Informes General | Reorganizar para que coincida con mental model Bubble, o al menos badges visibles en header | 🟡 | 2h |
| 15 | Select "SELECCIONE OTRO FORMATO" para agregar inspección desde plantilla | ✓ dentro de tab Formatos | ✅ funcional pero distinto lugar | ✅ | — |
| 16 | "REPORTES DEL DOMINGO, 15/FEB/2026" (agrupación por día) con sub-listas Reportes de Personal / Maquinaria / Check List | Tab "Reportes y Partes" muestra Personal / Maquinaria / Combustible sin agrupar por día | **Tarea multi-día genera N×M reportes** — sin agrupación por día es ilegible | 🔴 | 2h |
| 17 | Cada reporte fila: ID interno, nombre, horarios, horas extras, H.E.E., monto gastos, horas dominicales | Fila actual con campos insuficientes (ver 7.5) | Ver sección reportes | 🔴 | (en 7.5) |
| 18 | Botón **Editar** al pie del dialog | Probablemente editable inline | Verificar flujo Ver→Editar | 🟢 | 30 min |
| 19 | **Combustible** no aparece en Bubble como grupo en el dialog — en Next sí | Mejora Next (v3.1.22 agregó combustible) | ✅ mejora | ✅ | — |

**Total esfuerzo Detalle dialog:** ~6h (mayoría 🔴).

---

## 7.4 Editar tarea (wizard 3 pasos)

**Archivos Next:** [components/tareas/nueva-tarea-wizard.tsx](../../components/tareas/nueva-tarea-wizard.tsx) · [nueva-tarea-form.tsx](../../components/tareas/nueva-tarea-form.tsx)

### 7.4.1 Paso 1 — Información General

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 20 | Título, cliente, contacto cliente (con celular debajo), sitio, cotización (read-only cuando viene de cotización), fecha ejecución (calendar con **puntos** bajo días ya agendados como señal visual), hora inicio, hora fin, prioridad, ¿confirmada? (toggle amarillo), tipo de tarea (TURNOS/…), comentarios | ✓ Todos los campos presentes | Verificar: **puntos visuales** en calendar para días con tareas, toggle confirmada estilo Bubble, tipo_tarea con opciones equivalentes | 🟡 | 2h |
| 21 | RUC del cliente se muestra debajo del nombre (helper) | Verificar | Posible gap menor | 🟢 | 15 min |
| 22 | "Fecha de envío" (read-only) al lado de Cotización | ❌ | Info de trazabilidad con cotización origen | 🟢 | 30 min |

### 7.4.2 Paso 2 — Asignar Personal

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 23 | **Fechas aplicación**: radio "Aplica para todas las fechas / desde esta fecha en adelante / sólo para la fecha seleccionada" | ✓ toggle parcial | Verificar que los 3 modos existan | 🟡 | 1h |
| 24 | **Interno / Externo** radio buttons | ❌ | Externo = proveedor RH (subcontratista) — **confirmado pre-cutover** | 🔴 | 1.5h |
| 25 | Grupo de usuarios (select) | ✓ | ✅ | ✅ | — |
| 26 | **Proveedor de recursos humanos** (select — sólo si Externo) | ❌ | Permite contratar personal de tercero (común en grúas) — **confirmado pre-cutover** | 🔴 | 2h |
| 27 | Personal asignado (multiselect) con ícono "+" para agregar rápido | ✓ | ✅ | ✅ | — |
| 28 | Grid semanal debajo que muestra el calendario de asignaciones del personal (para evitar conflictos) — resaltado la tarea en curso | ❌ | Muy útil para evitar double-booking. Bubble lo muestra integrado en el form | 🟡 | 4h |

### 7.4.3 Paso 3 — Asignar Maquinaria

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 29 | Misma mecánica (fechas aplicación, interno/externo, proveedor, multiselect, grid semanal) | ✓ Maquinaria multiselect | Mismo patrón que personal — gaps equivalentes | 🟡 | incluido |

**Total esfuerzo wizard:** ~11h (mayoría 🟡).

---

## 7.5 Reportes dentro de la tarea

### 7.5.1 Reporte de Personal

**Archivos Next:** `components/tareas/reportes/reporte-personal-form.tsx` (u equivalente)
**PDF referencia del usuario:** `reporte-de-personal-26215-15-feb-26.pdf` (G.PAC-02 V.02 Nov-2024).

**Campos condicionados por `config_informe_personal` (ver 7.8).** Este módulo debe leer config del tenant antes de renderizar.

| # | Bubble / PDF | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 30 | Encabezado: REGISTRO N°, EMPRESA+RUC+DOMICILIO, COTIZACIÓN (CT099-2023), TAREA (T-8093), CLIENTE+RUC, SOLICITADO POR, FECHA, SITIO, MAQUINARIA | Verificar | Headers en UI + PDF | 🔴 | 1.5h |
| 31 | ID Documento interno (numérico, único, 5 dígitos) + Fecha del reporte | ✓ | ✅ | ✅ | — |
| 32 | Maquinaria (select) que operó — relaciona al reporte | ✓ | ✅ | ✅ | — |
| 33 | **PRIMERA JORNADA** (fecha+hora inicio/fin) | Verificar | Base requerida | 🔴 | 1h |
| 34 | **SEGUNDA JORNADA** — condicionada por `config.cantidad_turnos >= 2` | ❌ | Jornadas partidas son la norma | 🔴 | 1.5h |
| 34b | **TERCERA JORNADA** — condicionada por `config.cantidad_turnos == 3` (PDF la incluye como columna, aunque en el ejemplo está vacía `-`) | ❌ | Usar config para mostrar/ocultar columna | 🔴 | 1h |
| 35 | Cálculo automático: TOTAL HORAS, HORAS EXTRAS, HORAS EXTRA EXTRAORDINARIAS, HORAS DOMINICALES | Campo `total_horas` + `gasto_total` pero sin desglose | **Crítico para nómina y facturación** | 🔴 | 3h (lógica + UI + tests) |
| 36 | Reporte de gastos desglosado: Desayuno, Almuerzo, Cena, Movilidad + TOTAL (soles) — condicionado por `config.incluye_gastos = true` (si `false`, los gastos van en un reporte separado) | Campo `gasto_total` sin desglose | Desglose para rendición — condicional por tenant | 🔴 | 1.5h |
| 37 | Trabajo realizado (textarea) | ❌ (verificar) | Documentación obligatoria para cliente | 🔴 | 30 min |
| 38 | TRABAJADOR + CARGO + DOCUMENTO + FIRMA del trabajador (quien reportó) | Auto-detectable del usuario logueado | Mostrar + estampar firma del usuario desde `profile_details.signature_url` | 🔴 | 2h |
| 39 | Firma del representante del cliente (toggle + canvas) — condicionada por `config.incluye_firma_cliente_horas = true` | ❌ | Cuando aplica, valida horas cobradas | 🔴 (si config true) | 3h (compartido con maquinaria) |
| 40 | Fotografía del trabajo realizado — condicionada por `config.incluye_foto_trabajo = true` | ❌ | — | 🔴 (si config true) | 1.5h |
| 41 | "Registrado por: X" + "Fin de registro: DD-MMM-YYYY HH:MM" al pie | Auto-derivable (created_by + created_at) | Mostrar en UI + PDF | 🟡 | 30 min |

**Total esfuerzo Reporte Personal:** ~17h — casi todo 🔴, pero 3 filas son condicionales a la config del tenant.

### 7.5.2 Reporte de Maquinaria

**Archivos Next:** `components/tareas/reportes/reporte-maquinaria-form.tsx` (u equivalente)
**PDF referencia del usuario:** `reporte-de-alquiler-maquinaria-27465-28-mar-26.pdf` (G.PAC-04 V.04 Nov-2024).

**Campos condicionados por `config_informe_maquinaria` (ver 7.8).** Este módulo debe leer config del tenant antes de renderizar.

| # | Bubble / PDF | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 42 | Encabezado: REGISTRO N°, EMPRESA+RUC+DOMICILIO, COTIZACIÓN (CT 168-2023), TAREA (T-8426), CLIENTE+RUC+SUCURSAL, SOLICITADO POR, FECHA, SITIO, MAQUINARIA, **PLACA**, **TONELAJE SOLICITADO** | Verificar | Headers + campos extra placa/tonelaje | 🔴 | 1.5h |
| 43 | Fecha del reporte, ID documento interno (5 dígitos) | ✓ | ✅ | ✅ | — |
| 44 | **Operador/Chofer** (select) | ✓ | ✅ | ✅ | — |
| 45 | **Rigger 1 / Auxiliar 1** — condicionado por `config.cantidad_riggers >= 1` | ❌ | Rigger = ayudante de grúa. Nómina de cuadrilla | 🔴 (si config) | 1.5h |
| 45b | **Rigger 2 / Auxiliar 2** — condicionado por `config.cantidad_riggers == 2` | ❌ | — | 🔴 (si config 2) | 30 min |
| 46 | **SALIDA AUTORIZADA POR:** nombre | ❌ | Campo operativo (supervisor que autorizó) — verificar si aplica a todos los tenants | 🟡 | 1h |
| 47 | TURNO 1 INICIO + TURNO 1 FIN — base | Verificar | Base requerida | 🔴 | 1h |
| 47b | TURNO 2 INICIO + TURNO 2 FIN — condicionado por `config.cantidad_turnos >= 2` | ❌ | — | 🔴 (si config) | 1h |
| 47c | TURNO 3 — condicionado por `config.cantidad_turnos == 3` | ❌ | — | 🔴 (si config 3) | 30 min |
| 48 | **Tipo de recorrido** (select: "No Aplica" / "Ida y vuelta" / según enum) + **Recorrido (horas)** | ❌ | Usado para calcular traslado separado del tiempo de trabajo | 🔴 | 1.5h |
| 49 | TOTAL (horas) — calculado en vivo | Probablemente ✓ | Verificar fórmula: turnos + recorrido | 🟡 | 30 min |
| 50 | Descripción del trabajo realizado (textarea) | Verificar | Texto libre con izaje/descarga/traslado | 🔴 | 30 min |
| 51 | REPRESENTANTE DEL CLIENTE: nombre + cargo + **firma** — condicionado por `config.incluye_firma_cliente = true` | ❌ | Sustento de facturación (cuando aplica) | 🔴 (si config) | 3h (compartido con personal) |
| 52 | Fotografía de la actividad realizada — condicionada por `config.incluye_foto_trabajo = true` | ❌ | Evidencia al cliente | 🟡 (si config) | 1h |
| 53 | **Fotografía del reporte escrito físico** (parte diario) — condicionada por `config.incluye_foto_reporte_escrito = true` | ❌ | Backup físico manuscrito (PDF pág. 2 del ejemplo) | 🔴 (si config) | 1.5h |
| 54 | Pie: "Registrado por: X · Inicio de registro: … · Fin de registro: …" | Auto-derivable | Mostrar en PDF | 🟡 | 30 min |

**Total esfuerzo Reporte Maquinaria:** ~15h — casi todo 🔴, filas 45/47/51/53 son condicionales a config del tenant.

### 7.5.3 Checklist / Inspecciones

**Archivos Next:** componentes `DynamicInspectionForm` + `respuestas` table

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 51 | Modal INF-XXXX "CHECKLIST DE GRÚAS V2" con tarea, grúa (select), fecha (auto-carga con ícono naranja), bloques de preguntas SI/NO/NO APLICA | ✓ DynamicInspectionForm a partir de plantilla | ✅ funcional — ya auditado por separado | ✅ | — |
| 52 | Botón "+ Plantilla" abre selector y crea respuesta vacía | ✓ | ✅ | ✅ | — |
| 53 | Preguntas con radio SI/NO/NO_APLICA y campo obligatorio (*) | ✓ | ✅ OK | ✅ | — |
| 54 | Ícono "cargar fecha actual" naranja prominente | Verificar si existe — UX | 🟢 | 20 min |

### 7.5.4 Listado de reportes dentro de la tarea

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 55 | Agrupa por fecha: "REPORTES DEL DOMINGO 15/FEB/2026" → Personal / Maquinaria / Check List con filas resumen (ID, nombre, horarios, H.E., S/, H.Dom) | Lista plana por tipo | Con tareas multi-día es ilegible | 🔴 | 2h |
| 56 | Menú fila: Ver, Editar, Borrar (soft-delete) | Verificar | Probable gap en menú Ver | 🟡 | 1h |

**Total esfuerzo Reportes:** ~28h — gran parte 🔴 (es donde más diverge Next de Bubble).

---

## 7.6 Acciones/menú contextual (toolbar)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 57 | Descargar Excel (planificación completa semana) | ❌ | Seguimiento operativo | 🟡 | 2h |
| 58 | Buscar Tarea (por **Cliente** + **Cotización aprobada**) en popup | ❌ | Búsqueda rápida T-XXXX — mandatorio para operador | 🔴 | 2h |
| 59 | Buscar fecha (calendar que re-centra la semana en esa fecha) | ✓ | ✅ | ✅ | — |
| 60 | Selector vista (Listado / Personal / Maquinaria) | ✓ | ✅ | ✅ | — |

---

## 7.7 Filtros / navegación

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 61 | Navegación semanal ‹ › + botón Hoy | ✓ | ✅ | ✅ | — |
| 62 | Filtros por estado (confirmada/pendiente) / prioridad / cliente | ❌ | Decisión post-cutover | 🟡 | 2h |

---

## 7.8 Configuración por tenant (config_informe_*)

Decisión del usuario (2026-04-19): los reportes tienen estructura **variable por tenant**. Se crean dos tablas de configuración — cada tenant (CISE/GRUAS/futuros) define qué secciones mostrar. Los formularios + PDFs leen la config antes de renderizar.

### 7.8.1 Schema propuesto

**`config_informe_maquinaria`** (una fila por tenant):
| Campo | Tipo | Default GRUAS | Default CISE | Notas |
|---|---|---|---|---|
| `tenant_id` | UUID PK | — | — | 1:1 con `companies.id` |
| `cantidad_turnos` | smallint (1\|2\|3) | 2 | 2 | turnos visibles en el form + PDF |
| `cantidad_riggers` | smallint (0\|1\|2) | 2 | 0 | 0 = no mostrar (CISE no usa grúas) |
| `incluye_firma_cliente` | bool | true | false | canvas + nombre + cargo |
| `incluye_foto_trabajo` | bool | true | false | upload imagen actividad |
| `incluye_foto_reporte_escrito` | bool | true | false | upload imagen del parte físico |
| `incluye_tipo_recorrido` | bool | true | false | select + horas recorrido |
| `incluye_salida_autorizada` | bool | true | false | campo "salida autorizada por" |
| `incluye_tonelaje_placa` | bool | true | false | mostrar columnas placa+tonelaje |
| `codigo_formato` | text | "G.PAC-04" | "C.CISE-04" | código impreso en PDF |
| `version_formato` | text | "V.04" | "V.01" | versión impresa |
| `fecha_formato` | text | "Nov-2024" | "Abr-2026" | fecha del formato |

**`config_informe_personal`** (una fila por tenant):
| Campo | Tipo | Default GRUAS | Default CISE | Notas |
|---|---|---|---|---|
| `tenant_id` | UUID PK | — | — | 1:1 |
| `cantidad_turnos` | smallint (1\|2\|3) | 3 | 2 | PDF GRUAS muestra 3 columnas aunque tercera esté vacía |
| `incluye_horas_extras` | bool | true | true | columna horas extras |
| `incluye_horas_extras_extraord` | bool | true | false | columna horas extras extraord |
| `incluye_horas_dominicales` | bool | true | true | columna horas domin |
| `incluye_gastos` | bool | true | false | si `false`, gastos van en otro reporte |
| `incluye_firma_cliente_horas` | bool | false | false | para validar horas con cliente |
| `incluye_firma_trabajador` | bool | true | true | trabajador firma con `profile_details.signature_url` |
| `incluye_foto_trabajo` | bool | false | true | evidencia |
| `codigo_formato` | text | "G.PAC-02" | "C.CISE-02" | |
| `version_formato` | text | "V.02" | "V.01" | |
| `fecha_formato` | text | "Nov-2024" | "Abr-2026" | |

**Nota — datos de empresa (ya existentes):**
- Logo → ya está en `companies.logo_url` o `tenant_branding`
- Nombre corto + razón social → `companies.name` + `companies.razon_social` (v3.1.22)
- RUC → existe en `companies.ruc`
- Domicilio → existe en `companies.direccion`

### 7.8.2 Esfuerzo estimado (🔴)

| Tarea | Esfuerzo |
|---|---|
| Migración SQL: 2 tablas + seed default GRUAS y CISE | 2h |
| Server actions: `getConfigInformeMaquinaria(tenantId)` + `getConfigInformePersonal(tenantId)` | 1h |
| UI settings: [/settings/informes](./) — form para editar config por tenant (solo admin) | 3h |
| Refactor form Reporte Personal para leer config y mostrar/ocultar secciones | 2h |
| Refactor form Reporte Maquinaria para leer config y mostrar/ocultar secciones | 2h |
| **Total** | **10h** |

### 7.8.3 Generador PDF por tipo de reporte

Al finalizar cada reporte se genera PDF vía Gotenberg (infra ya existe: `lib/pdf-generator.ts`). Se necesitan 3 renderers nuevos.

**Estructura común de header** (todos los PDFs):
- Logo tenant (izquierda)
- Nombre del formato centrado (ej. "REPORTE DE PERSONAL")
- Bloque derecho: `codigo_formato` / `version_formato` / `fecha_formato` (lee de config)
- Bloque info empresa: nombre, RUC, domicilio (lee de `companies`)

**`renderReportePersonalHtml(data, config, tenant)`** — ~3h
- Secciones siempre: REGISTRO N°, EMPRESA/RUC/DOMICILIO/COTIZACIÓN/TAREA, CLIENTE/RUC/SOLICITADO POR, FECHA/SITIO/MAQUINARIA, trabajo realizado, trabajador+cargo+documento+firma, footer (registrado por + fin registro)
- Condicionales: 2-3 columnas de jornada, desglose horas extras/extraord/dominicales, 4 columnas gastos, firma cliente

**`renderReporteMaquinariaHtml(data, config, tenant)`** — ~3h
- Secciones siempre: REGISTRO N°, header, cliente, fecha/sitio/maquinaria + (placa/tonelaje si config), trabajo realizado, footer con inicio/fin registro
- Condicionales: riggers 1/2, salida autorizada, 1-3 turnos, tipo recorrido + horas, firma cliente, foto actividad, foto reporte escrito (página 2 del PDF)

**`renderChecklistHtml(data, plantilla, tenant)`** — ~2h
- Secciones: header (formato INF-XXXX), empresa, cliente/cotización, tarea/descripción/sitio, grúa/fecha, tabla de items con `¿CUMPLE?` (SI/NO/NO APLICA), OBSERVACIONES, footer "Realizada por" + inicio/fin reporte
- Los items vienen de `plantilla.estructura` + respuestas del usuario

**Subtotal generadores PDF:** ~8h.

**Total Sección 7.8:** ~18h.

---

## Resumen y recomendación pre-cutover

### 🔴 BLOQUEA-CUTOVER (~57h, **muy grande**)

Dividido por área de riesgo:

**A) Config por tenant + PDF generators (7.8) — ~18h**
- Migración 2 tablas config (maquinaria + personal) + seed GRUAS/CISE
- UI settings para editar config
- Refactor forms para leer config
- Renderers HTML→PDF: Personal, Maquinaria, Checklist

**B) Reportes (el núcleo operativo) — ~32h**
- Reporte Personal (~17h): 1-3 jornadas (config), desglose horas extras/dominicales, desglose gastos (config), trabajo realizado, firma trabajador, firma cliente (config), foto trabajo (config)
- Reporte Maquinaria (~15h): 0-2 riggers (config), 1-3 turnos (config), tipo recorrido, placa/tonelaje, salida autorizada, trabajo, firma cliente (config), foto actividad (config), foto reporte escrito (config)
- Agrupación por día en listado de reportes dentro de la tarea (incluido arriba)

**C) Listado principal — ~7h**
- Agrupación por día + orden por hora
- Columnas INFORMES con badges numéricos, COTIZACIÓN, SITIO, HORARIO
- Soft-delete UI (botón borrar)

**D) Detalle dialog — ~3.5h**
- Mostrar metadatos tarea (fecha, cliente, cotización, sitio, prioridad, confirmada, comentarios)
- Lista de personal + maquinaria con nombres legibles

**E) Wizard: Interno/Externo + Proveedor RH — ~3.5h** (confirmado pre-cutover)
- Radio buttons + select condicional proveedor RH

**F) Búsqueda y acciones — ~2h**
- Buscar Tarea (cliente + cotización)

### 🟡 POST-CUTOVER (~20h — diferidos)

- Grid de asignaciones en wizard paso 2/3 para evitar conflictos
- Columna AUTOR, puntos visuales en calendar, tipo_tarea paridad
- Export Excel planificación
- Filtros por estado/prioridad/cliente
- Salida autorizada (#46) si no aplica a todos los tenants → condicional config
- Foto actividad si config=false → no es 🔴 para esos tenants

### 🟢 MEJORAS (~3h — opcionales)

- Ícono "cargar fecha actual" prominente en checklist
- RUC bajo nombre cliente en form
- Título dialog con nombre de tarea
- Menú Ver explícito en reportes

### Decisiones confirmadas (2026-04-19)

| # | Tema | Decisión |
|---|---|---|
| 1 | Firma del cliente en reportes | ✅ Controlado por `config_informe_*.incluye_firma_cliente*` por tenant |
| 2 | Foto reporte escrito | ✅ Controlado por `config_informe_maquinaria.incluye_foto_reporte_escrito` |
| 3 | Proveedor RH (subcontratación) | ✅ **Pre-cutover** — gaps #24, #26 ascendidos a 🔴 |
| 4 | Rigger 1/2 | ✅ Controlado por `config_informe_maquinaria.cantidad_riggers` (0\|1\|2) |
| 5 | Cantidad de turnos | ✅ `config_informe_*.cantidad_turnos` (1\|2\|3) — PDF GRUAS muestra 3 columnas en personal, 2 en maquinaria |
| 6 | Gastos en reporte personal | ✅ `config.incluye_gastos` — algunos tenants separan gastos en otro reporte |
| 7 | Header PDF (logo, empresa, formato) | ✅ Logo + nombre + RUC + domicilio vienen de `companies`; código/versión/fecha de `config_informe_*` |
| 8 | PDF al finalizar reporte | ✅ Se genera via Gotenberg (infra ya existe) |

### Plan sugerido

**Realidad actualizada:** Planificación tiene ~57h de 🔴 (con config + PDF generators incluidos). Es el módulo más atrasado vs Bubble por un margen grande.

Sumado a los 🔴 de Cotizaciones (~5h) y los que falten (Informes, Ventas, Compras), estimación mínima **~65h de trabajo crítico** antes de cutover. Con 1 dev full-time = ~2 semanas. **El cutover 2026-04-26 es imposible; se requiere al menos hasta 2026-05-10.**

Priorizar en este orden:
1. **Config tables + seed + UI settings** (5h) — prerequisito de todo lo demás.
2. **Reportes Personal/Maquinaria completos con condicionales** (27h) — impacta nómina y cliente.
3. **PDF generators** (8h) — necesario para cierre del flujo.
4. **Listado + agrupación + detalle dialog** (10h) — impacta uso diario.
5. **Wizard Interno/Externo + RH** (3.5h).
6. **Búsqueda + soft-delete** (3h).

Diferir 🟡/🟢 a Fase 4 post-cutover.
