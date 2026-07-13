# Deployment Runbook — REPORTA WEB v3

> Guía paso-a-paso para desplegar el app server en Vercel con DNS en Cloudflare + Resend para emails.
> No contiene secretos. Los valores reales viven en Vercel UI + Cloudflare DNS + tu password manager.

---

## Decisión de infraestructura (2026-04-21)

| Capa | Servicio | Motivo |
|---|---|---|
| App server Next.js | **Vercel Pro** | Next.js 16 first-class · `vercel.json` ya con Cron Jobs · deploy en 30 min |
| DNS del dominio | **Cloudflare** (ya existente) | Mantiene el registrar actual · CNAME a Vercel |
| Base de datos | **Supabase** (ya existente) | Project `wioozisskjjgjjybsoqo` |
| Object storage | **Supabase Storage** (buckets `formatos`, `cotizaciones`, `epp-entregas`, `logos`, etc.) | Migrable a Cloudflare R2 post-cutover si escala el egress |
| Emails transaccionales | **Resend** | Único, dominio `reporta.la` verificado |
| PDF rendering | **Gotenberg** (externo) | VPS propio `89.117.72.44` · `https://infrastructure-gotenberg.0vt9eo.easypanel.host` |

Cloudflare Pages fue evaluado y descartado: Next.js 16 adapter todavía tiene fricciones (Gotenberg CPU limit, crons separados, Server Actions streaming).

---

## 1. Pre-requisitos

- [ ] Repo `github.com/edwinabb/reportaweb3` accesible con la cuenta que va a hacer el deploy.
- [ ] Cuenta Vercel (crear si no existe) — **plan Pro** (los Cron Jobs no corren en Hobby).
- [ ] Cuenta Resend (crear si no existe) — plan gratis alcanza para el volumen actual.
- [ ] Cloudflare con zona activa para `reporta.la`.
- [ ] Acceso al Supabase Dashboard para copiar las API keys.
- [ ] Password manager listo para guardar la copia maestra de los secretos.

---

## 2. Preparar DNS en Cloudflare

Zona: `reporta.la`. Todos los registros nuevos van con **proxy apagado** (nube gris, "DNS only") — Vercel y Resend necesitan ver las IPs reales.

| Tipo | Nombre | Valor | Proxy | Uso |
|---|---|---|---|---|
| `CNAME` | `app` (o `@` para root) | `cname.vercel-dns.com` | DNS only | App server |
| `MX` | `@` (o `send`) | Según Resend | DNS only | Recepción / bounce |
| `TXT` | `@` (o `send`) | `v=spf1 include:_spf.resend.com ~all` | DNS only | SPF |
| `TXT` | `resend._domainkey` | DKIM largo que da Resend | DNS only | DKIM |
| `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@reporta.la` | DNS only | DMARC |

Si el dominio raíz ya tiene MX para otro proveedor de email, Resend soporta subdomain (`send.reporta.la`) para no romper el email corporativo.

---

## 3. Configurar Resend

1. Login en <https://resend.com>.
2. **Domains → Add Domain** → `reporta.la` (o `send.reporta.la` si subdomain).
3. Copiar los 3 registros (MX + SPF + DKIM) a Cloudflare DNS según la tabla de arriba.
4. Esperar 5–15 min → refrescar → estado **Verified**.
5. **API Keys → Create API Key** → permisos *Sending access* → guardar `re_XXXXXXXX` en el password manager.

---

## 4. Importar proyecto en Vercel

1. **New Project** → **Import Git Repository** → `edwinabb/reportaweb3` → autorizar GitHub.
2. Framework Preset: **Next.js** (auto-detect).
3. Build Command: default.
4. Output Directory: default (`.next`).
5. Root Directory: `./`.
6. Install Command: `npm install`.

### 4.1. Environment Variables

Pegar **antes del primer deploy** (Settings → Environment Variables → todas en scope *Production + Preview + Development* salvo las marcadas):

```
NEXT_PUBLIC_SUPABASE_URL=https://wioozisskjjgjjybsoqo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...           # Dashboard Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # Mismo lugar — SECRETO, scope Production
GOTENBERG_URL=https://infrastructure-gotenberg.0vt9eo.easypanel.host
RESEND_API_KEY=re_...                          # Scope Production
CRON_SECRET=<openssl rand -hex 32>             # Scope Production
NEXT_PUBLIC_SITE_URL=https://app.reporta.la    # O el subdomain elegido
```

