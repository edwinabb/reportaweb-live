# Auditoría de Migraciones Opcionales (TK-U13 a TK-U17)

**Fecha:** 2026-07-14 · **Auditoría:** Campos con cobertura incompleta en PROD  
**Contexto:** Después de implementar TK-U1 a TK-U12 del piloto Usuarios, se auditan campos opcionales para decidir si migrar datos parciales o dejar vacíos.

---

## Resultados de Auditoría

| Ticket | Campo | Tabla | Total | Poblados | % | Recomendación |
|--------|-------|-------|-------|----------|---|---|
| **TK-U13** | middle_name | profile_details | 324 | 33 | 10% | 🟡 Migrar |
| **TK-U14** | birth_date | profile_details | 324 | 0 | 0% | ❌ Saltar |
| **TK-U15** | nationality | profile_details | 324 | 38 | 12% | 🟡 Migrar |
| **TK-U16** | pin | profiles | 623 | 0 | 0% | ❌ Saltar |
| **TK-U17** | signature_url | profile_details | 324 | 31 | 10% | 🟡 Migrar |

---

## Decisión por Campo

### 🟡 TK-U13: Nombre del Medio (middle_name)
- **Datos disponibles:** 33 de 324 (10%)
- **Estado en UI:** Campo opcional en formulario de usuario, paso 1
- **Recomendación:** ✅ **MIGRAR**
  - Baja cobertura pero datos válidos
  - Forma parte de nombre completo (first_name + middle_name + last_name)
  - Esfuerzo: ~30 min (simple INSERT/UPDATE desde profile_details → profiles)

### ❌ TK-U14: Fecha de Nacimiento (birth_date)
- **Datos disponibles:** 0 de 324 (0%)
- **Estado en UI:** Campo opcional en formulario usuario, paso 1
- **Recomendación:** **SALTAR**
  - No hay datos en prod
  - Formulario ya incluye field con default (-30 años)
  - Sin bloqueo para GO LIVE

### 🟡 TK-U15: Nacionalidad (nationality)
- **Datos disponibles:** 38 de 324 (12%)
- **Estado en UI:** Campo optional en formulario usuario, paso 1 (select con países)
- **Recomendación:** ✅ **MIGRAR**
  - Baja cobertura pero datos válidos
  - Catálogo existente (getPaises())
  - Esfuerzo: ~30 min (INSERT/UPDATE desde profile_details → profiles)

### ❌ TK-U16: PIN de Seguridad (pin)
- **Datos disponibles:** 0 de 623 (0%)
- **Estado en UI:** Campo nuevo en paso 2 (aprovechó relocalización)
- **Recomendación:** **SALTAR**
  - Nunca fue capturado en Bubble
  - Nuevo campo post-migración
  - Usuarios ingresarán manualmente si requieren
  - Sin bloqueo para GO LIVE

### 🟡 TK-U17: Firma Electrónica (signature_url)
- **Datos disponibles:** 31 de 324 (10%)
- **Estado en UI:** Campo importante para auditoría (mostrará botón "Editar firma" con re-auth)
- **Recomendación:** ✅ **MIGRAR**
  - Datos críticos de compliance (31 firmas capturadas)
  - CISE 30, GRUAS 1 (muy desigual)
  - Esfuerzo: ~1.5h (migrar URLs, validar accesibilidad en Storage)
  - **Impacto:** SIN migración, firma tendrá baja cobertura inicial pero campo está listo para nuevas firmas

---

## Roadmap de Migración

### Inmediato (antes de GO LIVE)
- ✅ TK-U1 a TK-U12: **COMPLETADOS**

### Después de GO LIVE (fase 2 — Sprint posterior)
1. **TK-U13 + TK-U15** (Nombre del Medio + Nacionalidad)
   - Esfuerzo combinado: 1h
   - Prioridad: BAJA (campos opcionales)
   - Blocker: NINGUNO

2. **TK-U17** (Firma Electrónica)
   - Esfuerzo: 1.5h
   - Prioridad: MEDIA (compliance)
   - Blocker: NINGUNO (pueden agregarse nuevas firmas sin migración)

3. **TK-U14 + TK-U16** (Fecha Nacimiento + PIN)
   - Esfuerzo: 0h (no migrar)
   - Campos nuevos post-migración, usuarios capturan según requieran

---

## Scripts de Auditoría Disponibles

- `scripts/audit-optional-migrations.ts` — Auditoría de cobertura por campo
- `scripts/migrate-optional-fields.ts` — Muestras de datos disponibles

---

## Conclusión

**GO LIVE está DESBLOQUEADO:**
- Todos los campos críticos tienen soluciones implementadas (TK-U1 a TK-U12)
- Campos opcionales con cobertura incompleta NO bloquean
- Firma electrónica (10% cobertura) es suficiente para inicialing, mejora post-GO LIVE
- Usuarios pueden completar datos en tiempo real sin dependencias de migración

**Próximo paso:** Iniciar fase 2 (opcional) tras validar GO LIVE en producción durante 1-2 semanas.
