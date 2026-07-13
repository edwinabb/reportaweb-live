# Plan Post-Cutover — REPORTA (actualizado 2026-06-02)

Cutover completado 2026-05-30 22:00. Estado del sistema y prioridades de trabajo.

---

## Completado 2026-06-02

| Versión | Fix |
|---------|-----|
| v3.10.35 (web) | Fix módulo `/sistema` — sección solo visible para `reporta_admin`; `admin_tenant` y otros roles no la ven |
| v3.9.4 (app) | **Timezone crítico:** fecha inicial usa `todayInTZ` (no device UTC); `loadGastos` filtra con offset local; `registrarEvento` usa `nowISOwithOffset`; `getEventosHoy` rango UTC-aware en SQLite; `gastos-dia` mismo fix |
| v3.9.4 (app) | **Deduplicación outbox:** `device_ref UUID` en cada payload; duplicados tratados como error permanente silencioso; columna `device_ref UNIQUE` en 9 tablas (TEST + PROD) |
| v3.9.4 (app) | Horas `hora_inicio - hora_fin` de tareas en Panel en formato AM/PM |
| v3.9.5 (app) | **Fotos maquinaria:** `uploadMaquinariaFoto` usa `expo-file-system` (blob.arrayBuffer no confiable en Hermes) |
| v3.9.5 (app) | **Checklist routing:** `checklist.tsx` → `checklist-form.tsx` para evitar conflicto de rutas con `(tabs)/checklist.tsx` |
| v3.9.5 (app) | **Tab Plan:** excluye hoy, inicia en mañana; botón HOY lleva a mañana |
| v3.9.5 (app) | Título "GASTO DE MANTENIMIENTO" en pantalla mantenimiento-np |
| v3.9.5 (app) | `app.json` sincronizado con versión real (necesario para mostrar versión en login) |
| v3.9.6 (app) | **Modal FIN:** hora fin auto-cargada (editable), duración calculada en tiempo real, campo comentarios, botón Panel muestra `HH:MM – HH:MM` |
| v3.9.6 (app) | **Incidencia FIN:** hora actual auto-cargada al abrir segunda vez |
| v3.9.7 (app) | **Equipo maquinaria:** Rigger 1 y Rigger 2 renombrados, carga todo el personal del tenant (no solo de la tarea), siempre visibles |
| v3.9.8 (app) | **Gastos detalle:** tap en cualquier fila abre bottom sheet con todos los campos; si es hoy → botón para agregar/editar |
| DB TEST + PROD | Columna `device_ref TEXT UNIQUE` en: `app_asistencias`, `app_combustible`, `app_mantenimiento_np`, `app_allowances`, `app_eventos_operacionales`, `app_eventos_clima`, `reportes_maquinaria`, `reportes_personal`, `inspecciones` |

---

## Completado 2026-06-01

| Versión | Fix |
|---------|-----|
| v3.10.34 (web) | Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| v3.10.34 (web) | Middleware `/sistema` — verifica `profiles.role = 'reporta_admin'` |
| v3.10.34 (web) | RLS `cotizaciones_matriz_actividades` — SELECT y UPDATE filtradas por `tenant_id` del usuario (TEST + PROD) |
| v3.9.3 (app) | Fix TS: `db.$client.getAllSync/getFirstSync`; tipo implícito `any` en `tareas.ts` |
| v3.9.3 (app) | Fix Plan tab: muestra hoy + futuro; chips deshabilitan días pasados |
| v3.9.3 (app) | Fix Incidencia: flujo 2 fases con AsyncStorage |
| v3.9.3 (app) | Fix outbox permanentes: items malformados se eliminan |

---

## Completado post-cutover (2026-05-30 – 2026-05-31)

| Versión | Fix |
|---------|-----|
| v3.10.32–33 (web) | Rebranding REPORTAR.APP; slogan en login, metadata, PDFs; expenses semanal; panel limpiado |
| v3.9.2 (app) | Pantallas nuevas: plan, historial (tab), perfil (PIN+firma), resumen-dia, evento-operacional |
| v3.9.2 (app) | `view_app_plan` + `view_app_historial` con `personal_ids UUID[]`; filtro por usuario en tabs |
| v3.9.2 (app) | `mv_planificacion_diaria` rango ±3 meses + pg_cron refresco cada 5 min (test + prod) |

---

## 1. 🔴 URGENTE — Prueba ciclo completo app→web (DT-QA-03)

**Bloqueante para entregar a clientes.** El sistema nunca fue probado end-to-end en producción.
**APK actual para prueba: v3.9.8** (apunta a TEST DB USA — cambiar a PROD para QA real).

**Pasos:**
1. Cambiar `.env.local` app a PROD DB (Brazil) + recompilar APK
2. Asignar tarea del tenant CISE a usuario operario de prueba en web
3. Desde app (BlueStacks con APK v3.9.8 en prod): registrar llegada → checklist → R. Maquinaria → R. Personal
4. Verificar que reportes aparecen en **Tab Historial** de la app
5. Verificar que aparecen en **Web → Planificación** del día correspondiente
6. Generar PDF desde web → verificar datos y slogan en header
7. Verificar expenses del día en app

---

## 2. 🔴 URGENTE — DNS `reportar.app` (DT-DNS01)

