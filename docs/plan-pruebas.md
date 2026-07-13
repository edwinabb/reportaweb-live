# Plan de Pruebas — REPORTA Web + App (Integración E2E)

Pruebas de validación que cubren el ciclo completo: configuración en web → planificación → asignación de tareas → ejecución en campo (app) → informes → EPP. Diseñadas para ser ejecutadas manualmente por un tester con acceso a ambas plataformas.

**Prerequisitos:**
- Web desplegada y funcional (Vercel o localhost:3000)
- App instalada en dispositivo físico o emulador (Expo Go o build de desarrollo)
- Usuario admin del tenant: `admin@cise.com` (o equivalente)
- Usuario operario: `operario@cise.com` (o equivalente), con PIN configurado
- Maquinaria de prueba creada en el sistema
- Al menos 1 cotización activa con cliente y sitio

---

## Bloque 0 — Configuración inicial (prerequisito de todos los demás)

### P-000.1 Configurar catálogo EPP en web
**Ruta:** `/sst/epp/config` (o Settings → EPP)
**Actor:** admin

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Ingresar a Settings → EPP → Catálogo de EPP | Lista de ítems EPP del tenant |
| 2 | Crear ítem: **Casco de seguridad** · 365 días renovación | Ítem guardado, visible en lista |
| 3 | Crear ítem: **Camisa de trabajo** · 180 días | Ítem guardado |
| 4 | Crear ítem: **Pantalón de trabajo** · 180 días | Ítem guardado |
| 5 | Crear ítem: **Zapatos de seguridad** · 365 días | Ítem guardado |
| 6 | Crear ítem: **Guantes** · 90 días | Ítem guardado |
| 7 | Crear ítem: **Lentes de seguridad** · 180 días | Ítem guardado |

### P-000.2 Configurar formatos de informe por tenant
**Ruta:** `/settings/formatos` (o Settings → Informes)
**Actor:** admin

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Abrir Settings → Informes → Personal | Campos código/versión/fecha |
| 2 | Ingresar: Código `CISE-02` · Versión `V.03` · Fecha `Feb-2022` | Guardado OK |
| 3 | Abrir Settings → Informes → Maquinaria | Campos código/versión/fecha + toggles |
| 4 | Ingresar: Código `CISE-03` · Versión `V.03` · Fecha `Feb-2022` | Guardado OK |
| 5 | Activar secciones: Guía transporte ✓ / Foto actividad ✓ / Firma cliente ✓ / Foto reporte escrito ✓ | Guardado OK |
| 6 | Abrir Settings → Checklist | Toggles por tenant |
| 7 | CISE: Medidores ON · Observaciones OFF · Declaración vacía | Guardado OK |

### P-000.3 Configurar notificaciones EPP
**Ruta:** Settings → Notificaciones
**Actor:** admin

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Abrir Settings → Notificaciones → EPP | Lista de usuarios con checkbox |
| 2 | Marcar al admin como receptor de observaciones EPP | Guardado OK |

---

## Bloque 1 — Planificación (Web)

### P-001.1 Crear tarea nueva con personal interno
**Ruta:** `/planificacion/nueva`
**Actor:** admin / planner

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Ingresar a `/planificacion/nueva` | Form carga correctamente |
| 2 | Tab Info: seleccionar cliente → cotización → servicio | Campos se cargan en cascada |
| 3 | Seleccionar 3 fechas: hoy, mañana, pasado mañana | Fechas marcadas en calendario |
| 4 | Tab Personal → INTERNO: seleccionar cargo → seleccionar operario | Operario asignado |
| 5 | Tab Maquinaria → INTERNO: seleccionar categoría → seleccionar equipo | Maquinaria asignada |
| 6 | Guardar tarea | Tarea creada, código T-XXXX-XXXX |
| 7 | Ir a `/planificacion` → Timeline Personal | Tarea aparece en el timeline del operario |
| 8 | Verificar que los días festivos aparecen con fondo ámbar en el timeline | Festivos resaltados |

