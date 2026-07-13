---
name: gaps-confirmados-del-mapeo-migracion
description: Gaps CONFIRMADOS del documento migracion-mapeo-bubble-supabase.md (año + tenant estimado)
metadata: 
  node_type: memory
  created: 2026-07-12
  source: docs/migracion-mapeo-bubble-supabase.md
  fecha_mapeo: 2026-06-03
  status: Extrae datos reales del mapeo
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# 📋 GAPS CONFIRMADOS DE MIGRACIÓN

**Fuente:** `docs/migracion-mapeo-bubble-supabase.md` (Cutover 2026-05-30)  
**Status:** Datos reales de migración ejecutada

---

## 🔴 GAPS CRÍTICOS (Migración incompleta)

### GAP 1: `inspecciones_detalles` — INCOMPLETO

**Bubble:** ~317,878 registros  
**Supabase:** 38,528 (actualizado a 138,528 al 2026-06-03)  
**Gap:** ~179,350 registros SIN migrar

**Estado del documento (L404):**
```
PROD: 38,528 | Bubble: ~317,878 | Gap: -279,350 | Prioridad: 🔴 CRÍTICO
```

**Análisis por año/tenant:**
- **Período:** 2020 hasta hoy (6 años de datos)
- **Distribuido entre:** CISE + GRÚAS (ambos tenants)
- **Problema:** Bubble API limita a 50k/query. Estrategia pendiente: paginación por rangos de fecha
- **Nota (L579-586):** Necesita split por trimestres para traer de a 50k

**Acción para v3.11:**
```
DECISIÓN: NO es prioridad v3.11 (muy grande)
RAZÓN: Tamaño crítico (180k registros), requiere estrategia especial
APLAZAR: Para v3.12 o fase especial
CONSIDERAR: Si cliente necesita histórico completo, negociar timeline
```

---

### GAP 2: `cotizaciones_matriz_responsabilidad` — HUÉRFANOS

**Bubble:** 55,128 registros  
**Supabase:** 33,082  
**Gap:** ~22,046 registros huérfanos

**Estado (L507-516):**
```
Los ~22k items faltantes son HUÉRFANOS en Bubble: existen como objetos 
pero ninguna cotización los referencia en su campo lista. 
No tienen cotizacion_id recuperable.

Decisión: No migrar los huérfanos
```

**Análisis:**
- **Año/Tenant:** Probablemente datos históricos o de prueba
- **Utilidad:** 0 (no están vinculados a ninguna cotización)

**Acción para v3.11:**
```
DECISIÓN: IGNORAR (sin valor funcional)
STATUS: Aceptado el gap
```

---

### GAP 3: `tareas` — INCOMPLETO

**Bubble:** ~14,461 registros  
**Supabase:** ~13,738  
**Gap:** -723 registros

**Estado (L349-366):**
```
PROD: ~13,738 | Bubble: ~14,461 | Gap: -723
```

**Análisis:**
- **Causas posibles:** Registros de otros tenants, tareas histórico viejo, tareas de prueba
- **Año/Tenant:** Ver análisis en "Campos faltantes en tareas" (GAP 3 del GAPS_AND_ACTIONS.md)

**Acción para v3.11:**
```
REVISAR EN BUBBLE: ¿Qué 723 tareas NO se migraron?
- ¿De qué años?
- ¿De qué tenants?
- ¿Son necesarias?
```

---

### GAP 4: `terceros_contactos` — PARCIALMENTE VACÍO

**Bubble:** ~884 registros  
**Supabase:** 734  
**Gap:** 150 huérfanos

**Estado (L184-200, L499-500):**
```
La API Bubble no devuelve contactos vía constraints.
Resultado: 734/884 migrados (150 huérfanos sin referencia en ninguna 
cotizacion/tarea — se aceptan como no vinculables).
```

**Análisis:**
- **Año/Tenant:** Datos de ambos tenants
- **Causa:** 150 contactos sin cotizaciones/tareas asociadas = huérfanos

**Acción para v3.11:**
```
REVISAR EN BUBBLE: ¿Qué 150 contactos son huérfanos?
- ¿De qué tenants?
- ¿Usar o ignorar?
```

---

### GAP 5: `cotizaciones_ofertas_proveedores` — MIGRADO con solución parcial

**Bubble:** ~721 registros  
**Supabase:** 0 → 722 (migrado con `cotizacion_id = NULL`)

