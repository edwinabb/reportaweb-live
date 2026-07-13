---
name: audit-checklist-detailed
description: Checklist exhaustivo de validación por módulo. Validar UI ↔ BD ↔ Bubble. Marcar con ✅/❌/⏳ durante recuperación.
metadata: 
  node_type: memory
  type: project
  status: template
  created: 2026-07-12
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# Audit Checklist — Recuperación de BD (Módulo por Módulo)

**Objetivo:** Validar que cada módulo tiene todos los campos, relaciones y datos necesarios  
**Método:** Ejecutar después de cada fase de migración  
**Marcar:** ✅ = listo, ❌ = problema, ⏳ = pendiente

---

## 0. PRE-AUDITORÍA: Infraestructura Base

### 0.1 Schema Base Creado

- [ ] ✅ Tabla `companies` existe + tiene 2 tenants (CISE, GRUAS)
- [ ] ✅ Tabla `profiles` existe + mapeo de roles correcto
- [ ] ✅ Tabla `profile_details` existe + FK job_titles, areas, branches
- [ ] ✅ Todos los catálogos creados (job_titles, areas, branches, personal_cargos, sitios_tipo)
- [ ] ✅ RLS policies activas en todas las tablas
- [ ] ✅ Funciones triggers (`update_updated_at_column`, `set_created_by_column`) funcionan

**Validar SQL:**
```sql
SELECT COUNT(*) FROM companies; -- Debe ser 2
SELECT COUNT(*) FROM profiles; -- >= 10
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'; -- >= 50
```

---

## 1. Módulo: TERCEROS & CONTACTOS

### 1.1 Estructura

- [ ] Tabla `terceros` existe
- [ ] Tabla `contactos` existe
- [ ] Tabla `terceros_sitios` existe
- [ ] FK: contactos.tercero_id → terceros.id ✅
- [ ] FK: terceros_sitios.tercero_id → terceros.id ✅

### 1.2 Campos Críticos

**Terceros:**
- [ ] id, tenant_id, nombre, tipo, ruc, email, telefono, direccion, es_activo
- [ ] Bubble field: `bubble_id` único
- [ ] UNIQUE constraint: (tenant_id, ruc)

**Contactos:**
- [ ] id, tenant_id, tercero_id, nombre, email, telefono, cargo, es_principal

**Terceros Sitios:**
- [ ] id, tenant_id, tercero_id, sitio_tipo_id, nombre, direccion, latitud, longitud

### 1.3 Data Integrity (Post-Migración)

```sql
-- No hay terceros huérfanos
SELECT COUNT(*) FROM terceros WHERE tenant_id NOT IN (SELECT id FROM companies);
-- Debe ser 0

-- No hay contactos sin tercero
SELECT COUNT(*) FROM contactos WHERE tercero_id IS NULL;
-- Debe ser 0

-- Todos los contactos pertenecen a terceros válidos
SELECT COUNT(*) FROM contactos c
WHERE NOT EXISTS (SELECT 1 FROM terceros t WHERE t.id = c.tercero_id);
-- Debe ser 0
```

### 1.4 UI Validation

En `localhost:3000/terceros`:
- [ ] ✅ Se carga lista de terceros (CISE)
- [ ] ✅ Se puede crear tercero
- [ ] ✅ Se puede editar tercero
- [ ] ✅ Se pueden ver contactos del tercero
- [ ] ✅ Se pueden crear contactos
- [ ] ✅ Se pueden ver sitios del tercero

### 1.5 Comparación Bubble

- [ ] Rowcount terceros Bubble ≈ Supabase (±5%)
- [ ] Campos críticos migraron (nombre, ruc, email, telefono)
- [ ] `bubble_id` mappeo 1:1 (validar SELECT bubble_id, COUNT(*) ...)
- [ ] ⏳ Campos adicionales Bubble (si aplica) documentados en `BUBBLE_GAPS.md`

### 1.6 Permisos (RBAC)

- [ ] Planner: puede ver terceros ✅
- [ ] Admin: puede crear/editar terceros ✅
- [ ] Viewer: puede ver terceros pero no crear ✅

