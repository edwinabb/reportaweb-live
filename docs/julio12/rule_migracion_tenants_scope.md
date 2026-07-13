---
name: migracion-tenants-scope
description: "REGLA crítica - Solo se migraron 2 tenants específicos, NO otros"
metadata: 
  node_type: memory
  type: feedback
  priority: CRITICAL
  created: 2026-07-12
  applies_to: "Todos los gaps, migraciones, auditorías"
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# ⚠️ REGLA CRÍTICA: SCOPE DE MIGRACIÓN (TENANTS)

**Fecha:** 2026-07-12  
**Status:** VIGENTE  
**Aplica a:** Todos los gaps v3.11, migraciones, auditorías

---

## LA REGLA

### ✅ MIGRARON DATOS DE (2 TENANTS SOLAMENTE):

1. **CISE** — CISE del Perú SAC
   - tenant_id: `1cb97ec7-326c-4376-93ee-ed317d3da51b`
   - País: Perú
   - Datos: Completamente migrables

2. **GRUAS** — GRÚAS DEL PACÍFICO SAC
   - tenant_id: `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
   - País: Probablemente Perú/Colombia
   - Datos: Completamente migrables

### ❌ NO MIGRARON DATOS DE:

- **Otros tenants en Bubble** (si existen)
- **Archivos de otros tenants**
- **Información parcial de los 2 tenants**

---

## POR QUÉ IMPORTA

**Para PDFs faltantes, auditorías, y validaciones:**

1. **PDFs faltantes → SOLO pueden ser de CISE o GRUAS**
   - Si un PDF no está en Supabase, debe ser de CISE o GRUAS
   - Si es de otro tenant → **NO lo hagas**, viola scope

2. **Datos incompletos → SOLO si están en CISE/GRUAS en Bubble**
   - Si Bubble tiene datos de otro tenant → **ignora**
   - Si Bubble tiene datos de CISE/GRUAS → **trae a Supabase**

3. **Validación de integridad:**
   - Auditar FKs/Constraints: solo para CISE y GRUAS
   - Sincronizar catálogos: solo para CISE y GRUAS
   - Migrar campos: solo para CISE y GRUAS

---

## APLICAR ESTA REGLA

### En REP-3.11-001 (PDFs):
```
AUDITAR: 
  SELECT * FROM bubble_cotizaciones 
  WHERE tenant_id IN ('CISE', 'GRUAS')  ← SOLO ESTOS
  AND pdf_url IS NOT NULL
```

### En REP-3.11-002 (tareas_recursos):
```
AUDITAR:
  SELECT * FROM tareas 
  WHERE tenant_id IN (
    '1cb97ec7-326c-4376-93ee-ed317d3da51b',  -- CISE
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73'   -- GRUAS
  )
```

### En REP-3.11-005 (FK integrity):
```
AUDITAR:
  SELECT * FROM cotizaciones 
  WHERE tenant_id IN (
    '1cb97ec7-326c-4376-93ee-ed317d3da51b',  -- CISE
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73'   -- GRUAS
  )
```

---

## SI ENCUENTRAS DATOS DE OTRO TENANT

**Decisión:** 
- ❌ **NO MIGRES** (viola scope)
- 📝 **DOCUMENTA** en ticket "Datos de [otro tenant] encontrados"
- 🎯 **ESCALATE** a CTO/PM para decidir si incluir

---

## REFERENCES

- Tenants: Ver `CLAUDE.md` línea 6-7
- Datos Bubble: Solo CISE y GRUAS
- Supabase: Ambos tenants activos en proyecto `fqwhagryqkkhbgznxtwf`

---

**Última actualización:** 2026-07-12  
**Status:** ✅ VIGENTE
