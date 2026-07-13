# Plan de pruebas pre-cutover (2026-05-02)

**Objetivo:** validar cada flujo crítico antes del cutover sin depender de datos reales aún no cargados. Todo lo marcado 🔴 es bloqueante.

**Entorno de pruebas:** `npm run dev` apuntando a la DB cloud (supabase `wioozisskjjgjjybsoqo`). Hacer login como tenant CISE y repetir para GRUAS.

---

## Orden sugerido

1. Fase C — Configuración por tenant
2. Fase D — Planificación (wizard + reportes)
3. Fase D — Detalle de tarea
4. Fase E — Cotizaciones (tras implementar)
5. Fase F/G — Ventas / Compras (tras implementar)
6. Fase H — Formatos WEB
7. Regresiones puntuales (Terceros, Maquinaria, EPP)

---

## 1. Configuración por tenant — Fase C ✅

### 1.1 `/settings/informes`

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 1.1.1 | Abrir `/settings/informes`, tab **Reporte de Maquinaria** | Se ven inputs cargados con valores del tenant (CISE: C.CISE-04 V.01 Abr-2026 / GRUAS: G.PAC-04 V.04 Nov-2024) | 🔴 |
| 1.1.2 | Cambiar `Cantidad de turnos` a `2`, `Cantidad de riggers` a `1`, guardar | Toast "Configuración ... actualizada". Recargar → valores persisten | 🔴 |
| 1.1.3 | Togglear OFF `Incluir placa y tonelaje solicitado` y `Tipo de recorrido + horas de recorrido`, guardar | Toast + persiste | 🔴 |
| 1.1.4 | Tab **Reporte de Personal**: cambiar `Cantidad de jornadas` a `3`, activar `Horas dominicales`, guardar | Toast + persiste | 🔴 |
| 1.1.5 | Togglear OFF `Bloque de gastos personales`, guardar | Toast + persiste | 🟡 |

### 1.2 `/settings/valorizaciones`

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 1.2.1 | Tab **Valorización de Venta**: cambiar IGV a 19, Detracción a 12, guardar | Toast + recarga muestra 19 / 12 | 🔴 |
| 1.2.2 | Revertir a 18 / 10 | Persiste | 🔴 |
| 1.2.3 | Tab **Valorización de Compra**: cambiar Código formato, guardar | Persiste y no afecta el tab de Venta | 🟡 |

---

## 2. Planificación — Wizard Interno/Externo (Fase D)

### 2.1 Ruta `/planificacion/nueva`

**Pre-requisito:** tener al menos 1 tercero con `tipo = proveedor` en el tenant actual.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 2.1.1 | Tab **Información**: completar Título, Cliente, Sitio, Calendar con ≥3 fechas, hora, prioridad, tipo tarea | Sin errores de validación. "Siguiente" habilitado | 🔴 |
| 2.1.2 | Tab **Personal**, radio `Interno`: seleccionar 2 personas diferentes con `+`. Eliminar una. | Lista muestra nombres reales (no IDs), borde azul, badge sin "Externo" | 🔴 |
| 2.1.3 | Cambiar radio a `Externo`: aparece card naranja con proveedor + nombre. Seleccionar proveedor, tipear `Juan Pérez`, `+` | Aparece fila con badge **Externo** naranja, borde izquierdo naranja, subtítulo "Proveedor: <razón social>" | 🔴 |
| 2.1.4 | Intentar `+` sin seleccionar proveedor o sin tipear nombre | Toast de error, no se agrega | 🟡 |
| 2.1.5 | Tab **Maquinaria**, radio `Externo`: seleccionar proveedor, tipear `GRÚA 50T · ABC-123`, `+` | Fila con badge **Externo** rojo | 🔴 |
| 2.1.6 | Click **Finalizar y Crear** | Toast "Tarea creada exitosamente", redirige a `/planificacion` | 🔴 |
| 2.1.7 | En Supabase, revisar `tareas_recursos` de la tarea creada: 2 filas de personal interno con `personal_id` poblado + 1 externo con `personal_id = NULL`, `proveedor_id` ≠ NULL, `recurso_externo_nombre = 'Juan Pérez'`. Idem para maquinaria. | Datos correctos | 🔴 |

### 2.2 Listado `/planificacion`

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 2.2.1 | Abrir Listado, ver filas | Cada columna Personal/Maquinaria muestra **nombres reales** (no IDs truncados). Externos con badge y color distinto. | 🔴 |
| 2.2.2 | Las filas están **agrupadas por fecha** (header orange "Lunes 16 de Febrero, 2026" separa bloques) | Visible y legible | 🟡 |
| 2.2.3 | Click en fila → abre diálogo detalle | ✓ | 🔴 |
| 2.2.4 | Click en "Editar fechas" → abre dialog de edición | ✓ | 🟡 |

### 2.3 Timeline Personal / Maquinaria

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 2.3.1 | Tab **Personal**, ver timeline | **NO aparece la segunda barra** con fecha y subtítulo "PERSONAL" (removida). Celdas con asignaciones muestran badge naranja con código + sitio. | 🔴 |
| 2.3.2 | Navegar semana con los botones `←` / `→` arriba | Cambia rango y se refrescan datos | 🟡 |
| 2.3.3 | Tab **Maquinaria**: lo mismo | Timeline muestra asignaciones | 🔴 |

