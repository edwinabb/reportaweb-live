---
name: database-recovery-goal-prompt
description: GOAL prompt final - copiar y pegar para continuar la recuperación desde cualquier punto
metadata: 
  node_type: memory
  type: project
  status: ready_to_use
  created: 2026-07-12
  usage: Copiar el contenido de este archivo al prompt cuando quieras continuar la recuperación
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# GOAL PROMPT — Recuperación de BD Supabase (Copy & Paste Ready)

**Instrucciones:** Copiar TODO el contenido entre los marcadores `---INICIO---` y `---FIN---` cuando necesites continuar con la recuperación. Especificar la fase en la que estás.

---

## ---INICIO---

### GOAL: Recuperar BD Supabase Borrada (Reporta Web 3)

**Situación:** 
- BD Supabase borrada hace ~1 mes
- 170+ migrations históricas disponibles en `supabase/migrations/`
- UI completa + server actions documentadas
- Datos históricos en Bubble disponibles para migración

**Archivos de Referencia:**
- `RECOVERY_PLAN.md` — Plan maestro 4 fases
- `SCHEMA_MAPPING.md` — 50+ tablas mapeadas completamente
- `AUDIT_CHECKLIST.md` — Validación exhaustiva por módulo
- Migrations: `supabase/migrations/` (170+ files)
- Server actions: `lib/actions/` (50+ files)
- Consolidated: `supabase_consolidated_migration.sql`

---

### FASE ACTUAL: [ESPECIFICAR - Por ejemplo: "FASE 1 - Paso 1.1"]

**Mis objetivos en esta fase:**
1. [Especificar qué quiero lograr]
2. [Especificar validaciones que necesito]
3. [Especificar problemas que necesito resolver]

**Contexto:**
- Tenant CISE: `1cb97ec7-326c-4376-93ee-ed317d3da51b`
- Tenant GRUAS: `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
- E2E test users: e2e-planner@reporta.la, e2e-admin@reporta.la, e2e-viewer@reporta.la
- Testing DB: Supabase project `wioozisskjjgjjybsoqo`
- Production DB: Supabase project `fqwhagryqkkhbgznxtwf`

---

### MI SOLICITUD ESPECÍFICA:

[Describir qué necesitas que haga en esta fase - puedes ser muy específico]

**Ejemplos:**
- "FASE 1.1: Ejecutar migrations + validar que schema se crea sin errores"
- "FASE 2.2: Crear ETL script para migrar terceros de Bubble CSV → Supabase"
- "FASE 3.2: Testear módulo Cotizaciones - validar que UI se conecta y obtiene datos"
- "FASE 4: Validar antes de cutover - revisar que E2E suite pasa 95%+"

---

### VALIDACIONES CRÍTICAS QUE NECESITO:

[Listar qué debe validarse al final de esta fase - o déjame decidir]

---

### NOTAS IMPORTANTES:

**Conservador:**
- NO BORRAR datos de Bubble hasta estar 100% seguro de que Supabase tiene todo
- DOCUMENTAR cada paso en archivos `.md` para poder continuar si falla
- HACER BACKUP antes de cambios importantes
- VALIDAR integridad de FKs constantemente

**Comunicación:**
- Decirme qué se hizo exitosamente ✅
- Decirme qué falló ❌ + qué hacer para arreglarlo
- Decirme qué falta todavía ⏳ + cómo proceder

**Entregas:**
- Actualizar `PROGRESS.md` con estado actual
- Crear archivos `.md` documentando qué se hizo en esta fase
- Mostrar comandos SQL/scripts que pueda reutilizar

---

### ESTILO DE EJECUCIÓN:

**Quiero que hagas:**
1. **Diagnóstico:** Analiza el estado actual completamente
2. **Plan:** Explica exactamente qué vas a hacer (paso a paso)
3. **Ejecución:** Haz lo que dijiste
4. **Validación:** Verifica que funcionó
5. **Documentación:** Actualiza archivos de referencia con lo aprendido

**Quiero que EVITES:**
- Asumir que algo funciona sin validar
- Hacer cambios destructivos sin backup
- Dejar archivos `.md` sin actualizar
- Saltarte pasos de validación

---

## ---FIN---

---

# Ejemplos de Uso Completo

## Ejemplo 1: Ejecutar FASE 1 (Crear Schema)

```
### GOAL: Recuperar BD Supabase Borrada (Reporta Web 3)

