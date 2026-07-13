---
name: database-recovery-plan-v1
description: Plan exhaustivo de recuperación de BD Supabase (borrada hace 1 mes). 170+ migrations + UI + Bubble data.
metadata: 
  node_type: memory
  type: project
  status: in_planning
  created: 2026-07-12
  estimated_duration: 3-4 días
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# Database Recovery Plan — REPORTA (2026-07-12)

## Situación Actual

| Aspecto | Detalles |
|--------|----------|
| **BD Supabase** | 🔴 Borrada hace ~1 mes (sin recuperación) |
| **Código Frontend** | ✅ Completo (Next.js 16 + React 19, UI implementada) |
| **Migrations Históricas** | ✅ 170+ archivos `.sql` en `supabase/migrations/` |
| **Schema Consolidated** | ✅ `supabase_consolidated_migration.sql` disponible |
| **Server Actions** | ✅ 50+ archivos documentando acceso a BD |
| **Datos Históricos** | ✅ Disponibles en Bubble (sistema antiguo) |

---

## Estrategia General

```
FASE 0: DIAGNOSTICO
  ├─ 0.1: Mapear todas las tablas/campos desde migrations
  ├─ 0.2: Auditar UI para identificar qué datos muestra
  ├─ 0.3: Revisar server actions para entender dependencias
  └─ 0.4: Documentar gaps entre Bubble → Supabase

FASE 1: PREPARACION (1.5 días)
  ├─ 1.1: Crear schema base (migrations consolid.)
  ├─ 1.2: Validar sintaxis SQL
  ├─ 1.3: Crear tenant + usuarios test
  └─ 1.4: Validar que la UI se conecte

FASE 2: MIGRACION DE DATOS (1.5 días)
  ├─ 2.1: Bubble → Staging (CSV exports)
  ├─ 2.2: Staging → Supabase (ETL scripts)
  ├─ 2.3: Validar integridad de datos (FKs, constraints)
  └─ 2.4: Reconciliar datos faltantes (Supabase vs Bubble)

FASE 3: VALIDACION (1 día)
  ├─ 3.1: E2E smoke tests (conectar UI a BD)
  ├─ 3.2: Validar cada módulo (cotizaciones, tareas, etc.)
  ├─ 3.3: Auditar permisos (RLS policies)
  └─ 3.4: Performance check (queries lentas)

FASE 4: CUTOVER (4-6 horas)
  ├─ 4.1: Backup final de Bubble
  ├─ 4.2: Corte de acceso a sistema antiguo
  ├─ 4.3: Validación final de datos
  └─ 4.4: Anuncio a usuarios
```

---

## Fase 0: Diagnóstico (HOY — 12 horas)

### 0.1 Mapear Todas las Tablas desde Migrations

**Objetivo:** Listar todas las tablas + enums + funciones + vistas

**Artefactos:**
- `SCHEMA_MAPPING.md` — Tabla completa de tablas/campos
- `schema_tables_list.txt` — Salida de migrations parseadas

**Método:**
1. Parsear migrations ordenadas cronológicamente (✅ tenemos lista de 170 archivos)
2. Identificar CREATE TABLE, ENUM, VIEW, FUNCTION
3. Extraer: nombre_tabla, campos, tipos, constraints, FK
4. Agrupar por módulo: auth, terceros, tareas, cotizaciones, reportes, etc.

**Resultado esperado:**
- [ ] 40-50 tablas mapeadas
- [ ] 100+ enums identificados
- [ ] 20+ vistas/funciones listadas

---

### 0.2 Auditar UI para Identificar Qué Datos Muestra

**Objetivo:** Cross-check entre BD schema y lo que la UI espera

**Método:**
1. Revisar componentes principales (cotizaciones, tareas, reportes, etc.)
2. Identificar queries/mutations usadas (server actions)
3. Verificar que todas las columnas que usa la UI existen en schema

**Artefactos:**
- `UI_DATA_REQUIREMENTS.md` — Por módulo, qué campos usa

**Riesgo a detectar:**
- [ ] Campos que la UI usa pero no están en migrations
- [ ] Tablas que migrations espera pero UI no usa

---

### 0.3 Revisar Server Actions para Entender Dependencias

**Objetivo:** Trazar qué tablas/campos usan los 50+ server actions

**Método:**
1. Leer cada archivo en `lib/actions/` (50+ archivos)
2. Extraer consultas Supabase (`.select()`, `.insert()`, `.update()`)
3. Identificar columnas + relaciones (joins)
4. Documentar orden de inserción (si A FK B, insertar B primero)