### 2.4 Detalle de tarea enriquecido — D.4 ✅

**Pre-requisito:** tener 1 tarea con cliente+contacto+cotización asignados, ≥2 personal (1 interno + 1 externo con proveedor), ≥1 maquinaria interna, sitio poblado y comentarios.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 2.4.1 | Click en fila del listado → abre detail dialog | Header muestra badge `T-YYYY-XXXX` (código real de la tarea, no placeholder `T-abcd`), estado (CONFIRMADA/BORRADOR/COMPLETADA/CANCELADA) como badge de color, prioridad como badge | 🔴 |
| 2.4.2 | Title del dialog | Es `tarea.titulo` real (ej. "ALQUILER GRÚA ANTAMINA"), NO "Detalle de Tarea" hardcoded | 🔴 |
| 2.4.3 | DialogDescription debajo del título | Muestra cliente (razón social), sitio, rango de fechas formateado (`dd MMM → dd MMM yyyy` si multi-día; `dd MMM yyyy` si 1 día) | 🔴 |
| 2.4.4 | Tab **Información General** → Card "Datos de la tarea" | 8 InfoRow visibles: Cliente (con sub "RUC 20xxx"), Contacto (con sub "Cargo · Teléfono"), Sitio, Cotización (sub "Estado: APROBADA" si linkeada), Tipo de tarea, Servicio, Fechas (sub "N días" si multi-día), Confirmada (Sí/No) | 🔴 |
| 2.4.5 | Si hay `descripcion` en la tarea | Bloque "Comentarios" gris con el texto literal (whitespace preservado) | 🔴 |
| 2.4.6 | Card "Recursos Asignados" → columna Personal | Lista de recursos con **nombres reales** (first_name + last_name), no IDs. Interno: badge azul "Interno". Externo: badge naranja "Externo", sub "Subcontratado", línea inferior "Proveedor: <razon_social>" | 🔴 |
| 2.4.7 | Card "Recursos Asignados" → columna Maquinaria | Mismo patrón. Interno: `codigo_interno · nombre`, sub `modelo · placa`. Externo: nombre del equipo libre con proveedor | 🔴 |
| 2.4.8 | Contador de recursos al lado del título de cada columna | `Personal (N)` y `Maquinaria (N)` con el número correcto sin duplicados entre intervalos | 🔴 |
| 2.4.9 | Abrir una tarea **sin cliente linkeado** (solo `cliente_nombre` texto libre) | Cliente muestra `cliente_nombre`, sin sub RUC. No crashea. | 🟡 |
| 2.4.10 | Abrir una tarea **sin cotización** | Cotización muestra `—` (fallback) o `cotizacion_ref` si hay string legacy | 🟡 |
| 2.4.11 | Tabs **Reportes y Partes** y **Inspecciones** | Funcionalidad previa intacta (regresión) | 🔴 |

### 2.5 Buscador de tareas — D.6 ✅

**Pre-requisito:** ≥5 tareas visibles en la semana actual, al menos 2 con cotización asociada en estado `APROBADA` y otras en `ENVIADA`/`BORRADOR`.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 2.5.1 | Abrir `/planificacion` en vista Listado | Sub-toolbar nueva visible debajo del header: input de búsqueda con ícono lupa + toggle "Solo cotización aprobada" + contador "N de M tareas" a la derecha | 🔴 |
| 2.5.2 | Tipear parte del título de una tarea (ej. `alquiler`) | Filas se filtran en vivo. Contador baja. Botón `X` aparece dentro del input para limpiar | 🔴 |
| 2.5.3 | Click en `X` | Limpia el input, todas las filas vuelven | 🔴 |
| 2.5.4 | Tipear un código T-XXXX exacto (ej. `T-2026-0003`) | Filtra a esa tarea | 🔴 |
| 2.5.5 | Tipear un RUC o cliente (ej. `ANTAMINA`) | Filtra por `cliente_nombre`. También matchea cotización.numero si tipeás el número | 🔴 |
| 2.5.6 | Click en toggle "Solo cotización aprobada" | Botón pasa a verde sólido. Solo quedan tareas cuya `cotizacion.estado === 'APROBADA'` | 🔴 |
| 2.5.7 | Combinar query + toggle | Ambos aplican. Contador coherente | 🔴 |
| 2.5.8 | Cambiar semana (←/→) | Sub-toolbar persiste con query activo (no se resetea), se re-filtra sobre las tareas de la nueva semana | 🟡 |
| 2.5.9 | Cambiar vista a Personal o Maquinaria | Sub-toolbar se oculta (solo aplica a Listado) | 🟡 |
| 2.5.10 | Con toggle ON y semana sin cotizaciones aprobadas | Contador `0 de M`, mensaje "No hay tareas planificadas para este rango" | 🟡 |

### 2.6 Deep-link desde cotización aprobada → tarea

**Pre-requisito:** completar el Flow de aprobación (Fase E.2): aprobar una cotización, obtener T-XXXX generado.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 2.6.1 | Ir a Paso 5 de la cotización aprobada | Card verde "Tarea generada: T-XXXX" visible con título de la tarea + estado "BORRADOR" + botón "Ver tarea" | 🔴 |
| 2.6.2 | Click en "Ver tarea" | Navega a `/planificacion?tarea=<id>`. El detail dialog se abre automáticamente con la tarea cargada | 🔴 |
| 2.6.3 | Cerrar el dialog, navegar dentro de la semana | El dialog NO se re-abre al cambiar semana (el query-param se lee solo al montar) | 🟡 |

