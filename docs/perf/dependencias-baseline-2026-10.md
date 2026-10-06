# Baseline de dependencias — 2026-10-05

Snapshot generado a partir de `npm audit` + `npm outdated` ejecutados en la raíz del repo (`C:\Proyectos\reportaweb3`) el 2026-10-05. Entrada para los tickets de upgrade por prioridad definidos en la Fase A del plan `docs/superpowers/plans/2026-10-05-cierre-pendientes-y-deudas.md`.

Dumps crudos (temporales, no committeados):
- `C:\tmp\npm-audit-prod.json`
- `C:\tmp\npm-audit-all.json`
- `C:\tmp\npm-outdated.json`
- `C:\tmp\npm-ls.txt`

---

## 1. Resumen `npm audit`

| Severidad | PROD (`--omit=dev`) | TOTAL (dev+prod) |
|-----------|---------------------|------------------|
| Critical  | **1**               | 2                |
| High      | **11**              | 23               |
| Moderate  | **19**              | 22               |
| Low       | **1**               | 1                |
| **Total** | **32**              | 48               |

> La columna "PROD" es la que importa para runtime del worker. La diferencia PROD vs TOTAL (16 extras) proviene del árbol dev (wrangler, miniflare, eslint, next-eslint, playwright, jest-worker). Ninguna de las TOTAL-only afecta el bundle que se despliega.

---

## 2. Vulnerabilidades HIGH / CRITICAL en PROD

| Paquete | Severidad | Rango vulnerable actual | Fix disponible | Notas |
|---------|-----------|-------------------------|----------------|-------|
| `next` | **CRITICAL** | `9.3.4-canary.0 – 16.3.5` (actual **16.2.10**) | Sí — `>=16.3.6` | 12 advisories, incluye RCE en `next/og` (GHSA-vcvr-r3jv-pc5j), RCE en Image Optimization con AVIF, SSRF en rewrites, cache confusion, DoS, middleware bypass. **Es el fix más urgente.** |
| `@xmldom/xmldom` | high | `0.9.0-beta.1 – 0.9.11` | Sí | 17 advisories de injection + ReDoS/DoS. Transitiva de `docxtemplater`/`pizzip`. |
| `axios` | high | `1.0.0 – 1.19.0` (actual **1.14.0**) | Sí — `>=1.20.0` | 35 advisories: prototype pollution, SSRF, CRLF injection, header leakage, DoS. Fix minor (1.14 → 1.20). |
| `brace-expansion` | high | `3.0.0 – 5.0.11` | Sí | 7 ReDoS/DoS advisories. Transitiva (glob/minimatch). |
| `browserslist` | high | `<=4.28.6` | Sí | OOM + prototype write. Transitiva (next/postcss). |
| `fast-uri` | high | `3.0.0 – 3.1.7` | Sí | 9 advisories SSRF/host confusion/path traversal. Transitiva. |
| `form-data` | high | `4.0.0 – 4.0.5` | Sí | CRLF injection. Transitiva. |
| `nanoid` | high | `<=3.3.17` | Sí | DoS + integer overflow. Transitiva. |
| `postcss` | high | `<=8.5.22` | Sí | XSS + path traversal source-map disclosure. Transitiva de `next`. |
| `sharp` | high | `<=0.35.4-rc.0` | Sí | libvips + libheif inherited CVEs. Transitiva de `next`. |
| `source-map-js` | high | `1.0.0 – 1.2.1` | Sí | Event-loop DoS. Transitiva. |
| **`xlsx`** | high | `*` (actual **0.18.5**) | **NO** | Prototype Pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9). **No hay fix publicado en npm**; SheetJS Pro distribuye por CDN propio. Ver **DUDA-DEPS-001**. |

### DUDA-DEPS-001 — `xlsx`

- Instalado: `xlsx@0.18.5` (desde `package.json`, registro npm).
- Advisories vigentes: prototype pollution + ReDoS; `npm audit` marca `fixAvailable: false`.
- Opciones:
  1. Migrar a `xlsx` CDN de SheetJS (`https://cdn.sheetjs.com/xlsx-X.Y.Z/xlsx-X.Y.Z.tgz`) — fix oficial pero cambia pipeline de instalación.
  2. Reemplazar por `exceljs` o `write-excel-file` donde aplique.
- Acción: ticket aparte para auditar los call-sites antes de decidir.

### DUDA-DEPS-002 — `@opennextjs/cloudflare`

- Instalado: **1.20.1**, latest: **1.20.8** (patch, sin breaking).
- Sin vulnerabilidades reportadas. Monitorear releases para soporte de Node middleware (actualmente bloquea migrar middleware a Node runtime).
- Acción: actualizar a 1.20.8 en el batch patch (seguro) y revisar changelog por soporte Node middleware.

---

## 3. Top-20 paquetes outdated por desfase

**Total outdated:** 52 (major: 9 · minor: 31 · patch: 12).

### Major (ticket aparte, breaking posible)

