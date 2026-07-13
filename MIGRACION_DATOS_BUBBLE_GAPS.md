# Gaps de Migración: Bubble → Supabase

**Generado:** 2026-07-12 (post-cutover v3.10.41)  
**Alcance:** Cotizaciones, Tareas, Terceros  
**Estado:** 3 tablas principales con 55 campos Bubble → 21+ campos normalizados Supabase

---

## Quick Reference: Campos Críticos No Migrados

### 1. ARCHIVOS (BLOCKER)

| Tabla | Campo Bubble | Tipo | Ubicación | Acción Requerida |
|-------|--------------|------|-----------|------------------|
| Cotizaciones | `Archivo_web` | S3 URL | AWS S3 (legacy) | ✓ **MIGRAR** a Supabase Storage |
| Terceros | `logo_url` | URL | Externo | Opcionalmente descargar |

**SQL para auditoría:**
```sql
-- Cuántos PDFs faltan
SELECT COUNT(*) as cotizaciones_con_pdf
FROM cotizaciones 
WHERE pdf_url IS NULL;

-- Listar URLs Bubble legacy
SELECT id, numero, Archivo_web 
FROM Cotizaciones 
WHERE Archivo_web LIKE '//s3.amazonaws.com%' 
LIMIT 20;
```

### 2. DATOS ACTUALMENTE NO REPRESENTADOS EN SUPABASE

#### Tareas

| Campo Bubble | Tipo | Prioridad | Acción |
|--------------|------|-----------|--------|
| `lista_maquinaria` | ARRAY de IDs | MEDIUM | Crear tabla `tareas_maquinarias` (junction) |
| `lista_personal` | ARRAY de IDs | MEDIUM | Crear tabla `tareas_personal` (junction) |
| `Tarea_Padre` | FK | MEDIUM | Agregar campo `tarea_padre_id` a `tareas` |
| `Progreso %` | NUMBER (0-100) | LOW | Agregar campo `progreso_porcentaje` INT |
| Fechas rango/listado | ARRAY/DATE | LOW | Clarificar requisito (calendarios de trabajo) |

**DDL para crear tablas faltantes:**

```sql
-- Tareas ↔ Maquinarias
CREATE TABLE IF NOT EXISTS public.tareas_maquinarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarea_id UUID REFERENCES public.tareas(id) ON DELETE CASCADE NOT NULL,
    maquinaria_id UUID REFERENCES public.maquinarias(id) NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(tarea_id, maquinaria_id)
);

-- Tareas ↔ Personal
CREATE TABLE IF NOT EXISTS public.tareas_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarea_id UUID REFERENCES public.tareas(id) ON DELETE CASCADE NOT NULL,
    personal_id UUID REFERENCES public.terceros_personal(id) NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    rol TEXT,  -- ej: "Supervisor", "Operador", etc.
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(tarea_id, personal_id)
);

-- Campos faltantes en tareas
ALTER TABLE public.tareas 
ADD COLUMN IF NOT EXISTS tarea_padre_id UUID REFERENCES public.tareas(id),
ADD COLUMN IF NOT EXISTS progreso_porcentaje INT CHECK (progreso_porcentaje >= 0 AND progreso_porcentaje <= 100);

CREATE INDEX IF NOT EXISTS idx_tareas_padre ON public.tareas(tarea_padre_id);
```

#### Cotizaciones

| Campo Bubble | Tipo | Prioridad | Notas |
|--------------|------|-----------|-------|
| `Observaciones MR` | TEXT | LOW | Posiblemente redundante con matriz_responsabilidad |
| `cotizacion_configuracion_id` | FK | LOW | Legacy, puede ignorarse |
| `con_informe` | BOOLEAN | LOW | Puede calcularse como `EXISTS(SELECT 1 FROM reportes WHERE cotizacion_id = ...)` |

#### Terceros

| Campo Bubble | Tipo | Prioridad | Estado Supabase |
|--------------|------|-----------|-----------------|
| `estado_seniat` | TEXT | LOW | Existe como `condicion` (revisar si equivalente) |
| Teléfono (Terceros) | TEXT | MEDIUM | ✓ Ya en Supabase.terceros.telefono |
| Email (Terceros) | TEXT | MEDIUM | ✓ Ya en Supabase.terceros.email |

---

## 3. CAMPOS DEPRECATED QUE IGNORAR

### Tareas (15+ campos legacy)

```
estado-BORRAR-27-08              (duplicado de estado-NUEVO-27-08)
estado-NUEVO-27-08               (usar estado actual en Supabase)
con_informe -BORRAR-27-08        (ignorar)
Hora Inicio--BORRAR-27-08        (ignorar, usar id_hora_inicio)
Hora Final--BORRAR-27-08         (ignorar, usar id_hora_final)
Hora Inicio-NUEVO-27-08          (reemplazar con campo formal)
responsable -BORRAR-27-08        (ignorar, usar asignado_a)
lista_formatos-BORRAR-27-08      (ignorar, legacy de formularios)
lista_recursos-BORRAR-27-08      (ignorar)
Responsables Reporte -BORRAR-27-08 (ignorar, consolidar en asignado_a)
0_lista_tareas_hijas-NUEVA-27-08 (derivar de tarea_padre_id)
Progreso % - NUEVA 27-08         (usar progreso_porcentaje)
actualizado                      (ignorar, usar updated_at)
Update_tarea_padre               (ignorar)
confirmado                       (ignorar, usar estado COMPLETADA)
```

