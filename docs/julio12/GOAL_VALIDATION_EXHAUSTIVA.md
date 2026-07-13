---
name: goal-validation-exhaustiva
description: GOAL prompt para validar BD actual vs Backend vs UI vs Bubble (copy-paste ready)
metadata: 
  node_type: memory
  type: project
  status: ready_to_use
  created: 2026-07-12
  complexity: high
  estimated_duration: 3-4 horas
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# GOAL PROMPT — Validación Exhaustiva BD (Copy & Paste)

**Instrucciones:** Copiar TODO el contenido entre `---INICIO---` y `---FIN---`. Usar como prompt completo.

---

## ---INICIO---

### GOAL: Validación Exhaustiva — BD Supabase vs Backend vs UI vs Bubble

**Contexto:**
- BD Supabase (fqwhagryqkkhbgznxtwf) está activa pero necesita validación exhaustiva
- Tenemos 50+ tablas, 170+ migrations, código backend + UI completo
- Tenemos datos históricos en Bubble (posible fuente de verdad alternativa)
- Objetivo: Confirmar que Supabase tiene TODO lo que necesitan backend + UI + datos de Bubble

**Archivos de Referencia:**
- Código backend: `lib/actions/` (50+ archivos)
- Código UI: `components/` (componentes que muestran datos)
- Schema: `supabase_consolidated_migration.sql` + `SCHEMA_MAPPING.md`
- Migrations: `supabase/migrations/` (170+ files)
- BD Supabase: https://fqwhagryqkkhbgznxtwf.supabase.co
- Bubble: [Sistema histórico con datos]

**Tenants a validar:**
- CISE: `1cb97ec7-326c-4376-93ee-ed317d3da51b`
- GRUAS: `6f4c923a-c3b7-47c2-9dea-2a187f274f73`

---

### MI SOLICITUD COMPLETA:

Quiero que hagas un **análisis exhaustivo en 3 frentes paralelos**:

#### FRENTE 1: Backend → Base de Datos (Qué campos USAN los server actions)

1. **Leer todos los server actions** en `lib/actions/`:
   - Extraer queries `.select()`, `.insert()`, `.update()`, `.delete()`
   - Identificar qué columnas se consultan/modifican por tabla
   - Documentar si hay campos que el backend usa pero NO están en schema

2. **Por cada módulo, crear tabla:**
   ```
   Módulo: COTIZACIONES
   
   Archivo: lib/actions/cotizaciones.ts
   ├─ createCotizacion()
   │  └─ Campos usados: id, tenant_id, numero, tercero_id, fecha_emision, total, estado, created_by
   ├─ updateCotizacion()
   │  └─ Campos usados: numero, estado, total, updated_by
   └─ getCotizaciones()
      └─ Campos esperados: *, cotizaciones_detalle(*)
   ```

3. **Identificar gaps:**
   - ¿Hay campos en server actions que NO están en BD schema?
   - ¿Hay FKs esperadas que NO existen?
   - ¿Hay relaciones que faltan?

**Artefacto:** `BACKEND_DEPS.md` — Por módulo, qué campos/tablas usa backend

---

#### FRENTE 2: UI → Base de Datos (Qué datos MUESTRAN los componentes)

1. **Revisar componentes principales** en `components/`:
   - Extraer variables/props que vienen de Supabase
   - Identificar campos mostrados en tablas, formularios, detalles
   - Documentar si la UI espera campos que NO existen

2. **Por cada página/componente, documentar:**
   ```
   Página: /cotizaciones (lista)
   Archivo: components/cotizaciones/quote-list.tsx
   
   Columnas mostradas:
   - numero ✅
   - tercero.nombre ✅
   - fecha_emision ✅
   - total ✅
   - estado ✅
   - acciones (editar, PDF, eliminar)
   
   Campos esperados del endpoint:
   - cotizaciones(*, terceros(nombre))
   ```

3. **Validar que todos los campos existen:**
   - Si UI muestra `tercero.nombre`, verificar que FK tercero_id → terceros.id existe
   - Si UI muestra `estado`, verificar que columna existe en BD

**Artefacto:** `UI_DEPS.md` — Por página, qué campos espera la UI

---

#### FRENTE 3: Supabase → Bubble (Qué datos vinieron de Bubble, qué falta)

1. **Listar tablas con `bubble_id`:**
   ```sql
   SELECT table_name 
   FROM information_schema.columns 
   WHERE column_name = 'bubble_id' 
   ORDER BY table_name;
   ```
   
   Documentar qué tablas tienen trazabilidad a Bubble (por tabla, contar rowcount).