**Validar:** Logearse como cada rol, revisar acceso

---

## 2. Módulo: MAQUINARIA

### 2.1 Estructura

- [ ] Tabla `maquinaria` existe
- [ ] Tabla `maquinaria_modelos` existe
- [ ] Tabla `maquinaria_docs` existe
- [ ] FK: maquinaria.modelo_id → maquinaria_modelos.id ✅
- [ ] FK: maquinaria.tercero_id → terceros.id (si propietario='tercero') ✅

### 2.2 Campos Críticos

**Maquinaria:**
- [ ] id, tenant_id, nombre, placa, tipo, modelo_id, propietario, tercero_id, year
- [ ] UNIQUE: (tenant_id, placa)
- [ ] Valores de `tipo`: grúa, excavadora, vehículo, herramienta

**Maquinaria Modelos:**
- [ ] id, tenant_id, nombre, marca, capacidad

**Maquinaria Docs:**
- [ ] id, tenant_id, maquinaria_id, tipo_doc, numero_doc, fecha_vencimiento

### 2.3 Data Integrity

```sql
-- No hay modelos huérfanos
SELECT m.id, m.nombre FROM maquinaria m
WHERE m.modelo_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM maquinaria_modelos mm WHERE mm.id = m.modelo_id
);
-- Debe ser 0 filas

-- Si propietario='tercero', tercero_id debe existir
SELECT COUNT(*) FROM maquinaria
WHERE propietario='tercero' AND tercero_id IS NULL;
-- Debe ser 0
```

### 2.4 UI Validation

En `localhost:3000/admin/maquinaria`:
- [ ] ✅ Se carga lista de maquinaria
- [ ] ✅ Filtro por tipo funciona
- [ ] ✅ Se puede crear maquinaria
- [ ] ✅ Se pueden ver documentos (SOAT, RTV, etc.)
- [ ] ✅ Se pueden subir documentos nuevos

### 2.5 Comparación Bubble

- [ ] Rowcount maquinaria Bubble ≈ Supabase
- [ ] Placas migraron correctamente
- [ ] Modelos creados/migraron
- [ ] Docs (SOAT, RTV) migraron o están vacías (OK si vacías)

---

## 3. Módulo: TAREAS & PLANIFICACIÓN

### 3.1 Estructura

- [ ] Tabla `tareas` existe
- [ ] Tabla `tareas_recursos` existe
- [ ] Tabla `tareas_cotizacion_item` existe
- [ ] FK: tareas.tercero_id → terceros.id ✅
- [ ] FK: tareas.sitio_id → terceros_sitios.id ✅
- [ ] FK: tareas_recursos.tarea_id → tareas.id ✅
- [ ] FK: tareas_recursos.maquinaria_id / profile_id ✅

### 3.2 Campos Críticos

**Tareas:**
- [ ] id, tenant_id, numero_interno, titulo, tercero_id, sitio_id, fecha_inicio, fecha_fin
- [ ] estado (pendiente, en_progreso, completada, cancelada)
- [ ] UNIQUE: (tenant_id, numero_interno)

**Tareas Recursos:**
- [ ] id, tarea_id, tipo_recurso (maquinaria/personal), maquinaria_id OR profile_id

### 3.3 Data Integrity

```sql
-- No hay tareas sin tercero (suele ser requerido)
SELECT COUNT(*) FROM tareas WHERE tercero_id IS NULL;
-- Verificar si está OK (puede haber tareas internas)

-- No hay recursos apuntando a maquinaria/personal inexistente
SELECT COUNT(*) FROM tareas_recursos tr
WHERE (tr.tipo_recurso='maquinaria' AND tr.maquinaria_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM maquinaria m WHERE m.id = tr.maquinaria_id));
-- Debe ser 0

SELECT COUNT(*) FROM tareas_recursos tr
WHERE (tr.tipo_recurso='personal' AND tr.profile_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = tr.profile_id));
-- Debe ser 0
```

### 3.4 UI Validation

En `localhost:3000/planificacion`:
- [ ] ✅ Se carga agenda diaria
- [ ] ✅ Se puede crear tarea
- [ ] ✅ Se pueden asignar recursos (maquinaria, personal)
- [ ] ✅ Se pueden ver detalles de tarea
- [ ] ✅ Materialized view `mv_planificacion_diaria` está actualizada