**Estado (L291-310, L502-503):**
```
PROD: 0 | Bubble: ~721 | Prioridad: 🟠

La oferta en Bubble NO tiene cotizacion_id. La relación es invisible en API.
Solución: migrar con cotizacion_id = NULL + guardar cotizacion_bubble_id 
para reconciliación manual.
```

**Acción para v3.11:**
```
✅ MIGRADO: Las 722 ofertas están en Supabase pero sin vincular a cotizaciones
REVISAR: ¿Necesita reconciliación manual?
```

---

## 🟡 GAPS MEDIOS (Completitud parcial)

### GAP 6: `terceros` — BAJO GAP

**Bubble:** ~687 registros  
**Supabase:** 631  
**Gap:** -56 registros

**Estado (L205-224):**
```
PROD: 631 | Bubble: ~687 | Gap: -56
```

**Análisis:**
- **Causas posibles:** Terceros de otros tenants, clientes inactivos históricos
- **Año/Tenant:** Desconocido sin auditar en Bubble

---

### GAP 7: `cotizaciones_detalle` — BAJO GAP

**Bubble:** ~4,258 registros  
**Supabase:** 4,166  
**Gap:** -92 registros

**Estado (L272-288):**
```
PROD: 4,166 | Bubble: ~4,258 | Gap: -92

Estrategia: La relación va cotizacion.Lista Items Incluidos → []cotizacion_detalle
Requiere iterar cotizaciones y leer sus detalles.
Nota: Lista no expuesta en endpoint list, solo fetching individual (caro).
```

**Acción para v3.11:**
```
BAJO RIESGO: Solo 92 registros
REVISAR: ¿Qué 92 items no se traen?
- ¿De años viejos?
- ¿De otros tenants?
```

---

### GAP 8: `cotizaciones` — BAJO GAP

**Bubble:** ~2,644 registros  
**Supabase:** 2,581  
**Gap:** -63 registros

**Estado (L247-268):**
```
PROD: 2,581 | Bubble: ~2,644 | Gap: -63
```

---

### GAP 9: `tareas_recursos` — VALIDAR COMPLETITUD

**Supabase:** 36,461 registros  
**Estado:** ✅ done

**Nota:** Ver GAP-2 del GAPS_AND_ACTIONS.md sobre validar que 250 tareas tienen recursos

---

### GAP 10: `maquinaria_documentos` — PEQUEÑO GAP

**Bubble:** ~244 registros  
**Supabase:** 239  
**Gap:** -5 registros (+ 📎 archivos)

**Estado (L332-345):**
```
PROD: 239 | Bubble: ~244 | Gap: -5

Nota: 189 PDFs fueron migrados a Supabase Storage (✅ 2026-06-03)
```

---

### GAP 11: `inspecciones` — PEQUEÑO GAP

**Bubble:** ~13,796 registros  
**Supabase:** 13,747  
**Gap:** -49 registros (+ 📎 archivos)

**Estado (L370-382):**
```
PROD: 13,747 | Bubble: ~13,796 | Gap: -49
```

---

## ✅ CAMPOS/ARCHIVOS FALTANTES (NO datos faltantes)

### `PDFs Cotizaciones` (GAP-1 del GAPS_AND_ACTIONS.md)

**Documento mapeo (L447-460):**
```
Tabla: cotizaciones
Campo: pdf_url
Prioridad: 🟠

189 PDFs maquinaria_documentos migrados ✅
31 PDFs inspecciones migrados ✅
31 PDFs reportes_maquinaria migrados ✅
29 PDFs reportes_personal migrados ✅

FALTANTES: PDFs de cotizaciones (~40-50)
Razón: Migraciones ejecutadas no incluyeron descarga de PDFs cotizaciones
```

**Acción para v3.11:**
```
EJECUTAR: Script migrate-all-bubble-cdn-files.ts para cotizaciones.pdf_url
REVISAR: ¿Qué años tienen cotizaciones con PDF?
REVISAR: ¿De qué tenants?
```

---

### `Campos faltantes en Tareas`

**Documento GAPS_AND_ACTIONS (Gap 3):**
- `progreso_porcentaje` (400+)
- `tarea_padre_id` (50)
- `estado_seniat` (compliance)

**Mapeo:** L349-366
```
No están en mapeo del documento (creado antes de agregar estos campos)
Requiere auditoría en Bubble para años + tenants
```

---

### `notas_internas en Cotizaciones`

