# Plan: Suite E2E v2 (+1000 tests multi-rol)

Proceso para pasar de la suite v1 (387 tests · solo planner completo) a la suite v2 (+1000 tests · 3 roles completos), manteniendo ambas en paralelo.

---

## Estado actual

| Suite | Config | Tests | Duración | Estado |
|-------|--------|-------|----------|--------|
| v1 (día a día) | `playwright.config.ts` | 387 | ~26 min | ✅ Activa |
| v2 (multi-rol completa) | `playwright.full.config.ts` | ~1,100 | ~80 min | ⏳ Pendiente crear |

**Versión base:** v3.7.12 · **Fecha inicio plan:** 2026-05-05

---

## Por qué se redujo la suite a 387

En v3.7.9 se agregó `grep: /@roles/` a los proyectos `chromium-admin` y `chromium-viewer` como workaround de los grupos de fallos G/H: los usuarios `e2e-admin` y `e2e-viewer` estaban en un tenant distinto al de `e2e-planner`, causando ~120 fallos sistemáticos que no representaban bugs reales de la app.

La suite v2 elimina ese workaround y corre todos los tests en los 3 roles.

---

## Pasos

### PASO 1 — Ver resultados del run de 387 (suite v1 actual)
- [ ] Confirmar cuántos tests pasan/fallan tras los fixes de v3.7.11 y v3.7.12
- [ ] Verificar que Grupo F (JWT expirado) ya no aparece con `MAX_AUTH_AGE_HOURS = 0.75`
- [ ] Documentar estado final de v1 en `docs/test-results-mayo-2026.md`

**Criterio de avance:** ≥ 383/387 passing (solo pueden quedar fallos de infra conocidos).

---

### PASO 2 — Verificar tenant de usuarios E2E en Supabase
- [ ] Ejecutar query en Supabase Studio:

```sql
SELECT p.id, p.email, p.role, p.tenant_id,
       t.nombre as tenant_nombre
FROM profiles p
LEFT JOIN tenants t ON t.id = p.tenant_id
WHERE p.email IN (
    'e2e-planner@reporta.la',
    'e2e-admin@reporta.la',
    'e2e-viewer@reporta.la'
);
```

- [ ] Confirmar que los 3 tienen `tenant_id = 1cb97ec7-326c-4376-93ee-ed317d3da51b` (CISE)
- [ ] Si alguno tiene tenant distinto, corregir:

```sql
UPDATE profiles
SET tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b'
WHERE email IN ('e2e-admin@reporta.la', 'e2e-viewer@reporta.la')
  AND tenant_id != '1cb97ec7-326c-4376-93ee-ed317d3da51b';
```

**Criterio de avance:** Los 3 usuarios E2E están en tenant CISE.

---

### PASO 3 — Crear `playwright.full.config.ts` y script npm
- [ ] Crear `playwright.full.config.ts` (igual que `playwright.config.ts` pero sin `grep: /@roles/`)
- [ ] Agregar `"test:e2e:full": "playwright test --config playwright.full.config.ts"` a `package.json`
- [ ] Verificar que `npm run test:e2e` (v1) sigue funcionando igual

**Archivos a crear/modificar:**
- `playwright.full.config.ts` (nuevo)
- `package.json` (agregar script)

**Criterio de avance:** `npm run test:e2e` sigue corriendo 387 tests; `npm run test:e2e:full` arranca sin errores.

---

### PASO 4 — Primer run de suite v2 (diagnóstico)
- [ ] Eliminar `.auth/*.json` para forzar re-autenticación fresca
- [ ] Ejecutar `npm run test:e2e:full`
- [ ] Registrar resultados en nueva sección de `docs/test-results-mayo-2026.md`
- [ ] Clasificar fallos nuevos en grupos:
  - **Grupo G** — admin/viewer ven datos de otro tenant
  - **Grupo H** — cleanup de planner elimina datos antes de que admin/viewer los lean
  - **Grupo I** — locators que asumen rol planner (texto de botones, permisos UI)
  - **Grupo J** — tests que son inherentemente planner-only (acciones sin sentido en otros roles)

**Duración estimada:** ~80 min de ejecución + 1h de análisis.

**Criterio de avance:** Lista completa de fallos clasificada.

---

### PASO 5 — Fixes Grupo G/H/I/J
- [ ] **Grupo G (tenant mismatch):** Si el Paso 2 corrigió el tenant, estos deberían desaparecer. Si persisten, revisar query de datos en cada page.
- [ ] **Grupo H (cleanup race):** En flows 30/31 (ventas/compras), el `afterAll` del rol planner elimina reportes antes de que admin/viewer los lean. Fix: cada rol crea sus propios datos en `beforeAll`.
- [ ] **Grupo I (locators de rol):** Actualizar assertions que asumen texto/botón visible solo para planner.
- [ ] **Grupo J (tests inherentemente planner-only):** Marcar con `test.skip()` + comentario explicativo los tests que no tienen sentido en admin/viewer (ej. crear cotización como viewer).

**Estimado de esfuerzo:** 4–6h según cantidad de fallos del Paso 4.

---

### PASO 6 — Run final v2 y release
- [ ] Eliminar `.auth/*.json` y ejecutar `npm run test:e2e:full`
- [ ] Verificar ≥ 95% passing (~1,045 / 1,100)
- [ ] Actualizar `docs/test-results-mayo-2026.md` con tabla final v2
- [ ] Hacer release con `/eb-release`

**Criterio de éxito:** ≥ 95% passing en suite v2. Los fallos restantes documentados como "known / won't fix" con justificación.

---

## Grupos de fallos esperados en v2

| Grupo | Descripción | Tests estimados | Fix estimado |
|-------|-------------|-----------------|--------------|
| G | admin/viewer ven tenant distinto → tablas vacías | ~20 | Paso 2 (tenant fix) |
| H | Cleanup planner elimina datos antes de admin/viewer | ~8 | beforeAll por rol |
| I | Locators asumen permisos de planner | ~15 | Actualizar assertions |
| J | Tests inherentemente planner-only | ~10 | test.skip() |

---

## Coexistencia de suites

```
# Suite v1 — uso diario, rápido (no modificar)
npm run test:e2e              # 387 tests · ~26 min

# Suite v2 — validación completa multi-rol
npm run test:e2e:full         # ~1,100 tests · ~80 min

# Reportes separados
playwright-report/            # reporte v1
playwright-report-full/       # reporte v2
```

---

*Documento creado: 2026-05-05 · Versión base: v3.7.12*