En `localhost:3000/tareas`:
- [ ] ✅ Se carga lista de tareas
- [ ] ✅ Filtros funcionan (estado, fecha, tercero)

### 3.5 Comparación Bubble

- [ ] Rowcount tareas Bubble ≈ Supabase
- [ ] Números internos migraron (P001, P002, etc.)
- [ ] Fechas y terceros asociados correctos
- [ ] Recursos asignados migraron

---

## 4. Módulo: COTIZACIONES

### 4.1 Estructura

- [ ] Tabla `cotizaciones` existe
- [ ] Tabla `cotizaciones_detalle` existe
- [ ] Tabla `cotizaciones_ofertas` existe
- [ ] Tabla `cotizaciones_config` existe (singleton per tenant)
- [ ] FK: cotizaciones.tercero_id → terceros.id ✅
- [ ] FK: cotizaciones_detalle.cotizacion_id → cotizaciones.id (ON DELETE CASCADE) ✅

### 4.2 Campos Críticos

**Cotizaciones:**
- [ ] id, tenant_id, numero, tercero_id, fecha_emision, fecha_vencimiento, total, estado
- [ ] estado: borrador, enviada, aprobada, rechazada, facturada
- [ ] UNIQUE: (tenant_id, numero)

**Cotizaciones Detalle:**
- [ ] id, cotizacion_id, descripcion, cantidad, unidad, precio_unitario
- [ ] precio_negociado (agregado 2026-05-24)
- [ ] descuento, subtotal

**Cotizaciones Config:**
- [ ] tenant_id (PK), acepta_pin, pin_salt, plantilla_html
- [ ] 1 row por tenant (singleton pattern)

### 4.3 Data Integrity

```sql
-- Cada cotización tiene al menos 1 detalle
SELECT c.id, c.numero FROM cotizaciones c
WHERE NOT EXISTS (SELECT 1 FROM cotizaciones_detalle cd WHERE cd.cotizacion_id = c.id);
-- Verificar si está OK (borrador puede no tener detalles)

-- No hay detalles huérfanos
SELECT COUNT(*) FROM cotizaciones_detalle cd
WHERE NOT EXISTS (SELECT 1 FROM cotizaciones c WHERE c.id = cd.cotizacion_id);
-- Debe ser 0

-- Totales consistentes (suma de detalles = total)
SELECT id, numero FROM cotizaciones
WHERE total != (SELECT SUM(subtotal) FROM cotizaciones_detalle WHERE cotizacion_id = cotizaciones.id);
-- Verificar y ajustar si es necesario
```

### 4.4 UI Validation

En `localhost:3000/cotizaciones`:
- [ ] ✅ Se carga lista de cotizaciones
- [ ] ✅ Se pueden crear cotizaciones
- [ ] ✅ Se pueden editar detalles
- [ ] ✅ Se pueden generar PDFs
- [ ] ✅ Se puede cambiar estado (enviar, aprobar, etc.)
- [ ] ✅ Viewer puede ver pero no crear (RBAC)

### 4.5 Comparación Bubble

- [ ] Rowcount cotizaciones Bubble ≈ Supabase
- [ ] Números de cotización migraron correctamente
- [ ] Totales y subtotales correctos (verificar manuales)
- [ ] PDFs generados (si estaban almacenados)

---

## 5. Módulo: REPORTES (Jornada, Maquinaria, Personal)

### 5.1 Estructura

- [ ] Tabla `reportes_jornada` existe
- [ ] Tabla `reportes_maquinaria` existe
- [ ] Tabla `reportes_personal` existe
- [ ] FK: reportes_*.tarea_id → tareas.id (optional) ✅
- [ ] FK: reportes_maquinaria.maquinaria_id → maquinaria.id ✅
- [ ] FK: reportes_personal.personal_id → profiles.id ✅

### 5.2 Campos Críticos

**Reportes Jornada:**
- [ ] id, tenant_id, tarea_id, fecha, personal_id, observaciones, pdf_url, version_formato

