---
name: gaps-and-actions-final
description: Síntesis final - Hallazgos priorizados (ALTA/MEDIA/BAJA) + acciones concretas
metadata: 
  node_type: memory
  type: project
  status: complete
  created: 2026-07-12
  source: Backend (125k) + UI (61k) + Schema (64k) + Bubble (92k)
  total_tokens: 342k
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# GAPS & ACTIONS — Síntesis Final

**Fecha:** 2026-07-12  
**Análisis:** Exhaustivo (Backend + UI + Schema + Bubble)  
**Hallazgos:** 12 gaps (3 ALTA, 5 MEDIA, 4 BAJA)  
**Esfuerzo Total:** ~29 horas  
**Status:** ✅ ANÁLISIS COMPLETO

---

## RESUMEN EJECUTIVO

### Situación Actual
✅ **BD Supabase está INTACTA y BIEN ESTRUCTURADA**
- 150 tablas presentes
- 14 tablas críticas OK
- 93% con tenant_id (multi-tenancy correcto)
- RLS policies esperadas
- 55% con bubble_id (trazabilidad)

❌ **3 Gaps CRÍTICOS Detectados**
1. PDFs cotizaciones (~40-50) NO en Supabase Storage
2. Relaciones N:M tareas (maquinaria/personal) - falta auditoría
3. Campos faltantes en tareas (progreso, padre_id, estado_seniat)

✅ **71% de campos Bubble migrados correctamente**

---

## HALLAZGOS POR PRIORIDAD

---

## 🔴 ALTA PRIORIDAD (Bloquean operaciones críticas)

### GAP 1: PDFs de Cotizaciones NO Migrados

**Severidad:** 🔴 CRÍTICA  
**Módulo:** Cotizaciones → Ventas → Facturas  
**Impacto:** Cotizaciones enviadas sin PDFs; aprobaciones sin documentación

**Descripción:**
```
BUBBLE: Almacena ~40-50 PDFs de cotizaciones en S3 AWS legacy
SUPABASE: Bucket 'clients/{tenant_id}/cotizaciones-pdf' VACÍO

El sistema espera que:
- cotizaciones.pdf_url apunte a Storage
- Finalizaciones de aprobación requieren PDF
- Facturas vinculadas necesitan PDF histórico
```

**Root Cause:**
- Migración no incluyó archivos (solo schema + datos)
- PDFs quedan en S3 Bubble, no en Supabase Storage

**Acción Requerida:**
```
v3.11 (INMEDIATO):
1. Auditoría: Listar todos los PDFs en S3 Bubble
2. Descarga: Descargar PDFs a local (o directo S3→Supabase)
3. Upload: Subir a Supabase Storage
   Path: clients/{tenant_id}/cotizaciones-pdf/{cotizacion_id}.pdf
4. Validación:
   - Verificar que cotizaciones.pdf_url se actualiza
   - Confirmar que links públicos funcionan
5. Cleanup: Confirmar que S3 Bubble puede deprecarse (mantener 12mo)
```

**Esfuerzo:** 8 horas  
**Owner:** [DevOps / Data Migration]

---

### GAP 2: Relaciones N:M Tareas (Maquinaria/Personal) - Falta Validación

**Severidad:** 🔴 CRÍTICA  
**Módulo:** Tareas → Planificación → Asignación de recursos  
**Impacto:** Tareas sin recursos asignados; timeline vacía

**Descripción:**
```
BUBBLE: lista_maquinaria (ARRAY), lista_personal (ARRAY) como TEXT
SUPABASE: tareas_recursos (tabla junction) + tareas_fechas (tabla)

El sistema espera:
- Cada tarea tiene tareas_fechas (intervalos)
- Cada intervalo tiene tareas_recursos (maquinaria/personal)
- Query: tareas.*, fechas:tareas_fechas(*, recursos:tareas_recursos(*))
```

**Root Cause:**
- Normalización: ARRAY Bubble → tablas Supabase
- ¿Completitud?: 250 tareas en Supabase, pero ¿todas migraron recursos?

**Acción Requerida:**
```
v3.11 (INMEDIATO):
1. Auditoría SQL:
   SELECT COUNT(DISTINCT tarea_id) FROM tareas_recursos;
   Compare with: SELECT COUNT(*) FROM tareas WHERE is_active=true;
   
   Si < 80% coincidencia → falta migración
   
2. Si falta migración:
   - Exportar lista_maquinaria[] de Bubble por tarea
   - Crear INSERT INTO tareas_recursos para cada tarea
   - Validar FKs (maquinaria_id, personal_id existentes)
   
3. Validación UI:
   - /planificacion debe mostrar timeline con recursos
   - Sin recursos = visual vacío (ERROR)

4. Casos especiales:
   - Tareas sin recursos (¿válido o gap?)
   - Tareas con recursos pero sin fechas (órfanas)
```

