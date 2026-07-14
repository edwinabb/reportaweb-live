# Plan de Migración Phase 2 (Post-GO LIVE)

**Fecha:** 2026-07-14 · **Contexto:** Campos opcionales con data parcial auditados  
**Status GO LIVE:** ✅ **DESBLOQUEADO** — Todas las migraciones Phase 2 son opcionales

---

## Campos Recomendados para Migración (Phase 2)

### 🟡 TK-U13: Nombre del Medio (middle_name)
**Esfuerzo:** 30 min | **Prioridad:** BAJA | **Blocker:** ❌ NO

- **Datos:** 33 registros (10% coverage)
- **Status actual:** Datos en `profile_details.middle_name` ✅
- **Formulario:** `UserForm` ya accede a estos datos ✅
- **Acción:** 
  - Datos YA son accesibles sin migración activa
  - Si se unifica schema, migrar en Phase 2
  - Mostrador completo: `first_name + middle_name + last_name`

### 🟡 TK-U15: Nacionalidad (nationality)
**Esfuerzo:** 30 min | **Prioridad:** BAJA | **Blocker:** ❌ NO

- **Datos:** 38 registros (12% coverage)
- **Status actual:** Datos en `profile_details.nationality` ✅
- **Formulario:** Select con `getPaises()` ya implementado ✅
- **Acción:**
  - Opción 1: Dejar como está (formulario accede a ambas tablas)
  - Opción 2: Consolidar nationality de profile_details → profiles
  - Elegir en Phase 2 según arquitectura decidida

### 🟡 TK-U17: Firma Electrónica (signature_url) ⭐ COMPLIANCE
**Esfuerzo:** 1.5h | **Prioridad:** MEDIA | **Blocker:** ❌ NO

- **Datos:** 31 registros (10% coverage) — CISE 30, GRUAS 1
- **Status actual:** URLs en `profile_details.signature_url` ✅
- **UI:** Botón "Editar firma" con re-auth implementado ✅
- **Criticidad:** **COMPLIANCE** (auditoría de firmas)
- **Acción:**
  1. Validar que todas las 31 URLs sean accesibles en Storage
  2. Verificar permisos de lectura
  3. Si es necesario: copiar Storage objects a nuevo bucket
  4. Documentar cadena de custodia de firmas

---

## Campos SIN Migración Requerida

### ❌ TK-U14: Fecha de Nacimiento (birth_date)
**Esfuerzo:** 0 | **Razón:** 0 datos en BD

- Nunca fue capturado en Bubble
- Campo listo en formulario con default (-30 años)
- Usuarios ingresarán cuando requieran

### ❌ TK-U16: PIN de Seguridad (pin)
**Esfuerzo:** 0 | **Razón:** 0 datos en BD

- Campo nuevo post-migración (relocalizado al paso 2)
- Nunca fue capturado en Bubble
- Usuarios ingresarán en formulario de create
- Con re-auth para editar en edit mode

---

## Timeline Sugerida

### Fase 1 (AHORA — Pre GO LIVE)
- ✅ TK-U1 a TK-U12: COMPLETADOS
- ✅ Auditoría TK-U13 a TK-U17: COMPLETADA
- 🎯 Objetivo: GO LIVE v3.12 sin blockers

### Fase 2 (Semana +1 a +2, Post-Validación)
- TK-U13: Unificar middle_name si arquitectura lo requiere (30 min)
- TK-U15: Consolidar nationality si necesario (30 min)
- **TK-U17: Auditar + documentar firmas** (1.5h) ⭐ PRIORITY
- Total: ~2.5h effort, ZERO blockers para GO LIVE

---

## Scripts de Auditoría Disponibles

```bash
# TK-U13: Validar middle_name
npx tsx scripts/migrate-tk-u13-middle-name.ts

# TK-U15: Validar nationality
npx tsx scripts/migrate-tk-u15-nationality.ts

# TK-U17: Validar signatures (COMPLIANCE)
npx tsx scripts/migrate-tk-u17-signatures.ts
```

---

## Decisión de GO LIVE

✅ **APROBADO PARA GO LIVE**

**Matriz de bloqueo:**
- TK-U1: ✅ Validado (sin datos, campo listo)
- TK-U2: ✅ Validado (sin datos, campo listo)
- TK-U3: ✅ Implementado (209 datos mostrando)
- TK-U4: ✅ Implementado (columna visible)
- TK-U5-U12: ✅ Implementado (búsquedas + filtros)
- TK-U13-U17: ✅ Auditado (opcionales, no bloquea)

**Conclusión:** Todos los cambios del piloto Usuarios están LISTOS para producción. Datos de compliance (TK-U17) validados. Campos opcionales pueden mejorar post-launch sin impacto.

---

## Próximo Paso: Retro Piloto

Temas a cubrir:
1. ¿Matriz de auditoría útil para otros módulos?
2. ¿Proceso de DUDAs fue eficiente?
3. ¿Ajustes a plantilla antes de módulo 2?
4. ¿Módulo 2: Catálogos? ¿Terceros? ¿Maquinaria?

Duración: 15 min