### 2.7 Tests E2E Playwright (D)

| # | Comando | Esperado | Severidad |
|---|---|---|---|
| 2.7.1 | `npm run test:e2e -- tests/flows/06-ver-reportes.spec.ts` | El test Flow 6 pasa. Verifica que el dialog enriquecido sigue mostrando reportes personal/maquinaria/combustible con nombres | 🔴 |
| 2.7.2 | `npm run test:e2e -- tests/flows/02-tarea-con-recursos.spec.ts tests/flows/03-editar-fechas-tarea.spec.ts tests/flows/04-add-remove-recursos.spec.ts tests/flows/05-recursos-por-fecha-distinta.spec.ts` | Flows 2-5 pasan. No regresión en el listado ni en el wizard | 🔴 |

---

## 3. Reportes dentro de tarea (Fase D — config-aware)

### 3.1 Reporte de Personal

**Pre-requisito:** config del tenant con `cantidad_turnos=2`, `incluye_horas_extras=true`, `incluye_gastos=true`, `incluye_firma_cliente_horas=false`.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 3.1.1 | Abrir una tarea, tab **Reportes y Partes**, botón "Nuevo reporte personal" | Form abre, muestra "Formato C.CISE-02 V.01 (Abr-2026)" | 🔴 |
| 3.1.2 | Con `cantidad_turnos=2`: ver que hay 2 columnas de Jornada | Correcto | 🔴 |
| 3.1.3 | Con `incluye_horas_extras=true`: input "H. extras" visible | Correcto | 🔴 |
| 3.1.4 | Con `incluye_horas_dominicales=false`: input NO visible | Correcto | 🔴 |
| 3.1.5 | Con `incluye_gastos=true`: bloque de gastos aparece | Correcto | 🔴 |
| 3.1.6 | Completar: personal, fecha, jornada1 08:00-17:00, jornada2 19:00-23:00, total 10, h.extras 2, gastos 20/30/0/10, obs | Sin errores | 🔴 |
| 3.1.7 | Guardar → toast "Reporte guardado" | Se refresca lista | 🔴 |
| 3.1.8 | En DB, revisar `reportes_personal`: campos condicionales nulos si off, con valor si on. `gasto_total = 60`. | Datos correctos | 🔴 |
| 3.1.9 | Cambiar config a `cantidad_turnos=3`, recargar dialog: aparece columna Jornada 3 | Correcto | 🟡 |
| 3.1.10 | Cambiar config a `incluye_firma_cliente_horas=true`: aparece bloque "Firma del cliente" con Nombre + Cargo | Correcto | 🟡 |

### 3.2 Reporte de Maquinaria

**Pre-requisito:** config del tenant con `cantidad_turnos=2`, `cantidad_riggers=1`, `incluye_tonelaje_placa=true`, `incluye_tipo_recorrido=true`, `incluye_salida_autorizada=false`, `incluye_firma_cliente=false`.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 3.2.1 | Abrir nueva ventana "Nuevo reporte maquinaria" | Form con "Formato G.PAC-04 V.04 (Nov-2024)" | 🔴 |
| 3.2.2 | 2 selects de rigger visibles (1 de los 2 por config) | Solo 1 | 🔴 |
| 3.2.3 | Campo Tonelaje solicitado visible | Correcto | 🔴 |
| 3.2.4 | Bloque Tipo recorrido + Horas recorrido visible | Correcto | 🔴 |
| 3.2.5 | Salida autorizada NO visible (off) | Correcto | 🔴 |
| 3.2.6 | Firma cliente NO visible (off) | Correcto | 🔴 |
| 3.2.7 | Completar maq, operador, rigger1, fecha, tonelaje 50, jornada 08:00-18:00, horas 10, recorrido "ida y vuelta" 2h | Sin errores | 🔴 |
| 3.2.8 | Guardar | Toast + lista actualizada | 🔴 |
| 3.2.9 | DB `reportes_maquinaria`: verificar `rigger1_id`, `tonelaje_solicitado`, `tipo_recorrido`, `horas_recorrido` correctos | Correcto | 🔴 |

### 3.3 PDF generation (config-aware)

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 3.3.1 | Desde lista de reportes dentro de tarea, generar PDF del reporte personal creado | PDF se genera vía Gotenberg, muestra header con `codigo_formato / version / fecha`. Solo 2 columnas de jornada, bloque gastos. | 🔴 |
| 3.3.2 | Cambiar config jornadas=3, regenerar | PDF ahora muestra 3 columnas de jornada | 🟡 |
| 3.3.3 | Reporte maquinaria PDF: si `incluye_foto_reporte_escrito=true`, PDF tiene página 2 con foto | Correcto | 🟡 |

---

## 4. Cotizaciones — Fase E ✅

Implementada en v3.4.0. Tests E2E en `tests/flows/12-cotizaciones.spec.ts` (`@critical`).

Flujos cubiertos: listado + filtro por estado, botón Nueva cotización, crear cotización con datos mínimos, página de servicios, página de tasas. Viewer: ve listado sin botón de creación (test marcado `fixme` hasta crear usuario `e2e-viewer@reporta.la` — ver DT-002).