**Esfuerzo:** 6 horas  
**Owner:** [Data Analyst / QA]

---

### GAP 3: Campos Faltantes en Tareas (progreso_porcentaje, tarea_padre_id)

**Severidad:** 🔴 CRÍTICA  
**Módulo:** Tareas → Planificación  
**Impacto:** No se puede trackear progreso; subtareas no funcionan

**Descripción:**
```
BUBBLE tiene:
- progreso_porcentaje (NUMERIC, 400+ registros con datos)
- tarea_padre_id (UUID, 50 tareas con subtareas)
- estado_seniat (TEXT, compliance)

SUPABASE: Campos NO existen
```

**Root Cause:**
- Campos no incluidos en schema inicial
- Backend + UI expectan estos campos en planificación

**Acción Requerida:**
```
v3.11 (INMEDIATO):
1. Agregar columnas:
   ALTER TABLE tareas ADD COLUMN progreso_porcentaje NUMERIC(5,2);
   ALTER TABLE tareas ADD COLUMN tarea_padre_id UUID REFERENCES tareas(id);
   
2. Migración de datos (Bubble → Supabase):
   UPDATE tareas SET progreso_porcentaje = ...
   UPDATE tareas SET tarea_padre_id = ... (solo 50 registros)

3. Validar UI:
   - /planificacion muestra progreso_porcentaje
   - Subtareas se expanden en timeline

4. RLS:
   - Asegurar que RLS policy funciona con tarea_padre_id
```

**Esfuerzo:** 4 horas  
**Owner:** [Data Engineer]

---

## 🟡 MEDIA PRIORIDAD (Afectan funcionalidad, pero no bloquean)

### GAP 4: notas_internas en Cotizaciones (1200+ registros)

**Severidad:** 🟡 MEDIA  
**Módulo:** Cotizaciones  
**Impacto:** Notas privadas perdidas en transición

**Acción:**
```
v3.11:
ALTER TABLE cotizaciones ADD COLUMN notas_internas TEXT;
UPDATE cotizaciones SET notas_internas = ... (from Bubble)

Esfuerzo: 1.5 horas
```

---

### GAP 5: progreso_porcentaje en Tareas (400+ registros)

**Severidad:** 🟡 MEDIA  
**Módulo:** Tareas → Dashboard  
**Impacto:** Historial de progreso perdido

**Acción:**
```
v3.11:
ALTER TABLE tareas ADD COLUMN progreso_porcentaje NUMERIC;
UPDATE tareas SET progreso_porcentaje = ... (from Bubble)

Esfuerzo: 1.5 horas
```

---

### GAP 6: logo_proveedor en Cotizaciones (30 registros)

**Severidad:** 🟡 MEDIA  
**Módulo:** Cotizaciones → Ofertas  
**Impacto:** Logos de proveedores no mostrados en ofertas

**Acción:**
```
v3.11:
1. Auditar si UI espera logo_proveedor
2. Si no lo espera: ignorar (deuda técnica)
3. Si lo espera:
   ALTER TABLE cotizaciones_ofertas_proveedores ADD COLUMN logo_url TEXT;
   Copiar logos a Storage

Esfuerzo: 1 hora (si ignorar) o 3 horas (si llevar)
```

---

### GAP 7: Validación de Integridad (FKs, Constraints)

**Severidad:** 🟡 MEDIA  
**Módulo:** Todas las tablas  
**Impacto:** Queries pueden fallar con orphaned records

**Acción:**
```
v3.11:
1. Ejecutar queries de auditoría SQL (en SCHEMA_VALIDATION.md)
2. Identificar registros huérfanos
3. Decidir: ¿borrar o reparar?

Esfuerzo: 2 horas
```

---

### GAP 8: Catálogos Sincronizados (rubros, paises, tipos_precio)

**Severidad:** 🟡 MEDIA  
**Módulo:** Catálogos → Terceros, Cotizaciones, Servicios  
**Impacto:** Dropdowns vacíos o inconsistentes

**Acción:**
```
v3.11:
1. Verificar que catálogos tienen valores
2. Comparar Bubble vs Supabase
3. Llevar faltantes

Esfuerzo: 1 hora
```

---

## 🟡 BAJA PRIORIDAD (Nice-to-have, documentar como deuda técnica)

### GAP 9: tarea_padre_id (Subtareas) - 50 registros

**Severidad:** 🟡 BAJA  
**Módulo:** Tareas  
**Impacto:** Subtareas no se expanden en timeline

