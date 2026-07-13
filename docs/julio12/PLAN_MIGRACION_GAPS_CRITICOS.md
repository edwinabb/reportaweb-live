---
name: plan-migracion-gaps-criticos-julio2026
description: "Plan detallado: Migrar inspecciones_detalles + cotizaciones_matriz (2025-2026 + años anteriores, solo CISE+GRÚAS)"
metadata:
  created: 2026-07-12
  applies_to: v3.11 + v3.12
  scope: CISE + GRÚAS only
  target_tables: inspecciones_detalles, cotizaciones_matriz
---

# 📋 PLAN DE MIGRACIÓN: INSPECCIONES_DETALLES + COTIZACIONES_MATRIZ

**Fecha:** 2026-07-12  
**Versión:** v3.11+  
**Ámbito:** CISE + GRÚAS solamente

---

## 📊 CONTEXTO ACTUAL

### Bubble vs Supabase (Estado 2026-06-03)

| Tabla | Bubble | Supabase | Gap | Prioridad | Bloqueador |
|-------|--------|----------|-----|-----------|-----------|
| `inspecciones_detalles` | ~317,878 | 138,528 | ~179,350 | 🔴 CRÍTICA | Bubble API limita 50k/query |
| `cotizaciones_matriz` | 55,128 | 33,082 | ~22,046 | 🟡 MEDIA | Huérfanos (sin cotizacion_id) |

---

## 🔴 TABLA 1: INSPECCIONES_DETALLES

### PROBLEMA TÉCNICO

**Volumen:** ~317,878 registros (6 años de datos)  
**Limitación:** Bubble API retorna máx 50k registros/query (sin importar constraint)  
**Solución:** Paginación por **rangos de fecha (trimestres)**

### ESTRATEGIA DE MIGRACIÓN

**Paso 1: Auditoría inicial en Bubble**

```sql
-- Determinar años presentes en Bubble
SELECT 
  DATE_TRUNC('year', created_at)::date as año,
  COUNT(*) as registros
FROM bubble_informe_respuesta
WHERE tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',  -- CISE
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'   -- GRÚAS
)
GROUP BY año
ORDER BY año DESC;

-- Resultado esperado:
-- 2026-01-01 | ~80,000
-- 2025-01-01 | ~95,000
-- 2024-01-01 | ~55,000
-- 2023-01-01 | ~45,000
-- ... (años anteriores)
```

**Paso 2: Paginación por trimestres**

```sql
-- Para cada trimestre, contar registros (verificar < 50k)
SELECT 
  DATE_TRUNC('quarter', created_at)::date as trimestre,
  COUNT(*) as registros
FROM bubble_informe_respuesta
WHERE tenant_id IN ('1cb97ec7...', '6f4c923a...')
  AND created_at >= '2025-01-01'
GROUP BY trimestre
ORDER BY trimestre DESC;

-- Si algún trimestre > 50k, dividir en meses
-- Si algún mes > 50k, dividir en semanas
```

**Paso 3: Fetch con cursor (paginación)** 

```javascript
// Pseudocódigo: migrate-inspecciones-detalles-v4.ts
const TENANT_IDS = [
  '1cb97ec7-326c-4376-93ee-ed317d3da51b', // CISE
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'  // GRÚAS
];

const WINDOWS = [
  { start: '2026-01-01', end: '2026-06-30', label: 'Q2 2026' },
  { start: '2025-10-01', end: '2025-12-31', label: 'Q4 2025' },
  { start: '2025-07-01', end: '2025-09-30', label: 'Q3 2025' },
  { start: '2025-04-01', end: '2025-06-30', label: 'Q2 2025' },
  { start: '2025-01-01', end: '2025-03-31', label: 'Q1 2025' },
  { start: '2024-01-01', end: '2024-12-31', label: '2024 (full)' },
  { start: '2023-01-01', end: '2023-12-31', label: '2023 (full)' },
  // ... años anteriores
];

for (const window of WINDOWS) {
  for (const tenantId of TENANT_IDS) {
    // Fetch con constraint: created_at BETWEEN window.start AND window.end
    const records = await fetchAllBubble('informe_respuesta', {
      constraints: [
        { key: 'id_empresa', value: tenantId },
        { key: 'Created Date', operator: '>=', value: window.start },
        { key: 'Created Date', operator: '<', value: window.end }
      ]
    });
    
    // Upsert a Supabase
    await supabase.from('inspecciones_detalles').upsert(records, {
      onConflict: 'bubble_id'
    });
    
    console.log(`${window.label} | ${tenantId.slice(0,8)}... | ${records.length} insertados`);
  }
}
```