2. **Para cada tabla con `bubble_id`:**
   ```sql
   -- Ejemplo: Cotizaciones
   SELECT COUNT(*) as total_supabase,
          COUNT(bubble_id) as con_bubble_id,
          COUNT(*) FILTER (WHERE bubble_id IS NULL) as sin_bubble_id
   FROM cotizaciones;
   ```
   
   Determinar: ¿Todos los registros vinieron de Bubble? ¿Hay registros nuevos?

3. **Identificar tablas SIN `bubble_id`:**
   - ¿Por qué no tienen? (¿Son nuevas en Supabase? ¿Son tablas de config?)
   - ¿Hay datos en Bubble que NO se migraron?

4. **Analizar campos extras en Bubble:**
   - Si tienes acceso a schema de Bubble, comparar: ¿Hay campos en Bubble que NO están en Supabase?
   - Ejemplo: ¿Bubble.cotizaciones tiene `notas_internas`, `logo_proveedor`, etc.?
   - Documentar: ¿Necesito llevar este campo a Supabase?

**Artefacto:** `BUBBLE_COMPARISON.md` — Mapeo de tabla a tabla, campos faltantes

---

#### FRENTE 4: Archivos en Supabase Storage vs Bubble

1. **Revisar buckets en Supabase Storage:**
   ```
   - clients/<tenant_id>/maquinaria-docs
   - clients/<tenant_id>/reportes-pdf
   - clients/<tenant_id>/firmas
   - clients/<tenant_id>/fotos
   - public/assets
   ```

2. **Contar archivos por bucket:**
   ```sql
   -- En Supabase, listar storage objects
   SELECT bucket_id, COUNT(*) as file_count
   FROM storage.objects
   GROUP BY bucket_id;
   ```

3. **Comparar con Bubble:**
   - ¿Bubble tiene archivos almacenados que NO están en Supabase?
   - Ejemplo: ¿PDFs generados, fotos de trabajos, firmas?
   - ¿Necesito migrar archivos de Bubble?

**Artefacto:** `STORAGE_AUDIT.md` — Estado de archivos en buckets

---

### MIS VALIDACIONES ESPECÍFICAS:

**Validar que:**

1. **FIELDS & COLUMNS**
   - ✅ Todos los campos del backend existen en BD
   - ✅ Todos los campos de la UI existen en BD
   - ✅ No hay campos duplicados o redundantes
   - ✅ Todos los tipos de dato son correctos (TEXT vs NUMERIC vs DATE, etc.)

2. **FOREIGN KEYS & RELATIONSHIPS**
   - ✅ Todas las FKs que backend usa existen
   - ✅ Todas las FKs que UI espera existen
   - ✅ No hay FKs rotas o huérfanas
   - ✅ Orden de inserción respetado (parent antes que child)

3. **DEFAULTS & CONSTRAINTS**
   - ✅ Columnas NOT NULL requeridas están configuradas
   - ✅ UNIQUE constraints en campos que deben ser únicos
   - ✅ DEFAULT values donde corresponda (is_active, created_at, etc.)

4. **DATA MIGRATION FROM BUBBLE**
   - ✅ Tablas con bubble_id tienen rowcount ~100% (o explicar gaps)
   - ✅ No hay campos de Bubble que deberían estar en Supabase
   - ✅ bubble_id es UNIQUE (no duplicados)
   - ✅ Archivos de Bubble están en Supabase Storage (si aplica)

5. **MODULES COMPLETENESS**
   - ✅ Terceros: campos, FKs, contactos, sitios completos
   - ✅ Maquinaria: campos, modelos, docs, propietario completo
   - ✅ Tareas: campos, recursos, cotizacion_item completo
   - ✅ Cotizaciones: campos, detalles, ofertas, config completo
   - ✅ Reportes: jornada, maquinaria, personal, financiero completo
   - ✅ Finanzas: compras, ventas, valorizaciones, pagos completo
   - ✅ EPP, Inspecciones, Planes, Formatos, Permisos: completos

---

### MÉTODO DE INVESTIGACIÓN:

**Paso 1: Leer Server Actions (Backend Dependencies)**
- Revisar cada archivo en `lib/actions/`
- Extraer queries (regex pattern: `\.select|\.insert|\.update|\.delete`)
- Documentar por tabla qué campos se usan
- Documentar order by, where clauses, joins