### P-001.2 Ver detalle de tarea desde timeline
**Ruta:** `/planificacion`

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Click en la card de la tarea creada en P-001.1 | Dialog de detalle abre |
| 2 | Verificar tabs: General / Reportes / Inspecciones | Tabs presentes |
| 3 | Verificar datos: código, cliente, fechas, operario, maquinaria | Datos correctos |

---

## Bloque 2 — Login y Plan del Día (App)

### P-002.1 Login operario en la app
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Abrir la app | Pantalla de login |
| 2 | Ingresar email y contraseña del operario | — |
| 3 | Tocar "INICIAR SESIÓN" | Tab HOY carga con nombre del operario |
| 4 | Verificar que la tarea de P-001.1 aparece en "TAREA ACTIVA" | Tarea visible con código y cliente |
| 5 | Si hoy es festivo → verificar banner `🎌 Hoy: [descripcion]` | Banner presente |

### P-002.2 Sin conexión — datos disponibles offline
| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Activar modo avión en el dispositivo | — |
| 2 | Cerrar y reabrir la app | App inicia, muestra tarea del día (datos locales) |
| 3 | Verificar banner "Sin conexión" | Banner presente |
| 4 | Desactivar modo avión | Banner desaparece, sync automático |

---

## Bloque 3 — Registro de llegada (App)

### P-003.1 Registrar llegada con foto y GPS
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab HOY → tocar "▶ Registrar Llegada" o Tab 2 → Registrar Llegada | Pantalla llegada |
| 2 | Verificar que GPS se captura automáticamente | Coordenadas visibles |
| 3 | Tomar foto con cámara | Foto aparece en grid |
| 4 | Intentar enviar sin foto → botón bloqueado | Correcto |
| 5 | Tocar "REGISTRAR LLEGADA" | Banner "✓ Guardado" |
| 6 | En Tab HOY → sección Completado HOY: "✓ Registro de llegada" | Ítem marcado |

### P-003.2 Verificar llegada en web
**Actor:** admin
**Ruta:** módulo de asistencias o detalle de tarea

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Abrir detalle de la tarea → tab Reportes | — |
| 2 | Verificar que aparece el registro de llegada del operario | Fecha/hora, foto, GPS |

---

## Bloque 4 — Checklist de Maquinaria (App)

### P-004.1 Completar checklist con todos SI
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 2 → Checklist Maquinaria | Pantalla checklist carga |
| 2 | Verificar que muestra Empresa/Cliente/Tarea auto-poblados (config CISE) | Visible |
| 3 | Verificar sección Medidores presente (CISE: mostrar_medidores = true) | Visible |
| 4 | Responder todos los ítems como SI | Íconos verdes |
| 5 | Ingresar horómetro inicio: `1250` · Foto horómetro | — |
| 6 | Ingresar km inicio: `45000` · Foto odómetro | — |
| 7 | Ingresar horómetro final: `1260` · Foto horómetro | — |
| 8 | Ingresar km final: `45100` · Foto odómetro | — |
| 9 | Tocar "FIRMAR Y ENVIAR" → ingresar PIN | Checklist guardado |

### P-004.2 Checklist con ítem en NO → plan de acción automático
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Iniciar nuevo checklist | — |
| 2 | Responder primer ítem como NO | Expande campo observación + badge "⚠ Se creará un plan de acción" |
| 3 | Escribir observación: "Freno de mano no responde" | — |
| 4 | Completar el resto como SI | — |
| 5 | Firmar y enviar con PIN | Checklist + plan de acción guardados |
| 6 | En la web → módulo Planes de Acción | Plan aparece con badge "Desde Checklist" |
| 7 | Admin asigna responsable + fecha compromiso | Plan actualizado |

### P-004.3 Verificar checklist en web
**Actor:** admin

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Abrir detalle de la tarea → tab Inspecciones | — |
| 2 | Verificar checklist de P-004.1: puntaje = 100% | Puntaje correcto |
| 3 | Verificar checklist de P-004.2: puntaje < 100% | Puntaje correcto |
| 4 | Descargar PDF del checklist | PDF con header CISE, ítems, medidores |