**Reportes Maquinaria:**
- [ ] id, tenant_id, tarea_id, maquinaria_id, fecha, horas_utilizadas, tipo_uso

**Reportes Personal:**
- [ ] id, tenant_id, tarea_id, personal_id, fecha, tipo_personal (interno/externo), cargo_id

### 5.3 Data Integrity

```sql
-- No hay reportes con maquinaria inexistente
SELECT COUNT(*) FROM reportes_maquinaria rm
WHERE NOT EXISTS (SELECT 1 FROM maquinaria m WHERE m.id = rm.maquinaria_id);
-- Debe ser 0

-- No hay reportes de personal con personal inexistente
SELECT COUNT(*) FROM reportes_personal rp
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = rp.personal_id);
-- Debe ser 0
```

### 5.4 UI Validation

En `localhost:3000/reportes`:
- [ ] ✅ Se carga lista de reportes
- [ ] ✅ Filtro por fecha funciona
- [ ] ✅ Se pueden ver detalles de reporte
- [ ] ✅ PDFs se generan/descargan

### 5.5 Comparación Bubble

- [ ] Rowcount reportes Bubble ≈ Supabase
- [ ] Fechas migraron correctamente
- [ ] Horas y observaciones migraron
- [ ] PDFs accesibles (si estaban almacenados en Bubble)

---

## 6. Módulo: FINANZAS (Compras, Ventas, Valorizaciones, Pagos)

### 6.1 Estructura

- [ ] Tabla `movimientos_compra` existe
- [ ] Tabla `movimientos_venta` existe
- [ ] Tabla `valorizaciones` existe
- [ ] Tabla `pagos` existe
- [ ] FK: movimientos_*.tercero_id → terceros.id ✅
- [ ] FK: valorizaciones.cotizacion_id → cotizaciones.id ✅
- [ ] FK: pagos.valorizacion_id → valorizaciones.id ✅

### 6.2 Campos Críticos

**Movimientos Compra/Venta:**
- [ ] id, tenant_id, numero, tercero_id, fecha_emision, estado, subtotal, igv, total
- [ ] UNIQUE: (tenant_id, numero)

**Valorizaciones:**
- [ ] id, tenant_id, numero, tipo, tercero_id, tarea_id, cotizacion_id, fecha_emision, estado
- [ ] moneda (PEN, USD, etc.), subtotal, igv, total, pdf_url
- [ ] UNIQUE: (tenant_id, numero)

**Pagos:**
- [ ] id, tenant_id, numero, tipo (entrada/salida), tercero_id, valorizacion_id, fecha_pago, monto, moneda, metodo

### 6.3 Data Integrity

```sql
-- Movimientos tienen número único por tenant
SELECT tenant_id, numero, COUNT(*) 
FROM movimientos_compra 
GROUP BY tenant_id, numero 
HAVING COUNT(*) > 1;
-- Debe retornar 0 filas

-- Valorizaciones tienen tercero válido
SELECT COUNT(*) FROM valorizaciones v
WHERE NOT EXISTS (SELECT 1 FROM terceros t WHERE t.id = v.tercero_id);
-- Debe ser 0

-- Totales financieros consistentes
SELECT id FROM valorizaciones
WHERE total != COALESCE(subtotal, 0) + COALESCE(igv, 0);
-- Verificar y corregir
```

### 6.4 UI Validation

En `localhost:3000/admin/finanzas/compras`:
- [ ] ✅ Se carga lista de compras
- [ ] ✅ Se pueden crear compras
- [ ] ✅ Estados funciona (pendiente, recibida, facturada, pagada)

En `localhost:3000/admin/finanzas/valorizaciones`:
- [ ] ✅ Se carga lista de valorizaciones
- [ ] ✅ Se pueden crear valorizaciones
- [ ] ✅ Se pueden marcar como pagadas
- [ ] ✅ PDFs se generan

### 6.5 Comparación Bubble

- [ ] Rowcount movimientos Bubble ≈ Supabase
- [ ] Números de documento migraron
- [ ] Montos totales consistentes
- [ ] Estados migraron correctamente

---

## 7. Módulo: EPP