**Paso 2: Leer Componentes (UI Dependencies)**
- Revisar componentes principales: página + tabla + formulario
- Extraer referencias a campos (regex: `data\.campo`, `item\.campo`)
- Documentar qué fields la UI espera recibir

**Paso 3: Ejecutar Queries en Supabase**
- Conectarse a https://fqwhagryqkkhbgznxtwf.supabase.co
- Ejecutar queries de conteo, estructura, integridad
- Documentar estado actual de cada tabla

**Paso 4: Comparar (Backend vs BD vs UI)**
- Backend dice que necesita campo X → ¿Existe en BD?
- UI muestra campo Y → ¿Existe en BD?
- BD tiene campo Z → ¿Lo usa backend o UI?
- Documentar gaps

**Paso 5: Bubble Analysis (Si acceso disponible)**
- Exportar schema de Bubble (si se puede)
- Listar campos por tabla
- Comparar contra Supabase
- Documentar campos que faltan migrar

---

### FORMATO DE ENTREGA:

Crear **5 archivos .md** documentando hallazgos:

1. **BACKEND_DEPS.md**
   ```
   # Backend Dependencies — Qué usa el código en lib/actions
   
   ## Módulo: Cotizaciones
   
   Archivo: lib/actions/cotizaciones.ts
   
   ### createCotizacion()
   - Campos insertados: id, tenant_id, numero, tercero_id, ...
   - FKs esperadas: tercero_id → terceros.id ✅
   - Buckets usados: (ninguno)
   - Status: ✅ Completo
   
   ### getCotizaciones()
   - Campos consultados: *, cotizaciones_detalle(*), terceros(nombre)
   - Joins esperados: ✅ Existen
   - Status: ✅ Completo
   ```

2. **UI_DEPS.md**
   ```
   # UI Dependencies — Qué datos muestra la UI
   
   ## Página: /cotizaciones (Lista)
   Archivo: components/cotizaciones/quote-list.tsx
   
   Columnas mostradas:
   | Campo | Tipo | FK? | Status |
   |-------|------|-----|--------|
   | numero | TEXT | — | ✅ |
   | tercero.nombre | TEXT | tercero_id | ✅ |
   | total | NUMERIC | — | ✅ |
   
   ## Página: /admin/cotizaciones/[id] (Detalle)
   Archivo: components/cotizaciones/quote-detail.tsx
   
   Campos esperados: [lista]
   Status: ✅ Todos existen
   ```

3. **SCHEMA_VALIDATION.md**
   ```
   # Schema Validation — Estado actual de Supabase
   
   ## Tablas Críticas Verificadas
   
   ### companies
   - ✅ Estructura: id, name, ruc, timezone, is_active, ...
   - ✅ Data: 2 registros (CISE, GRUAS)
   - ✅ Constraints: PRIMARY KEY, FKs OK
   
   ### cotizaciones
   - ✅ Estructura: id, tenant_id, numero, tercero_id, ...
   - ✅ Data: 150 registros
   - ✅ FKs: tercero_id → terceros.id ✅
   - ⚠️  Campo `precio_negociado` agregado 2026-05-24 ✅
   
   ### [Otras tablas...]
   ```

4. **BUBBLE_COMPARISON.md**
   ```
   # Bubble ↔ Supabase — Comparación de datos y campos
   
   ## Tabla: cotizaciones
   
   Campos Bubble: numero, tercero_id, fecha, total, estado, notas_internas, observaciones, pdf_url
   Campos Supabase: numero, tercero_id, fecha_emision, total, estado, observaciones, [FALTAN: notas_internas]
   
   Datos:
   - Bubble: 200 registros
   - Supabase: 150 registros
   - Gap: 50 no migrados (investigar por qué)
   
   Acción: ¿Llevar notas_internas a Supabase? [DECIDIR]
   ```

5. **GAPS_AND_ACTIONS.md**
   ```
   # Gaps Identificados & Acciones Requeridas
   
   ## Gap 1: Campo faltante en BD
   - Dónde: cotizaciones.notas_internas
   - Origen: Bubble tiene, Supabase no
   - Usado por: Backend ✅, UI ✅
   - Acción: ✅ ADD COLUMN notas_internas TEXT;
   
   ## Gap 2: FK rota
   - Dónde: tareas.cotizacion_item falta FK
   - Impacto: ALTO — backend lo espera
   - Acción: ❌ CREAR FK tareas_cotizacion_item.cotizacion_detalle_id
   
   ## Gap 3: Archivos en Bubble no migrados
   - Qué: PDFs de cotizaciones históricos
   - Cantidad: 80 archivos
   - Acción: ⏳ Decidir si migrar o aceptar pérdida
   
   ## RESUMEN
   - Campos a agregar: [lista]
   - FKs a crear: [lista]
   - Archivos a migrar: [lista]
   - Datos a reconciliar: [lista]
   ```