---

## Bloque 5 — Informe Personal (App)

### P-005.1 Llenar informe personal día normal
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 2 → Informe Personal | Pantalla informe |
| 2 | Fecha: hoy (no domingo ni festivo) | Sin banner de festivo |
| 3 | Jornada 1: 07:00 → 13:00 (6h) | — |
| 4 | Jornada 2: 14:00 → 20:00 (6h) | — |
| 5 | Verificar cálculo automático: Total 12h · Normales 8h · Extras 25% 2h · Extras 35% 2h · Domin. 0h | Correcto (solo lectura) |
| 6 | Viáticos: Desayuno S/.15 · Almuerzo S/.25 · Movilidad S/.10 | — |
| 7 | Trabajo realizado: "Operación de camión pluma" | — |
| 8 | Dibujar firma en canvas | Firma visible |
| 9 | Ingresar PIN | — |
| 10 | Tocar "ENVIAR INFORME" | Banner "✓ Informe guardado · PDF generado" |
| 11 | Compartir PDF via WhatsApp/email | PDF se abre y comparte correctamente |

### P-005.2 Informe personal día domingo
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Abrir informe personal | — |
| 2 | Cambiar fecha a domingo pasado | Banner "⚠ Este día es domingo/feriado" |
| 3 | Seleccionar "No (aplica pago triple)" | — |
| 4 | Jornada 1: 07:00 → 15:00 (8h) | — |
| 5 | Verificar: Dominicales = 8h | Correcto |
| 6 | Enviar con firma + PIN | Guardado OK |

### P-005.3 Verificar informe personal en web
**Actor:** admin

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Módulo Informes Personal → buscar informe del operario | Aparece en la lista |
| 2 | Abrir detalle | Datos correctos: horas, viáticos, firma |
| 3 | Descargar PDF | PDF con header CISE-02, tabla horas, tabla gastos, firma |
| 4 | Verificar que PDF coincide con el enviado desde la app | Idéntico |

---

## Bloque 6 — Informe Maquinaria (App)

### P-006.1 Llenar informe de maquinaria
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 2 → Informe Maquinaria | Info de tarea auto-poblada |
| 2 | Verificar: Tarea/Cliente/RUC/Sitio visibles y solo lectura | Correcto |
| 3 | Operador/Chofer: seleccionar operario actual | — |
| 4 | Jornada 1: 07:00 → 13:00 | — |
| 5 | Tipo recorrido: N/A | Campo "Horas recorrido" oculto |
| 6 | Cambiar a tipo recorrido: Ida | Campo "Horas recorrido" visible |
| 7 | Horas recorrido: 1.5h | Total = 7.5h |
| 8 | Verificar total horas = 6h jornada + 1.5h recorrido = 7.5h | Correcto |
| 9 | Guía de transporte: "Av. Arequipa 1234" | — |
| 10 | Trabajo realizado: "Traslado de estructura metálica" | — |
| 11 | Sección aceptación cliente: toggle ON · firma canvas · nombre · cargo | — |
| 12 | Foto reporte escrito: capturar foto del reporte físico | — |
| 13 | Tocar "ENVIAR INFORME" | Guardado OK |

### P-006.2 Verificar informe maquinaria en web
**Actor:** admin

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Módulo Informes Maquinaria → buscar informe | Aparece con version_formato = 'v2' |
| 2 | Verificar campos: rigger1, tipo_recorrido, total_horas | Correctos |
| 3 | Descargar PDF | PDF con header CISE-03, secciones configuradas |

---

## Bloque 7 — Combustible y Parada (App)