**Decisión:** En futura migración de Tareas, IGNORAR todos estos campos. El schema Supabase es correcto.

### Cotizaciones

```
Fecha Solicitud_Año              (calcular con DATE_PART en queries)
Fecha Solicitud_Mes              (calcular con DATE_PART en queries)
Fecha Solicitud_Semana           (calcular con DATE_TRUNC en queries)
Tab                              (legacy UI)
Slug                             (generar en frontend si es necesario)
con_informe                      (calcular con EXISTS)
cotizacion_configuracion_id      (legacy, puede ignorarse)
Lista Temporal Items - Chequear  (ignorar, para migración)
```

---

## 4. VALIDACIONES REQUERIDAS

### Estado Mappings

**Cotizaciones.Estado (Bubble) → cotizaciones.estado (Supabase ENUM)**

Necesita validación:
- "Aprobada" → "APROBADA" ✓
- "Rechazada" → "RECHAZADA" ✓
- "Vencida" → "VENCIDA" ✓
- "Enviada" → "ENVIADA" ✓
- "Pendiente"? → "BORRADOR"?
- ¿Otros estados en Bubble?

**Query para verificar:**
```sql
-- Valores únicos en Bubble Cotizaciones.Estado
SELECT DISTINCT Estado FROM Cotizaciones ORDER BY Estado;

-- Valores esperados en Supabase
SELECT unnest(enum_range(NULL::cotizacion_estado));
```

### Terceros.tipo (Array en Bubble → ENUM en Supabase)

Bubble: `tipo` = ["Cliente"], ["Proveedor"], ["Ambos"]  
Supabase: `tipo` = 'cliente' | 'proveedor' | 'ambos'

**Mapeo:**
```python
TIPO_MAPPING = {
    'Cliente': 'cliente',
    'Proveedor': 'proveedor',
    'Ambos': 'ambos',
    'Cliente, Proveedor': 'ambos',  # si viene como array
}
```

---

## 5. CONTEOS SUGERIDOS PARA AUDITORÍA

```sql
-- Cotizaciones
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN Archivo_web IS NOT NULL THEN 1 END) as con_pdf,
    COUNT(DISTINCT Estado) as estados_unicos,
    COUNT(DISTINCT cliente_id) as clientes_unicos
FROM Cotizaciones;

-- Tareas
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN lista_maquinaria IS NOT NULL THEN 1 END) as con_maquinaria,
    COUNT(CASE WHEN lista_personal IS NOT NULL THEN 1 END) as con_personal,
    COUNT(CASE WHEN Tarea_Padre IS NOT NULL THEN 1 END) as con_subtareas
FROM Tareas;

-- Terceros
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as con_logo,
    COUNT(DISTINCT tipo) as tipos_unicos
FROM Terceros;

-- FK Integrity (muestras)
SELECT COUNT(*) as cotizaciones_sin_cliente
FROM Cotizaciones
WHERE cliente_id IS NULL OR cliente_id NOT IN (SELECT _id FROM Terceros);

SELECT COUNT(*) as tareas_sin_titulo
FROM Tareas
WHERE titulo IS NULL OR titulo = '';
```

---

## 6. SCRIPT DE LIMPIEZA (TAREAS DEPRECADAS)

Eliminar campos legacy de Tareas en Supabase si aún existen:

```sql
-- Backup primero
CREATE TABLE tareas_backup_legacy AS SELECT * FROM tareas;

-- Luego limpiar (si existían, lo cual es unlikely)
-- Las columnas legacy probablemente nunca fueron sincronizadas a Supabase
-- Por lo tanto, esta limpieza es más para Bubble si es necesario

-- Verificar si Supabase tiene estos campos (debería NO tener)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tareas' 
AND column_name LIKE '%BORRAR%' 
OR column_name LIKE '%NUEVO%';
-- Esperado: 0 filas
```

---

## 7. PLAN DE MIGRACIÓN DE ARCHIVOS (PDFs)

### Fase 1: Auditoría

```bash
# Script pseudo-código para descargar y auditar URLs de Bubble
BUBBLE_PDFs=$(psql -h bubble.db -c "
  SELECT _id, numero, Archivo_web 
  FROM Cotizaciones 
  WHERE Archivo_web IS NOT NULL
" | awk '{print $NF}')

for url in $BUBBLE_PDFs; do
  curl -I "$url" --silent | head -1  # Validar acceso
done
```

### Fase 2: Migración a Supabase Storage

