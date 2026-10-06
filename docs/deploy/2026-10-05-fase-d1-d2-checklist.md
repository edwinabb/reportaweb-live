# Checklist D1-D2 — Deploy `dev.reportar.app` + `reporta-admin` TEST

**Fecha:** 2026-10-05 · **Plan origen:** `docs/superpowers/plans/2026-10-05-cierre-pendientes-y-deudas.md` FASE D1-D2.

> **Importante:** cada paso requiere ejecución tuya (credenciales Cloudflare/Supabase). Marcá el checkbox cuando esté hecho.
> El rebind `demo` → `dev.reportar.app` **mantiene vivo `demo.reportar.app` durante la transición** (las dos routes están en `wrangler.demo.toml` líneas 20-21). No hay riesgo de romper enlaces viejos.

---

## D1 · Deploy `dev.reportar.app` (worker `reportaweb-demo`)

### D1.1 · Prerrequisitos — [ ]

- [ ] `cd C:\Proyectos\reportaweb3`
- [ ] `git status` → debe estar limpio (ya está en master `001ffb4`).
- [ ] `npx wrangler whoami` → confirmá que estás logueado en la cuenta Cloudflare correcta. Si no: `npx wrangler login` (abre el browser).
- [ ] Cloudflare DNS → confirmá que `dev.reportar.app` tiene un CNAME proxied (naranja) al worker. Si no existe, agregarlo en el panel.

### D1.2 · Build + Deploy — [ ]

```bash
cd C:\Proyectos\reportaweb3
npm run build:demo
npx opennextjs-cloudflare build
npx wrangler deploy --config wrangler.demo.toml
```

- [ ] `npm run build:demo` termina sin errores.
- [ ] `npx opennextjs-cloudflare build` termina OK.
- [ ] `npx wrangler deploy` imprime las 2 routes aplicadas:
  - `dev.reportar.app`
  - `demo.reportar.app`
- [ ] Verificá en el output que carga el secret `SUPABASE_SERVICE_ROLE_KEY` (ya existe en el worker `reportaweb-demo` desde el deploy anterior).

### D1.3 · Smoke tests — [ ]

```bash
curl -I https://dev.reportar.app/
curl -I https://demo.reportar.app/
```

- [ ] `dev.reportar.app` responde `HTTP/2 200` (o `302 → /login`) con header `cf-ray`.
- [ ] `demo.reportar.app` **sigue respondiendo** igual (no se rompió).

Login real:
- [ ] Abrí `https://dev.reportar.app/login` en el browser. Login con tu usuario de TEST.
- [ ] Carga el dashboard; no hay 500 ni redirect loops.
- [ ] Alguna acción admin (ej. abrir `/settings/usuarios`, borrar un usuario soft, crear uno). Si da 401/403 → verificar que el secret del worker esté vigente.

### D1.4 · Verificación cross-browser — [ ]

- [ ] Chrome/Edge: login ok.
- [ ] Firefox: login ok (opcional).

### D1.5 · Rollback plan — si algo falla

- `demo.reportar.app` sigue sirviendo el worker previo porque la route está lista en el nuevo deploy. Si `dev.reportar.app` no responde: `npx wrangler rollback --config wrangler.demo.toml` revierte al deploy anterior (que no tenía la route de `dev`, pero las de `demo` sí). Comunicá tras rollback.

---

## D2 · Deploy `reporta-admin` TEST (worker `reporta-admin-test`)

### D2.1 · Promover `info@reporta.la` a `reporta_admin` en TEST — [ ]

El MCP de Supabase está read-only en mi sesión. Ejecutá vos:

1. Abrí Supabase Studio → proyecto **TEST** (`oyrokyyaeaeqzlsgxtto`) → SQL Editor.
2. Pegá:
   ```sql
   UPDATE profiles
   SET role = 'reporta_admin', updated_at = now()
   WHERE id = 'b13ad450-ed04-410f-a852-743a2ff57d67'
     AND email = 'info@reporta.la'
     AND role = 'admin_tenant'
   RETURNING id, email, role, tenant_id;
   ```