### 7.1 Estructura

- [ ] Tabla `epp_alertas` existe
- [ ] Tabla `epp_personal_config` existe
- [ ] FK: epp_alertas.personal_id → profiles.id ✅
- [ ] FK: epp_personal_config.cargo_id → personal_cargos.id ✅

### 7.2 Campos Críticos

**EPP Alertas:**
- [ ] id, tenant_id, personal_id, tipo_alerta (vencimiento, falta, daño), fecha_alerta, estado

**EPP Personal Config:**
- [ ] tenant_id, cargo_id, elementos_epp (array de strings), UNIQUE (tenant_id, cargo_id)

### 7.3 Data Integrity

```sql
-- Alertas de personal válido
SELECT COUNT(*) FROM epp_alertas ea
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ea.personal_id);
-- Debe ser 0
```

### 7.4 UI Validation

En `localhost:3000/admin/epp`:
- [ ] ✅ Se carga configuración de EPP por cargo
- [ ] ✅ Se pueden crear alertas
- [ ] ✅ Se ven alertas activas en dashboard

### 7.5 Comparación Bubble

- [ ] Configuraciones de EPP por cargo migraron
- [ ] Alertas históricas migraron (si aplica)

---

## 8. Módulo: INSPECCIONES

### 8.1 Estructura

- [ ] Tabla `inspecciones` existe
- [ ] Tabla `inspecciones_detalles` existe
- [ ] FK: inspecciones.recurso_id → maquinaria.id ✅
- [ ] FK: inspecciones_detalles.inspeccion_id → inspecciones.id (ON DELETE CASCADE) ✅

### 8.2 Campos Críticos

**Inspecciones:**
- [ ] id, tenant_id, tipo (preventiva, correctiva, audit), recurso_id, personal_id, fecha_inspeccion, estado

**Inspecciones Detalles:**
- [ ] id, inspeccion_id, pregunta, respuesta (booleano), observaciones

### 8.3 Data Integrity

```sql
-- No hay inspecciones de recurso inexistente
SELECT COUNT(*) FROM inspecciones i
WHERE i.recurso_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM maquinaria m WHERE m.id = i.recurso_id);
-- Debe ser 0
```

### 8.4 UI Validation

En `localhost:3000/inspecciones`:
- [ ] ✅ Se carga lista de inspecciones
- [ ] ✅ Se pueden crear inspecciones
- [ ] ✅ Se pueden responder preguntas
- [ ] ✅ Se pueden ver detalles

### 8.5 Comparación Bubble

- [ ] Rowcount inspecciones Bubble ≈ Supabase
- [ ] Preguntas y respuestas migraron

---

## 9. Módulo: PLANES DE ACCIÓN

### 9.1 Estructura

- [ ] Tabla `planes_accion` existe
- [ ] Tabla `planes_accion_tareas` existe
- [ ] FK: planes_accion_tareas.plan_id → planes_accion.id (ON DELETE CASCADE) ✅
- [ ] FK: planes_accion_tareas.tarea_id → tareas.id (optional) ✅

### 9.2 Campos Críticos

**Planes Acción:**
- [ ] id, tenant_id, numero, titulo, estado (abierto, en_progreso, cerrado), responsable_id, fecha_vencimiento

**Planes Acción Tareas:**
- [ ] id, plan_id, tarea_id (optional), descripcion, estado, responsable_id, fecha_limite

### 9.3 Data Integrity

```sql
-- No hay tareas de plan inexistente
SELECT COUNT(*) FROM planes_accion_tareas pat
WHERE NOT EXISTS (SELECT 1 FROM planes_accion pa WHERE pa.id = pat.plan_id);
-- Debe ser 0
```

### 9.4 UI Validation

En `localhost:3000/planes-accion`:
- [ ] ✅ Se carga lista de planes
- [ ] ✅ Se pueden crear planes
- [ ] ✅ Se pueden agregar tareas a planes
- [ ] ✅ Filtro por estado funciona

### 9.5 Comparación Bubble

- [ ] Rowcount planes Bubble ≈ Supabase
- [ ] Estados migraron (abierto, en progreso, cerrado)

