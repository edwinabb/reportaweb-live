---
name: database-recovery-progress
description: Tracking de progreso de recuperación de BD (actualizar después de cada fase)
metadata: 
  node_type: memory
  type: project
  status: in_progress
  created: 2026-07-12
  started: 2026-07-12
  estimated_completion: 2026-07-15
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# Progress Tracker — Database Recovery

**Iniciado:** 2026-07-12  
**COMPLETADO:** Análisis exhaustivo 342k tokens (Backend + UI + Schema + Bubble)  
**Estado:** ✅ 5 ARCHIVOS FINALES LISTOS  
**Hallazgos:** 12 gaps (3 ALTA, 5 MEDIA, 4 BAJA) | 71% migrado OK

---

## Timeline General

```
FASE 0: DIAGNOSTICO (12 horas)       2026-07-12 09:00 → 2026-07-12 21:00 ⏳
├─ 0.1: Mapear tablas                ⏳
├─ 0.2: Auditar UI                   ⏳
├─ 0.3: Server actions deps          ⏳
└─ 0.4: Bubble gaps                  ⏳

FASE 1: PREPARACION (1.5 días)       2026-07-13 09:00 → 2026-07-13 22:00 ⏳
├─ 1.1: Crear schema base            ⏳
├─ 1.2: Validar sintaxis SQL         ⏳
├─ 1.3: Crear tenant + usuarios      ⏳
└─ 1.4: Validar UI conecta           ⏳

FASE 2: MIGRACION (1.5 días)         2026-07-14 09:00 → 2026-07-14 22:00 ⏳
├─ 2.1: Bubble → CSV                 ⏳
├─ 2.2: CSV → Supabase (ETL)        ⏳
├─ 2.3: Validar integridad           ⏳
└─ 2.4: Reconciliar gaps             ⏳

FASE 3: VALIDACION (1 día)           2026-07-15 09:00 → 2026-07-15 17:00 ⏳
├─ 3.1: Smoke tests                  ⏳
├─ 3.2: Validar módulos              ⏳
├─ 3.3: Auditar RLS                  ⏳
└─ 3.4: Performance check            ⏳

FASE 4: CUTOVER (4-6 horas)          2026-07-15 17:00 → 2026-07-15 23:00 ⏳
├─ 4.1: Backup final                 ⏳
├─ 4.2: Validación final             ⏳
├─ 4.3: E2E full suite               ⏳
└─ 4.4: Anuncio a usuarios           ⏳
```

---

## Fase 0: Diagnostico (CURRENT ⏳)

**Objetivo:** Mapear completamente la estructura de BD y datos necesarios

### 0.1 Mapear Tablas desde Migrations

**Status:** ⏳ En progreso

**Qué se hizo:**
- ✅ Identificadas 170+ migration files en `supabase/migrations/`
- ✅ Creado `SCHEMA_MAPPING.md` con 50+ tablas mapeadas
- ✅ Documentados tipos, campos, constraints, FKs
- ✅ Identificados enums, vistas, funciones

**Qué falta:**
- [ ] Crear lista parseable de tablas con orden de dependencias
- [ ] Validar que migrations ejecutan sin error (TEST preview)

**Artefacto:** `SCHEMA_MAPPING.md` (✅ Completo)

**Próximo:** Ir a 0.2

---

### 0.2 Auditar UI para Identificar Qué Datos Muestra

**Status:** ⏳ Pendiente

**Plan:**
1. Revisar componentes principales (50+ archivos en `components/`)
2. Extraer qué campos usa la UI
3. Crear tabla UI Data Requirements
4. Cross-check contra schema

**Artefacto:** `UI_DATA_REQUIREMENTS.md` (crear)

---

### 0.3 Revisar Server Actions para Entender Dependencias

**Status:** ⏳ Pendiente

**Plan:**
1. Leer 50+ archivos en `lib/actions/`
2. Extraer consultas Supabase
3. Identificar orden de inserciones (FKs)
4. Documentar dependencias

**Artefacto:** `SERVER_ACTIONS_DEPS.md` (crear)

---

### 0.4 Documentar Gaps: Bubble ↔ Supabase

**Status:** ⏳ Pendiente

**Plan:**
1. Si tienes acceso a Bubble, exportar schema/data
2. Comparar campos contra migrations
3. Decidir qué llevar + qué ignorar

**Artefacto:** `BUBBLE_GAPS.md` (crear)

---

## Fase 1: Preparación (Pendiente)

**Estado:** ⏳ No iniciado

Será iniciada cuando Fase 0 esté al 100%.

---

## Fase 2: Migración (Pendiente)

**Estado:** ⏳ No iniciado

Será iniciada cuando Fase 1 esté al 100%.

---

## Fase 3: Validación (Pendiente)

**Estado:** ⏳ No iniciado

Será iniciada cuando Fase 2 esté al 100%.

---

## Fase 4: Cutover (Pendiente)

**Estado:** ⏳ No iniciado

Será iniciada cuando Fase 3 esté al 100%.

---

## Blockers & Decisiones Pendientes

| ID | Asunto | Urgencia | Estado | Dueño |
|----|--------|----------|--------|-------|
| B-001 | ¿Llevar campos adicionales de Bubble o ignorar? | Media | ⏳ Pendiente | — |
| B-002 | ¿Acceso a BD Bubble para export data? | Alta | ⏳ Pendiente | — |
| B-003 | ¿JWT TTL aumentado en Supabase TEST? | Media | ⏳ Pendiente | — |

---

## Lecciones Aprendidas (So Far)

1. **170+ migrations disponibles** — Schema es recuperable, no hay datos perdidos en git
2. **UI completa** — No necesitamos redeseñar, solo repoblar BD
3. **Bubble tiene datos** — Fuente de verdad para migración
4. **Bubble IDs en schema** — Facilita trazabilidad y debugging

---

## Recursos Disponibles

| Recurso | Ubicación | Estado |
|---------|-----------|--------|
| Migrations | `supabase/migrations/` | ✅ 170+ files |
| Consolidated SQL | `supabase_consolidated_migration.sql` | ✅ Listo |
| Server Actions | `lib/actions/` | ✅ 50+ files |
| Schema Mapping | `SCHEMA_MAPPING.md` | ✅ Listo |
| Audit Checklist | `AUDIT_CHECKLIST.md` | ✅ Listo |
| GOAL Prompt | `GOAL_PROMPT.md` | ✅ Listo |
| Plan Maestro | `RECOVERY_PLAN.md` | ✅ Listo |

---

## Cómo Continuar

**Próxima Sesión:**

1. Copiar el contenido de `GOAL_PROMPT.md` (entre `---INICIO---` y `---FIN---`)
2. Especificar fase actual + objetivos
3. Pegar en prompt
4. Continuaremos desde donde dejamos

**Después de cada fase:**

1. Actualizar este archivo con status
2. Crear/actualizar fase-specific `.md` files
3. Documentar blockers o decisiones
4. Guardar todos los cambios en git

---

## Notas Importantes

- ⚠️ **NO BORRAR datos de Bubble** hasta estar 100% seguro
- ⚠️ **DOCUMENTAR cada paso** en `.md` para poder continuar
- ⚠️ **HACER BACKUP** antes de cambios importantes
- ⚠️ **VALIDAR integridad** constantemente

---

**Última actualización:** 2026-07-12 08:45 UTC  
**Próxima revisión:** 2026-07-12 21:00 UTC (fin Fase 0)