**Situación:** [Como arriba]

**FASE ACTUAL:** FASE 1 - Crear Schema Base

**Mis objetivos en esta fase:**
1. Ejecutar migrations en orden en Supabase TEST
2. Validar que todas las 50+ tablas se crean sin error
3. Crear 2 tenants (CISE + GRUAS) con 3 usuarios test
4. Verificar que UI se conecta a BD

**MI SOLICITUD ESPECÍFICA:**

FASE 1.1 - Crear Schema:
- Ejecutar todas las migrations en orden
- Validar que no hay errores SQL
- Confirmar que 50+ tablas existen
- Documentar en `PHASE1_CREATE_SCHEMA.md`

FASE 1.2 - Crear Tenants & Usuarios:
- INSERT companies (CISE, GRUAS)
- INSERT 3 usuarios test en auth
- INSERT profiles + roles
- Guardar en `PHASE1_TEST_DATA.sql`

FASE 1.3 - Validar Conexión:
- Arrancá `npm run dev`
- Logéate como e2e-planner
- Valida que `/dashboard` carga sin error 500
- Screenshot en `PHASE1_UI_CONNECTION.md`

VALIDACIONES CRÍTICAS:
- SELECT COUNT(*) FROM companies; -- Debe ser 2
- SELECT COUNT(*) FROM profiles; -- >= 10
- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'; -- >= 50
- Ningún error en Sentry
```

---

## Ejemplo 2: Ejecutar FASE 2.2 (Migrar Datos)

```
### GOAL: Recuperar BD Supabase Borrada (Reporta Web 3)

**Situación:** [Como arriba]

**FASE ACTUAL:** FASE 2.2 - Migrar Terceros de Bubble → Supabase

**Mis objetivos en esta fase:**
1. Leer CSV de Bubble (terceros.csv)
2. Crear script ETL que mapea Bubble → Supabase
3. Ejecutar migración de 1250 terceros
4. Validar integridad (FK, constraints, rowcount)

**MI SOLICITUD ESPECÍFICA:**

1. Revisar CSV de Bubble en `C:\tmp\bubble_exports\terceros.csv`
2. Entender estructura de campos Bubble vs Supabase
3. Crear script `scripts/migrate/migrate-terceros.ts` que:
   - Lee CSV
   - Mapea campos (nombre, ruc, email, tipo, etc.)
   - Genera UUIDs nuevos
   - Guarda bubble_id para trazabilidad
   - INSERT en Supabase respetando tenant_id + FKs
4. Ejecutar: `npx ts-node scripts/migrate/migrate-terceros.ts`
5. Validar: SELECT COUNT(*) FROM terceros; -- Debe ser ~1250
6. Documentar en `PHASE2_MIGRATION_LOG.md`

VALIDACIONES CRÍTICAS:
- Rowcount terceros Bubble ≈ Supabase (±5%)
- Todos los campos críticos migraron
- bubble_id está 1:1 con nuevo id
- No hay NULL en campos requeridos
- Sitios de terceros también migraron (FK válida)
```

---

## Ejemplo 3: Ejecutar FASE 3.2 (Validar Módulo)

```
### GOAL: Recuperar BD Supabase Borrada (Reporta Web 3)

**Situación:** [Como arriba]

**FASE ACTUAL:** FASE 3.2 - Validar Módulo Cotizaciones