### ESTIMACIÓN DE REGISTROS POR VENTANA

Asumiendo distribución uniforme (~50k/trimestre):

```
2026 (6 meses)     | CISE: ~8k     | GRÚAS: ~12k    | Total: 20k
2025 (12 meses)    | CISE: ~16k    | GRÚAS: ~24k    | Total: 40k
2024 (12 meses)    | CISE: ~13k    | GRÚAS: ~20k    | Total: 33k
2023 (12 meses)    | CISE: ~11k    | GRÚAS: ~17k    | Total: 28k
2022 (12 meses)    | CISE: ~9k     | GRÚAS: ~14k    | Total: 23k
2021 (12 meses)    | CISE: ~7k     | GRÚAS: ~11k    | Total: 18k
2020 (12 meses)    | CISE: ~5k     | GRÚAS: ~8k     | Total: 13k
---
**TOTAL ESTIMADO**  | CISE: ~69k    | GRÚAS: ~106k   | **175k registros**
```

### PASOS A SEGUIR

**PASO 1: Auditoría (30 min)**
- [ ] Ejecutar query "Determinar años presentes" en Bubble
- [ ] Confirmar distribución por año/tenant
- [ ] Crear tabla WINDOWS (trimestres/meses/semanas según tamaño)

**PASO 2: Crear script (2-3 horas)**
- [ ] Crear `scripts/migrate-inspecciones-detalles-v4.ts`
- [ ] Implementar loop por WINDOWS × TENANTS
- [ ] Implementar retry logic + error handling
- [ ] Agregar logging por ventana

**PASO 3: Test en TEST environment (1 hora)**
- [ ] Ejecutar en TEST: `npm run migrate:inspecciones-detalles-v4 --env test`
- [ ] Verificar count por ventana
- [ ] Confirmar 0 errores

**PASO 4: Ejecutar en PROD (2-3 horas runtime)**
- [ ] Ejecutar en PROD: `npm run migrate:inspecciones-detalles-v4 --env prod`
- [ ] Monitorear: logs, CPU, memoria
- [ ] Post-ejecución: count final vs Bubble

**PASO 5: Validación (1 hora)**
- [ ] Query: `SELECT COUNT(*) FROM inspecciones_detalles WHERE tenant_id = ?`
- [ ] Comparar vs Bubble: expected ~175k
- [ ] Validar FKs: inspeccion_id existen en inspecciones

---

## 🟡 TABLA 2: COTIZACIONES_MATRIZ

### PROBLEMA TÉCNICO

**Volumen:** 55,128 en Bubble / 33,082 en Supabase = **~22,046 huérfanos**  
**Causa:** Items sin `cotizacion_id` (relación inversa en Bubble, no recuperable vía API list)

### ANÁLISIS DEL GAP

**Hallazgo del mapeo (2026-06-03):**
```
Los ~22k items faltantes son HUÉRFANOS en Bubble:
- Existen como objetos del tipo cotizaciones_matriz_responsabilidad
- Pero NINGUNA cotización los referencia en su campo 
  "Lista Items Matriz de Responsabilidad"
- No tienen cotizacion_id recuperable
- Decisión: No migrar (sin valor funcional)
```

### DECISIÓN OPERATIVA

**Opción A: IGNORAR (Recomendado)**
```
Razón: Huérfanos = sin cotización vinculada = sin valor operativo
Impacto: 0 (no rompe funcionalidad)
Esfuerzo: 0
Riesgo: BAJO
```

**Opción B: MIGRAR CON NULL (Alternativa)**
```
Si futuro cliente necesita reconciliación manual:
1. Migrar todos los 55,128 con cotizacion_id = NULL
2. Guardar cotizacion_bubble_id para reconciliación
3. Crear UI de "Items Huérfanos" para admin

Esfuerzo: 4-6 horas
Riesgo: MEDIO (requiere schema change + UI)
```

### RECOMENDACIÓN

**✅ OPCIÓN A: IGNORAR** (decisión original del mapeo)

**Justificación:**
- Los 22k huérfanos no están vinculados a cotizaciones activas
- No rompen funcionalidad
- Económicamente no vale el esfuerzo
- Si cliente los necesita (futuro), se pueden recuperar con SQL directo

**Plan alternativo (si cliente insiste):**
- Documentar en ROADMAP v3.13
- Negotiated timeline: Q3 2026 (después de v3.12)

---

## 📊 RESUMEN: CUÁNTOS REGISTROS POR REVISAR

### Inspecciones_detalles

**Total a migrar:** ~175,000 registros

