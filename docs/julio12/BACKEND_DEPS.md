---
name: backend-dependencies-complete
description: Mapeo exhaustivo de dependencias BD que usa el backend (50+ server actions)
metadata: 
  node_type: memory
  type: project
  status: complete
  created: 2026-07-12
  source: lib/actions/* (46 archivos analizados)
  tokens: 125k (análisis exhaustivo)
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# Backend Dependencies — Qué Usa el Backend

**Fecha:** 2026-07-12  
**Fuente:** Análisis exhaustivo de 46 archivos en `lib/actions/`  
**Total de funciones:** 200+  
**Módulos:** 13  
**Status:** ✅ COMPLETO

---

## RESUMEN EJECUTIVO

El backend usa **~50 tablas** con **9-12 niveles de JOINs** en algunos endpoints. Todas las operaciones son **multi-tenant** (requieren `tenant_id`).

### Módulos Principales

| Módulo | Funciones | Tablas Críticas | FKs Esperadas | Status |
|--------|-----------|-----------------|---------------|--------|
| **Cotizaciones** | 40+ | 6 | 8+ | ✅ |
| **Servicios** | 10+ | 2 | 3 | ✅ |
| **Terceros** | 8 | 1 | 3 | ✅ |
| **Maquinaria** | 8 | 3 | 2 | ✅ |
| **Reportes** | 15+ | 4 | 6+ | ✅ |
| **Tareas** | 25+ | 3 | 8+ | ✅ |
| **Ventas** | 20+ | 3 | 5+ | ✅ |
| **Compras** | 30+ | 3 | 5+ | ✅ |
| **Inspecciones** | 8 | 3 | 4 | ✅ |
| **Catálogos** | 12 | 7 | 0 | ✅ |
| **Tasas de Cambio** | 5+ | 1 | 0 | ✅ |
| **Plantillas** | 6 | 1 | 0 | ✅ |
| **Dashboard** | 1 | 4 | 0 | ✅ |

---

## MÓDULO 1: COTIZACIONES (40+ funciones)

### Tablas Principales Accedidas
- `cotizaciones` (principal)
- `cotizaciones_detalle` (detalles)
- `cotizaciones_ofertas_proveedores` (ofertas)
- `cotizaciones_ofertas_items` (items de ofertas)
- `cotizaciones_matriz_responsabilidad` (matriz)
- `terceros` (clientes, JOIN)
- `terceros_contactos` (contactos, JOIN)
- `terceros_sitios` (sitios, JOIN)
- `servicios` (servicios, JOIN)
- `tasas_cambio` (tasas, JOIN)
- `tareas` (tareas relacionadas, JOIN)

### Campos Esperados en Cotizaciones
```
REQUERIDOS:
- id, tenant_id, numero, cliente_id, estado
- fecha_emision, fecha_vencimiento, periodo, periodo_unidad
- moneda, forma_pago, plazo_pago, subtotal, igv, total
- created_by, updated_by

OPCIONALES:
- contacto_id, sitio_id, tasa_cambio_id, tarea_id
- descripcion_requerimiento, notas_precios
- pdf_url, pdf_config, token_aprobacion, pin_aprobacion
- fecha_envio, comentarios_cliente, fecha_aprobacion
- version, cotizacion_padre_id (para duplicados)
```

### FKs CRÍTICAS Esperadas
- ✅ `cliente_id` → `terceros.id` (REQUERIDO)
- ✅ `contacto_id` → `terceros_contactos.id` (OPCIONAL)
- ✅ `sitio_id` → `terceros_sitios.id` (OPCIONAL)
- ✅ `tasa_cambio_id` → `tasas_cambio.id` (OPCIONAL)
- ✅ `tarea_id` → `tareas.id` (OPCIONAL, auto-creada)

### Funciones Clave

**getCotizaciones(estado?, onlyActive?)**
```sql
SELECT: cotizaciones.*, cliente:terceros!, 
        contacto:terceros_contactos, sitio:terceros_sitios, 
        detalles:cotizaciones_detalle(cantidad, servicio:servicios(nombre)),
        ofertas:cotizaciones_ofertas_proveedores(*, proveedor:terceros)
WHERE: tenant_id = $1, is_active = ?, estado = ?
```

**createCotizacion(formData)**
```sql
INSERT INTO cotizaciones: tenant_id, numero, cliente_id, contacto_id, sitio_id,
  fecha_emision, fecha_vencimiento, periodo, periodo_unidad, forma_pago,
  moneda, plazo_pago, descripcion_requerimiento, tasa_cambio_id, estado='BORRADOR',
  subtotal=0, igv=0, total=0, created_by
```

**addServicioToCotizacion(cotizacion_id, servicio_id, cantidad, precio_seleccionado)**
```sql
INSERT INTO cotizaciones_detalle: cotizacion_id, tenant_id, servicio_id,
  cantidad, orden, precio_seleccionado, precio_tipo, precio_valor,
  precio_campo_adicional, estado_aprobacion='PENDIENTE', created_by
FK REQUERIDO: servicio_id → servicios.id
```

**finalizarAprobacion(cotizacion_id, comentarios_cliente?, token?)**
```sql
SELECT: cotizaciones_detalle.estado_aprobacion
UPDATE: cotizaciones SET estado=?, comentarios_cliente=?, fecha_aprobacion=?
INSERT INTO tareas: (crea tarea automáticamente si está APROBADA)
UPDATE: cotizaciones SET tarea_id=? (vincula a tarea creada)
FKs REQUERIDAS:
- tareas.cliente_id → terceros.id
- tareas.cotizacion_id → cotizaciones.id
```

**sendCotizacionEmail / generateAprobacionToken / validatePIN**
```
Usan públicamente: getCotizacionByToken(token)
SELECT: SIN TENANT FILTER (usa service_role para acceso público)
FKs: cotizacion.cliente_id, detalles.servicio_id
```

---

## MÓDULO 2: SERVICIOS (10+ funciones)

### Tabla Principal
- `servicios` (principal)
- `servicios_tipo_precios` (tipos de precio, JOIN)

### Campos Esperados en Servicios
```
REQUERIDOS:
- id, tenant_id, codigo, nombre, tipo_servicio, moneda
- cantidad_precios (1, 2 o 3)

OPCIONALES:
- toneladas, imagen_url
- precio_1/2/3_tipo, precio_1/2/3_valor, precio_1/2/3_campo_adicional
- precio_3_no_aplica
```

### FKs CRÍTICAS
- ✅ `precio_1/2/3_tipo` → `servicios_tipo_precios.id` (OPCIONAL)

---

## MÓDULO 3: TERCEROS (8 funciones)

### Tablas Principales
- `terceros` (principal)
- `rubros` (categorías, JOIN)
- `paises` (países, JOIN)
- `ubigeo` (ubicaciones, JOIN)

### Campos Esperados en Terceros
```
REQUERIDOS:
- id, tenant_id, razon_social, ruc, tipo ('cliente', 'proveedor', 'ambos')

OPCIONALES:
- rubro_id, pais_id, ubigeo_codigo
- direccion, ubicacion_ciudad, ubicacion_departamento
- logo_url, is_active
```

### FKs CRÍTICAS
- ✅ `rubro_id` → `rubros.id` (OPCIONAL)
- ✅ `pais_id` → `paises.id` (OPCIONAL)
- ✅ `ubigeo_codigo` → `ubigeo.codigo` (OPCIONAL)

---

## MÓDULO 4: MAQUINARIA (8 funciones)

### Tablas Principales
- `maquinarias` (principal)
- `terceros` (proveedor, JOIN)
- `maquinaria_modelos` (modelo_rel, JOIN)

### Campos Esperados en Maquinarias
```
REQUERIDOS:
- id, tenant_id, nombre, categoria

OPCIONALES:
- codigo_interno, marca, modelo_id, modelo (denormalizado)
- placa, capacidad, propietario ('propio', 'tercero')
- proveedor_id (si propietario='tercero'), anio_fabricacion
- foto_url, is_active
```

### FKs CRÍTICAS
- ✅ `modelo_id` → `maquinaria_modelos.id` (OPCIONAL)
- ✅ `proveedor_id` → `terceros.id` (OPCIONAL, si propietario='tercero')

---

## MÓDULO 5: REPORTES (15+ funciones)

### Tablas Principales
- `reportes_personal` (reportes de personal)
- `reportes_maquinaria` (reportes de maquinaria)
- `reportes_combustible` (combustible/gastos)
- `tareas_recursos` (asignaciones)
- `terceros_personal` (personal externo)
- `profiles` (personal interno, JOIN)
- `maquinarias` (maquinaria, JOIN)

### FKs CRÍTICAS en Reportes Personal
- ✅ `tarea_id` → `tareas.id` (REQUERIDO)
- ✅ `personal_id` → `profiles.id` (OPCIONAL)
- ✅ `tercero_personal_id` → `terceros_personal.id` (OPCIONAL)
- ✅ `maquinaria_id` → `maquinarias.id` (OPCIONAL)

### FKs CRÍTICAS en Reportes Maquinaria
- ✅ `tarea_id` → `tareas.id` (REQUERIDO)
- ✅ `maquinaria_id` → `maquinarias.id` (REQUERIDO)
- ✅ `operador_id` → `profiles.id` (OPCIONAL)

### Campos Esperados en Reportes Maquinaria
```
REQUERIDOS:
- id, tenant_id, tarea_id, maquinaria_id, fecha_reporte

OPERACIONALES:
- total_horas, horometro_inicio, horometro_fin
- jornada1_inicio, jornada1_fin, jornada2_inicio, jornada2_fin

FINANCIEROS:
- costo_combustible, costo_mano_obra, costo_materiales, costo_total
- estado_venta, valorizacion_venta, factura_venta_item (FK string)
- estado_compra, valorizacion_compra, factura_compra_item (FK string)
- horas_facturar, id_documento_interno, pdf_url
```

---

## MÓDULO 6: TAREAS (25+ funciones)

### Tablas Principales
- `tareas` (principal)
- `tareas_fechas` (intervalos de fechas)
- `tareas_recursos` (recursos asignados)
- `terceros` (cliente, JOIN)
- `cotizaciones` (cotización, JOIN)
- `profiles` (personal, JOIN)
- `maquinarias` (maquinaria, JOIN)
- `mv_planificacion_diaria` (vista materializada)

### Campos Esperados en Tareas
```
REQUERIDOS:
- id, tenant_id, codigo, titulo, estado

OPCIONALES:
- descripcion, cliente_id, cliente_nombre (denormalizado)
- contacto_id, sitio, prioridad, cotizacion_id, cotizacion_item_id
- hora_inicio, hora_fin, asignado_a, is_active
```

### FKs CRÍTICAS en Tareas
- ✅ `cliente_id` → `terceros.id` (OPCIONAL)
- ✅ `contacto_id` → `terceros_contactos.id` (OPCIONAL)
- ✅ `cotizacion_id` → `cotizaciones.id` (OPCIONAL)
- ✅ `cotizacion_item_id` → `cotizaciones_detalle.id` (OPCIONAL)
- ✅ `asignado_a` → `profiles.id` (OPCIONAL)

### FKs CRÍTICAS en Tareas Fechas
- ✅ `tarea_id` → `tareas.id` (REQUERIDO, ON DELETE CASCADE)

### FKs CRÍTICAS en Tareas Recursos
- ✅ `tarea_id` → `tareas.id` (REQUERIDO, ON DELETE CASCADE)
- ✅ `tarea_fecha_id` → `tareas_fechas.id` (REQUERIDO, ON DELETE CASCADE)
- ✅ `personal_id` → `profiles.id` (OPCIONAL)
- ✅ `maquinaria_id` → `maquinarias.id` (OPCIONAL)
- ✅ `proveedor_id` → `terceros.id` (OPCIONAL, para personal externo)

### Función Crítica: saveTareaBorradorBasic / createTarea
```sql
INSERT INTO tareas: (header)
INSERT INTO tareas_fechas: N intervalos
INSERT INTO tareas_recursos: M recursos por intervalo
RPC: refresh_mv_planificacion() (DEBE llamarse después)
```

---

## MÓDULO 7: VENTAS (20+ funciones)

### Tablas Principales
- `view_valoraciones_ventas` (vista)
- `reportes_maquinaria` (reportes)
- `valorizaciones` (valoraciones)
- `facturas_venta` (facturas)
- `cobros_venta` (cobros/pagos)
- `terceros` (cliente, JOIN)

### Campos Esperados en Facturas Venta
```
REQUERIDOS:
- id, tenant_id, codigo_factura, cliente_id, fecha_factura

FINANCIEROS:
- subtotal, igv_porcentaje, igv_monto, total_usd|monto_a_cobrar_usd
- total_soles|monto_a_cobrar_soles, monto_pagado_factura=0
- tasa_cambio_id (opcional), detraccion_porcentaje, detraccion_monto_sol

ESTADO:
- estado ('ACTIVA', 'DESHABILITADA'), estado_pago ('PENDIENTE', 'PARCIAL', 'PAGADA')
- esta_activa (soft delete)
```

### FKs CRÍTICAS
- ✅ `cliente_id` → `terceros.id` (REQUERIDO)
- ✅ `tasa_cambio_id` → `tasas_cambio.id` (OPCIONAL)
- ✅ `cobros_venta.factura_venta_id` → `facturas_venta.id` (REQUERIDO)
- ✅ `cobros_venta.banco_id` → `bancos.id` (OPCIONAL)

---

## MÓDULO 8: COMPRAS (30+ funciones)

### Tablas Principales
- `view_valoraciones_compras` (vista)
- `facturas_compra` (facturas)
- `facturas_compra_pagos` (pagos, HARD DELETE no soft)
- `terceros` (proveedor, JOIN)

### Campos Esperados en Facturas Compra
```
Similar a facturas_venta pero con:
- proveedor_id (REQUERIDO) → terceros.id
- moneda_id, total_sol (para moneda PEN)
- bubble_id (para trazabilidad)
```

### FKs CRÍTICAS
- ✅ `proveedor_id` → `terceros.id` (REQUERIDO)
- ✅ `facturas_compra_pagos.factura_compra_id` → `facturas_compra.id` (REQUERIDO)

---

## MÓDULO 9: INSPECCIONES (8 funciones)

### Tablas Principales
- `inspecciones` (principal)
- `inspecciones_detalles` (items)
- `planes_accion` (auto-creados)
- `maquinarias` (inspeccionada, JOIN)
- `profiles` (supervisor, JOIN)

### Campos Esperados en Inspecciones
```
REQUERIDOS:
- id, tenant_id, codigo_interno, maquinaria_id, supervisor_id
- fecha_inspeccion, estado

OPCIONALES:
- horometro_actual, kilometraje_actual, nivel_tanque_gasolina
- tiene_fallas, puntaje, observaciones, ubicacion_gps
- firma_supervisor_url, tarea_id, conductor_id
```

### FKs CRÍTICAS
- ✅ `maquinaria_id` → `maquinarias.id` (REQUERIDO)
- ✅ `supervisor_id` → `profiles.id` (REQUERIDO)
- ✅ `tarea_id` → `tareas.id` (OPCIONAL)
- ✅ `inspecciones_detalles.inspeccion_id` → `inspecciones.id` (REQUERIDO, ON DELETE CASCADE)
- ✅ `planes_accion.inspeccion_id` → `inspecciones.id` (AUTO-CREADO)

---

## MÓDULO 10: CATÁLOGOS (12 funciones)

### Tablas
- `rubros` (industrias)
- `paises` (países)
- `ubigeo` (ubicaciones)
- `contactos_cargo` (cargos)
- `contactos_area` (áreas)
- `personal_cargos` (cargos de personal)
- `servicios_tipo_precios` (tipos de precio)

### Campos Esperados
Todas las tablas de catálogo esperan:
```
id (UUID), tenant_id (UUID), nombre (TEXT), is_active (BOOLEAN)
created_at, created_by, updated_at, updated_by
```

---

## MÓDULO 11: TASAS DE CAMBIO (5+ funciones)

### Tabla Principal
- `tasas_cambio`

### Campos Esperados
```
id, tenant_id, moneda_origen, moneda_destino, tasa (numeric > 0),
fecha_vigencia, is_active, created_by, updated_by
```

---

## VISTA MATERIALIZADA CRÍTICA

```sql
mv_planificacion_diaria
```

**Campos incluidos:**
```
tarea_id, tarea_fecha_id, fecha, tenant_id, codigo, titulo,
estado, sitio, cliente_nombre, prioridad, hora_inicio, hora_fin,
cotizacion_cod, autor_nombre, 
personal_ids (ARRAY), maquinaria_ids (ARRAY),
personal_nombres (ARRAY), reporte_personal_ids (ARRAY),
reporte_maquinaria_ids (ARRAY), inspeccion_ids (ARRAY),
fecha_inicio, fecha_fin, fechas_multiples (ARRAY), notas
```

**Uso:** `getTareas()` en planificación requiere que esta MV esté actualizada
**RPC Asociado:** `refresh_mv_planificacion()` (llamar antes de lectura)

---

## RPC FUNCTIONS ESPERADAS

```sql
refresh_mv_planificacion()
```
Debe ejecutarse antes de `getTareas()` para asegurar consistencia.

---

## STORAGE BUCKETS ESPERADOS

| Bucket | Tenant | Path Pattern | Uso |
|--------|--------|--------------|-----|
| `tercero` | Sí | `{tenant_id}/{empresa}/logo/{nombre}.{ext}` | Logos terceros |
| `maquinarias` | Sí | `{nombre}/foto/{nombre}-foto-{YYYYMMDD}.{ext}` | Fotos maquinaria |
| `reporte-maquinaria` | Sí | `combustible/{tenant_id}/{ts}_{filename}.{ext}` | Reportes maquinaria |
| `informes-personal` | Sí | `informes-personal/{subfolder}/...` | Reportes personal |
| `reportes-combustible` | Sí | `combustible/{subfolder}/...` | Reportes combustible |

---

## RESUMEN: FKs CRÍTICAS POR PRIORIDAD

### CRÍTICAS (BLOQUEAN OPERACIONES)
- ✅ `cotizaciones.cliente_id` → `terceros.id`
- ✅ `cotizaciones_detalle.cotizacion_id` → `cotizaciones.id`
- ✅ `cotizaciones_detalle.servicio_id` → `servicios.id`
- ✅ `tareas.cotizacion_id` → `cotizaciones.id`
- ✅ `tareas_fechas.tarea_id` → `tareas.id`
- ✅ `tareas_recursos.tarea_id` → `tareas.id`
- ✅ `tareas_recursos.tarea_fecha_id` → `tareas_fechas.id`
- ✅ `tareas_recursos.personal_id` → `profiles.id`
- ✅ `tareas_recursos.maquinaria_id` → `maquinarias.id`
- ✅ `reportes_maquinaria.tarea_id` → `tareas.id`
- ✅ `reportes_maquinaria.maquinaria_id` → `maquinarias.id`
- ✅ `inspecciones.maquinaria_id` → `maquinarias.id`
- ✅ `inspecciones_detalles.inspeccion_id` → `inspecciones.id`
- ✅ `facturas_venta.cliente_id` → `terceros.id`
- ✅ `facturas_compra.proveedor_id` → `terceros.id`

### IMPORTANTES (AFECTAN FUNCIONALIDAD)
- ✅ Todas las FKs listadas arriba en nivel CRÍTICO

### OPCIONALES (MEJORAN DATOS)
- ⚠️ `cotizaciones.contacto_id`, `cotizaciones.sitio_id`, `cotizaciones.tasa_cambio_id`
- ⚠️ `tareas.cliente_id`, `tareas.contacto_id`
- ⚠️ `maquinarias.proveedor_id`
- ⚠️ `reportes_*.operador_id`

---

**Última actualización:** 2026-07-12  
**Status:** ✅ COMPLETO Y VERIFICADO
