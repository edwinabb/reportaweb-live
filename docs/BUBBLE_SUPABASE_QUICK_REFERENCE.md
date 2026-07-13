# Bubble ↔ Supabase: Quick Reference Tables

**Objetivo:** Consulta rápida para desarrolladores y migradores.  
**Fecha:** 2026-07-12

---

## COTIZACIONES: Mapeo de Campos

| # | Bubble | Tipo | Supabase | Tipo | Status | Notas |
|---|--------|------|----------|------|--------|-------|
| 1 | `_id` | TEXT | `id` | UUID | ✓ Migrado | PK renombrada |
| 2 | `Codigo` | TEXT | `numero` | TEXT | ✓ Migrado | Identificador público |
| 3 | `cliente_id` | TEXT | `cliente_id` | UUID | ✓ Migrado | FK normalizada |
| 4 | `contacto_id` | TEXT | `contacto_id` | UUID | ✓ Migrado | FK a terceros_contactos |
| 5 | `sitio_id` | TEXT | `sitio_id` | UUID | ✓ Migrado | FK a terceros_sitios |
| 6 | `Descripcion General` | TEXT | `descripcion_requerimiento` | TEXT | ✓ Migrado | Nuevo nombre |
| 7 | `Fecha Solicitud` | DATE | `fecha_emision` | DATE | ✓ Migrado | Renamed |
| 8 | `Fecha Planificada` | DATE | `fecha_inicio_estimada` | DATE | ~ Parcial | Nuevo campo Supabase |
| 9 | `fecha_aprobacion` | DATE | `fecha_aprobacion` | TIMESTAMPTZ | ✓ Migrado | Con zona horaria |
| 10 | `Estado` | TEXT | `estado` | ENUM | ✓ Migrado | Valores normalizados |
| 11 | `Archivo_web` | URL | `pdf_url` | TEXT | ✗ **GAP** | En S3 AWS, no en Supabase Storage |
| 12 | `Archivo_nombre` | TEXT | — | — | ✗ Faltante | Podría guardarse en metadata |
| 13 | `Observaciones precios` | LONGTEXT | `notas_precios` | TEXT | ✓ Migrado | Renamed |
| 14 | `Observaciones MR` | TEXT | — | — | ✗ Faltante | Posiblemente redundante |
| 15 | `forma_pago` | FK | `forma_pago` | TEXT | ✓ Migrado | Simplified |
| 16 | `moneda` | ENUM | `moneda` | ENUM | ✓ Migrado | PEN/USD |
| 17 | `Id Plazo de Pago` | FK | `plazo_pago` | TEXT | ✓ Migrado | Simplified |
| 18 | `Periodo Cantidad` | NUMBER | `periodo` | INT | ✓ Migrado | Renamed |
| 19 | `Periodo Unidad` | ENUM | `periodo_unidad` | ENUM | ✓ Migrado | DIA/MES |
| 20 | `Lista Items Incluidos` | ARRAY(FK) | → `cotizaciones_detalle[]` | Relation | ✓ Migrado | Tabla separada |
| 21 | `Lista Items Matriz Responsabilidad` | ARRAY(FK) | → `matriz_responsabilidad[]` | Relation | ✓ Migrado | Tabla separada |
| 22 | `tenant_id` | TEXT | `tenant_id` | UUID | ✓ Migrado | FK a companies |
| 23 | `Created By` | TEXT | `created_by` | UUID | ✓ Migrado | FK a auth.users |
| 24 | `Created Date` | DATE | `created_at` | TIMESTAMPTZ | ✓ Migrado | Con zona horaria |
| 25 | `Modified Date` | DATE | `updated_at` | TIMESTAMPTZ | ✓ Migrado | Con zona horaria |
| — | `Fecha Solicitud_Año` | INT | — | — | — | **DEPRECATED**: Calcular con DATE_PART |
| — | `Fecha Solicitud_Mes` | INT | — | — | — | **DEPRECATED**: Calcular con DATE_PART |
| — | `Fecha Solicitud_Semana` | INT | — | — | — | **DEPRECATED**: Calcular con DATE_TRUNC |
| — | `Tab` | NUMBER | — | — | — | **DEPRECATED**: Legacy UI |
| — | `Slug` | TEXT | — | — | — | **DEPRECATED**: Generar en frontend |
| — | `con_informe` | BOOLEAN | — | — | — | **DEPRECATED**: Calcular con EXISTS |
| — | `cotizacion_configuracion_id` | FK | — | — | — | **DEPRECATED**: Legacy config |
| — | `Lista Temporal Items - Chequear` | ARRAY | — | — | — | **DEPRECATED**: Para migración |