### 4.2. Deploy inicial

1. Click **Deploy**. Primera build debería pasar limpia.
2. Si falla por typecheck: `npx tsc --noEmit 2>&1 | grep -v "scripts/"` local antes de re-deploy.

### 4.3. Conectar el dominio

1. **Settings → Domains → Add** → `app.reporta.la` (o el elegido).
2. Vercel pide confirmar el `CNAME` — ya configurado en Cloudflare paso 2.
3. Esperar que verifique → status **Valid**. Vercel emite cert SSL automático.

### 4.4. Plan Pro + Cron Jobs

1. Account/Team Settings → **Upgrade to Pro** ($20/mes).
2. **Project → Cron Jobs**: debería auto-detectar los 2 jobs declarados en [vercel.json](vercel.json):
   - `0 9 * * *` → `/api/cron/epp-alertas` (alertas EPP diarias, 9am Lima)
   - `0 8 * * 1` → `/api/cron/epp-reporte-semanal` (reporte semanal, lunes 8am)
3. Confirmar que ambos aparecen con "Ready".

---

## 5. Smoke test post-deploy

Desde `https://app.reporta.la`:

1. **Login** — un admin tenant real.
2. **`/formatos`** — ver plantillas CISE/GRUAS seed.
3. **`/informes/nuevo`** → seleccionar plantilla → llenar → firmar → enviar → validar correlativo `INF-XXX-2026-000001` asignado.
4. **`/api/informes/<id>/pdf`** → el PDF carga (valida que Gotenberg responde).
5. **`/epp/alertas`** → click **Enviar por email** → validar en Resend → Logs que salió.
6. **`/admin/agenda`** → calendario semanal carga.
7. Disparar cron manualmente para probar sin esperar:
   ```bash
   curl -X POST https://app.reporta.la/api/cron/epp-alertas \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

---

## 6. Checklist post-deploy pre-cutover 2026-05-02

- [ ] DNS `app.reporta.la` resolviendo correcto + SSL válido.
- [ ] Cron jobs habilitados y en "Ready".
- [ ] Smoke test Fase G (compras) pasa.
- [ ] Smoke test Fase H (formatos/informes) pasa — incluye PDF.
- [ ] Smoke test Fase J (email EPP) pasa — Resend log confirma envío.
- [ ] Smoke test Fase O (agenda) pasa.
- [ ] Cliente GRUAS sube `imagen_banco` + `imagen_firma` en `/settings/cotizaciones`.
- [ ] Usuarios reales hacen UAT en prod stage durante la semana.
- [ ] Cutover definitivo sábado 2026-05-02.

---

## 7. Runbook de operación (ongoing)

### Cambiar env vars

Vercel UI → Settings → Environment Variables → **Edit**. Después **redeploy** manual (Vercel no reinicia automático tras cambiar env).

### Ver logs

- **Build logs:** Vercel UI → Deployments → cada deployment.
- **Runtime logs:** Vercel UI → project → **Logs** (live tail).
- **Cron logs:** Vercel UI → Cron Jobs → cada job tiene historial de ejecuciones.
- **Emails:** Resend → Logs (última semana de envíos).

### Rollback

Vercel UI → Deployments → el último que funcionaba → menú ⋯ → **Promote to Production**. Instantáneo.

### Disparar cron manual

```bash
curl -X POST https://app.reporta.la/api/cron/epp-alertas \
  -H "Authorization: Bearer $CRON_SECRET"
curl -X POST https://app.reporta.la/api/cron/epp-reporte-semanal \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Regenerar types de Supabase después de un schema change

```bash
export SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-)
npx supabase gen types typescript --project-id wioozisskjjgjjybsoqo > types/supabase.ts
```

---

## 8. Optimización futura (post-cutover)

- **Cloudflare R2** para el bucket de PDFs si el egress de Supabase Storage escala feo. Migración = cambiar cliente S3 + copiar archivos. No afecta el deployment del app server.
- **Supabase Edge Functions** si aparece lógica que no conviene en Vercel (ej. webhooks de n8n que deben responder en < 100ms global).
- **Gotenberg** ya migrado a VPS propio (`89.117.72.44`, EasyPanel). URL actualizada en env.

Ninguna bloquea el cutover.