---

## 10. Módulo: FORMATOS (Dinámicos)

### 10.1 Estructura

- [ ] Tabla `formatos_preguntas` existe
- [ ] Tabla `formatos_informes` existe
- [ ] Tabla `formatos_respuestas` existe
- [ ] FK: formatos_respuestas.formato_informe_id → formatos_informes.id (ON DELETE CASCADE) ✅

### 10.2 Campos Críticos

**Formatos Preguntas:**
- [ ] id, tenant_id, nombre_formato, numero_pregunta, pregunta, tipo_respuesta
- [ ] UNIQUE: (tenant_id, nombre_formato, numero_pregunta)

**Formatos Informes:**
- [ ] id, tenant_id, nombre_formato, correlativo, tarea_id, personal_id, fecha_informe, estado
- [ ] UNIQUE: (tenant_id, nombre_formato, correlativo)

**Formatos Respuestas:**
- [ ] id, formato_informe_id, pregunta_id, respuesta_* (texto, número, booleano, foto, firma)

### 10.3 Data Integrity

```sql
-- Respuestas pertenecen a informes válidos
SELECT COUNT(*) FROM formatos_respuestas fr
WHERE NOT EXISTS (SELECT 1 FROM formatos_informes fi WHERE fi.id = fr.formato_informe_id);
-- Debe ser 0

-- Informes tienen al menos 1 respuesta (si completo)
SELECT fi.id FROM formatos_informes fi
WHERE fi.estado='completo'
  AND NOT EXISTS (SELECT 1 FROM formatos_respuestas fr WHERE fr.formato_informe_id = fi.id);
-- Verificar si está OK (borrador puede no tener respuestas)
```

### 10.4 UI Validation

En `localhost:3000/formatos`:
- [ ] ✅ Se cargan formatos disponibles
- [ ] ✅ Se pueden completar formatos
- [ ] ✅ Se pueden subir fotos
- [ ] ✅ Se pueden capturar firmas
- [ ] ✅ Se generan PDFs

### 10.5 Comparación Bubble

- [ ] Rowcount preguntas + informes Bubble ≈ Supabase
- [ ] Preguntas migraron con tipos correctos
- [ ] Respuestas migraron

---

## 11. Módulo: PERMISOS (RBAC)

### 11.1 Estructura

- [ ] Tabla `cargo_permisos` existe
- [ ] Tabla `sistema_recursos` existe
- [ ] FK: cargo_permisos.cargo_id → job_titles.id ✅
- [ ] FK: cargo_permisos.recurso_id → sistema_recursos.id ✅

### 11.2 Campos Críticos

**Cargo Permisos:**
- [ ] id, tenant_id, cargo_id, recurso_id, puede_ver, puede_crear, puede_editar, puede_eliminar
- [ ] UNIQUE: (tenant_id, cargo_id, recurso_id)

**Sistema Recursos:**
- [ ] id, tenant_id, nombre (cotizaciones, tareas, reportes, etc.), descripcion

### 11.3 Data Integrity

```sql
-- Cada cargo tiene permisos configurados
SELECT jt.id, jt.nombre FROM job_titles jt
WHERE NOT EXISTS (SELECT 1 FROM cargo_permisos cp WHERE cp.cargo_id = jt.id);
-- Verificar si está OK (algunos cargos pueden no tener permisos explícitos)

-- Recursos existen
SELECT COUNT(*) FROM cargo_permisos cp
WHERE NOT EXISTS (SELECT 1 FROM sistema_recursos sr WHERE sr.id = cp.recurso_id);
-- Debe ser 0
```

### 11.4 UI Validation

En `localhost:3000/admin/permisos`:
- [ ] ✅ Se cargan permisos por cargo
- [ ] ✅ Se pueden editar permisos (solo admin)
- [ ] ✅ Cambios se aplican inmediatamente

### 11.5 Validation de RBAC en Acción

- [ ] ✅ Planner: puede ver cotizaciones pero NO crear ni editar
- [ ] ✅ Admin: puede crear, editar, eliminar todo
- [ ] ✅ Viewer: puede ver todo pero NO crear ni editar
- [ ] ✅ Supervisor: permisos limitados según configuración