```sql
-- Script TypeScript (pseudo)
const supabase = createClient(url, key);

const results = await fetch('https://reporta.la/api/1.1/obj/Cotizaciones?limit=1000');
for (const cotizacion of results) {
    if (cotizacion.Archivo_web) {
        // Descargar PDF
        const pdf = await fetch(cotizacion.Archivo_web);
        const blob = await pdf.blob();
        
        // Guardar en Supabase Storage
        await supabase.storage
            .from('cotizaciones-archive')
            .upload(`${cotizacion._id}.pdf`, blob);
        
        // Actualizar referencia en Supabase
        await supabase
            .from('cotizaciones')
            .update({
                pdf_url: `https://[bucket].supabase.co/storage/v1/object/public/cotizaciones-archive/${cotizacion._id}.pdf`
            })
            .eq('id', cotizacion.id);  // Assumiendo bubble_id migration
    }
}
```

### Fase 3: Deprecación

- Mantener acceso a S3 Bubble por 12 meses
- Logging de referencias a URLs antiguas (para medir adopción)
- Fecha objetivo: Shutoff Q2 2027

---

## 8. MATRIZ DECISIONAL

### ¿Migrar este campo?

| Campo Bubble | En Supabase? | Crítico? | Versión | Decisión |
|--------------|--------------|----------|---------|----------|
| Archivo_web | NO | ✓✓ | v3.11 | **MIGRAR** |
| lista_maquinaria | NO | MEDIUM | v3.11 | **CREAR TABLA** |
| lista_personal | NO | MEDIUM | v3.11 | **CREAR TABLA** |
| Tarea_Padre | NO | MEDIUM | v3.11 | **CREAR CAMPO** |
| Progreso % | NO | LOW | v3.12 | **CREAR CAMPO** |
| Observaciones MR | NO | LOW | v3.12 | **IGNORAR** (redundante) |
| logo_url | SÍ (TEXT) | LOW | — | **MANTENER** |
| estado_seniat | SÍ (condicion) | LOW | — | **VALIDAR** |
| [*-BORRAR-*] | NO | — | — | **IGNORAR SIEMPRE** |

---

## 9. BACKLOG DE TICKETS

### v3.11 (Próxima)

- [ ] **TASK:** Migrar archivos Cotizaciones (Bubble PDFs → Supabase Storage)
  - Subtarea: Auditar conteo y validez de URLs
  - Subtarea: Script de descarga y carga
  - Subtarea: Actualizar referencias en cotizaciones.pdf_url
  - Estimado: 8h

- [ ] **FEATURE:** Crear tabla tareas_maquinarias
  - Auditar Tareas con lista_maquinaria en Bubble
  - DDL migration
  - RLS policies
  - Estimado: 4h

- [ ] **FEATURE:** Crear tabla tareas_personal
  - Similar a tareas_maquinarias
  - Considerar campo `rol` (supervisor, operador, etc.)
  - Estimado: 4h

- [ ] **FEATURE:** Agregar tarea_padre_id a tareas
  - Migration: ALTER TABLE
  - Queries recursivas para subtareas
  - Estimado: 3h

### v3.12 (Siguiente)

- [ ] **FEATURE:** Agregar progreso_porcentaje a tareas
  - Migration
  - Campos de actualización
  - Estimado: 2h

- [ ] **TASK:** Auditoría de integridad Bubble vs Supabase
  - Validar estados
  - Validar FKs
  - Detectar orfandad de datos
  - Estimado: 6h

---

## 10. QUERIES DE VALIDACIÓN POST-MIGRACIÓN

```sql
-- 1. ¿Todos los PDFs fueron migrados?
SELECT 
    COUNT(*) as total_cotizaciones,
    COUNT(pdf_url) as con_pdf_url,
    COUNT(pdf_url) * 100.0 / COUNT(*) as pct_migrado
FROM cotizaciones
WHERE is_active = true;

-- 2. ¿Integridad FK de Cotizaciones?
SELECT COUNT(*) as cotizaciones_huerfanas
FROM cotizaciones c
LEFT JOIN terceros t ON c.cliente_id = t.id
WHERE t.id IS NULL;

-- 3. ¿Estados válidos en cotizaciones?
SELECT DISTINCT estado, COUNT(*) as count
FROM cotizaciones
GROUP BY estado
ORDER BY count DESC;

-- 4. ¿Tareas sin cotización válida?
SELECT COUNT(*) as tareas_huerfanas
FROM tareas t
LEFT JOIN cotizaciones c ON t.cotizacion_id = c.id
WHERE t.cotizacion_id IS NOT NULL AND c.id IS NULL;

-- 5. ¿Terceros sin tipo?
SELECT COUNT(*) as terceros_sin_tipo
FROM terceros
WHERE tipo IS NULL;
```

---

## 11. REFERENCIAS

- **Documentación completa:** `COMPARACION_BUBBLE_SUPABASE.md`
- **Migraciones:** `/supabase/migrations/`
- **Tipos TypeScript:** `/types/*.ts`
- **Roadmap:** `/docs/ROADMAP.md`

---

**Propietario:** Cloud Architecture  
**Última actualización:** 2026-07-12  
**Próxima revisión:** Post v3.11 release