3. - [ ] Devuelve 1 fila con `role='reporta_admin'`.
4. - [ ] Si devuelve 0 filas: chequear si ya se ejecutó antes (`SELECT role FROM profiles WHERE email='info@reporta.la'`).

**Reversible:** `UPDATE profiles SET role='admin_tenant' WHERE id='b13ad450-ed04-410f-a852-743a2ff57d67';`

**No afecta E2E:** los tests usan `e2e-admin@reporta.la` (otro usuario). `info@reporta.la` solo aparece en `setup-base.ts:54` como marker de timeout y en `45-permisos-cargo.spec.ts:53` como comentario.

### D2.2 · Secret del worker TEST — [ ]

1. Cloudflare Dashboard → Workers & Pages → **(crear si no existe)** `reporta-admin-test`.
2. Settings → Variables → Secret:
   - Nombre: `SUPABASE_SERVICE_ROLE_KEY`
   - Valor: la service_role de **TEST** (`.env.local` → `TEST_SUPABASE_SERVICE_ROLE_KEY` o similar; **nunca** la de PROD).
3. - [ ] Guardado y la UI confirma "encrypted".

### D2.3 · Build + Deploy — [ ]

```bash
cd C:\Proyectos\reporta-admin
npm install                                   # si cambió algo desde el último
npm run build
npx opennextjs-cloudflare build
npx wrangler deploy --config wrangler.test.toml
```

- [ ] Build sin errores.
- [ ] `wrangler deploy` imprime `reporta-admin-test` deployado.
- [ ] Decidir dominio: ¿bindear a `admin-test.reportar.app` (recomendado), o quedarse con `reporta-admin-test.<account>.workers.dev` para esta primera iteración? Si bindeás dominio: agregarlo al `wrangler.test.toml` como `routes = [{ pattern = "admin-test.reportar.app", custom_domain = true }]` y crear el DNS CNAME.

### D2.4 · Smoke tests — [ ]

- [ ] URL del worker (del output de deploy) responde `200` en `/login`.
- [ ] Login con `info@reporta.la` + su contraseña (o magic link / PIN según el flow de reporta-admin).
- [ ] Dashboard carga sin 500.
- [ ] Si está la UI de upload de plantillas: probar subir **1** `.docx` placeholder a `system_document_templates` para CISE, tipo `cotizacion`. Esto permite el smoke test del bridge PDF de Bubble (D4-D5 más adelante).

### D2.5 · Rollback plan

- Rollback de la promoción: SQL inverso de D2.1.
- Rollback del worker: `npx wrangler rollback --config wrangler.test.toml`.
- Si no bindeaste dominio, no hay DNS que revertir.

---

## Cosas que NO están en D1-D2 (quedan para D3-D5)

- Deploy real de `reporta-admin` a **PROD** (`admin.reporta.la`) → **D3**. Depende de A1 (service_role rotada).
- Poblar los 6 `.docx` reales en `system_document_templates` para CISE+GRUAS → **D4**. Depende de D2 funcionando + obtener los `.docx` desde docmaker.
- Smoke test del bridge PDF Bubble (6 tipos) → **D5**. Depende de D4.
- Bind apex `reportar.app` → `reportaweb-live` → **D6**. Depende de Growth Engine (FASE G).

---

## Al terminar — [ ]

- [ ] Marcá los 4 checkboxes grandes de este doc.
- [ ] Avisá en el chat; actualizo `CLAUDE.md` § Estado Actual + `docs/TECHNICAL_DEBTS.md` (fila "Crear entorno Cloudflare de prod…" pasa a 🟢 para la parte de TEST + dev).
- [ ] Commit opcional: `docs(deploy): checklist D1-D2 ejecutado, dev.reportar.app + reporta-admin-test vivos`.
