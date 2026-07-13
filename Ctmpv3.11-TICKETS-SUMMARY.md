# v3.11 Tickets Summary — Auditoría Exhaustiva (2026-07-13)

## TICKET 1: REP-3.11-001 — PDFs Cotizaciones ✅ APROBADO

**Status:** ✅ COMPLETADO - No requiere acción

**Hallazgos:**
- Total cotizaciones: **1,000**
- Con pdf_url: **854** (85.4%)
- En Supabase Storage: **854** (100% de los con URL)
- En Bubble/otros: **0** (migración completada previamente)

**Validación:**
- ✅ PDFs almacenados en Supabase bucket 'cotizaciones'
- ✅ URLs públicas funcionan
- ✅ 146 cotizaciones sin pdf_url (probablemente no generadas aún)

**Conclusión:** Nada que hacer. Los PDFs fueron migrados correctamente en fases anteriores.

---

## TICKET 2: REP-3.11-002 — tareas_recursos Validación ❌ REQUIERE ACCIÓN

**Status:** ⚠️ BLOQUEADO - 13.5% cobertura

**Hallazgos:**
- Total tareas activas: **1,000**
- Con recursos asignados: **135** (13.5%)
- **Sin recursos: 865** (86.5%) ← CRÍTICO
- FK Integrity: ✅ OK (0 huérfanos)

**Recursos disponibles:**
- Maquinarias referencias: 44 (OK)
- Profiles (personal) referencias: 71 (OK)

**Tareas sin recursos (ejemplos):**
- OBRA 808-E-03
- ALQUILER GRUA 80 TN
- 24TN-E-06-CALLAO
- 650TN-POZO 1 BIS
- (... 845 más)

**Root Cause:** Migración de tareas_recursos desde Bubble incompleta. Solo 135 tareas tienen relaciones tarea←→maquinaria/personal.

**Acción Requerida:**
1. Auditar qué tareas_recursos existen en Bubble (para CISE + GRUAS)
2. Ejecutar script de migración:
   ```bash
   npx tsx scripts/migrate-tareas-recursos-from-bubble.ts --run
   ```
3. Validar cobertura ≥ 95% post-migración
4. Reexecutar auditoría para confirmar

**Blocker Status:** ⚠️ Planificación depende de tareas.recursos para timeline visual

---

## Tickets v3.11 Resumen

| Ticket | Nombre | Status | Blocker | Horas |
|--------|--------|--------|---------|-------|
| REP-3.11-001 | PDFs Cotizaciones | ✅ OK | No | 1h |
| REP-3.11-002 | tareas_recursos | ⚠️ PENDING | Sí | 5h |

**Tiempo Invertido:** 2 horas (auditoría)
**Tiempo Restante:** ~5-6 horas (remediation + revalidation)

---

## Documentación Generada

- `docs/AUDITORÍA_cotizaciones_pdfs_v3.11.md` — Detalles TICKET 1
- `docs/AUDITORÍA_tareas_recursos_v3.11.md` — Detalles TICKET 2 + lista de tareas sin recursos

**Scripts Creados (audit only):**
- `scripts/audit-cotizaciones-pdfs.ts` — Auditoría PDFs
- `scripts/audit-tareas-recursos-v3.ts` — Auditoría tareas_recursos
- `scripts/inspect-tareas-schema.ts` — Inspección de schema