**Resumen:** 20/25 campos ✓ migrados, 3 gaps críticos (Archivo_web), 5 deprecated.

---

## TAREAS: Mapeo de Campos

| # | Bubble | Tipo | Supabase | Tipo | Status | Notas |
|---|--------|------|----------|------|--------|-------|
| 1 | `_id` | TEXT | `id` | UUID | ✓ Migrado | PK |
| 2 | `titulo` | TEXT | `titulo` | TEXT | ✓ Migrado | Nombre de tarea |
| 3 | `codigo` | TEXT | `codigo` | TEXT | ~ Parcial | Código único |
| 4 | `comentarios` | LONGTEXT | → `tareas_comentarios[]` | Relation | ✓ Migrado | Tabla separada |
| 5 | `id_cotizacion` | FK | `cotizacion_id` | UUID | ✓ Migrado | FK a cotizaciones |
| 6 | `id_cliente` | FK | `cliente_id` | UUID | ✓ Migrado | FK a terceros |
| 7 | `id_empresa` | FK | `tenant_id` | UUID | ✓ Migrado | FK a companies |
| 8 | `Progreso % - NUEVA 27-08` | NUMBER | `progreso_porcentaje` | INT | ✗ **GAP** | Nuevo campo a crear |
| 9 | `prioridad` | ENUM | `prioridad` | ENUM | ✓ Migrado | ALTA/MEDIA/BAJA |
| 10 | `lista_maquinaria` | ARRAY(FK) | → `tareas_maquinarias[]` | Relation | ✗ **GAP** | Tabla a crear |
| 11 | `lista_personal` | ARRAY(FK) | → `tareas_personal[]` | Relation | ✗ **GAP** | Tabla a crear |
| 12 | `Tarea_Padre` | FK | `tarea_padre_id` | UUID | ✗ **GAP** | Campo a agregar |
| 13 | `0_lista_tareas_hijas` | ARRAY(FK) | Derivado | Computed | ✗ **GAP** | Derivar de tarea_padre_id |
| 14 | `confirmado` | BOOLEAN | — | — | ✗ **DEPRECATED** | Usar estado = COMPLETADA |
| 15 | `id_sitio-2025` | FK | — | — | ✗ **GAP** | Posible FK a terceros_sitios |
| — | `estado-BORRAR-27-08` | TEXT | — | — | — | **DEPRECATED**: Marcar de eliminación |
| — | `estado-NUEVO-27-08` | TEXT | — | — | — | **DEPRECATED**: Usar `estado` |
| — | `con_informe -BORRAR-27-08` | BOOLEAN | — | — | — | **DEPRECATED** |
| — | `Hora Inicio--BORRAR-27-08` | TEXT | — | — | — | **DEPRECATED** |
| — | `Hora Final--BORRAR-27-08` | TEXT | — | — | — | **DEPRECATED** |
| — | `Hora Inicio-NUEVO-27-08` | TEXT | — | — | — | **DEPRECATED** |
| — | `lista_formatos-BORRAR-27-08` | ARRAY | — | — | — | **DEPRECATED**: Legacy |
| — | `responsable -BORRAR-27-08` | TEXT | — | — | — | **DEPRECATED** |
| — | `Responsables Reporte -BORRAR-27-08` | ARRAY | — | — | — | **DEPRECATED** |
| — | `actualizado` | BOOLEAN | — | — | — | **DEPRECATED**: Usar updated_at |
| — | `Update_tarea_padre` | BOOLEAN | — | — | — | **DEPRECATED** |

**Resumen:** 7/15 campos ✓ migrados, 5 gaps (tablas relacionadas + campos), 15 deprecated.

---

## TERCEROS: Mapeo de Campos

