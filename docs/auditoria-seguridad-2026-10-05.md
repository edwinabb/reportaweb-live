# Auditoría de secretos y credenciales — 2026-10-05

**Scope:** árbol trackeado en `master` + últimos 30 días de historia (119 commits) + archivos locales no trackeados.
**Autor:** FASE A, A4 del plan `docs/superpowers/plans/2026-10-05-cierre-pendientes-y-deudas.md`.

---

## 1. Matches por tipo de secreto

| Tipo | Matches árbol | Matches en commits últimos 30d | Veredicto |
|---|---:|---:|---|
| `sb_secret_…` (Supabase service key nuevo formato) | **0** | 0 | 🟢 limpio |
| `sb_publishable_…` (Supabase anon nuevo formato) | 2 | 0 nuevos | 🟢 esperado (público) — ver §3 |
| `sbp_…` (PAT Supabase) | **0** | 1 commit (`b681ae2`) **solo lo menciona en TECHNICAL_DEBTS como deuda**, no filtra token nuevo | 🟢 ya rotados / limpio en árbol |
| JWT `eyJ…ey…` (anon/service_role legacy) | 4 | 0 nuevos | 🟡 **todos son `role:"anon"` (verificado por decode)** — ningún `service_role` trackeado; mezcla legacy vs sb_publishable (§3) |
| `Bearer [0-9a-f]{20,}` | 0 | 0 | 🟢 |
| Resend `re_…` | 0 | 0 | 🟢 (clave real solo en `.env.local` gitignored) |
| Postmark | 0 (solo nombre de env var en `.env.example` y `lib/email.ts`) | 0 | 🟢 |
| SendGrid `SG.…` | 0 | 0 | 🟢 |
| Stripe `sk_live_` / `rk_live_` | 0 | 0 | 🟢 |
| Bubble token-live (prefijo retirado del árbol el 2026-10-05) | **0** matches en el árbol actual (antes de la limpieza: 16 en 8 docs) | 2 commits previos (`b681ae2`, `211ff4b`) — ambos solo tocan docs; prefijos quedan en git history | 🟡 **tokens inertes esperando rotación en Bubble** — ver DUDA-SEC-002 |
| URL proyecto muerto `wioozisskjjgjjybsoqo…` | 72 (70 en docs, **2 en código activo**) | 0 nuevos | 🟡 ver §4 (hallazgo nuevo de código) |
| `password = … / secret = … / api_key = …` hardcoded | 2 (ambos `env(…)` en `supabase/config.toml`, correcto) | 0 | 🟢 |

### Archivos trackeados que contienen material sensible

| Archivo | Qué contiene | Status |
|---|---|---|
| `.env.production` | solo `sb_publishable_` (anon público PROD) y URLs | 🟢 OK |
| `.env.demo` | anon JWT legacy TEST (público) + URLs | 🟡 convertir a `sb_publishable_` cuando se rote la anon de TEST |
| `wrangler.toml` | anon JWT legacy PROD | 🟡 **archivo huérfano** — `wrangler.live.toml` ya migró a `sb_publishable_`; `wrangler.toml` quedó sin actualizar |
| `wrangler.live.toml` | `sb_publishable_` PROD | 🟢 OK |
| `wrangler.demo.toml` | anon JWT legacy TEST | 🟡 mismo caso que `.env.demo` |
| `docs/julio13/DEMO_TEST_DB_SETUP.md` | anon JWT legacy TEST | 🟢 doc histórico, es key pública |
| 8 docs con prefijo del token-live (ya retirado del árbol el 2026-10-05) | token Bubble filtrado | 🟡 DUDA-SEC-002 — rotar en Bubble sigue pendiente del usuario |

### Archivos NO trackeados con secretos reales (correcto que estén fuera de git)

Confirmado por `.gitignore` (`.env*` excepto `.env.production`/`.env.demo`/`.env.example`):

- `.env.local` — `RESEND_API_KEY`, `BUBBLE_API_TOKEN` (token-live — rotar), `SUPABASE_ACCESS_TOKEN=sbp_28c7…`, `CLOUDFLARE_API_TOKEN=cfut_lsXm…`, `BUBBLE_PDF_BRIDGE_API_KEY`, service_role de PROD **comentado** (líneas 20/26), `DEMO_SUPABASE_SERVICE_ROLE_KEY` activo.
- `.env.test` — anon + service_role de TEST.

Ninguno aparece en `git status`; ninguno es stageable por accidente.

---

## 2. Rotación pendiente (seguimiento de deudas existentes)