**Prueba manual pendiente:** aprobación de cotización con PIN y generación de tarea enlazada (ver sección 2.6 deep-link).

---

## 5. Ventas — Fase F

### 5.1 F.1 — Valorizar Venta (dialog masivo) ✅

**Pre-requisito:** tenant con ≥2 reportes de maquinaria `estado_venta=PENDIENTE`, mismo cliente, misma moneda, con `cant_fact`+`precio_unit` definidos (la vista `view_valoraciones_ventas` debe devolverlos). Config `config_valorizacion_venta` activa (IGV 18, detracción 10).

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.1.1 | Abrir `/ventas/valoraciones`, filtro estado PENDIENTE | Se ven reportes pendientes con checkbox por fila | 🔴 |
| 5.1.2 | Seleccionar 2 reportes del mismo cliente, click "Acciones Masivas (2)" → "Valorizar Venta" | Se abre dialog "Valorizar Venta" con header "N° Valorización" mostrando código `YYYY-NNNNN` preview, Cliente, Moneda, Fecha (default hoy) | 🔴 |
| 5.1.3 | Tabla del dialog | Muestra las 2 filas con Informe, Fecha, Maquinaria, Cantidad, Precio, Subtotal calculados | 🔴 |
| 5.1.4 | Totales al pie del dialog | Subtotal = suma subtotales, IGV = subtotal × 0.18, Detracción = subtotal × 0.10, Total a facturar = subtotal + IGV (en naranja) | 🔴 |
| 5.1.5 | Click "Crear Valorización" | Toast "Valorización YYYY-NNNNN creada (2 reportes)". Dialog cierra. Listado refresca: los 2 reportes pasan a estado VALORADO, columna Valoración muestra el código como link naranja | 🔴 |
| 5.1.6 | En DB: `SELECT * FROM valorizaciones WHERE codigo='YYYY-NNNNN'` | 2 filas con mismo `codigo`, `reporte_maquinaria_id` apuntando a cada reporte, `subtotal` correcto, `estado='VALORADO'` | 🔴 |
| 5.1.7 | `SELECT estado_venta, valorizacion_venta FROM reportes_maquinaria WHERE id IN (...)` | Ambos en `VALORADO` con el código poblado | 🔴 |
| 5.1.8 | Seleccionar 2 reportes de **clientes distintos** → "Valorizar Venta" | El dialog muestra warning rojo "Los reportes pertenecen a 2 clientes distintos. Valorizá uno por vez." Botón "Crear Valorización" deshabilitado | 🔴 |
| 5.1.9 | Seleccionar reportes **ya VALORADOS** → botón "Valorizar Venta" en el dropdown | Opción deshabilitada con label `solo PENDIENTE` a la derecha | 🟡 |
| 5.1.10 | Consecutivo `codigo`: crear 2 valorizaciones seguidas en el mismo tenant | La segunda es `YYYY-NNNNN+1` (sin gaps ni duplicados) | 🔴 |
| 5.1.11 | Aislamiento por tenant: CISE y GRUAS tienen contadores independientes | Crear valorización en CISE no afecta el código que siguió GRUAS | 🔴 |
| 5.1.12 | `deshacerValorizacion('YYYY-NNNNN')` vía server action (no hay UI aún) | Borra filas de `valorizaciones`, vuelve reportes a PENDIENTE, limpia `valorizacion_venta`. Si alguno tiene `factura_venta_item`, aborta con error | 🟡 |

### 5.2 F.2 — PDF Valorización ✅

**Pre-requisito:** F.1.5 completado, valorización `YYYY-NNNNN` existe. Gotenberg disponible en `GOTENBERG_URL` (default demo EasyPanel).

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.2.1 | En el listado, click en el código naranja de la columna "Valoración" (ej. `2026-00001`) | Nueva pestaña con PDF inline `valorizacion-2026-00001.pdf` | 🔴 |
| 5.2.2 | Header del PDF | Logo del tenant (o fallback "RE" naranja) + título "VALORIZACIÓN DE SERVICIOS" + bloque derecho con `codigo_formato / version_formato / fecha_formato` desde `config_valorizacion_venta` | 🔴 |
| 5.2.3 | Meta (fila superior) | CONSECUTIVO = `YYYY-NNNNN (NN TN)` si todos los reportes tienen mismo tonelaje, solo `YYYY-NNNNN` si mixto o vacío. FECHA = fecha de valorización. CLIENTE + RUC poblados | 🔴 |
| 5.2.4 | Tabla items | 14 columnas: FECHA, DÍA, NÚMERO REPORTE, DETALLE FACTURA, PLACA, HORA INICIO 1/FIN 1/INICIO 2/FIN 2, RECORRIDO, HORAS, TOTAL FACTURAR, PRECIO UNITARIO, SUBTOTAL. Una fila por reporte | 🔴 |
| 5.2.5 | Fila TOTALES | Suma de horas, total facturar y subtotal correctos | 🔴 |
| 5.2.6 | Resumen inferior | SUBTOTAL + %DETRACCIÓN + IGV (N%) + TOTAL A FACTURAR (fila naranja resaltada) | 🔴 |
| 5.2.7 | Valorización inexistente: abrir `/api/valorizaciones/INVALIDO/pdf` | Response 404 JSON `{"error":"Valorización no encontrada"}` | 🟡 |
| 5.2.8 | Cross-tenant: usuario CISE abre URL de valorización GRUAS | 404 (RLS + filtro por tenant_id en la query) | 🔴 |
| 5.2.9 | Gotenberg caído | Response 500 con mensaje. La UI no debe crashear — se abre pestaña con error legible | 🟡 |