### P-007.1 Registrar recarga de combustible
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 2 → Recarga de Combustible | Pantalla combustible |
| 2 | Maquinaria: seleccionar · Combustible: Diesel | — |
| 3 | Galones: 45 · Horómetro: 1260 · Grifo: "Primax Miraflores" | — |
| 4 | Foto medidor ANTES → Foto horómetro → Foto medidor DESPUÉS | 3 fotos obligatorias |
| 5 | Intentar enviar sin 1 foto obligatoria → botón bloqueado | Correcto |
| 6 | Capturar GPS | Coordenadas obtenidas |
| 7 | Tocar "REGISTRAR RECARGA" | Guardado OK |

### P-007.2 Registrar parada y reinicio
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 2 → Parada de Maquinaria | Pantalla parada |
| 2 | Motivo: "Espera cliente" · Descripción | — |
| 3 | Tomar foto de evidencia | — |
| 4 | Tocar "REGISTRAR PARADA" | Parada activa visible al pie |
| 5 | Tab 2 → Reinicio Maquinaria (card habilitada) | Lista paradas activas |
| 6 | Seleccionar parada → tomar foto → confirmar | Parada cerrada, duración calculada |

---

## Bloque 8 — EPP Flujo completo

### P-008.1 Registrar entrega de EPP en la web
**Ruta:** `/sst/epp/nueva-entrega`
**Actor:** admin

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Módulo EPP → Nueva entrega | Form de entrega |
| 2 | Colaborador: seleccionar al operario de prueba | — |
| 3 | Agregar ítems: Casco (x1) · Guantes (x2) · Lentes (x1) | Fechas de vencimiento calculadas automáticamente |
| 4 | Guardar entrega | Entrega creada con estado_confirmacion = PENDIENTE |
| 5 | Verificar en lista: badge "⏳ Pendiente" | Correcto |

### P-008.2 Confirmar recepción total en app (Pantalla C)
**Actor:** operario en la app

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 2 → Confirmar EPP (badge visible con número) | Pantalla C carga |
| 2 | Verificar ítems de P-008.1: Casco, Guantes, Lentes | Los 3 ítems visibles con fechas vencimiento |
| 3 | Marcar todos con ✅ | Resumen: 3 de 3 OK |
| 4 | Ingresar PIN personal | — |
| 5 | Tocar "CONFIRMAR RECEPCIÓN" | Guardado OK, card EPP desaparece del Tab 2 |
| 6 | En web: entrega muestra badge "✅ Completo" | Correcto |

### P-008.3 Confirmar recepción parcial en app (Pantalla C con observación)
**Actor:** admin + operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Admin web: crear nueva entrega para operario → Casco (x1) + Zapatos (x1) + Camisa (x1) | Entrega creada |
| 2 | Operario app: Tab 2 → Confirmar EPP | Entrega visible |
| 3 | Marcar Casco ✅ y Camisa ✅ | — |
| 4 | Desmarcar Zapatos → motivo: "Llegó con daños" → nota: "Suela despegada" | Sección expande |
| 5 | Resumen: "2 de 3 ítems OK · 1 con observación" | Visible |
| 6 | Ingresar PIN y confirmar | Guardado, estado_confirmacion = PARCIAL |
| 7 | Admin web: entrega muestra badge "⚠ Parcial" y está primera en la lista | Correcto |
| 8 | Admin abre detalle → ve observación: "Llegó con daños — Suela despegada" | Correcto |
| 9 | Admin escribe respuesta: "Te enviamos zapatos nuevos el lunes" | — |
| 10 | Admin elige decisión: REENVIAR | — |
| 11 | Admin toca "GUARDAR DECISIÓN" | Estado ítem = RESUELTO; nueva entrega creada (solo zapatos) |
| 12 | Operario app: notificación push "Admin respondió tu observación EPP" | Recibida |
| 13 | Operario abre Pantalla D | Ve: Casco ✅ / Camisa ✅ / Zapatos 🔄 "Se programará nuevo envío" |
| 14 | Operario toca "ENTENDIDO" | Pantalla se cierra |
| 15 | Tab 2 → Confirmar EPP: nueva entrega de zapatos aparece como pendiente | Correcto |