Error 522 (Cloudflare timeout) al acceder a `reportar.app` y `www.reportar.app`.

**Fix en Cloudflare:**
1. Registro A `@` → `76.76.21.21` con proxy **desactivado**
2. CNAME `www` → `reportar.app` con proxy activado + Page Rule redirect `www.reportar.app/*` → `https://reportar.app/$1`
3. Verificar que `reportar.app` esté en Vercel → proyecto `reportaweb3` → Settings → Domains

---

## 3. 🟠 IMPORTANTE — Entorno demo (tenant DEMO en PROD)

Crear tenant `DEMO` en DB de producción para mostrar el sistema a clientes potenciales sin riesgo para datos reales.

**Plan:**
1. Crear empresa `DEMO` en tabla `companies` con datos ficticios realistas
2. Crear usuario `demo@reportar.app` con contraseña demo
3. Seed: tareas, personal, maquinaria, reportes de muestra
4. `pg_cron` que resetea datos demo cada 24h
5. Compilar APK "demo" apuntando a PROD DB con usuario demo pre-cargado

**Ventaja:** PDFs funcionan, datos aislados por `tenant_id`, costo cero de infraestructura.

---

## 4. 🟠 IMPORTANTE — Keystore producción + Play Store (DT-APP-04)

**Requiere interacción del usuario** (keytool es interactivo).

```powershell
keytool -genkey -v -keystore android\app\reporta-release.keystore `
  -alias reporta -keyalg RSA -keysize 2048 -validity 10000
```

Luego actualizar `android/key.properties` y ejecutar:
```powershell
cd android && .\gradlew.bat bundleRelease
# → android\app\build\outputs\bundle\release\app-release.aab
```

Subir AAB a Google Play Console (nueva app, package `com.reportar.app`).

---

## 5. 🟠 IMPORTANTE — Política privacidad (requerida por Play Store)

Publicar `docs/POLITICA_PRIVACIDAD.md` en `reportar.app/privacidad`.
- Crear página estática en Next.js (`app/privacidad/page.tsx`)

---

## 6. 🟡 Remediación post-migración (DT-MIG02) — Parcialmente resuelto

**Diagnóstico 2026-06-02:** La mayoría de bugs ya se resolvieron durante la migración.

| Bug | TEST | PROD | Estado |
|-----|------|------|--------|
| `created_by` con IDs Bubble | ✅ 0 casos | ✅ 0 casos | Resuelto |
| `pdf_url` reportes_usuario | ✅ 0 URLs Bubble | ✅ 0 URLs Bubble | Resuelto |
| `foto_actividad_url` sin migrar | ⚠️ 226 URLs Bubble (solo TEST) | ✅ 0 URLs Bubble | Solo TEST pendiente |

**Fix pendiente solo en TEST** (226 fotos GRUAS):
```bash
BUBBLE_API_URL=https://reporta.la/api/1.1/obj \
npx tsx scripts/migrate-files-to-storage.ts --table=reportes_maquinaria_foto --step=migrate --concurrency=8
```

---

## 7. 🟡 Backfill 1,414 PDFs (DT-MIG03)

`reportes_maquinaria` con `pdf_url = NULL` (nunca generados en Bubble).
CISE: 579 registros · GRUAS: 835 registros · Años: 2020–2026.

Evaluar viabilidad vía API Gotenberg con datos ya migrados.

---

## 8. 🟡 Verificar templates PDF (DT-PDF01)

Comparar `lib/reporte-personal-pdf-template.ts` vs G.PAC-02 (Reporte Personal)
y `lib/informe-formato-pdf-template.ts` vs G.PAC-04 (Reporte Maquinaria).

---

## 9. Deuda técnica app

| ID | Tarea | Prioridad |
|----|-------|-----------|
| DT-APP-04 | Keystore producción + AAB Play Store | Alta |
| DT-APP-05 | PDF no se genera en TEST: `WEB_URL` apunta a PROD web → no encuentra registros de TEST DB. Se resuelve apuntando la app a PROD o desplegando web con TEST DB. | Media |
| DT-APP-02 | `npx expo install expo-camera` → descomentar qr-scan.tsx para QR real | Baja |
| DT-APP-03 | Tabla `notificaciones` en Supabase (SQL schema en header de notificaciones.tsx) | Baja |

---

## Resumen de prioridades

| # | Tarea | Urgencia | Requiere usuario |
|---|-------|----------|-----------------|
| 1 | DT-QA-03: prueba ciclo completo (APK v3.9.8 → PROD) | 🔴 Alta | BlueStacks + cambio .env |
| 2 | DT-DNS01: fix DNS reportar.app | 🔴 Alta | Panel Cloudflare |
| 3 | Entorno demo (tenant DEMO en PROD) | 🟠 Media | — |
| 4 | DT-APP-04: keystore + Play Store | 🟠 Media | keytool interactivo |
| 5 | Política privacidad | 🟠 Media | — |
| 6 | DT-MIG02: 226 fotos TEST | 🟡 Normal | — |
| 7 | DT-MIG03: 1,414 PDFs backfill | 🟡 Normal | — |
| 8 | DT-PDF01: verificar templates PDF | 🟡 Normal | Docs físicos |
| 9 | E2E suite re-run (DT-QA-01) | 🟢 Baja | — |