### 5.3 F.3 — Menú masivo en listado valoraciones ✅

**Pre-requisito:** al menos 1 valorización existente (ver 5.1). Ideal: 1 con ≥2 reportes del mismo código VALORADO y 1 en estado FACTURADO para el caso negativo.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.3.1 | Sin selección: botón "Acciones Masivas (0)" | Botón deshabilitado | 🟡 |
| 5.3.2 | Seleccionar 2 reportes PENDIENTES del mismo cliente: "Acciones Masivas (2)" → dropdown | Dropdown muestra: **Valorizar Venta** (habilitado), **PDF Valorización** (deshabilitado con tag `1 valorización`), **Deshacer Valorización** (deshabilitado), **Facturar Venta (F.4)** (deshabilitado) | 🔴 |
| 5.3.3 | Seleccionar 2 reportes del mismo código VALORADO | **Valorizar** deshabilitado (`solo PENDIENTE`). **PDF Valorización** habilitado (azul). **Deshacer Valorización** habilitado (rojo). **Facturar** deshabilitado. | 🔴 |
| 5.3.4 | Click en "PDF Valorización" con selección válida | Abre nueva pestaña con `/api/valorizaciones/YYYY-NNNNN/pdf` (mismo endpoint que F.2) | 🔴 |
| 5.3.5 | Click en "Deshacer Valorización" | Abre AlertDialog rojo "¿Deshacer valorización YYYY-NNNNN?" con warning sobre reportes a PENDIENTE y abort si facturada | 🔴 |
| 5.3.6 | AlertDialog → "Cancelar" | Se cierra sin efecto. Cotización intacta en DB | 🟡 |
| 5.3.7 | AlertDialog → "Deshacer valorización" | Toast "Valorización YYYY-NNNNN deshecha". Selección se resetea. Listado refresca. Los reportes ahora PENDIENTE | 🔴 |
| 5.3.8 | Seleccionar reportes de **2 valorizaciones distintas** (codigos diferentes) | PDF/Deshacer deshabilitados con tag `1 valorización` | 🔴 |
| 5.3.9 | Seleccionar reportes de valorización FACTURADA | Deshacer deshabilitado con tag `facturada`. PDF habilitado (se puede reimprimir) | 🔴 |
| 5.3.10 | Mezclar PENDIENTE + VALORADO en la selección | Todas las acciones excepto "Facturar (F.4)" quedan deshabilitadas (no se puede operar sobre estados mixtos) | 🟡 |

### 5.4 F.4 + F.5 — Listado Facturación + Ver/Editar dialog ✅

**Pre-requisito:** facturas migradas de Bubble en `facturas_venta` con `esta_activa=true` para el tenant. Al menos 1 con `cliente_id` válido.

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.4.1 | Abrir `/ventas/facturas` | Ya no es placeholder. Ve 3 KPI cards arriba (Total facturado / Cobrado / Pendiente en USD) + toolbar + listado | 🔴 |
| 5.4.2 | Listado de facturas | 13 columnas: N° Factura · Fecha · Vencimiento · Cliente · RUC · Subtotal · IGV · Total USD · Detracción S/ · Cobrado · Pendiente · Estado · Acciones | 🔴 |
| 5.4.3 | Cliente + RUC se muestran joineados de `terceros` | Razón social + RUC reales (no IDs) | 🔴 |
| 5.4.4 | Toolbar: input búsqueda + filtro estado (ALL/PENDIENTE/PARCIAL/PAGADA/VENCIDA) | Los filtros se pushan a URL (`?estado=PAGADA&search=F001`), refrescan server-side | 🔴 |
| 5.4.5 | Contador "N de M facturas" a la derecha | Refleja el total filtrado vs el del tenant | 🟡 |
| 5.4.6 | Acciones por fila | 4 botones icono: Ver (Eye), Editar (Pencil), PDF cliente (FileText azul, deshabilitado si no hay `pdf_factura_url`), PDF Valorización (ExternalLink naranja, solo si `codigo_valoracion` existe) | 🔴 |
| 5.4.7 | Click "Ver" (Eye) | Abre dialog en modo read-only. Header con N° Factura + cliente + RUC, badges (Estado, Estado pago, Valorización linkeable al PDF) | 🔴 |
| 5.4.8 | Dialog Ver — sección "Montos" | 7 campos read-only: Subtotal, IGV (con %), Total USD, Total S/, Cobrado (verde), Pendiente USD (naranja), Pendiente S/ | 🔴 |
| 5.4.9 | Dialog Ver — sección "Detracción" | 4 campos: Monto S/ (con %), A cargo de, N° Constancia, Fecha pago detracción | 🔴 |
| 5.4.10 | Nota azul al pie | Informa que cobros/constancia se gestionan en F.6/F.7 (próximamente) | 🟡 |
| 5.4.11 | Click "Editar" (Pencil) en fila o "Editar" en el dialog Ver | Entra en modo edición. Campos editables: N° Factura, Fecha factura, Vencimiento, Días para pago, PDF cliente (URL), Detracción (A cargo de, N° constancia, Fecha pago). Montos y subtotal siguen read-only (no se re-valorizan) | 🔴 |
| 5.4.12 | Editar → "Cancelar" | Revierte form al estado original de la factura, vuelve a modo Ver | 🟡 |
| 5.4.13 | Editar → "Guardar" | Toast "Factura actualizada". DB actualizada con `updated_at` nuevo. Dialog vuelve a modo Ver. Listado refresca | 🔴 |
| 5.4.14 | Agregar URL válida en campo "PDF cliente (URL)", guardar, reabrir | En modo Ver aparece botón "Abrir PDF" con link a la URL guardada. En el listado, el botón FileText azul se habilita | 🔴 |
| 5.4.15 | Paginación/scroll | Tabla scrollea horizontal sobre 13 columnas; listado server-side con range de 50 por página | 🟡 |
| 5.4.16 | Cross-tenant isolation | Usuario CISE no ve facturas de GRUAS (RLS + eq tenant_id) | 🔴 |

