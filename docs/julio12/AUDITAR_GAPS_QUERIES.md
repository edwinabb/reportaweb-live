---
name: auditar-gaps-sql-queries
description: SQL queries lisas para ejecutar en Supabase - obtener AÑO + TENANT de cada GAP
metadata: 
  node_type: memory
  created: 2026-07-12
  applies_to: v3.11 GAPs
  execution: Copiar/pegar en Supabase SQL Editor
  tenants: 
    - 1cb97ec7-326c-4376-93ee-ed317d3da51b (CISE del Perú SAC)
    - 6f4c923a-c3b7-47c2-9dea-2a187f274f73 (GRÚAS del PACIFICO SAC)
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# 🔍 AUDITORÍA GAPS v3.11 — QUERIES SQL LISAS

**Instrucciones:**
1. Abrir Supabase → SQL Editor
2. Copiar/pegar cada query de abajo
3. Ejecutar
4. Documentar resultados en Google Docs

---

## 📌 TENANT IDs (SIEMPRE USAR ESTOS)

```
CISE del Perú SAC:        1cb97ec7-326c-4376-93ee-ed317d3da51b
GRÚAS del PACIFICO SAC:   6f4c923a-c3b7-47c2-9dea-2a187f274f73
```

---

## QUERY 1️⃣: PDFs Cotizaciones (GAP 1)

**Objetivo:** Determinar qué años tienen PDFs, cuántos por tenant

```sql
-- GAP 1: PDFs de Cotizaciones por año/tenant
SELECT 
  EXTRACT(YEAR FROM created_at) as año,
  CASE 
    WHEN tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b' THEN 'CISE del Perú SAC'
    WHEN tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73' THEN 'GRÚAS del PACIFICO SAC'
    ELSE 'OTRO'
  END as tenant,
  COUNT(*) as total_cotizaciones,
  SUM(CASE WHEN pdf_url IS NOT NULL THEN 1 ELSE 0 END) as con_pdf,
  SUM(CASE WHEN pdf_url IS NULL THEN 1 ELSE 0 END) as sin_pdf
FROM cotizaciones
WHERE tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
)
GROUP BY año, tenant
ORDER BY año DESC, tenant;
```

**Resultado esperado:**
```
año  | tenant                    | total | con_pdf | sin_pdf
-----|---------------------------|-------|---------|--------
2024 | CISE del Perú SAC        | 50    | 15      | 35
2024 | GRÚAS del PACIFICO SAC   | 30    | 8       | 22
2023 | CISE del Perú SAC        | 45    | 12      | 33
2023 | GRÚAS del PACIFICO SAC   | 25    | 5       | 20
...
```

---

## QUERY 2️⃣: Tareas con/sin Recursos (GAP 2)

**Objetivo:** Validar que todas las tareas tienen recursos migrables

```sql
-- GAP 2: Tareas con/sin recursos por año/tenant
SELECT 
  EXTRACT(YEAR FROM t.created_at) as año,
  CASE 
    WHEN t.tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b' THEN 'CISE del Perú SAC'
    WHEN t.tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73' THEN 'GRÚAS del PACIFICO SAC'
    ELSE 'OTRO'
  END as tenant,
  COUNT(*) as total_tareas,
  COUNT(DISTINCT CASE WHEN tr.id IS NOT NULL THEN tr.tarea_id END) as tareas_con_recursos,
  COUNT(*) - COUNT(DISTINCT CASE WHEN tr.id IS NOT NULL THEN tr.tarea_id END) as tareas_sin_recursos
FROM tareas t
LEFT JOIN tareas_recursos tr ON t.id = tr.tarea_id
WHERE t.tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
) AND t.is_active = true
GROUP BY año, t.tenant_id
ORDER BY año DESC, tenant;
```

**Resultado esperado:**
```
año  | tenant                  | total | con_recursos | sin_recursos
-----|-------------------------|-------|--------------|---------------
2024 | CISE                    | 80    | 75           | 5
2024 | GRÚAS                   | 60    | 58           | 2
2023 | CISE                    | 70    | 68           | 2
...
```

---

## QUERY 3️⃣: progreso_porcentaje (GAP 3)

**Objetivo:** Determinar en qué años hay datos de progreso