### P-008.4 Entregar EPP desde la app (Pantalla A)
**Actor:** supervisor/encargado + operario (mismo dispositivo)

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 2 → Entregar EPP | Pantalla A |
| 2 | Seleccionar colaborador: buscar por nombre | — |
| 3 | Agregar ítem: Pantalón de trabajo (x2) | Fecha vencimiento calculada |
| 4 | Pasar dispositivo al colaborador | — |
| 5 | Colaborador ingresa su PIN | Validado contra profiles.pin_hash |
| 6 | Tocar "REGISTRAR ENTREGA" | Guardado OK, todos ítems = CONFIRMADO |
| 7 | Web: entrega aparece con badge "✅ Completo" y confirmado_via_app = true | Correcto |

### P-008.5 Ver stock personal de EPP (Pantalla B)
**Actor:** operario

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 4 → sección "MI EPP" → tocar [→] | Pantalla B carga |
| 2 | Verificar que aparecen los ítems de las entregas P-008.2, P-008.3, P-008.4 | Todos visibles |
| 3 | Verificar orden: VENCIDOS primero (si hay) → PRÓXIMOS → VIGENTES | Correcto |
| 4 | Verificar colores: 🔴 rojo / 🟡 amarillo / 🟢 verde | Correcto |
| 5 | Verificar resumen en Tab 4: "🟢 X vigentes" | Recuento correcto |

---

## Bloque 9 — Resumen mensual y KPIs (App)

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 3 → Resumen | Mes actual cargado |
| 2 | Verificar KPI Puntualidad (si llegada fue a tiempo) | Valor calculado |
| 3 | Verificar HORAS: refleja informes de P-005.1 y P-005.2 | Totales correctos |
| 4 | Verificar COMBUSTIBLE: refleja recarga de P-007.1 | Galones y costo |
| 5 | Verificar GASTOS: refleja viáticos de P-005.1 | Totales por categoría |
| 6 | Navegar al mes anterior con ← | Datos del mes anterior (puede ser vacío) |

---

## Bloque 10 — Vista mensual de días (App → Informe Personal)

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Tab 3 → "Mis Días" (o Tab HOY → link días del mes) | Lista días del mes |
| 2 | Días con informe: ✓ con horas | Colores verde/naranja según extras |
| 3 | Días sin informe: ○ gris | Correcto |
| 4 | Día domingo trabajado (P-005.2): marcado en rojo con horas dominicales | Correcto |
| 5 | Tap en día con informe → modo lectura | Informe abre en solo lectura |
| 6 | Tap en día sin informe → form nuevo informe con fecha preseleccionada | Form abre con fecha correcta |

---

## Bloque 11 — Sync offline y reconexión

| Paso | Acción | Resultado esperado |
|------|--------|-------------------|
| 1 | Activar modo avión | — |
| 2 | Registrar llegada con foto y GPS | Banner "⚡ Sin conexión — se sincronizará" |
| 3 | Llenar informe personal completo y enviar | Banner "✓ Guardado localmente" |
| 4 | Verificar que en web NO aparecen aún los registros | Correcto (no sincronizado) |
| 5 | Desactivar modo avión | — |
| 6 | Esperar sync automático (máx. 30s) | — |
| 7 | Verificar en web que llegada e informe personal aparecen | Sincronizado correctamente |
| 8 | Verificar que no hay duplicados | Idempotencia por uuid_local funciona |

---

## Resumen de cobertura

| Bloque | Funcionalidad | Plataformas |
|--------|--------------|-------------|
| B-0 | Configuración EPP + formatos | Web |
| B-1 | Planificación + festivos | Web |
| B-2 | Login + plan del día | App |
| B-3 | Registro llegada | App → Web |
| B-4 | Checklist + planes de acción | App → Web |
| B-5 | Informe personal + PDF | App → Web |
| B-6 | Informe maquinaria + PDF | App → Web |
| B-7 | Combustible + parada/reinicio | App |
| B-8 | EPP completo (web+app) | Web ↔ App |
| B-9 | Resumen KPIs | App |
| B-10 | Vista mensual días | App |
| B-11 | Sync offline | App → Web |