**Nota de alcance pendiente (F.8/F.9):**
- Upload de PDF al bucket de Supabase Storage (hoy solo URL manual).
- Crear nueva factura desde "Facturar Venta" del listado de valoraciones — requiere workaround de `facturas_venta.bubble_id NOT NULL` legacy. En el plan para F.6+F.7+F.8.

### 5.5 F.6 + F.7 + F.8 — Cobros + Detracción + Deshacer Factura ✅

**Pre-requisito:** al menos 1 factura emitida del tenant en `facturas_venta` con `esta_activa=true`, con `total_usd` > 0 y `monto_a_cobrar_usd` definido. Al menos 1 banco en la tabla `bancos` para el tenant (si no, el selector del cobro queda vacío pero permite guardar sin banco).

#### 5.5.1 Nuevo Cobro (F.6)

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.5.1.1 | En `/ventas/facturas`, click "Ver" sobre una factura con `pendiente_por_cobrar_usd > 0` | Abre dialog. Nueva sección "Cobros registrados (0)" con estado "No hay cobros registrados". Botón "Nuevo cobro" visible | 🔴 |
| 5.5.1.2 | Click "Nuevo cobro" | Sub-dialog se abre. Header muestra `Factura <código>` + `Pendiente USD $XXX.XX` (prellenado con el pendiente actual) | 🔴 |
| 5.5.1.3 | Form prellenado: Tipo=TRANSFERENCIA, Monto=pendiente, Moneda=USD, Fecha=hoy, Banco=vacío | Todos los defaults correctos | 🔴 |
| 5.5.1.4 | Banco select muestra bancos activos del tenant con `nombre · cuenta (moneda)` | Lista poblada desde `bancos.is_active=true` | 🔴 |
| 5.5.1.5 | Intentar guardar con monto 0 o vacío | Toast error "Monto inválido" | 🟡 |
| 5.5.1.6 | Completar form válido y click "Registrar cobro" | Toast "Cobro registrado". Sub-dialog cierra. Tabla de cobros en el dialog padre ahora tiene 1 fila: fecha, tipo (badge), banco, monto verde, comentarios | 🔴 |
| 5.5.1.7 | En DB `cobros_venta`: verificar fila con factura_venta_id, tipo, monto, moneda, banco_id, is_active=true, created_by | Todo correcto | 🔴 |
| 5.5.1.8 | Verificar factura actualizada: `monto_pagado_factura` = monto del cobro, `pendiente_por_cobrar_usd` = total - monto, `estado_pago` = 'PARCIAL' si parcial, 'PAGADA' si total | Recálculo automático correcto | 🔴 |
| 5.5.1.9 | Registrar 2do cobro parcial | Suma acumulada correcta. `estado_pago` transita PARCIAL → PAGADA cuando alcanza total | 🔴 |
| 5.5.1.10 | Click ícono 🗑 (Trash2) en una fila de cobro | Confirm nativo "¿Anular cobro de...?" → OK → toast "Cobro anulado". Cobro desaparece de la lista. `cobros_venta.is_active=false` en DB. Factura se recalcula (monto_pagado baja, pendiente sube, estado_pago retrocede) | 🔴 |

#### 5.5.2 Registrar Detracción (F.7)

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.5.2.1 | En el dialog de factura (modo Ver), click "Registrar detracción" (botón con ícono Landmark) | Sub-dialog "Registro de detracción" abre con datos pre-llenados si ya existen (porcentaje, monto S/, a cargo de, constancia, fecha pago) | 🔴 |
| 5.5.2.2 | Defaults iniciales (factura sin detracción previa): % = 10, Monto S/ = vacío, A cargo de = CLIENTE, Constancia = vacío, Fecha = hoy | Correcto | 🟡 |
| 5.5.2.3 | Guardar sin número de constancia | Toast error "Número de constancia obligatorio" | 🔴 |
| 5.5.2.4 | Completar todos los campos y "Registrar" | Toast "Detracción registrada". Sub-dialog cierra. Sección "Detracción" del dialog padre muestra los nuevos valores | 🔴 |
| 5.5.2.5 | En DB `facturas_venta`: verificar `detraccion_porcentaje`, `detraccion_monto_sol`, `detraccion_a_cargo_de`, `detraccion_numero_constancia`, `detraccion_fecha_pago` | Actualizados | 🔴 |
| 5.5.2.6 | Reabrir dialog → "Registrar detracción" | Campos llegan pre-poblados con lo guardado (se puede re-editar) | 🟡 |