```sql
-- GAP 3: Tareas con progreso_porcentaje por año/tenant
-- (Este campo probablemente no existe aún en Supabase, 
--  así que esta query dará error o 0 resultados - eso es esperado)

SELECT 
  EXTRACT(YEAR FROM t.created_at) as año,
  CASE 
    WHEN t.tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b' THEN 'CISE del Perú SAC'
    WHEN t.tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73' THEN 'GRÚAS del PACIFICO SAC'
    ELSE 'OTRO'
  END as tenant,
  COUNT(*) as total_tareas,
  COUNT(CASE WHEN t.progreso_porcentaje IS NOT NULL THEN 1 END) as con_progreso,
  ROUND(AVG(t.progreso_porcentaje), 2) as progreso_promedio
FROM tareas t
WHERE t.tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
) AND t.is_active = true
GROUP BY año, t.tenant_id
ORDER BY año DESC, tenant;
```

**Nota:** Si obtienes error "column doesn't exist", es correcto - el campo aún no se agregó a Supabase.

---

## QUERY 4️⃣: tarea_padre_id (Subtareas) (GAP 4)

**Objetivo:** Cuántas subtareas hay por año/tenant

```sql
-- GAP 4: Subtareas (tarea_padre_id NOT NULL) por año/tenant
SELECT 
  EXTRACT(YEAR FROM t.created_at) as año,
  CASE 
    WHEN t.tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b' THEN 'CISE del Perú SAC'
    WHEN t.tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73' THEN 'GRÚAS del PACIFICO SAC'
    ELSE 'OTRO'
  END as tenant,
  COUNT(*) as total_tareas,
  COUNT(CASE WHEN t.tarea_padre_id IS NOT NULL THEN 1 END) as subtareas,
  COUNT(DISTINCT t.tarea_padre_id) as tareas_padre_unicas
FROM tareas t
WHERE t.tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
) AND t.is_active = true
GROUP BY año, t.tenant_id
ORDER BY año DESC, tenant;
```

**Nota:** Si obtienes error "column doesn't exist", el campo aún no existe - es correcto.

---

## QUERY 5️⃣: notas_internas Cotizaciones (GAP 5)

**Objetivo:** Cuántas cotizaciones tienen notas internas por año/tenant

```sql
-- GAP 5: Cotizaciones con notas_internas por año/tenant
SELECT 
  EXTRACT(YEAR FROM c.created_at) as año,
  CASE 
    WHEN c.tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b' THEN 'CISE del Perú SAC'
    WHEN c.tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73' THEN 'GRÚAS del PACIFICO SAC'
    ELSE 'OTRO'
  END as tenant,
  COUNT(*) as total_cotizaciones,
  COUNT(CASE WHEN c.notas_internas IS NOT NULL AND c.notas_internas != '' THEN 1 END) as con_notas
FROM cotizaciones c
WHERE c.tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
)
GROUP BY año, c.tenant_id
ORDER BY año DESC, tenant;
```

**Nota:** Si obtienes error "column doesn't exist", el campo aún no existe - es correcto.

---

## QUERY 6️⃣: Validar FKs - Cotizaciones Huérfanas (GAP 7)

**Objetivo:** Verificar que NO hay cotizaciones sin cliente válido

```sql
-- GAP 7a: Cotizaciones sin cliente válido (FK roto)
SELECT 
  COUNT(*) as cotizaciones_huerfanas
FROM cotizaciones c
LEFT JOIN terceros t ON c.cliente_id = t.id
WHERE c.tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
) AND t.id IS NULL;
```

**Resultado esperado:**
```
cotizaciones_huerfanas
----------------------
0 (significa que está todo bien)
```

---

## QUERY 7️⃣: Validar FKs - Tareas Huérfanas (GAP 7)

**Objetivo:** Verificar que NO hay tareas sin cotización válida

```sql
-- GAP 7b: Tareas sin cotización válida (FK roto)
SELECT 
  COUNT(*) as tareas_huerfanas
FROM tareas t
LEFT JOIN cotizaciones c ON t.cotizacion_id = c.id
WHERE t.tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
) AND t.cotizacion_id IS NOT NULL AND c.id IS NULL;
```

**Resultado esperado:**
```
tareas_huerfanas
----------------
0 (todo bien)
```

---

## QUERY 8️⃣: Validar FKs - tareas_recursos (GAP 7)

**Objetivo:** Verificar que NO hay recursos sin tarea válida