**Decision:** Llevar en v3.12 (no crítico para v3.11)  
**Esfuerzo:** 4 horas

---

### GAP 10: estado_seniat (Compliance) - Tareas

**Severidad:** 🟡 BAJA  
**Módulo:** Tareas → Reporting  
**Impacto:** Reportes de compliance incompletos

**Decision:** Documentar en ROADMAP v3.12  
**Esfuerzo:** 2 horas

---

### GAP 11: condicion_maquinaria (Estado) - Tareas

**Severidad:** 🟡 BAJA  
**Módulo:** Tareas → Reportes  
**Impacto:** Detalles de estado maquinaria perdidos

**Decision:** Documentar en ROADMAP v3.12  
**Esfuerzo:** 2 horas

---

### GAP 12: Campos Deprecated en Bubble (IGNORAR)

**Severidad:** ℹ️ INFO  
**Módulo:** Tareas  
**Campos:** -BORRAR-27-08, -NUEVO-27-08, etc.

**Decision:** NUNCA copiar estos campos a Supabase (datos basura)  
**Esfuerzo:** 0 (ignorar)

---

## RESUMEN POR VERSIÓN

### v3.11 (INMEDIATO - 11-19 horas)

**CRÍTICOS (11h):**
- ✅ PDFs Cotizaciones → Storage (8h)
- ✅ Validar tareas_recursos completitud (6h)
- ✅ Agregar progreso_porcentaje + tarea_padre_id (4h)

**MEDIA (4.5h):**
- ✅ notas_internas Cotizaciones (1.5h)
- ✅ Validar FKs/Constraints (2h)
- ✅ Sincronizar Catálogos (1h)

**Total v3.11:** 15.5 horas (1-2 sprints)

---

### v3.12 (PRONTO - 8 horas)

**BAJA:**
- [ ] tarea_padre_id completo (subtareas) (4h)
- [ ] estado_seniat (compliance) (2h)
- [ ] condicion_maquinaria (2h)

**Total v3.12:** 8 horas (1 sprint)

---

### DEUDA TÉCNICA / FUTURO

- [ ] Deprecar S3 Bucket Bubble (keep 12 months for legacy)
- [ ] logo_proveedor en Cotizaciones (si no se usa)
- [ ] Deprecated fields - nunca copiar

---

## MATRIZ DE RIESGOS

| Gap | Riesgo | Probabilidad | Impacto | Mitigation |
|-----|--------|--------------|---------|-----------|
| PDFs faltantes | Aprobaciones sin documentos | ALTA | CRÍTICO | Auditoría inmediata |
| tareas_recursos incompleto | Timeline vacía | MEDIA | CRÍTICO | Validar 100% |
| campos progreso faltantes | Dashboard no funciona | MEDIA | ALTO | ADD COLUMN + Migrate |
| FKs rotos | Queries fallan | BAJA | MEDIO | Auditoría + Fix |
| Catálogos desincronizados | UI vacía | BAJA | MEDIO | Sincronizar |

---

## CRITERIOS DE ÉXITO

### v3.11 Checklist
- [ ] Todos los PDFs de cotizaciones en Supabase Storage
- [ ] tareas_recursos tiene 80%+ completitud vs tareas
- [ ] tareas.progreso_porcentaje + tarea_padre_id existen + poblados
- [ ] FKs validadas: 0 orphaned records
- [ ] Catálogos sincronizados: 100% cobertura
- [ ] UI: /planificacion muestra timeline completo
- [ ] E2E tests: smoke suite 18/18 (PASA)

### Post-Migration Verification
- [ ] Backend queries funcionan sin error
- [ ] UI renderiza datos correctamente
- [ ] Bubble → Supabase: 100% de datos válidos
- [ ] Storage: PDFs accesibles
- [ ] Performance: queries < 100ms (p95)

---

## RECOMENDACIÓN FINAL

✅ **PROCEDER CON CONFIANZA**

**La BD está 71% migrada correctamente.** Los 3 gaps CRÍTICOS son identificables y reparables en 11-19 horas.

**Roadmap recomendado:**
1. **Hoy:** Crear tickets v3.11 con los 3 gaps críticos
2. **Esta semana:** Ejecutar auditorías (PDFs, tareas_recursos, FKs)
3. **Next sprint:** Agregar campos + migrar datos
4. **Validación:** E2E suite + pruebas en TEST
5. **v3.12:** Completar deuda técnica (subtareas, compliance)

**No esperar a que esté "perfecto"** — los gaps son manejables y documentados.

---

**Última actualización:** 2026-07-12  
**Status:** ✅ ANÁLISIS FINAL COMPLETO  
**Recomendación:** PROCEDER A IMPLEMENTACIÓN