#### 5.5.3 Deshacer Factura (F.8)

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.5.3.1 | Con una factura activa (estado ≠ DESHABILITADA), click botón rojo "Deshacer factura" al final del dialog | AlertDialog rojo abre con advertencia sobre cobros anulados + reportes a VALORADO | 🔴 |
| 5.5.3.2 | "Cancelar" | Dialog cierra sin efecto | 🟡 |
| 5.5.3.3 | "Deshacer factura" | Toast "Factura <código> deshecha". `facturas_venta.esta_activa=false`, `estado='DESHABILITADA'`. Cobros asociados soft-deleted (`is_active=false`). Reportes con `factura_venta_item=<código>` actualizados: `estado_venta='VALORADO'`, `factura_venta_item=null` | 🔴 |
| 5.5.3.4 | Listado `/ventas/facturas` | La factura deshabilitada ya NO aparece (filtro `esta_activa=true` a nivel query) | 🔴 |
| 5.5.3.5 | Listado `/ventas/valoraciones` filtrado por VALORADO | Los reportes de la valorización afectada reaparecen como VALORADO, disponibles para refacturar | 🔴 |
| 5.5.3.6 | En el dialog de la factura ahora DESHABILITADA (si se abriera vía link directo o después de refresh) | Sección muestra aviso rojo: "Esta factura fue deshabilitada. La valorización asociada volvió a VALORADO y puede refacturarse". Botones "Nuevo cobro", "Registrar detracción", "Deshacer factura" ocultos | 🟡 |
| 5.5.3.7 | Intentar deshacer con RLS de otro tenant | Error silencioso (0 filas afectadas) + toast si aplica | 🔴 |

### 5.6 F.9 + F.10 — Menú individual por informe + cross-module consistency ✅

#### 5.6.1 Menú ⋮ por fila (F.9)

**Pre-requisito:** `/ventas/valoraciones` con reportes en los 3 estados (PENDIENTE, VALORADO, FACTURADO).

| # | Paso | Esperado | Severidad |
|---|---|---|---|
| 5.6.1.1 | Listado muestra una columna nueva al final con un botón `⋮` (MoreHorizontal) por fila | Visible en todas las filas, sin ocupar mucho espacio | 🔴 |
| 5.6.1.2 | Click en `⋮` de una fila PENDIENTE | Dropdown abre con: label "Informe <id_reporte>", "Copiar ID reporte", "Ver PDF del reporte" (si existe pdf_reporte), "Precio por Día (F.9)" (deshabilitado), "Deshabilitar informe" (rojo, habilitado) | 🔴 |
| 5.6.1.3 | Click "Copiar ID reporte" | Toast "ID copiado". El UUID queda en clipboard | 🟡 |
| 5.6.1.4 | Click "Ver PDF del reporte" | Abre nueva pestaña con `/reportes/<reporte_id>/pdf` (endpoint externo al scope de F.9 — si 404 es gap conocido de Fase B/D) | 🟡 |
| 5.6.1.5 | Click "Deshabilitar informe" en PENDIENTE | AlertDialog rojo → "Deshabilitar" → toast "Reporte deshabilitado". `reportes_maquinaria.is_active=false` en DB. Fila desaparece del listado (el filtro del backend respeta `is_active`) | 🔴 |
| 5.6.1.6 | `⋮` en fila VALORADO (sin factura) | "Deshabilitar informe" deshabilitado con tag `deshacé valor.` — guard correcto | 🔴 |
| 5.6.1.7 | `⋮` en fila FACTURADO | "Deshabilitar informe" deshabilitado con tag `facturado` | 🔴 |
| 5.6.1.8 | Intento forzar deshabilitar un VALORADO via server action directa | `deshabilitarReporteMaquinaria()` devuelve `{success:false, message:"Reporte está valorizado (YYYY-NNNNN). Deshacé la valorización primero."}` | 🔴 |
| 5.6.1.9 | Intento forzar deshabilitar un FACTURADO via server action | `{success:false, message:"Reporte ya facturado (F001-XXX). Deshacé la factura primero."}` | 🔴 |

#### 5.6.2 Cross-module consistency (F.10)

Matriz de transiciones válidas — verificar que la DB no queda en estado inconsistente en cada paso.

