---
name: gaps-year-tenant-breakdown
description: Análisis de GAPS con AÑO + TENANT desglosado (o NO DATA AVAILABLE si no disponible)
metadata: 
  node_type: memory
  created: 2026-07-12
  source: GAPS_AND_ACTIONS.md + BUBBLE_COMPARISON.md + SCHEMA_VALIDATION.md + BACKEND_DEPS.md + UI_DEPS.md
  data_quality: PARCIAL - solo documentados en la mayoría; faltan datos temporales específicos
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# GAPS v3.11 — AÑO + TENANT DESGLOSADO

**Fecha:** 2026-07-12  
**Crítica:** La mayoría de GAPS NO incluyen información de AÑO + TENANT en los documentos existentes  
**Status:** ⚠️ AUDITORÍA EN BUBBLE/SUPABASE REQUERIDA  

---

## HALLAZGO CRÍTICO

Los documentos de análisis (GAPS_AND_ACTIONS.md + BUBBLE_COMPARISON.md) contienen **cantidades totales** pero **NO detallan AÑO + TENANT** de cada registro. Esto requiere auditorías directas en:
- **Bubble API** (data original)
- **Supabase queries** (data migrada)
- **Supabase Storage** (archivos)

---

## MATRIZ DE GAPS CONSOLIDADA

### GAP 1: PDFs Cotizaciones (40-50 archivos)

| Año | Tenant | Cantidad | Fuente | Status |
|-----|--------|----------|--------|--------|
| ? | ? | ~40-50 | BUBBLE_COMPARISON.md L231-248 | ⚠️ NO DATA |

**Descripción:** PDFs en S3 Bubble (legacy) no migrados a Supabase Storage

**Fuente documentada:**
```
BUBBLE: ~40-50 PDFs de cotizaciones en S3 AWS legacy
SUPABASE: Bucket 'clients/{tenant_id}/cotizaciones-pdf' VACÍO
```

**Acción requerida:** Auditar con queries Supabase (ver doc "AUDITAR_GAPS_QUERIES.md")

**Status:** [AUDITAR EN BUBBLE/SUPABASE]

---

### GAP 2: tareas_recursos (Relaciones N:M) — FALTA VALIDACIÓN

| Año | Tenant | Cantidad | Fuente | Status |
|-----|--------|----------|--------|--------|
| ? | ? | 250 tareas total | GAPS_AND_ACTIONS.md L87-130 | ⚠️ NO DATA |

**Descripción:** Normalización ARRAY (Bubble) → tabla junction (Supabase). ¿Todos los recursos migraron?

**Datos documentados:**
```
BUBBLE: lista_maquinaria (ARRAY), lista_personal (ARRAY)
SUPABASE: tareas_recursos (table junction)
Supabase: 250 tareas, pero ¿todas con recursos?
```

**Status:** [AUDITAR EN SUPABASE]

---

### GAP 3: progreso_porcentaje en Tareas (400+ registros)

| Año | Tenant | Cantidad | Fuente | Status |
|-----|--------|----------|--------|--------|
| ? | ? | 400+ | GAPS_AND_ACTIONS.md L137-174, BUBBLE_COMPARISON.md L157, L176-177 | ⚠️ NO DATA |

**Descripción:** Campo numérico de tracking de progreso. NO existe en Supabase.

**Datos documentados:**
```
BUBBLE: progreso_porcentaje (NUMERIC, 400+ registros)
SUPABASE: Campo NO existe → GAP CRÍTICO
```

**Status:** [AUDITAR EN BUBBLE]

---

### GAP 4: tarea_padre_id (Subtareas) — 50 registros

| Año | Tenant | Cantidad | Fuente | Status |
|-----|--------|----------|--------|--------|
| ? | ? | 50 | GAPS_AND_ACTIONS.md L137-174, BUBBLE_COMPARISON.md L158, L179 | ⚠️ NO DATA |

**Descripción:** Autorreferencia en tareas para subtareas. NO existe en Supabase.

**Datos documentados:**
```
BUBBLE: tarea_padre_id (UUID, 50 tareas con subtareas)
SUPABASE: Campo NO existe
```

**Status:** [AUDITAR EN BUBBLE]

---

### GAP 5: notas_internas en Cotizaciones (1200+ registros)

| Año | Tenant | Cantidad | Fuente | Status |
|-----|--------|----------|--------|--------|
| ? | ? | 1200+ | GAPS_AND_ACTIONS.md L183-196, BUBBLE_COMPARISON.md L77, L94-99, L313-314 | ⚠️ NO DATA |

**Descripción:** Campo de notas privadas. NO existe en Supabase.

**Datos documentados:**
```
BUBBLE: notas_internas (TEXT, 1200+ registros con datos)
SUPABASE: Campo NO existe
```

**Status:** [AUDITAR EN BUBBLE]

---

### GAP 6: logo_proveedor en Cotizaciones (30 registros)

**Decision:** Documentar como deuda técnica. No llevar en v3.11.

**Status:** [DEUDA TÉCNICA v3.12]

---

### GAP 7: Validación de Integridad (FKs rotos)

| Métrica | Valor | Fuente | Status |
|---------|-------|--------|--------|
| Registros huérfanos esperados | ?? | GAPS_AND_ACTIONS.md L237-251 | ⚠️ NO DATA |
| Tablas a auditar | Todas las críticas | SCHEMA_VALIDATION.md | ✅ Documentado |

**Status:** [AUDITAR EN SUPABASE]

---

### GAP 8: Catálogos Sincronizados

| Catálogo | Tabla | Status |
|----------|-------|--------|
| Rubros | rubros | ✅ OK |
| Países | paises | ✅ OK |
| UBIGEO | ubigeo | ✅ OK |
| Servicios | servicios | ✅ OK |

**Status:** [REVISAR EN SUPABASE]

---

## RESUMEN EJECUTIVO

| GAP | Años | Tenants | Recomendación |
|-----|------|---------|---------------|
| PDFs Cotizaciones | ❌ | ❌ | Ver AUDITAR_GAPS_QUERIES.md |
| tareas_recursos | ❌ | ❌ | Ver AUDITAR_GAPS_QUERIES.md |
| progreso_porcentaje | ❌ | ❌ | Ver AUDITAR_GAPS_QUERIES.md |
| tarea_padre_id | ❌ | ❌ | Ver AUDITAR_GAPS_QUERIES.md |
| notas_internas (cot) | ❌ | ❌ | Ver AUDITAR_GAPS_QUERIES.md |
| Validación FK | ❌ | ❌ | Ver AUDITAR_GAPS_QUERIES.md |
| Catálogos | ✅ | N/A | Probablemente OK |

---

## PRÓXIMO PASO

**Ejecutar queries en `AUDITAR_GAPS_QUERIES.md`** para obtener desglose año + tenant específico.

---

**Última actualización:** 2026-07-12  
**Status:** ⚠️ AUDITORÍA EN PROGRESO