**Artefactos:**
- `SERVER_ACTIONS_DEPS.md` — Por acción, qué tablas toca

**Riesgo a detectar:**
- [ ] Orden de inserciones (evitar FK violations)
- [ ] Columnas opcionales vs requeridas

---

### 0.4 Documentar Gaps: Bubble ↔ Supabase

**Objetivo:** Identificar datos que existen en Bubble pero no en Supabase schema

**Método:**
1. Revisar tablas Bubble (si tienes acceso a BD o export CSV)
2. Comparar campos contra migrations
3. Decidir: ¿llevar a Supabase? ¿es deuda técnica?

**Artefactos:**
- `BUBBLE_GAPS.md` — Qué datos migrar de Bubble

**Ejemplo:**
```
Bubble table: Terceros
  - nombre (✅ exists supabase)
  - email (✅ exists)
  - telefono (✅ exists)
  - notas_bubble (❌ NO en supabase) → ¿llevar?
```

---

## Fase 1: Preparación (Día 1, 1.5 días)

### 1.1 Crear Schema Base

**Objetivo:** Ejecutar migrations en orden en Supabase TEST (ambiente nuevo)

**Método:**
1. Limpiar Supabase TEST (vaciar public schema)
2. Ejecutar `supabase_consolidated_migration.sql` O ejecutar migrations una por una
3. Validar que todas las tablas + funciones existen

**Comando:**
```bash
# En Supabase SQL Editor (TEST):
-- Ejecutar supabase_consolidated_migration.sql completo
```

**Validación:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Artefactos:**
- `PHASE1_CREATE_SCHEMA.md` — Logs de creación exitosa

---

### 1.2 Validar Sintaxis SQL

**Objetivo:** Detectar errores de sintaxis antes de intentar insertar datos

**Método:**
1. Revisar errores en Supabase SQL Editor
2. Si hay error en migration X, investigar + fijar
3. Documentar qué falló + por qué

**Artefactos:**
- `SCHEMA_VALIDATION_ERRORS.md` — Errores encontrados + fixes

---

### 1.3 Crear Tenant + Usuarios Test

**Objetivo:** Tener data mínima para probar que UI se conecta

**Método:**
```sql
-- 1. Crear tenant (company)
INSERT INTO companies (id, name, ruc, is_active)
VALUES (
  '1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid,
  'CISE',
  '20000000000',
  true
);

-- 2. Crear usuarios en auth.users (via Supabase UI)
-- emails: e2e-planner@reporta.la, e2e-admin@reporta.la, e2e-viewer@reporta.la

-- 3. Crear profiles
INSERT INTO profiles (id, tenant_id, email, first_name, last_name, role)
VALUES (
  <auth.uid>,'1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, 'e2e-planner@reporta.la', 'E2E', 'Planner', 'planner'
);
```

**Artefactos:**
- `PHASE1_TEST_DATA.sql` — Script idempotente para crear data test

---

### 1.4 Validar Que UI Se Conecte

**Objetivo:** Hacer login + verificar que API funciona

**Método:**
1. Arrancar `npm run dev`
2. Ir a login
3. Logearse con e2e-planner@reporta.la
4. Verificar que al menos 1 página carga sin error 500
5. Revisar Sentry para errores

**Artefactos:**
- `PHASE1_UI_CONNECTION.md` — Screenshots + logs de éxito

---

## Fase 2: Migración de Datos (Día 2-3, 1.5 días)

### 2.1 Bubble → Staging (CSV Exports)

**Objetivo:** Exportar datos de Bubble en formato que podamos parsear