| # | Bubble | Tipo | Supabase | Tipo | Status | Notas |
|---|--------|------|----------|------|--------|-------|
| 1 | `_id` | TEXT | `id` | UUID | ✓ Migrado | PK |
| 2 | `razon_social` | TEXT | `razon_social` | TEXT | ✓ Migrado | Nombre legal |
| 3 | `ruc` | TEXT | `ruc` | TEXT | ✓ Migrado | Identificador fiscal |
| 4 | `tipo` | ARRAY | `tipo` | ENUM | ✓ Migrado | cliente/proveedor/ambos |
| 5 | `direccion` | TEXT | `direccion` | TEXT | ✓ Migrado | Dirección principal |
| 6 | `telefono` | TEXT | `telefono` | TEXT | ✓ Migrado | Teléfono principal |
| 7 | `email` | TEXT | `email` | TEXT | ✓ Migrado | Email |
| 8 | `rubro` | TEXT | `rubro` | TEXT | ✓ Migrado | Industria |
| 9 | `estado_seniat` | TEXT | `condicion` | TEXT | ~ Validar | Estado fiscal ¿es equivalente? |
| 10 | `condicion_seniat` | TEXT | `estado` | TEXT | ~ Validar | Condición fiscal ¿es equivalente? |
| 11 | `ubicacion_ciudad` | TEXT | `ubicacion_ciudad` | TEXT | ✓ Migrado | Ciudad |
| 12 | `ubicacion_departamento` | TEXT | `ubicacion_departamento` | TEXT | ✓ Migrado | Departamento |
| 13 | `ubicacion_pais` | TEXT | `ubicacion_pais` | TEXT | ✓ Migrado | País (default: PERU) |
| 14 | `logo_url` | URL | `logo_url` | TEXT | ✓ Migrado | Logo (URL almacenada) |
| 15 | `is active` | BOOLEAN | `is_active` | BOOLEAN | ✓ Migrado | Soft delete |
| 16 | `tenant_id` | FK | `tenant_id` | UUID | ✓ Migrado | FK a companies |
| 17 | `Created By` | TEXT | `created_by` | UUID | ✓ Migrado | FK a auth.users |
| 18 | `Created Date` | DATE | `created_at` | TIMESTAMPTZ | ✓ Migrado | Con zona horaria |
| 19 | `Modified Date` | DATE | `updated_at` | TIMESTAMPTZ | ✓ Migrado | Con zona horaria |
| — | `con_informe?` | BOOLEAN | — | — | — | **DEPRECATED** |
| — | — | — | `nombre_comercial` | TEXT | ✓ Nuevo | Alias comercial (Supabase) |

**Tablas Relacionadas en Supabase (NO en Bubble):**

| Tabla | Campos | Propósito |
|-------|--------|----------|
| `terceros_contactos` | id, tercero_id, nombre_completo, cargo, area, telefono, email | Contactos por persona |
| `terceros_sitios` | id, tercero_id, nombre, codigo, direccion, ciudad, tipo, comentarios | Sitios/proyectos |
| `terceros_personal` | id, tercero_id, nombres, apellidos, tipo_doc, numero_doc, cargo, email, telefono, firma_url | Personal del tercero |

**Resumen:** 14/19 campos ✓ migrados, 0 gaps críticos, 3 tablas relacionadas creadas (mejora), validar estado vs condición.

---

## ESTADO ENUMS: Valores Válidos

### Cotizaciones.estado

| Bubble | Supabase | Equivalencia |
|--------|----------|--------------|
| `Aprobada` | `APROBADA` | ✓ 1:1 |
| `Rechazada` | `RECHAZADA` | ✓ 1:1 |
| `Vencida` | `VENCIDA` | ✓ 1:1 |
| `Enviada` | `ENVIADA` | ✓ 1:1 |
| — | `BORRADOR` | Nuevo (estado inicial) |
| — | `APLAZADA` | Nuevo (postponed) |

**Acción:** Validar si existen otros estados en Bubble.

```sql
SELECT DISTINCT Estado FROM Cotizaciones WHERE is_active = true;
```

### Tareas.estado

| Bubble | Supabase | Equivalencia |
|--------|----------|--------------|
| — | `PENDIENTE` | Nuevo default |
| — | `EN_PROCESO` | En curso |
| — | `COMPLETADA` | Finalizada |
| — | `CANCELADA` | Cancelada |

**Nota:** Bubble usa estados textuales sin ENUM. Supabase normaliza a 4 valores.

### Tareas.prioridad

| Bubble | Supabase | Equivalencia |
|--------|----------|--------------|
| `ALTA` | `ALTA` | ✓ 1:1 |
| `MEDIA` | `MEDIA` | ✓ 1:1 |
| `BAJA` | `BAJA` | ✓ 1:1 |

---

