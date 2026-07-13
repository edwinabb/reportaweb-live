# PROMPT DE REINICIO — pegar al arrancar una nueva sesión de Claude Code

> Propósito: re-entrar al proyecto REPORTA WEB v3 con contexto completo en 1 prompt.
> Uso: copiá el bloque "PROMPT" de abajo y pegalo como primer mensaje al abrir Claude Code.
> Este archivo lista **solo lo pendiente**. Historia completa en `DOCUMENTACION_PROYECTO.md` y `RELEASE_NOTES.md`.

---

## PROMPT (copiar desde aquí)

Hola. Estoy retomando el proyecto **REPORTA WEB v3** (Next.js 16 + Supabase, multi-tenant CISE/GRUAS, migrado desde Bubble, en producción desde 2026-05-07). Antes de responderme, leé:

1. `CLAUDE.md` — estado actual del proyecto, módulos, decisiones de schema, comandos.
2. `DEUDA_TECNICA.md` — deuda activa.
3. `PROMPT-REINICIO.md` §Pendientes — lista de tareas en curso.

**Versión actual:** v3.7.45 (2026-05-23). Deploy en producción: `https://app.reporta.la`.

---

## Pendientes

### 🟡 Edge Function `onboarding-copy-defaults` — re-deploy pendiente

La función fue actualizada localmente (commit v3.7.45) con:
- Nuevas tablas: `actividades_matriz`, `sst_epp_config`, `cotizaciones_configuracion`

**Hay que desplegarla en Supabase** vía MCP o CLI:
```bash
supabase functions deploy onboarding-copy-defaults --project-ref wioozisskjjgjjybsoqo
```
O desde Claude con el MCP Supabase → `deploy_edge_function`.

---

### 🔴 Deuda técnica activa (ver DEUDA_TECNICA.md)

| ID | Resumen |
|----|---------|
| DT-MIG01 | Seed `contactos_cargo` y `contactos_area` con valores únicos de contactos migrados de Bubble |
| DT-MIG02 | Remediación post-migración (3 bugs: created_by, foto_actividad_url, pdf_url usuarios) |
| DT-MIG03 | Regenerar PDFs faltantes en reportes_maquinaria (1,414 registros sin pdf_url) |
| DT-DNS01 | DNS `reportar.app` apuntar a Vercel (error 522) |
| DT-PDF01 | Verificar templates PDF vs formatos físicos GRUAS DEL PACÍFICO |

---

### 🟢 Features post-cutover (por definir)

- Pendiente feedback de usuarios CISE/GRUAS en producción.
- Suite E2E v2 multi-rol (~1100 tests) — ver `docs/plan-suite-v2.md`.

---

## Arquitectura rápida

- **Multi-tenant:** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
- **Referencia onboarding (INGEM):** `3be055d3-7570-45ed-843e-1bc9bdb733fd`
- **reporta_admin** puede cambiar tenant activo en `/sistema/tenant` (cookie `managed_tenant_id`)
- **Edge Functions:** excluidas de tsconfig (`"supabase/functions"` en `exclude`)
- **Storage:** buckets públicos (`logos`, `maquinarias`, `usuarios`) · privados (`doc_usuarios`, `doc_maquinarias`)

---

## Comandos útiles

```bash
# Dev
npm run dev                    # http://localhost:3000

# Build (correr antes de deploy)
npm run build

# Types Supabase
npm run types:supabase

# Deploy (skill)
# /eb-release → bump patch → commit → push → vercel deploy
```

---

## Reglas técnicas no olvidar

- `searchParams` Next.js 16: siempre `Promise<T>` + `await`
- Server Actions: `captureWithContext(error, pathname)` de `lib/sentry`
- `config_informe_*` y `config_checklist`: upsert, nunca create (tenant_id es PK en config_informe_*)
- `cotizaciones_configuracion`: tiene UUID id + UNIQUE tenant_id → insert (no upsert)
- Storage uploads: usar `adminClient` (service role), NO cliente de usuario
- `next build` antes de deploy (tsc solo no detecta errores de prerender)

---

## Fin del PROMPT