| # | Escenario | Verificación | Severidad |
|---|---|---|---|
| 5.6.2.1 | Valorizar N reportes PENDIENTES | N filas en `valorizaciones` con mismo `codigo`. N rows en `reportes_maquinaria` con `estado_venta='VALORADO'` + `valorizacion_venta=<codigo>` | 🔴 |
| 5.6.2.2 | Deshacer valorización | Filas de `valorizaciones` borradas. Reportes vuelven a `estado_venta='PENDIENTE'`, `valorizacion_venta=NULL` | 🔴 |
| 5.6.2.3 | Intento de deshacer una valorización facturada (si existiera en data migrada) | Aborta con `"No se puede deshacer: algunos reportes ya están facturados"` | 🔴 |
| 5.6.2.4 | Registrar cobro parcial en factura (50% del total) | `facturas_venta.monto_pagado_factura=50%`, `pendiente_por_cobrar_usd=50%`, `estado_pago='PARCIAL'` | 🔴 |
| 5.6.2.5 | Registrar 2do cobro que completa el total | `monto_pagado_factura=100%`, `pendiente_por_cobrar_usd=0`, `estado_pago='PAGADA'` | 🔴 |
| 5.6.2.6 | Anular uno de los cobros (soft-delete) | Recálculo: monto_pagado baja, pendiente sube, estado_pago transita PAGADA → PARCIAL o PARCIAL → PENDIENTE según corresponda | 🔴 |
| 5.6.2.7 | Registrar detracción en factura | `facturas_venta.detraccion_*` poblados. Sin efecto cascade en cobros ni reportes (detracción es metadata) | 🔴 |
| 5.6.2.8 | Deshacer factura con cobros activos | `esta_activa=false` + `estado='DESHABILITADA'`. Todos los cobros asociados con `is_active=false`. Reportes con `factura_venta_item=<código>` actualizados a `estado_venta='VALORADO'` + `factura_venta_item=NULL` (la valorización queda disponible para refacturar) | 🔴 |
| 5.6.2.9 | Tras deshacer factura, refacturar la misma valorización | El flow F.1→F.4 puede re-crear una factura con nuevo código sobre la misma valorización (la valorización sigue existiendo, solo se limpia `factura_venta_item`) | 🔴 |
| 5.6.2.10 | Deshabilitar un reporte PENDIENTE → intentar valorizarlo | No aparece en el listado (filtro `is_active=true`), no se puede seleccionar | 🔴 |
| 5.6.2.11 | Cross-tenant: ninguna operación afecta tenants distintos | Todos los updates llevan `eq('tenant_id', tenantId)`. Probar con CISE + GRUAS en paralelo | 🔴 |

---

## 6. Compras — Fase G ✅

Implementada en v3.4.1. Tests E2E en `tests/flows/16-compras.spec.ts` (`@critical`).

Flujos cubiertos: listado de valoraciones de compra, filtros, botón Nueva valorización, acciones masivas (valorizar compra), listado de facturas de compra.

**Prueba manual pendiente:** misma matriz de transiciones que Ventas (sección 5.6) aplicada al módulo de compras.

---

## 7. Formatos WEB — Fase H ✅

Implementada en v3.5.0. Tests E2E en `tests/flows/08-formatos.spec.ts` (`@critical`).

Flujos E2E cubiertos: listado de formatos, plantilla activa, publicar/clonar, llenado con firma+PIN, listado de informes generados. PDF vía Gotenberg.

**Prueba manual recomendada:**

- [ ] Admin seed: 2 plantillas activas (CISE + GRUAS) con correlativo atómico configurado
- [ ] Crear versión BORRADOR → publicar (lock) → verificar que `trg_prevent_edit_published_version` bloquea edición posterior
- [ ] Llenar formulario con firma + PIN → informe generado con código correlativo correcto
- [ ] Clonar plantilla publicada → editar preguntas → republicar como nueva versión

---

## 8. Regresiones

| # | Módulo | Prueba | Severidad |
|---|---|---|---|
| 8.1 | Terceros | Listado carga, filtros tipo=cliente/proveedor funcionan | 🟡 |
| 8.2 | Maquinaria | CRUD básico funciona | 🟡 |
| 8.3 | Usuarios | Crear profile → aparece en select de planificación | 🟡 |
| 8.4 | EPP | Dashboard carga, alertas de vencimiento aparecen | 🟢 |
| 8.5 | Inspecciones | Listado carga, abrir una → muestra checklist | 🟡 |
| 8.6 | Planes de acción | Listado carga, crear nuevo desde inspección funciona | 🟡 |

---

## 9. Chequeo de DB post-cutover

| # | Query | Criterio |
|---|---|---|
| 9.1 | `SELECT COUNT(*) FROM config_informe_personal` | = 2 (CISE + GRUAS) |
| 9.2 | `SELECT COUNT(*) FROM config_informe_maquinaria` | = 2 |
| 9.3 | `SELECT COUNT(*) FROM config_valorizacion_venta` | = 2 |
| 9.4 | `SELECT COUNT(*) FROM config_valorizacion_compra` | = 2 |
| 9.5 | `\dt public.formatos_*` | 10 tablas presentes |
| 9.6 | `SELECT COUNT(*) FROM reportes_personal WHERE jornada3_inicio IS NOT NULL` | puede ser 0 ahora, pero la columna existe |
| 9.7 | Verificar triggers activos en `formatos_versiones` | `trg_prevent_edit_published_version` presente |

---

## 10. Checklist de go/no-go cutover 2026-05-02

- [ ] Todas las 🔴 de secciones 1-3 en verde
- [ ] Al menos 1 tarea creada con personal externo en cada tenant
- [ ] Al menos 1 reporte personal + 1 reporte maquinaria generado + PDF descargable
- [ ] Fase E/F/G smoke tests 🔴 verdes
- [ ] Fase H con 2 plantillas seed y correlativo atómico funcionando
- [ ] Sin errores en Supabase logs últimas 24h
- [ ] Backup de DB cloud tomado el 2026-05-01 antes del switch