**Método:**
1. En Bubble, exportar cada tabla a CSV (Data > Export)
2. Guardar en `C:\tmp\bubble_exports\`
3. Documentar orden de exportación + rowcount

**Artefactos:**
- CSV files en `C:\tmp\bubble_exports/`
- `PHASE2_BUBBLE_EXPORTS.md` — Log de qué se exportó

**Ejemplo:**
```
Exported:
✅ Terceros (1250 rows)
✅ Maquinaria (340 rows)
✅ Contactos (2100 rows)
⏳ Inspecciones (pending access)
```

---

### 2.2 Staging → Supabase (ETL Scripts)

**Objetivo:** Convertir CSVs Bubble → inserts Supabase

**Método:**
1. Para cada tabla, crear script ETL:
   ```typescript
   // scripts/migrate/migrate-terceros.ts
   import { createClient } from '@supabase/supabase-js'
   import * as fs from 'fs'
   import * as csv from 'csv-parse'
   
   // Leer CSV
   // Mapear campos Bubble → Supabase
   // Insertar respetando FKs
   // Generar nuevos UUIDs si necesario
   // Mappear bubble_id → id
   ```

2. Ejecutar por orden de dependencias (padres antes que hijos):
   - companies (tenant)
   - profiles (usuarios)
   - terceros
   - maquinaria
   - tareas (FK terceros + maquinaria)
   - etc.

**Artefactos:**
- `scripts/migrate/` — Carpeta con ETL por tabla
- `PHASE2_MIGRATION_LOG.md` — Qué se insertó, cuándo, con qué errors

---

### 2.3 Validar Integridad de Datos

**Objetivo:** Verificar que no hay orphan FKs ni datos corruptos

**Método:**
```sql
-- Para cada tabla con FK:
SELECT t1.id, t1.nombre, t1.tercero_id
FROM tareas t1
WHERE t1.tercero_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM terceros t2 WHERE t2.id = t1.tercero_id
  );

-- Si hay resultados → datos corruptos
```

**Artefactos:**
- `PHASE2_INTEGRITY_CHECKS.sql` — Queries de validación
- `PHASE2_INTEGRITY_RESULTS.md` — Qué se encontró + fixes

---

### 2.4 Reconciliar Datos Faltantes

**Objetivo:** Si hay gaps entre Bubble + Supabase, decidir acción

**Método:**
1. Revisar `BUBBLE_GAPS.md` (creado en Fase 0.4)
2. Para cada gap:
   - ¿Es crítico? → Llevar a Supabase (new column)
   - ¿Es deuda técnica? → Documentar en ROADMAP
   - ¿Es obsoleto? → Ignorar

**Artefactos:**
- `PHASE2_GAPS_RESOLUTION.md` — Decisiones tomadas

---

## Fase 3: Validación (Día 4, 1 día)

### 3.1 E2E Smoke Tests

**Objetivo:** Verificar que la UI se conecta + obtiene datos

**Método:**
```bash
npm run test:e2e:smoke
```

**Expected:** 18 smoke tests en verde (sidebar tests)

**Artefactos:**
- `PHASE3_SMOKE_RESULTS.md` — Reporte de tests

---

### 3.2 Validar Cada Módulo

**Objetivo:** Testear cada feature manualmente o con E2E

**Método:**
Revisar checklist en `AUDIT_CHECKLIST.md` (que crearemos ahora):
```
Módulo Cotizaciones:
  ✅ Crear cotización
  ✅ Ver listado
  ✅ Editar
  ✅ Generar PDF
  
Módulo Tareas:
  ✅ Crear tarea
  ✅ Asignar recursos
  ✅ Ver agenda
  ...