| Paquete | Current | Latest | Notas |
|---------|---------|--------|-------|
| `@sentry/nextjs` | 10.50.0 | 11.4.0 | Revisar changelog, SDK v11 cambia init API. |
| `@tanstack/react-table` | 8.21.3 | 9.2.6 | v9 cambia API de columnas. |
| `@types/node` | 20.19.25 | 26.6.4 | Alinear con Node 22 LTS; impacto solo TS. |
| `dotenv` | 17.2.3 | 18.0.5 | API estable, revisar notas v18. |
| `eslint` | 9.39.1 | 10.12.0 | v10 remueve APIs legacy, puede romper `eslint-config-next`. |
| `lucide-react` | 0.556.0 | 1.52.0 | v1.x estabiliza API; auditar imports de íconos. |
| `react-day-picker` | 9.12.0 | 10.0.2 | Breaking en props de calendario. |
| `typescript` | 5.9.3 | 7.0.2 | **Alto riesgo** — revisar nuevos chequeos. |
| `uuid` | 13.0.0 | 14.0.2 | API estable, verificar imports ESM. |

### Minor (revisar changelog, batch separado)

| Paquete | Current | Latest |
|---------|---------|--------|
| `@sentry/nextjs` subset Radix UI (10 paquetes) | varios | varios minor |
| `@supabase/ssr` | 0.8.0 | 0.12.7 |
| `@supabase/supabase-js` | 2.86.2 | 2.117.2 |
| `@tailwindcss/postcss` | 4.1.17 | 4.3.3 |
| `tailwindcss` | 4.1.17 | 4.3.3 |
| `axios` | 1.14.0 | 1.20.0 ← **cierra 35 advisories** |
| `next` | 16.2.10 | 16.3.8 ← **cierra 12 advisories, incl. critical** |
| `eslint-config-next` | 16.0.7 | 16.3.8 |
| `@playwright/test` | 1.59.1 | 1.63.0 |
| `date-fns` | 4.1.0 | 4.4.0 |
| `docxtemplater` | 3.67.6 | 3.71.0 |
| `pg` | 8.21.0 | 8.23.1 |
| `react-hook-form` | 7.68.0 | 7.89.0 |
| `resend` | 6.10.0 | 6.32.0 |
| `zod` | 4.1.13 | 4.6.5 |
| `tailwind-merge` | 3.4.0 | 3.7.0 |

### Patch (batch seguro)

- `@opennextjs/cloudflare` 1.20.1 → 1.20.8
- `@radix-ui/react-separator`, `@radix-ui/react-tabs`
- `@types/leaflet` 1.9.21 → 1.9.22
- `jszip` 3.10.1 → 3.10.2
- `pizzip` 3.2.0 → 3.3.0
- `react` / `react-dom` 19.2.0 → 19.3.0
- `slugify` 1.6.6 → 1.6.9
- `sonner` 2.0.7 → 2.0.8

---

## 4. Clasificación de fixes por prioridad

### Prioridad 1 — Patch batch (seguro, aplicar en un solo PR)

Candidatos sin breaking conocido. Un `npm update` sobre estas versiones debería bastar:

- `@opennextjs/cloudflare` (resuelve DUDA-DEPS-002)
- `react`, `react-dom`, `@types/react`, `@types/react-dom`
- `jszip`, `pizzip`, `slugify`, `sonner`, `@types/leaflet`
- Radix UI patches (`react-separator`, `react-tabs`, resto quedan como minor)

### Prioridad 2 — Minor con revisión de changelog (varios PRs cortos)

Agrupar por "familia":

1. **Next.js stack** — `next` 16.2.10 → 16.3.8 + `eslint-config-next` → 16.3.8. **Cierra el CRITICAL y 11 highs de `next`.** Prioritario.
2. **axios** 1.14 → 1.20. **Cierra 35 advisories.** Prioritario inmediatamente después de Next.
3. **Supabase** — `@supabase/ssr` + `@supabase/supabase-js`.
4. **Tailwind** — `tailwindcss` + `@tailwindcss/postcss`.
5. **Radix UI minor set** (10+ paquetes) — un PR único.
6. **Resto minor** — `resend`, `zod`, `date-fns`, `docxtemplater`, `pg`, `react-hook-form`, `@playwright/test`, `tailwind-merge`.

### Prioridad 3 — Major (ticket por paquete, no batch)

Cada uno con changelog + test suite. Orden sugerido por riesgo:

1. `@tanstack/react-table` 8→9 (API columnas).
2. `react-day-picker` 9→10 (UI calendars).
3. `lucide-react` 0.x→1.x (imports de íconos).
4. `@sentry/nextjs` 10→11 (init API).
5. `dotenv` 17→18.
6. `uuid` 13→14.
7. `@types/node` 20→26 (solo TS).
8. `eslint` 9→10 (coordinar con `eslint-config-next`).
9. `typescript` 5→7 — **último, mayor impacto**.

### Prioridad 4 — Pendientes de decisión (sin fix directo)

- **`xlsx`** (DUDA-DEPS-001) — requiere decisión producto: CDN SheetJS vs reemplazo (`exceljs` / `write-excel-file`).

---

## 5. Próximos pasos sugeridos

1. Abrir ticket `SEC-DEPS-001`: upgrade `next` 16.2.10 → 16.3.8 (critical). Verificar E2E tras bump.
2. Abrir ticket `SEC-DEPS-002`: upgrade `axios` 1.14 → 1.20.
3. Abrir ticket `SEC-DEPS-003`: batch patch (prioridad 1).
4. Abrir ticket `SEC-DEPS-004`: decidir fate de `xlsx` (DUDA-DEPS-001).
5. Dejar `@opennextjs/cloudflare` 1.20.1 → 1.20.8 en el batch patch y chequear si el changelog menciona Node middleware (DUDA-DEPS-002).

> **Nota:** este documento es solo baseline. No se corrió ningún `npm update` ni `npm install` como parte de la Tarea A5.