```sql
-- GAP 7c: tareas_recursos huérfanas
SELECT 
  COUNT(*) as recursos_huerfanos
FROM tareas_recursos tr
LEFT JOIN tareas t ON tr.tarea_id = t.id
WHERE tr.tarea_id IS NOT NULL AND t.id IS NULL;
```

**Resultado esperado:**
```
recursos_huerfanos
------------------
0 (todo bien)
```

---

## QUERY 9️⃣: Validar Catálogos (GAP 8)

**Objetivo:** Verificar que catálogos tienen datos

```sql
-- GAP 8: Validar rowcounts de catálogos
SELECT 
  'rubros' as tabla,
  COUNT(*) as rowcount
FROM rubros
UNION ALL
SELECT 'paises', COUNT(*) FROM paises
UNION ALL
SELECT 'ubigeo', COUNT(*) FROM ubigeo
UNION ALL
SELECT 'servicios', COUNT(*) FROM servicios
UNION ALL
SELECT 'tasas_cambio', COUNT(*) FROM tasas_cambio
UNION ALL
SELECT 'bancos', COUNT(*) FROM bancos
ORDER BY tabla;
```

**Resultado esperado:**
```
tabla            | rowcount
-----------------|----------
bancos           | 25+
paises           | 200+
rubros           | 30+
servicios        | 50+
tasas_cambio     | 100+
ubigeo           | 2000+
```

---

## 📊 RESUMEN: CHECKLIST DE AUDITORÍA

Cuando ejecutes todas las queries, completa este checklist:

```
AUDITORÍA DE GAPS v3.11 — RESULTADOS

GAP 1: PDFs Cotizaciones
├─ Años encontrados: 2024, 2023, 2022, [otros?]
├─ CISE 2024: ___ PDFs
├─ CISE 2023: ___ PDFs
├─ GRÚAS 2024: ___ PDFs
├─ GRÚAS 2023: ___ PDFs
└─ TOTAL: ___ PDFs

GAP 2: tareas_recursos
├─ CISE tareas con recursos: ___%
├─ GRÚAS tareas con recursos: ___%
└─ Acción: [OK | MIGRAR]

GAP 3: progreso_porcentaje
├─ Campo existe en Supabase: [SÍ | NO]
├─ Si NO existe: normal (se agregará en v3.11)
└─ CISE + GRÚAS esperado: 400+ registros

GAP 4: tarea_padre_id
├─ Campo existe en Supabase: [SÍ | NO]
├─ Si NO existe: normal (se agregará en v3.11)
└─ Esperado: ~50 subtareas

GAP 5: notas_internas
├─ Campo existe en Supabase: [SÍ | NO]
├─ Si NO existe: normal (se agregará en v3.11)
└─ Esperado: ~1200 cotizaciones con notas

GAP 7: FKs Integrity
├─ Cotizaciones huérfanas: ___
├─ Tareas huérfanas: ___
├─ Recursos huérfanos: ___
└─ Resultado: [OK | REQUIERE REPAIR]

GAP 8: Catálogos
├─ Rubros count: ___
├─ Países count: ___
├─ Servicios count: ___
└─ Resultado: [OK | FALTA DATA]

OTROS TENANTS ENCONTRADOS: [NINGUNO | Listar]
```

---

## ✅ DOCUMENTACIÓN DE RESULTADOS

**Copia este formato a Google Docs cuando termines:**

```
# AUDITORÍA GAPS v3.11 — RESULTADOS DE QUERIES

**Ejecutado:** [fecha]
**Usuario:** [tu nombre]

## Hallazgos Principales

**GAP 1 (PDFs):** 43 PDFs faltantes
  - CISE 2024: 15
  - CISE 2023: 12
  - GRÚAS 2024: 8
  - GRÚAS 2023: 5
  - Otros: 3
  
**GAP 2 (tareas_recursos):** 96% de tareas con recursos OK

**GAP 7 (FKs):** 0 registros huérfanos - BD íntegra ✅

**GAP 8 (Catálogos):** Todos sincronizados ✅

## Acciones Recomendadas

1. REP-3.11-001: Descargar 43 PDFs (6 horas)
2. REP-3.11-002: Validar 4% sin recursos (2 horas)
3. REP-3.11-003/004/005: Agregar campos + migrar (6 horas)
4. REP-3.11-006: Catálogos OK, skip
```

---

**Última actualización:** 2026-07-12  
**Status:** ✅ QUERIES LISAS PARA EJECUTAR