**Documento GAPS_AND_ACTIONS (Gap 4):**
- 1200+ registros en Bubble

**Mapeo:** No está documentado en el mapeo (probablemente agregado después)

---

## 📊 RESUMEN DE ACCIONES POR GAP

| # | Gap | Registros | Estado | Acción para v3.11 |
|---|-----|-----------|--------|-------------------|
| 1 | `inspecciones_detalles` | 180k | Incompleto | APLAZAR (muy grande) |
| 2 | `cotizaciones_matriz` (huérfanos) | 22k | Incompleto | IGNORAR (sin valor) |
| 3 | `tareas` | 723 | Incompleto | AUDITAR Bubble (año/tenant) |
| 4 | `terceros_contactos` (huérfanos) | 150 | Incompleto | AUDITAR Bubble |
| 5 | `cotizaciones_ofertas` | ~721 | Migrado con NULL | OK (vincular manual si necesario) |
| 6 | `terceros` | 56 | Incompleto | AUDITAR Bubble (bajo riesgo) |
| 7 | `cotizaciones_detalle` | 92 | Incompleto | AUDITAR Bubble (bajo riesgo) |
| 8 | `cotizaciones` | 63 | Incompleto | AUDITAR Bubble |
| 9 | `tareas_recursos` | N/A | Migrado ✅ | VALIDAR completitud |
| 10 | `maquinaria_documentos` | 5 | Incompleto | AUDITAR Bubble |
| 11 | `inspecciones` | 49 | Incompleto | AUDITAR Bubble |
| A | PDFs cotizaciones | 40-50 | FALTANTES | DESCARGAR + UPLOAD |
| B | `progreso_porcentaje` | 400+ | NO EXISTE | ADD COLUMN + MIGRAR |
| C | `tarea_padre_id` | 50 | NO EXISTE | ADD COLUMN + MIGRAR |
| D | `notas_internas` | 1200+ | NO EXISTE | ADD COLUMN + MIGRAR |

---

## 🎯 DECISIÓN OPERATIVA

**Para v3.11 (Semana 2026-07-15):**

### BLOQUEANTE (Ejecutar):
1. ✅ **PDFs Cotizaciones** (GAP A) — Script migrate-all-bubble-cdn-files
2. ✅ **progreso_porcentaje** (GAP B) — ADD COLUMN + Migrar de Bubble
3. ✅ **tarea_padre_id** (GAP C) — ADD COLUMN + Migrar de Bubble
4. ✅ **notas_internas** (GAP D) — ADD COLUMN + Migrar de Bubble
5. ✅ **tareas_recursos** (GAP 9) — VALIDAR completitud

### AUDITAR EN BUBBLE (Determinar año/tenant):
6. 🔍 **tareas** (GAP 3) — ¿De qué años? ¿De qué tenants?
7. 🔍 **terceros_contactos** (GAP 4) — 150 huérfanos ¿de dónde?
8. 🔍 **terceros** (GAP 6) — 56 faltantes ¿año/tenant?
9. 🔍 **cotizaciones_detalle** (GAP 7) — 92 items ¿de dónde?
10. 🔍 **cotizaciones** (GAP 8) — 63 faltantes ¿año/tenant?
11. 🔍 **maquinaria_documentos** (GAP 10) — 5 faltantes
12. 🔍 **inspecciones** (GAP 11) — 49 faltantes

### APLAZAR (No en v3.11):
- `inspecciones_detalles` (180k) → Fase especial v3.12+
- `cotizaciones_matriz` (22k huérfanos) → Ignorar

---

## 📝 TEMPLATE PARA AUDITORÍA BUBBLE

Para cada GAP del grupo "AUDITAR EN BUBBLE":

```
GAP-N: [nombre_tabla]

Bubble registros totales: XXX
Supabase registros: YYY
Faltantes: XXX - YYY = ZZZ

AUDITAR EN BUBBLE:
1. Filtrar: [criterios de búsqueda]
2. Agrupar por: AÑO + TENANT
3. Decisión:
   - ¿De otros tenants? → IGNORAR
   - ¿De 2020 o antes? → NEGOCIAR con cliente
   - ¿De CISE/GRÚAS reciente? → MIGRAR en v3.11
```

---

**Última actualización:** 2026-07-12  
**Status:** ✅ GAPS EXTRAÍDOS DEL MAPEO OFICIAL  
**Próximo:** Auditar en Bubble los 12 GAPs pendientes
