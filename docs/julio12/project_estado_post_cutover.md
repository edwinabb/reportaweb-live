---
name: Estado post-cutover 2026-05-13
description: Estado actual del sistema v3.7.24 en producción. Plan: onboarding tenants ✅ → fix E2E v1 → suite v2 → distribución app → nuevas features
type: project
originSessionId: e5b069a5-86f6-4860-b757-a29bc2833cf0
---
## Estado del sistema — 2026-05-13

**Web admin:** v3.7.24 en producción (Vercel Pro / web.reportar.app). Todos los módulos activos.
**App móvil:** v1.5.1, APK debug generada (`android/app/build/outputs/apk/release/app-release.apk`, 83 MB).
**Cutover web:** 2026-05-07 ✅ (completado).

---

## Módulos web completos

Planificación · Cotizaciones · Ventas · Compras · Formatos/Checklist · EPP · Terceros · Maquinaria · Usuarios · Planes de Acción · Soporte · Permisos por Cargo · Settings (informes, empresa/timezone, notificaciones, permisos) · **Onboarding Tenants** (nuevo v3.7.24)

---

## Historial de versiones recientes

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| v3.7.24 | 2026-05-13 | Módulo onboarding tenants (wizard 6 pasos) |
| v3.7.23 | 2026-05-13 | Fix sitios cliente — join tipo_id→tipo en getTerceroSitios |
| v3.7.22 | 2026-05-13 | Fix grilla planificación con fechas no consecutivas |
| v3.7.21 | 2026-05-13 | Fix sitio tercero_id + pin schema + pasos tarea-detail |
| v3.7.20 | 2026-05-13 | Fix UX contacto/sitio/recursos + pin validation |
| v3.7.19 | 2026-05-13 | Fix 4 bugs producción (sitios tipo, usuarios gender, planificación refresh, contacto pre-select) |

---

## Módulo Onboarding Tenants (v3.7.24)

Wizard para `reporta_admin` en `/sistema/onboarding`. Crea tenants completos sin acceso directo a DB.

**Pasos:**
1. Empresa + Admin (obligatorio) — crea `companies` + Auth user + `profiles` + `profile_details`
2. Usuarios Excel (obligatorio) — upsert `job_titles` → seed `cargo_permisos` → crea usuarios → devuelve Excel con passwords
3. Terceros (opcional) — upsert `rubros` → upsert `terceros`
4. Maquinaria (opcional) — upsert `maquinaria_modelos` → upsert `maquinarias`
5. Servicios (opcional) — upsert `servicios_tipo_precios` + `servicios_tipo` → upsert `servicios`
6. Config (opcional) — upsert 5 tablas `config_*` con defaults por tenant

**Archivos:**
- `lib/actions/onboarding.ts` — todas las server actions
- `components/sistema/onboarding/` — wizard-shell + 6 step-*.tsx
- `app/(dashboard)/sistema/onboarding/` — page, nuevo/page, [tenantId]/page

---

## Deuda técnica activa

**DT-MIG01** — Migración Bubble→Supabase: contactos importados pero faltan catálogos `contactos_cargo` y `contactos_area`.
- Fix: seed con valores únicos presentes en los contactos migrados
- Impacto: dropdowns cargo/área vacíos en ContactoDialog para contactos v1

---

## Plan de trabajo activo

### 1. Fix E2E suite v1 ⏳ (próximo)
- **Fix middleware** `utils/supabase/middleware.ts`: al redirigir ruta bloqueada, copiar cookies de auth al nuevo `NextResponse.redirect`
- **SQL Supabase Studio**: habilitar `cargo_permisos` para el cargo del usuario `e2e-planner@reporta.la`
- Meta: ≥383/387 tests pasando (flows 02-06 son known/won't fix por redesign planificación)

### 2. Suite E2E v2 multi-rol ⏳ (~1100 tests)
- Plan completo en `docs/plan-suite-v2.md`
- Prerequisito: suite v1 al ≥99%
- Crear `playwright.full.config.ts` sin filtro `@roles`

### 3. App — distribución producción ⏳
- APK actual usa debug keystore (válida para pruebas internas)
- Para Play Store: keystore de producción + `eas build --platform android --profile production`
- Para iOS: certificados Apple + `eas build --platform ios`

### 4. Nuevas features ⏳
- Pendiente de feedback de clientes CISE/GRUAS en producción

---

## Why / How to apply
**Why:** El cutover ocurrió, el foco cambió de "implementar" a "estabilizar + distribuir + onboarding". El módulo de onboarding permite incorporar nuevos clientes sin tocar la DB directamente.
**How to apply:** Al iniciar sesión, proponer continuar por el ítem 1 del plan (fix E2E) a menos que el usuario indique otra cosa.