**Mis objetivos en esta fase:**
1. Revisar que tabla cotizaciones tiene datos
2. Testear UI manualmente (crear, editar, PDF)
3. Validar que E2E tests de cotizaciones pasan
4. Documentar gaps encontrados

**MI SOLICITUD ESPECÍFICA:**

Usa `AUDIT_CHECKLIST.md` > "4. Módulo: COTIZACIONES" como guía.

1. Validar Estructura:
   - Verifica que todas las tablas existen (cotizaciones, cotizaciones_detalle, etc.)
   - Verifica FKs: tercero_id, cotizacion_detalle.cotizacion_id
   
2. Validar Data Integrity:
   - Ejecuta queries SQL de integridad
   - Revisa rowcount: SELECT COUNT(*) FROM cotizaciones;
   - Busca datos huérfanos o inconsistencias

3. Testear UI:
   - Arranca dev server
   - Logeate como admin
   - Ve a /admin/cotizaciones (o /cotizaciones)
   - Intenta crear cotización nueva
   - Valida que lista de cotizaciones carga
   - Intenta generar PDF
   - Toma screenshots de lo que funciona/falla

4. Testear E2E:
   - npx playwright test tests/flows/12-cotizaciones.spec.ts --headed
   - Revisa qué tests pasan/fallan
   - Documenta en `PHASE3_MODULE_VALIDATION.md`

VALIDACIONES CRÍTICAS:
- Cotizaciones tienen tercero válido
- Detalles no son huérfanos
- Totales son consistentes (SUM de detalles)
- PDF se genera en < 5 segundos
- RBAC funciona (viewer no puede crear, admin sí)
```

---

## Ejemplo 4: Debugging de Error Específico

```
### GOAL: Recuperar BD Supabase Borrada (Reporta Web 3)

**Situación:** [Como arriba]

**FASE ACTUAL:** FASE 1 - [Estoy aquí]

**Error encontrado:**
- Ejecuté migration `20251208203000_cotizaciones_module.sql`
- Resultado: ERROR at statement 123: FOREIGN KEY violation
- Mensaje: "No referential integrity for constraint fk_cotizaciones_tercero"

**MI SOLICITUD ESPECÍFICA:**

1. Analiza por qué falla:
   - Revisa migration file completo
   - Verifica si tabla `terceros` existe antes de crear FK
   - Busca si hay CREATE TABLE terceros en order correcto

2. Sugiere fix:
   - ¿Reordenar migrations? (ejecutar terceros antes que cotizaciones)
   - ¿Modificar migration para agregar IF NOT EXISTS?
   - ¿Crear script de fix manual?

3. Ejecuta fix:
   - Aplica la solución
   - Re-ejecuta migration
   - Valida que funciona

4. Documenta:
   - Qué fue el problema
   - Cómo se resolvió
   - Cómo evitarlo en el futuro
```

---

## Ejemplo 5: Preguntar sobre Decisión

```
### GOAL: Recuperar BD Supabase Borrada (Reporta Web 3)

**Situación:** [Como arriba]

**FASE ACTUAL:** FASE 2.4 - Reconciliar Gaps Bubble ↔ Supabase

**Pregunta para decidir:**

Encontré que Bubble tiene estos campos que NO están en Supabase schema:
1. `terceros.notas_internas` (TEXT) — 500 registros tienen datos
2. `terceros.logo_url` (TEXT) — 30 registros
3. `reportes_jornada.foto_url_backup` (TEXT) — field histórico no usado

**¿Qué hago?**
- ¿Llevar estos 3 campos a Supabase (ADD COLUMN)?
- ¿Documentarlos en deuda técnica y ignorarlos?
- ¿Combinarlos con campos existentes (ej: notas_internas + observaciones)?

Necesito tu análisis:
- Importancia de cada campo
- Esfuerzo de migración
- Riesgo de no llevarlo
- Recomendación final