## ARCHIVOS/DOCUMENTOS: Ubicaciones

### Cotizaciones

| Campo Bubble | Tipo | Ubicación Actual | Ubicación Supabase | Gap |
|--------------|------|------------------|-------------------|-----|
| `Archivo_web` | S3 URL | `s3.amazonaws.com/appforest_uf/...` | `supabase.co/storage/cotizaciones/` | ✗ PDFs no descargados |
| `Archivo_nombre` | TEXT | Bubble DB | Metadata en Supabase? | ✗ No guardado |

### Terceros

| Campo | Tipo | Ubicación | Gap |
|-------|------|-----------|-----|
| `logo_url` | URL | Externo (presumible Cloudinary) | ✗ Opcional descargar |

### Tareas

| Campo | Tipo | Ubicación | Gap |
|-------|------|-----------|-----|
| `lista_formatos` | ARRAY(FK) | Referencias | ✓ Legacy, ignorar |

---

## CONTEO ESTIMADO DE REGISTROS

| Tabla | Bubble (estimado) | Supabase (actual) | Status |
|-------|-------------------|-------------------|--------|
| Cotizaciones | ~500-600 | ? | Verificar con query |
| Tareas | ~300-400 | ? | Verificar con query |
| Terceros | ~150-200 | ? | Verificar con query |

**Queries para verificar:**

```sql
-- Supabase
SELECT COUNT(*) as cot_count FROM public.cotizaciones;
SELECT COUNT(*) as tar_count FROM public.tareas;
SELECT COUNT(*) as trc_count FROM public.terceros;

-- Contar registros con campos específicos
SELECT COUNT(*) as cot_con_pdf FROM public.cotizaciones WHERE pdf_url IS NOT NULL;
SELECT COUNT(*) as tar_con_prog FROM public.tareas WHERE progreso_porcentaje IS NOT NULL;
```

---

## DECISIÓN RÁPIDA: ¿Qué Hacer?

### Inmediato (v3.11)

- [ ] **Auditar PDFs en Bubble** → Migrar a Supabase Storage
- [ ] **Crear `tareas_maquinarias`** → Junction table
- [ ] **Crear `tareas_personal`** → Junction table
- [ ] **Agregar `progreso_porcentaje`** a `tareas`

### Corto Plazo (v3.12)

- [ ] **Agregar `tarea_padre_id`** a `tareas`
- [ ] **Validar estado_seniat vs condicion** en terceros
- [ ] **Auditoría de integridad** (FKs, orfandad)

### Largo Plazo (Q3 2026)

- [ ] **Deprecar Bucket S3 Bubble** (12 meses grace period)
- [ ] **Limpieza de campos legacy** en Tareas (si Bubble los tiene)

### Ignorar Siempre

- Todos los campos con `--BORRAR-`, `-NUEVO-`, `-LEGACY-`
- `Tab`, `Slug`, `con_informe`, `cotizacion_configuracion_id`
- Fechas descompuestas (calcular en queries)

---

## TICKETS JIRA SUGERIDOS

```
[TASK] Auditar y migrar PDFs de Cotizaciones (Bubble S3 → Supabase Storage)
  Subtasks:
    - Contar PDFs en Bubble no nulos
    - Validar accesibilidad de URLs
    - Script de descarga + carga
    - Actualizar referencias cotizaciones.pdf_url
  Estimado: 8h
  Versión: v3.11

[FEATURE] Crear tabla tareas_maquinarias (junction)
  Auditar Tareas con lista_maquinaria en Bubble
  DDL + RLS
  Estimado: 4h
  Versión: v3.11

[FEATURE] Crear tabla tareas_personal (junction)
  Similar a tareas_maquinarias
  Campos: tarea_id, personal_id, rol
  Estimado: 4h
  Versión: v3.11

[FEATURE] Agregar campo progreso_porcentaje a tareas
  Migration + triggers
  Estimado: 2h
  Versión: v3.11

[FEATURE] Agregar tarea_padre_id a tareas (subtareas)
  Migration + indexes
  Queries recursivas
  Estimado: 3h
  Versión: v3.12

[TASK] Auditoría de integridad Bubble vs Supabase
  Validar estados, FKs, orfandad
  Reportar anomalías
  Estimado: 6h
  Versión: v3.12
```

---

**Última actualización:** 2026-07-12  
**Propietario:** Cloud Architecture  
**Next Review:** Post v3.11 release