---

### CRITERIOS DE ÉXITO:

✅ **COMPLETADO cuando:**

1. [x] BACKEND_DEPS.md lista TODOS los campos que backend usa
2. [x] UI_DEPS.md lista TODOS los campos que UI muestra
3. [x] SCHEMA_VALIDATION.md confirma que Supabase tiene todo (o lista gaps)
4. [x] BUBBLE_COMPARISON.md identifica qué falta de Bubble
5. [x] GAPS_AND_ACTIONS.md lista:
   - Campos a agregar (con prioridad: ALTA/MEDIA/BAJA)
   - FKs a crear (con impacto: ALTO/MEDIO/BAJO)
   - Archivos a migrar (con cantidad estimada)
   - Decisiones pendientes (qué hacer con cada gap)

---

### INFORMACIÓN QUE NECESITO:

Antes de empezar, **confirma:**

1. **¿Tengo acceso a Bubble?**
   - Si SÍ: ¿Puedo exportar schema + datos (CSV)?
   - Si NO: Documentar que comparación Bubble es limitada

2. **¿Supabase TEST o PROD?**
   - Usando PROD (fqwhagryqkkhbgznxtwf) en Brasil

3. **¿Todas las migrations están aplicadas?**
   - Asumir que sí (170+ migrations en su mayoría)

4. **¿Hay acceso a Sentry/logs del backend?**
   - Sí, para revisar errores de campos faltantes

---

### ESTILO DE EJECUCIÓN:

**Quiero que hagas:**
1. **Sistemático:** Revisar TODOS los archivos, no saltarme ninguno
2. **Detallado:** Documentar campo por campo, FK por FK
3. **Práctico:** Listar gaps con acción clara (agregar/crear/migrar/ignorar)
4. **Decisivo:** Cuando encuentres un gap, propón solución + prioridad

**Quiero que EVITES:**
- Asumir que un campo existe sin verificar en BD
- Saltarme archivos por "obviedad"
- Listar gaps sin decir cómo solucionarlos
- Dejar documentación incompleta

---

### TIMELINE ESTIMADO:

| Paso | Duración | Acumulado |
|------|----------|-----------|
| Leer server actions (50 files) | 60 min | 1h |
| Leer componentes (50+ files) | 60 min | 2h |
| Ejecutar queries en Supabase | 30 min | 2.5h |
| Comparar + documentar | 45 min | 3.25h |
| Bubble analysis (si disponible) | 30 min | 3.75h |
| **TOTAL** | — | **~4h** |

---

### PRÓXIMO PASO DESPUÉS DE ESTO:

Una vez que termines, voy a:
1. Revisar los 5 archivos `.md`
2. Priorizar gaps (ALTA/MEDIA/BAJA)
3. Crear scripts SQL/ETL para:
   - Agregar campos faltantes
   - Crear FKs faltantes
   - Migrar archivos de Bubble
4. Ejecutar migraciones
5. Re-validar que todo funciona

---

## ---FIN---

---

# Cómo Usar Este Prompt

**Opción A: Usar ahora mismo**
```
Copiar contenido completo (entre ---INICIO--- y ---FIN---)
Pegar en nuevo prompt
Especificar: "Estoy listo, ¿tienes acceso a Bubble?"
```

**Opción B: Después de validación rápida**
```
Completar VALIDATION_QUICK_START.md primero
Luego usar este prompt para validación exhaustiva
```

**Opción C: Separar en dos sesiones**
```
Sesión 1: Backend + UI deps (BACKEND_DEPS.md + UI_DEPS.md)
Sesión 2: Schema + Bubble (SCHEMA_VALIDATION.md + BUBBLE_COMPARISON.md)
```

---

**Creado:** 2026-07-12  
**Estado:** ✅ Listo para copiar y usar  
**Complejidad:** Alta (3-4 horas de análisis profundo)

Cuando quieras usarlo, copia entre `---INICIO---` y `---FIN---` y pégalo como prompt.