---

## 12. Autenticación & Usuarios

### 12.1 Validaciones

- [ ] ✅ E2E Planner puede logearse
- [ ] ✅ E2E Admin puede logearse
- [ ] ✅ E2E Viewer puede logearse
- [ ] ✅ 3 contextos Playwright generan `.auth/{planner,admin,viewer}.json`
- [ ] ✅ Refresh token se rota correctamente
- [ ] ✅ Session persiste entre páginas

### 12.2 RLS Validation

- [ ] ✅ Planner no puede ver data de otro tenant
- [ ] ✅ Admin ve solo su tenant
- [ ] ✅ Viewer ve solo su tenant
- [ ] ✅ Direct SQL queries respetan tenant_id from JWT

### 12.3 UI Validation

En `localhost:3000/login`:
- [ ] ✅ Logueo funciona
- [ ] ✅ Redirect a dashboard OK
- [ ] ✅ Logout funciona
- [ ] ✅ Session timeout funciona

---

## 13. Performance & Optimization

### 13.1 Query Performance

```sql
-- Top 10 queries más lentas
-- Ver en Supabase > SQL Editor > Logs
-- Buscar queries con duration > 100ms
```

- [ ] ✅ Queries < 100ms (p95)
- [ ] ✅ Índices creados en columnas FK
- [ ] ✅ Índices en campos de búsqueda (nombre, email, etc.)
- [ ] ✅ Materialized views actualizadas

### 13.2 Database Size

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

- [ ] ✅ Tamaño total de BD < 500MB
- [ ] ✅ Tablas grandes (reportes, formatos_respuestas) tienen índices

### 13.3 Storage Performance

- [ ] ✅ PDFs se generan en < 5 segundos
- [ ] ✅ Fotos se cargan en < 2 segundos
- [ ] ✅ Firmas se capturan sin error

---

## 14. E2E Tests

### 14.1 Smoke Tests

```bash
npm run test:e2e:smoke
```

- [ ] ✅ 18/18 smoke tests en verde
- [ ] ✅ Todas las rutas del sidebar cargan
- [ ] ✅ No hay errores 500

### 14.2 Full Suite

```bash
npm run test:e2e
```

- [ ] ✅ 347+/374 tests en verde (95%+)
- [ ] ✅ Todos los módulos cubiertos
- [ ] ✅ Viewer auth tests pasan (post-TTL increase)
- [ ] ✅ No hay flaky tests

### 14.3 Test de Modules Específicos

```bash
npm run test:e2e -- --grep "@critical"
npm run test:e2e:planner
npm run test:e2e:admin
npm run test:e2e:viewer
```

- [ ] ✅ Flow 02 Tarea con recursos
- [ ] ✅ Flow 06 Ver reportes
- [ ] ✅ Flow 10 Terceros CRUD
- [ ] ✅ Flow 12 Cotizaciones + roles
- [ ] ✅ Flow 13 Planes de acción
- [ ] ✅ Flow 15 Ventas
- [ ] ✅ Flow 16 Compras

---

## 15. Final Checklist (Pre-Producción)

- [ ] ✅ Todas las tablas 50+ creadas
- [ ] ✅ Todos los campos mapeados
- [ ] ✅ RLS policies activas y validadas
- [ ] ✅ Data integridad validada (FK, constraints)
- [ ] ✅ Bubble data 100% migrada
- [ ] ✅ E2E smoke 18/18 en verde
- [ ] ✅ E2E full suite 347+/374 en verde (95%+)
- [ ] ✅ Performance < 100ms (p95)
- [ ] ✅ Usuarios pueden logearse (planner, admin, viewer)
- [ ] ✅ Todos los módulos funcionales en UI
- [ ] ✅ No hay errores en Sentry (últimas 24h)
- [ ] ✅ Storage buckets accesibles y seguros
- [ ] ✅ Backup de datos realizado
- [ ] ✅ Documentación actualizada

---

**Última actualización:** 2026-07-12  
**Total de checklists:** 15 módulos + infraestructura + tests + performance  
**Estado:** ✅ Listo para usar durante recuperación