| Año | CISE | GRÚAS | Total | Estado |
|-----|------|-------|-------|--------|
| 2026 (6m) | 8k | 12k | 20k | ✅ Revisar |
| 2025 | 16k | 24k | 40k | ✅ Revisar |
| 2024 | 13k | 20k | 33k | ✅ Revisar |
| 2023 | 11k | 17k | 28k | ✅ Revisar |
| 2022 | 9k | 14k | 23k | ✅ Revisar |
| 2021 | 7k | 11k | 18k | ✅ Revisar |
| 2020 | 5k | 8k | 13k | ⏳ Opcional (años muy viejos) |
| **TOTAL** | **69k** | **106k** | **175k** | — |

**Para revisar pasos a seguir:** ~140k (excluyendo 2020) o ~175k (incluyendo)

### Cotizaciones_matriz

**Decisión:** ✅ **IGNORAR** (22k huérfanos, sin valor)

---

## 🛠️ PLAN DE EJECUCIÓN

### SEMANA 1 (2026-07-15 a 2026-07-19) — PREPARACIÓN

- [ ] **Lunes:** Auditoría en Bubble (años presentes, distribución por tenant)
- [ ] **Martes:** Crear script v4 (paginación por ventanas)
- [ ] **Miércoles:** Test en TEST environment
- [ ] **Jueves-Viernes:** Test en PROD (horario off-peak)

### SEMANA 2 (2026-07-22 a 2026-07-26) — EJECUCIÓN COMPLETA

- [ ] **Lunes:** Ejecutar inspecciones_detalles en PROD (~3 horas)
- [ ] **Martes:** Validación + verificación FKs
- [ ] **Miércoles-Viernes:** Resolución de issues (si aplica)

### SEMANA 3+ — DOCUMENTACIÓN + REFINAMIENTO

- [ ] Documentar lecciones aprendidas
- [ ] Crear runbook para futuras migraciones masivas
- [ ] Considerar cotizaciones_matriz si cliente lo requiere

---

## 📋 QUERYS AUDITORÍA (COPIA/PEGA)

### Auditoría Inspecciones_detalles en Bubble

```javascript
// Obtener años presentes
const response = await fetch('https://reporta.la/api/1.1/obj/informe_respuesta?limit=1000&sort=-Created Date', {
  headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}` }
});
const data = await response.json();

// Agrupar por año (en JavaScript)
const byYear = {};
data.response.results.forEach(item => {
  const year = new Date(item['Created Date']).getFullYear();
  byYear[year] = (byYear[year] || 0) + 1;
});
console.table(byYear);
```

### Auditoría en Supabase (POST-MIGRACIÓN)

```sql
-- Verificar total migrados
SELECT COUNT(*) as total FROM inspecciones_detalles;

-- Por año
SELECT 
  EXTRACT(YEAR FROM created_at) as año,
  COUNT(*) as registros
FROM inspecciones_detalles
WHERE tenant_id IN (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b',
  '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
)
GROUP BY año
ORDER BY año DESC;

-- Validar FKs
SELECT COUNT(*) as huerfanos
FROM inspecciones_detalles id
LEFT JOIN inspecciones i ON id.inspeccion_id = i.id
WHERE i.id IS NULL;  -- Debe ser 0
```

---

## ✅ CHECKLIST FINAL

**Antes de empezar:**
- [ ] REGLA confirmada: Solo CISE + GRÚAS
- [ ] Años a migrar definidos (2025-2026 + anteriores)
- [ ] Cantidad de registros confirmada (~175k para inspecciones)
- [ ] Cotizaciones_matriz: Decisión tomada (IGNORAR)

**Durante migración:**
- [ ] Script v4 probado en TEST
- [ ] Logs capturando por-ventana
- [ ] Monitoreo de errores en tiempo real
- [ ] Rollback plan definido (si necesario)

**Post-migración:**
- [ ] Count final vs Bubble
- [ ] FK integrity check
- [ ] UI verificación (inspecciones_detalles visibles)
- [ ] Documentación de resultados

---

## 📞 CONTACTO/ESCALATE

Si encuentras:
- ❌ Errores de API Bubble → Contactar Bubble support (credenciales en config_credentials_supabase.md)
- ❌ Timeout en Supabase → Dividir por meses en lugar de trimestres
- ❌ FKs rotos → Auditoría de inspecciones (tabla padre)

---

**Última actualización:** 2026-07-12  
**Status:** ✅ PLAN LISTO PARA EJECUTAR  
**Próximo:** Ejecutar auditoría en Bubble para confirmar números reales