Luego haremos lo que decidas.
```

---

# Cómo Continuar la Recuperación

1. **Ahora mismo:** 
   - Revisa RECOVERY_PLAN.md (plan maestro)
   - Revisa SCHEMA_MAPPING.md (estructura de BD)
   - Revisa AUDIT_CHECKLIST.md (validaciones)

2. **Para próxima sesión:**
   - Copiar el contenido entre `---INICIO---` y `---FIN---` 
   - Reemplazar `[ESPECIFICAR...]` con detalles de tu fase actual
   - Pegarlo en el prompt
   - Yo continuaré desde donde dejaste

3. **Mantener actualizado:**
   - Después de cada fase, actualizar `PROGRESS.md`
   - Guardar logs + resultados en archivos `.md` por fase
   - Documentar decisiones + gaps encontrados

---

# Archivos Generados por Este Plan

```
C:\Users\Usuario\.claude\projects\C--Proyectos-reportaweb3\memory\
├── RECOVERY_PLAN.md (✅ Listo) — Plan maestro
├── SCHEMA_MAPPING.md (✅ Listo) — 50+ tablas
├── AUDIT_CHECKLIST.md (✅ Listo) — Validaciones por módulo
├── GOAL_PROMPT.md (✅ Listo) — Este archivo
├── PROGRESS.md (⏳ A crear después de FASE 0)
├── 
├── PHASE0_DIAGNOSTICO.md (⏳ A crear)
│   ├── PHASE0_SCHEMA_MAPPING_COMPLETE.md
│   ├── PHASE0_UI_REQUIREMENTS.md
│   ├── PHASE0_SERVER_ACTIONS_DEPS.md
│   └── PHASE0_BUBBLE_GAPS.md
│
├── PHASE1_PREPARE_SCHEMA.md (⏳ A crear)
│   ├── PHASE1_CREATE_SCHEMA.md
│   ├── PHASE1_VALIDATION_ERRORS.md
│   ├── PHASE1_TEST_DATA.sql
│   └── PHASE1_UI_CONNECTION.md
│
├── PHASE2_MIGRATE_DATA.md (⏳ A crear)
│   ├── PHASE2_BUBBLE_EXPORTS.md
│   ├── PHASE2_MIGRATION_LOG.md
│   ├── PHASE2_INTEGRITY_CHECKS.sql
│   ├── PHASE2_INTEGRITY_RESULTS.md
│   └── PHASE2_GAPS_RESOLUTION.md
│
├── PHASE3_VALIDATE.md (⏳ A crear)
│   ├── PHASE3_SMOKE_RESULTS.md
│   ├── PHASE3_MODULE_VALIDATION.md
│   ├── PHASE3_RLS_AUDIT.md
│   └── PHASE3_PERFORMANCE.md
│
└── PHASE4_CUTOVER.md (⏳ A crear)
    ├── PHASE4_FINAL_VALIDATION.md
    └── PHASE4_USER_ANNOUNCEMENT.md
```

---

# Referencia Rápida de Comandos

```bash
# Crear schema
-- Ejecutar en Supabase SQL Editor: supabase_consolidated_migration.sql

# Tests
npm run test:e2e:smoke          # 18 smoke tests (~30s)
npm run test:e2e                # Full suite (~40 min)
npm run test:e2e:planner        # Solo planner
npm run test:e2e:admin          # Solo admin
npm run test:e2e:viewer         # Solo viewer

# Dev
npm run dev                      # Inicia app http://localhost:3000

# Validar integridad
-- En Supabase SQL Editor, copiar queries de PHASE2_INTEGRITY_CHECKS.sql

# TypeScript types
npm run types:supabase           # Regenerar types/supabase.ts
```

---

**Creado:** 2026-07-12  
**Última actualización:** 2026-07-12  
**Estado:** ✅ Listo para usar

Cuando necesites continuar, copia el contenido entre `---INICIO---` y `---FIN---` en tu próximo prompt.