| Deuda | Estado hoy (verificado en código) | Nota |
|---|---|---|
| **DUDA-SEC-001** — Rotar `SERVICE_ROLE_KEY` PROD (estuvo en git) | 🟢 **Avanzado:** anon PROD migrado a `sb_publishable_` en `.env.production` + `wrangler.live.toml`. Falta: cargar `sb_secret_` en worker `reportaweb-live`, verificar y deshabilitar legacy. | Service role NO está hoy trackeado ni en los últimos 30 días. Única copia en `.env.local` líneas 20/26 **comentada**. |
| **DUDA-SEC-002** — Rotar tokens Bubble + limpiar docs | 🟡 **Rotación aún pendiente del usuario.** Limpieza de árbol ya aplicada (prefijo retirado de los 8 docs el 2026-10-05 — DUDA-SEC-002 §A2). Token sigue activo en `.env.local` como `BUBBLE_API_TOKEN` hasta la rotación. | Dos commits de los últimos 30d tocan docs con el token, pero ambos solo *documentan la deuda* — no se agregó un token nuevo. |
| **DUDA-SEC-003** — Revocar PATs Supabase expuestos (`sbp_2135…`, `sbp_bd7c…`) | 🟡 **Pendiente** (acción solo en dashboard Supabase). Ya removidos de `~/.claude/settings.json`. | `git grep sbp_` en el árbol: 0 matches. 🟢 árbol limpio; falta revocar en el dashboard. |

---

## 3. Falsos positivos / intencionales

- **`sb_publishable_jNXbMhz5zkjtJ0rEnAieZA_s2F5h548`** en `.env.production:7` y `wrangler.live.toml:18`: anon key PROD en formato nuevo. Pública por diseño (protegida por RLS). ✅ Intencional.
- **Anon JWT TEST** (`oyrokyyaeaeqzlsgxtto`) en `.env.demo`, `wrangler.demo.toml`, `docs/julio13/DEMO_TEST_DB_SETUP.md`: anon key pública del proyecto TEST en formato legacy. ✅ Intencional, pero inconsistente con el nuevo formato de PROD; conviene migrar a `sb_publishable_` cuando se tenga.
- **`openai_api_key = "env(OPENAI_API_KEY)"`** y **`secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"`** en `supabase/config.toml`: *placeholders* que resuelven desde entorno. ✅ Intencional.
- Menciones al token-live Bubble y `sbp_…` en `TECHNICAL_DEBTS.md` / runbook / planes: referencias intencionales para documentar la deuda. Tras la limpieza del 2026-10-05 los prefijos ya no aparecen literalmente — se referencian como "token-live" / "token-settings". El material peligroso sigue siendo el mismo token legacy; no agregan superficie nueva.

---

## 4. Hallazgos NUEVOS (no listados en TECHNICAL_DEBTS)

1. **`wrangler.toml` tiene anon JWT legacy PROD** (línea 27) mientras `wrangler.live.toml` ya migró a `sb_publishable_`.
   - No es un leak de service_role (es anon, es público), pero el archivo quedó desincronizado del release v3.11.5 de DUDA-SEC-001. Si `wrangler.toml` sigue en uso para algún deploy, debería migrarse también. Si está obsoleto, convendría borrarlo para evitar confusión.
2. **Dead-project URL hardcoded como fallback de runtime en código activo:**
   - `lib/utils/storage.ts:2` → `const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wioozisskjjgjjybsoqo.supabase.co';`
   - `next.config.ts:109` → `hostname: 'wioozisskjjgjjybsoqo.supabase.co'` en `images.remotePatterns`.
   - CLAUDE.md afirma que `wioozisskjjgjjybsoqo` está muerto. El fallback de `storage.ts` nunca debería dispararse en prod, y el patrón de imagen de Next podría permitir fetchear desde un host muerto. **No es un secreto filtrado**, pero es deuda de higiene relacionada con la limpieza post-cutover.
3. **`.claude/commands/eb-types.md:9`** aún usa `--project-id wioozisskjjgjjybsoqo` en el comando documentado para regenerar tipos. Debería ser `fqwhagryqkkhbgznxtwf` (TK para FASE B).

Ninguno de los tres es exposición de credenciales activas; son residuales de la migración de proyecto Supabase.

---

## 5. Veredicto final

**🟡 LIMPIEZA PENDIENTE — sin nuevas filtraciones de secretos activos.**

- 🟢 El árbol no tiene ningún `sb_secret_`, `sbp_`, service_role JWT, Resend/SendGrid/Stripe key o Bearer hex. Los 30 días de historia reciente tampoco agregan secretos nuevos; los dos commits que tocan el token-live Bubble solo lo mencionan en docs/plan de deudas, y a partir del 2026-10-05 el prefijo ya no aparece literalmente en el árbol.
- 🟡 Rotaciones ya conocidas siguen pendientes de acción del usuario: DUDA-SEC-001 (deshabilitar legacy en Supabase + cargar `sb_secret_` en worker), DUDA-SEC-002 (rotar token-live Bubble en el panel de Bubble — la limpieza de los 8 docs trackeados ya se aplicó el 2026-10-05, DUDA-SEC-002 §A2), DUDA-SEC-003 (revocar 2 PATs en dashboard Supabase).
- 🟡 Hallazgos nuevos (hygiene, no credencial): (1) `wrangler.toml` quedó con anon legacy PROD mientras `wrangler.live.toml` ya migró, (2) `lib/utils/storage.ts` y `next.config.ts` conservan el host del proyecto Supabase muerto como fallback/pattern, (3) `.claude/commands/eb-types.md` apunta al project-id muerto.