```

**Artefactos:**
- `PHASE3_MODULE_VALIDATION.md` — Qué se testó + resultados

---

### 3.3 Auditar Permisos (RLS)

**Objetivo:** Verificar que RLS policies dejan acceder solo a su tenant

**Método:**
1. Logearse como usuario CISE
2. Intentar acceder a datos de GRUAS (otro tenant)
3. Debe fallar (403 o sin resultados)

**Artefactos:**
- `PHASE3_RLS_AUDIT.md` — Qué se validó + gaps

---

### 3.4 Performance Check

**Objetivo:** Verificar que queries no son lentas

**Método:**
```sql
-- En Supabase > SQL Editor > Logs:
-- Ver qué queries toman > 100ms
-- Revisar query plans (EXPLAIN ANALYZE)
```

**Artefactos:**
- `PHASE3_PERFORMANCE.md` — Queries lentas identificadas + fixes

---

## Fase 4: Cutover (Día 5, 4-6 horas)

### 4.1 Backup Final de Bubble

**Objetivo:** Asegurar que no perdemos datos antes de corte

**Método:**
1. Export completo de Bubble (todas las tablas)
2. Guardar en `C:\tmp\bubble_final_backup_20260712/`
3. Verificar que todos los archivos existen

**Artefactos:**
- Carpeta de backup en local + en cloud (drive)

---

### 4.2 Validación Final de Datos

**Objetivo:** Último check antes de anunciar

**Método:**
```bash
npm run test:e2e              # Full suite
npm run test:e2e:smoke        # Smoke canario
```

**Expected:** 95%+ tests en verde

**Artefactos:**
- `PHASE4_FINAL_VALIDATION.md` — Reporte final

---

### 4.3 Anuncio a Usuarios

**Artefacto:**
- Email template en `PHASE4_USER_ANNOUNCEMENT.md`

---

## Artefactos Entregables Finales

```
C:\Users\Usuario\.claude\projects\C--Proyectos-reportaweb3\memory\
├── RECOVERY_PLAN.md (este archivo)
├── SCHEMA_MAPPING.md (creado en Fase 0.1)
├── UI_DATA_REQUIREMENTS.md (creado en Fase 0.2)
├── SERVER_ACTIONS_DEPS.md (creado en Fase 0.3)
├── BUBBLE_GAPS.md (creado en Fase 0.4)
├── AUDIT_CHECKLIST.md (creado durante plan)
├── GOAL_PROMPT.md (creado al final)
│
├── PHASE1_CREATE_SCHEMA.md
├── PHASE1_TEST_DATA.sql
├── PHASE1_UI_CONNECTION.md
│
├── PHASE2_BUBBLE_EXPORTS.md
├── PHASE2_MIGRATION_LOG.md
├── PHASE2_INTEGRITY_CHECKS.sql
├── PHASE2_INTEGRITY_RESULTS.md
├── PHASE2_GAPS_RESOLUTION.md
│
├── PHASE3_SMOKE_RESULTS.md
├── PHASE3_MODULE_VALIDATION.md
├── PHASE3_RLS_AUDIT.md
├── PHASE3_PERFORMANCE.md
│
├── PHASE4_FINAL_VALIDATION.md
├── PHASE4_USER_ANNOUNCEMENT.md
│
└── PROGRESS.md (actualizado después de cada fase)
```

---

## Timeline Estimado

| Fase | Duración | Inicio | Fin | Hito |
|------|----------|--------|-----|------|
| **Fase 0** (Diagnóstico) | 12h | 2026-07-12 09:00 | 2026-07-12 21:00 | Schema mapeado completamente |
| **Fase 1** (Preparación) | 1.5d | 2026-07-13 09:00 | 2026-07-13 22:00 | BD en TEST + UI conecta |
| **Fase 2** (Migración) | 1.5d | 2026-07-14 09:00 | 2026-07-14 22:00 | Datos Bubble → Supabase ✅ |
| **Fase 3** (Validación) | 1d | 2026-07-15 09:00 | 2026-07-15 17:00 | E2E 95%+ verde |
| **Fase 4** (Cutover) | 4-6h | 2026-07-15 17:00 | 2026-07-15 23:00 | Producción actualizada |

**Total estimado:** 3-4 días (si no hay sorpresas)

---

## Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| Bubble data corrupted | Media | Alto | Validar antes de migrar |
| FK violations durante insert | Alta | Alto | Respetar orden de inserciones |
| Columnas faltantes en schema | Media | Medio | Auditar UI vs schema |
| Performance issues | Media | Medio | Indexar after migration |
| RLS policies rotas | Baja | Alto | Auditar cada política |

---

## Criterios de Éxito

- [x] Todos los 170+ migrations ejecutados sin error
- [x] Schema completo mapeado + documentado
- [x] 100%+ data Bubble migrada a Supabase
- [x] E2E smoke tests: 18/18 en verde
- [x] E2E full suite: 95%+ en verde (347+ tests)
- [x] RLS policies validadas (no cross-tenant leaks)
- [x] Performance: queries < 100ms (p95)
- [x] Usuarios pueden logearse + usar todas las features

---

## Próximos Pasos Inmediatos

1. **HOY (Fase 0):** Crear `SCHEMA_MAPPING.md` con todas las tablas
2. **HOY:** Crear `AUDIT_CHECKLIST.md` con validación por módulo
3. **HOY:** Crear `GOAL_PROMPT.md` final para implementación
4. **MAÑANA:** Iniciar Fase 1 (crear schema en TEST)

---

## Notas Importantes

- **NO BORRAR datos de Bubble** hasta estar 100% seguro de que Supabase tiene todo
- **Documentar cada paso** en archivos `.md` para poder continuar si algo falla
- **Usar git** para toda la migración (scripts, configs, documentación)
- **Backup frecuente** de Supabase durante la migración (cada 2-3 horas)
- **Comunicar con stakeholders** antes de Fase 4 (cutover)

---

**Última actualización:** 2026-07-12 08:30 UTC
**Estado:** En planificación → Listo para Fase 0

