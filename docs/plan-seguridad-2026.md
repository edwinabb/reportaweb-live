# Plan de Seguridad REPORTA — Audit 2026-05

> **Auditor:** Claude Code (Anthropic) — Fecha: 2026-05-11  
> **Alcance:** Web admin (reportaweb3 v3.7.14), App móvil (reporta-app v1.5.1), DB Supabase `wioozisskjjgjjybsoqo`  
> **Base:** 112 archivos de migración SQL analizados + next.config.ts + middleware.ts + build.gradle + AndroidManifest.xml

---

## 1. Resumen ejecutivo

| Área | Estado | Severidad máxima |
|------|--------|-----------------|
| RLS / Multitenancy DB | **AMARILLO** | Alta — 8 tablas sin políticas de escritura o con políticas permisivas sin aislamiento de tenant |
| Seguridad web (Next.js) | **ROJO** | Alta — Sin security headers (CSP, HSTS, X-Frame-Options) en next.config.ts |
| Anti-scraping / anti-copy | **AMARILLO** | Media — Sin rate limiting en rutas API; sin Cloudflare Bot Management activo |
| Seguridad APK Android | **ROJO** | Alta — `allowBackup="true"`, `minifyEnabled=false` en release, keystore de debug en producción |

**Veredicto general: AMARILLO tirando a ROJO.** El sistema tiene una base sólida de RLS multi-tenant, pero la ausencia total de security headers HTTP y la configuración de APK en estado de desarrollo son riesgos críticos antes de la publicación en Play Store.

---

## 2. Audit RLS — Base de datos

### Función helper confirmada

El proyecto usa `get_auth_tenant_id()` como helper SECURITY DEFINER para obtener el `tenant_id` del JWT. Esto es correcto. La función `get_rutas_bloqueadas()` también está bien diseñada con SECURITY DEFINER.

### 2.1 Tablas con RLS completo (ENABLE + políticas por tenant_id)

| Tabla | Políticas | Tipo de check | Notas |
|-------|-----------|---------------|-------|
| `profiles` | SELECT, UPDATE | `get_auth_tenant_id()` | UPDATE solo propio (auth.uid()) |
| `profile_details` | SELECT | `get_auth_tenant_id()` | Solo SELECT; escritura via service_role |
| `job_titles` | ALL | `get_auth_tenant_id()` | Correcto |
| `document_types` | ALL | `get_auth_tenant_id()` | Cubre NULL tenant_id para globales |
| `user_documents` | ALL | `get_auth_tenant_id()` | Correcto |
| `companies` | SELECT | `id = get_auth_tenant_id()` | Solo ve la propia empresa |
| `tareas` | SELECT, INSERT, UPDATE | `get_auth_tenant_id()` (via fix_operational_rls) | Fix sobreescribe política original |
| `terceros` | SELECT, INSERT, UPDATE | `get_auth_tenant_id()` | Correcto |
| `maquinarias` | SELECT, INSERT, UPDATE | `get_auth_tenant_id()` | Correcto |
| `cotizaciones` | SELECT, INSERT, UPDATE | `get_auth_tenant_id()` + `is_admin()` | Solo admins ven finanzas |
| `cotizaciones_detalle` | SELECT | join a cotizaciones + is_admin() | Sin INSERT/UPDATE policy explícita en v2 |
| `facturas_venta` | SELECT, INSERT, UPDATE | `get_auth_tenant_id()` + `is_admin()` | Correcto |
| `facturas_venta_item` | SELECT | join a facturas_venta + is_admin() | Sin INSERT/UPDATE |
| `factura_venta_pagos` | ALL (USING) | `profiles.tenant_id` subquery | Sin WITH CHECK separado |
| `facturas_compra_pagos` | ALL (USING) | `profiles.tenant_id` subquery | Sin WITH CHECK separado |
| `valorizaciones` | ALL (USING) | `profiles.tenant_id` subquery | Sin WITH CHECK separado |
| `planes_accion` | ALL | `profiles.tenant_id` subquery | Solo USING, sin WITH CHECK |
| `inspecciones` | ALL | `profiles.tenant_id` subquery | Solo USING, sin WITH CHECK |
| `inspecciones_detalles` | ALL | `profiles.tenant_id` subquery | Solo USING, sin WITH CHECK |
| `plantillas` | ALL | `profiles.tenant_id` subquery | Solo USING, sin WITH CHECK |
| `planes_accion_responsables` | ALL | `get_auth_tenant_id()` | Correcto |
| `planes_accion_avances` | ALL | `get_auth_tenant_id()` | Correcto |
| `maquinaria_horas` | ALL | `get_auth_tenant_id()` | Correcto |
| `informe_objetos` | ALL | `get_auth_tenant_id()` | Correcto |
| `gastos_usuario` | ALL | `get_auth_tenant_id()` | Correcto |
| `tareas_fechas` | ALL | `get_auth_tenant_id()` (via fix_operational_rls) | Correcto |
| `tareas_recursos` | ALL | `get_auth_tenant_id()` | Correcto |
| `reportes_personal` | ALL | `get_auth_tenant_id()` | Correcto |
| `reportes_maquinaria` | ALL | `get_auth_tenant_id()` | Correcto |
| `reportes_combustible` | ALL | `get_auth_tenant_id()` | Correcto |
| `bitacora_operaciones` | ALL | `get_auth_tenant_id()` | Correcto |
| `tickets_soporte` | SELECT, INSERT, UPDATE | tenant_id + user_id + role check | Buen diseño multi-rol |
| `tickets_soporte_respuestas` | SELECT, INSERT | via subquery a tickets | Correcto |
| `cargo_permisos` | SELECT, ALL | `get_auth_tenant_id()` + role check | Solo admin_tenant/reporta_admin modifica |
| `sistema_recursos` | SELECT, ALL | SELECT=any authenticated; ALL=reporta_admin | Catálogo global correcto |
| `formatos` (y las 9 tablas formatos_*) | SELECT | `profiles.tenant_id` subquery | Solo SELECT; sin INSERT/UPDATE/DELETE policies |
| `config_informe_maquinaria` | SELECT | `profiles.tenant_id` subquery | Solo SELECT |
| `config_informe_personal` | SELECT | `profiles.tenant_id` subquery | Solo SELECT |
| `config_valorizacion_venta` | SELECT | `profiles.tenant_id` subquery | Solo SELECT |
| `config_valorizacion_compra` | SELECT | `profiles.tenant_id` subquery | Solo SELECT |
| `bancos` | SELECT | `profiles.tenant_id` subquery | Solo SELECT |
| `cobros_venta` | SELECT | `profiles.tenant_id` subquery | Solo SELECT |
| `maquinaria_modelos` | SELECT, INSERT, UPDATE | `tenant_id = auth.uid()` | **BUG CRITICO** — compara con auth.uid() en vez de get_auth_tenant_id() |
| `maquinaria_documentos` | ENABLE sin políticas | — | Sin políticas definidas en migración |
| `maquinaria_tipos_docs` | ENABLE sin políticas | — | Sin políticas definidas en migración |
| `paises` | SELECT | `USING (true)` | Público — catálogo global, aceptable |
| `ubigeo` | SELECT | `USING (true)` | Público — catálogo global, aceptable |
| `rubros` | ENABLE sin políticas | — | Sin políticas definidas |

### 2.2 Tablas con RLS parcial o con problemas

| Tabla | Problema | Riesgo | Acción |
|-------|----------|--------|--------|
| `maquinaria_modelos` | Policy usa `tenant_id = auth.uid()` — siempre FALSE; ningún usuario puede leer | Alta | Fix inmediato: reemplazar con `get_auth_tenant_id()` |
| `maquinaria_documentos` | RLS habilitado, 0 políticas definidas | Alta | Agregar policy tenant_isolation |
| `maquinaria_tipos_docs` | RLS habilitado, 0 políticas definidas | Alta | Agregar policy tenant_isolation |
| `rubros` | RLS habilitado, 0 políticas definidas | Alta | Agregar SELECT público o por tenant |
| `catalogos` | RLS habilitado, 0 políticas en migración | Alta | Verificar en DB; agregar si faltan |
| `tareas_comentarios` | Solo SELECT e INSERT; sin UPDATE | Media | Agregar UPDATE policy |
| `cotizaciones_historial` | RLS habilitado, 0 políticas visibles en migraciones | Alta | Verificar y agregar |
| `reportes_usuario` | `SELECT USING (true)` — cualquier usuario autenticado ve TODOS los reportes de TODOS los tenants | **Critica** | Fix urgente: agregar `tenant_id::text = get_auth_tenant_id()::text` |
| `cotizaciones_matriz_actividades` | `SELECT USING (true)` — sin tenant isolation | Alta | Agregar filtro por tenant_id |
| `formatos_*` (10 tablas) | Solo política SELECT; sin INSERT/UPDATE/DELETE | Media | Agregar políticas de escritura (actualmente van por service_role) |
| `servicios_tipos` | Sin RLS habilitado en ninguna migración | Alta | Verificar en DB; habilitar RLS + policies |
| `sst_epp_entrega`, `sst_epp_item`, `sst_epp_movimiento`, `sst_epp_alerta`, `sst_epp_reporte` | Sin ENABLE ROW LEVEL SECURITY en ninguna migración | **Critica** | 5 tablas EPP completamente sin RLS |
| `file_migration_log` | RLS habilitado, 0 políticas (intencional: solo service_role) | Bajo | Documentado como solo service_role — correcto |
| `companies_consecutives`, `app_calendario_festivos`, `app_hora_intervalos`, `cotizaciones_configuracion`, `plazos_pago`, `formas_pago` | RLS habilitado, 0 políticas visibles | Alta | Verificar en DB; agregar policies |
| `cotizaciones_motivo_rechazo`, `servicios_tipo_precios` | tenant_isolation policy: solo USING; sin WITH CHECK | Media | Agregar WITH CHECK para INSERT |

### 2.3 Tablas sin RLS detectado

| Tabla | Módulo | Riesgo |
|-------|--------|--------|
| `servicios_tipos` | Catálogos | Alta |
| `sst_epp_entrega` | EPP | Critica |
| `sst_epp_item` | EPP | Critica |
| `sst_epp_movimiento` | EPP | Critica |
| `sst_epp_alerta` | EPP | Critica |
| `sst_epp_reporte` | EPP | Critica |
| `sst_epp_config` | EPP | Critica |

> **Nota:** Estas tablas pueden tener RLS habilitado directamente en Supabase Studio (sin migración registrada). **Verificar ejecutando en SQL Editor:**
> ```sql
> SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
> ```

### 2.4 Hallazgo crítico: `reportes_usuario`

```sql
-- PROBLEMA ACTUAL — cualquier usuario autenticado ve reportes de TODOS los tenants:
CREATE POLICY "Enable read access for all users" ON public.reportes_usuario FOR SELECT USING (true);

-- CORRECCIÓN REQUERIDA:
DROP POLICY "Enable read access for all users" ON public.reportes_usuario;
CREATE POLICY "tenant_isolation_select" ON public.reportes_usuario
    FOR SELECT TO authenticated
    USING (tenant_id::text = get_auth_tenant_id()::text);
```

### 2.5 Hallazgo crítico: `maquinaria_modelos`

```sql
-- PROBLEMA ACTUAL — policy siempre devuelve FALSE (tenant_id UUID vs auth.uid() UUID de usuario):
CREATE POLICY "Enable read access for tenant users" ON maquinaria_modelos
    FOR SELECT USING (tenant_id = auth.uid());  -- BUG: compara empresa_id con user_id

-- CORRECCIÓN:
DROP POLICY "Enable read access for tenant users" ON maquinaria_modelos;
CREATE POLICY "tenant_isolation" ON public.maquinaria_modelos
    FOR ALL TO authenticated
    USING (tenant_id = get_auth_tenant_id())
    WITH CHECK (tenant_id = get_auth_tenant_id());
```

---

## 3. Seguridad web (Next.js)

### 3.1 Security Headers — AUSENTES (Severidad: Alta)

**Hallazgo:** `next.config.ts` no define ningún security header HTTP. Esto expone el sistema a:
- **Clickjacking** (sin X-Frame-Options ni CSP frame-ancestors)
- **MIME sniffing** (sin X-Content-Type-Options)
- **Sin HTTPS forzado** (sin Strict-Transport-Security) — en prod Vercel maneja TLS, pero el header debe ser explícito
- **Referrer leakage** (sin Referrer-Policy)
- **Sin CSP** — facilita XSS si algún endpoint devuelve HTML sin sanitizar

**Remediación — agregar a `next.config.ts`:**

```typescript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // CSP básica — ajustar dominios según necesidad
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",  // unsafe-eval requerido por Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://wioozisskjjgjjybsoqo.supabase.co https://timbhcrbisxeniquwwmm.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://o4*.ingest.sentry.io",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // ... config existente ...
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

> **Nota sobre CSP:** En producción, eliminar `'unsafe-eval'` y `'unsafe-inline'` de script-src, usando nonces o hashes. Con Next.js 16 y RSC esto es más manejable. Implementar en dos fases: primero headers sin CSP, luego CSP en modo report-only.

### 3.2 Middleware — Estado mayormente correcto (Severidad: Baja)

**Lo que funciona bien:**
- Redirect a `/login` con `redirect` param para rutas no autenticadas
- Enforcement de `cargo_permisos` via RPC `get_rutas_bloqueadas()`
- Copia de cookies auth en redirect bloqueado (fix ya aplicado)
- Timezone cookie por tenant

**Problemas menores:**
- `/api` está en PUBLIC_PATHS sin ninguna verificación — las rutas API deben manejar auth individualmente (correcto per el comentario, pero vale documentarlo)
- `/sistema` es accesible para cualquier usuario autenticado sin verificar si es `reporta_admin`
- La cookie `rw3_bloqueadas` es `httpOnly: false` (necesario para JS sidebar), lo que la hace manipulable desde el cliente. Sin embargo, la verificación real ocurre en el middleware server-side, así que el impacto es bajo.

**Remediación middleware `/sistema`:**
```typescript
// En middleware.ts, reemplazar:
if (request.nextUrl.pathname.startsWith('/sistema')) return response

// Por:
if (request.nextUrl.pathname.startsWith('/sistema')) {
    const role = user.user_metadata?.role
    if (role !== 'reporta_admin') {
        return NextResponse.redirect(new URL('/', request.url))
    }
    return response
}
```

### 3.3 Anon key expuesta en cliente (Severidad: Media — por diseño)

La `NEXT_PUBLIC_SUPABASE_ANON_KEY` está expuesta en el cliente (es el diseño de Supabase). **Esto es aceptable siempre que RLS esté correctamente configurado.** Los riesgos residuales de las tablas sin RLS (sección 2) se convierten en riesgos reales aquí.

La anon key en el APK también se incluirá en el bundle compilado. Ver sección 4.

### 3.4 Rate limiting — AUSENTE en API routes (Severidad: Media)

No existe rate limiting a nivel de Next.js. Vercel Pro incluye rate limiting básico en el plan, pero no está configurado explícitamente.

**Hallazgo positivo:** La tabla `cotizaciones` tiene columnas `pin_attempts` y `pin_locked_until` para rate limiting del PIN de aprobación — buen patrón a replicar.

**Remediación:** Configurar rate limiting en Vercel Dashboard → Edge Config, o implementar con `@upstash/ratelimit`:

```typescript
// app/api/[ruta-sensible]/route.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
})

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  if (!success) return new Response('Too Many Requests', { status: 429 })
  // ... lógica normal
}
```

### 3.5 CSRF — Estado correcto por arquitectura (Severidad: Baja)

Next.js Server Actions incluyen protección CSRF mediante el `Origin` header. Las rutas API tipo `route.ts` deben verificar el header `Authorization` o cookies de sesión — lo cual el middleware ya garantiza para rutas no-públicas.

### 3.6 Verificación de tenant en Server Actions (Severidad: Media)

Las Server Actions en `lib/actions/` usan `createServerClient` con cookies del request, lo que hace que las políticas RLS se apliquen automáticamente. Sin embargo, hay Server Actions que usan `service_role` key (en `lib/action-context.ts`) para bypassear RLS. Estas **deben verificar manualmente el tenant** del usuario antes de cualquier operación.

**Verificación recomendada en actions con service_role:**
```typescript
// Siempre al inicio de actions críticas:
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('No autenticado')
const tenantId = user.user_metadata?.tenant_id
if (!tenantId) throw new Error('Sin tenant')
// Luego filtrar explícitamente por tenantId en todas las queries
```

---

## 4. Anti-scraping / Anti-copy

### 4.1 Honestidad sobre lo que funciona vs security theater

| Medida | Efectividad real | Recomendación |
|--------|-----------------|---------------|
| CSS `user-select: none` | Muy baja — 2 clics en DevTools para bypassear | No implementar solo; complementar |
| Deshabilitar right-click | Muy baja — F12 / Ctrl+U siempre funciona | No implementar |
| JavaScript obfuscation en web | Baja — reversible con herramientas estándar | No es prioritario |
| DevTools detection | Media — cats and mouse; genera falsos positivos | No recomendado |
| Rate limiting por IP/usuario | Alta | Implementar (ver 3.4) |
| Cloudflare Bot Management | Alta | Recomendado para producción |
| Watermarking de datos | Alta (trazabilidad, no prevención) | Implementable con poco esfuerzo |
| Sesión única por usuario | Media | Implementable via Supabase |
| Logs de acceso anómalo | Alta | Ya parcialmente en Sentry |
| Hermes bytecode + ProGuard (APK) | Media-Alta (dificulta reverse engineering) | Implementar antes de Play Store |

### 4.2 Lo que sí tiene valor real y es implementable

**a) Watermarking de datos en PDFs y exportaciones:**
Incluir en cada PDF/export generado por Gotenberg un identificador del usuario y tenant que lo generó (en metadata invisible o en un pie de página sutil). Si el PDF aparece filtrado, es trazable.

```typescript
// En server action de generación PDF:
const watermark = `[${user.email} · ${new Date().toISOString().slice(0,10)}]`
// Pasar al template HTML como comentario o metadata
```

**b) Rate limiting en rutas de datos masivos:**
Limitar el número de exportaciones/PDF por usuario por hora. Las rutas más críticas son:
- `/api/informes/[id]/pdf`
- `/api/valorizaciones/[codigo]/pdf`
- `/api/reportes-personal/[id]/pdf`

**c) Headers anti-indexación en rutas de datos:**
```typescript
// En layout.tsx o en headers de next.config.ts para rutas /informes, /cotizaciones, etc:
{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }
```

**d) Logs de acceso anómalo:**
Registrar en Sentry cuando un usuario descarga más de N PDFs en X minutos. Ya se tiene `captureWithContext` disponible.

**e) Sesión única por usuario (opcional, alta fricción para usuarios legítimos):**
Supabase no soporta sesión única nativa. Implementaría requeriría una tabla `active_sessions` con invalidación manual — alto costo de mantenimiento para el beneficio.

### 4.3 Lo que NO implementar (relación costo/beneficio negativa)

- **Deshabilitar DevTools**: La API de Supabase es pública por diseño (con anon key). No aporta seguridad real.
- **Ofuscación JS de la web**: Next.js ya minifica el bundle. La ofuscación adicional aumenta el tiempo de build sin seguridad real.
- **Captcha en todas las páginas**: Daña la UX de usuarios legítimos. Usarlo solo en login y formularios públicos.

---

## 5. Seguridad APK (Android)

### 5.1 Hallazgos críticos

| Hallazgo | Severidad | Archivo | Detalle |
|----------|-----------|---------|---------|
| `allowBackup="true"` | **Alta** | `AndroidManifest.xml` línea 17 | Permite extraer datos de la app via `adb backup` sin root en Android <12 |
| Release firmado con debug keystore | **Alta** | `build.gradle` línea 115 | `signingConfig signingConfigs.debug` en release build — keystore público |
| `minifyEnabled = false` | **Alta** | `build.gradle` línea 68-69 | `enableMinifyInReleaseBuilds` por defecto `false` — sin ProGuard/R8 |
| `shrinkResources = false` | Media | `build.gradle` línea 116 | Sin eliminación de recursos no usados — APK más grande |
| Anon key en bundle JS | Media | `.env.local` | `EXPO_PUBLIC_*` vars se incluyen en el bundle — es por diseño de Expo/Supabase pero el key está en .env.local |
| Sin certificate pinning | Media | `lib/supabase.ts` | Posible MITM en redes comprometidas |
| `SYSTEM_ALERT_WINDOW` permission | Baja | `AndroidManifest.xml` | Permiso de overlay — solo necesario para dev builds, remover en release |
| Hermes activado condicionalmente | Positivo | `build.gradle` línea 177 | `hermesEnabled.toBoolean()` — verificar que esté en `true` en `gradle.properties` |

### 5.2 Correcciones requeridas antes de Play Store

**a) Crear keystore de producción:**
```bash
keytool -genkey -v -keystore reporta-release.keystore \
  -alias reporta -keyalg RSA -keysize 2048 -validity 10000
```

**b) Actualizar `build.gradle`:**
```groovy
android {
  // ...
  signingConfigs {
    release {
      storeFile file(System.getenv("REPORTA_KEYSTORE_PATH") ?: "reporta-release.keystore")
      storePassword System.getenv("REPORTA_KEYSTORE_PASSWORD")
      keyAlias System.getenv("REPORTA_KEY_ALIAS")
      keyPassword System.getenv("REPORTA_KEY_PASSWORD")
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release   // CAMBIAR de debug a release
      minifyEnabled true                      // ACTIVAR
      shrinkResources true                    // ACTIVAR
      proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
  }
}
```

**c) Corregir `AndroidManifest.xml`:**
```xml
<!-- CAMBIAR allowBackup a false -->
<application
  android:allowBackup="false"
  android:fullBackupContent="false"
  ...>
```

**d) Verificar Hermes habilitado en `gradle.properties`:**
```properties
# android/gradle.properties
hermesEnabled=true
```

**e) Remover `SYSTEM_ALERT_WINDOW` del manifest de release** (mover solo al manifest de debug).

### 5.3 Sobre certificate pinning

Certificate pinning en React Native/Expo es complejo de mantener (rotaciones de certificado rompen la app). Para el nivel de riesgo actual (SaaS B2B empresas de grúas, no banca), el costo/beneficio no justifica implementarlo ahora. Alternativa más pragmática: documentar que la app solo debe usarse en redes de confianza (WiFi corporativa, datos móviles).

### 5.4 Sobre la anon key en el APK

La `EXPO_PUBLIC_SUPABASE_ANON_KEY` quedará embebida en el bundle JavaScript del APK. Esto es **por diseño en toda arquitectura Supabase + app móvil**. La protección real viene del RLS. Un atacante con la anon key puede intentar acceder a tablas sin RLS o con políticas permisivas — razón adicional para corregir las tablas del módulo EPP y `reportes_usuario`.

---

## 6. Plan de remediación priorizado

| # | Hallazgo | Severidad | Esfuerzo | Acción concreta | Responsable |
|---|----------|-----------|----------|-----------------|-------------|
| 1 | 5 tablas EPP sin RLS | Crítica | 30 min | Migración SQL: ENABLE RLS + policy tenant_isolation en sst_epp_* | Dev |
| 2 | `reportes_usuario`: SELECT public sin tenant | Crítica | 15 min | DROP + recrear policy con `get_auth_tenant_id()` | Dev |
| 3 | Release APK con debug keystore | Alta | 2h | Generar keystore producción + configurar env vars en CI | Dev/Ops |
| 4 | `allowBackup="true"` en APK | Alta | 5 min | Cambiar a `false` en AndroidManifest.xml | Dev |
| 5 | `minifyEnabled=false` en release APK | Alta | 30 min | Activar + testear que ProGuard no rompa RN | Dev |
| 6 | Sin security headers HTTP | Alta | 1h | Agregar headers en next.config.ts (ver sección 3.1) | Dev |
| 7 | `maquinaria_modelos`: policy bug (tenant_id vs auth.uid()) | Alta | 15 min | Fix SQL: reemplazar con `get_auth_tenant_id()` | Dev |
| 8 | `maquinaria_documentos` y `maquinaria_tipos_docs` sin policies | Alta | 20 min | Agregar policy tenant_isolation en ambas | Dev |
| 9 | `rubros` y `catalogos` sin policies | Alta | 20 min | Agregar policies según tipo (global o por tenant) | Dev |
| 10 | Sin rate limiting en API routes | Media | 4h | Implementar con Upstash Redis o Vercel KV | Dev |
| 11 | `/sistema` accesible a cualquier usuario autenticado | Media | 15 min | Verificar role='reporta_admin' en middleware | Dev |
| 12 | `cotizaciones_matriz_actividades`: SELECT sin tenant | Media | 15 min | Reemplazar policy `USING (true)` con tenant_isolation | Dev |
| 13 | Formatos (10 tablas) solo con SELECT policy | Media | 45 min | Agregar INSERT/UPDATE/DELETE policies (o confirmar que todo va por service_role) | Dev |
| 14 | `companies_consecutives`, `app_hora_intervalos`, etc. sin policies | Media | 30 min | Verificar en DB; agregar si faltan | Dev |
| 15 | Watermarking en PDFs generados | Media | 2h | Agregar user_email + fecha en footer de templates PDF | Dev |
| 16 | Hermes habilitado en gradle.properties | Media | 5 min | Verificar `hermesEnabled=true` | Dev |
| 17 | `SYSTEM_ALERT_WINDOW` en release | Baja | 15 min | Mover al debug manifest overlay | Dev |
| 18 | Rate limiting en rutas de PDF/exportación | Baja | 3h | Contar descargas por user en Redis; limitar a 20/hora | Dev |
| 19 | X-Robots-Tag en rutas de datos | Baja | 20 min | Agregar en next.config.ts para /informes, /cotizaciones | Dev |

---

## 7. Estimación de esfuerzo total

| Categoría | Esfuerzo estimado | Impacto |
|-----------|-------------------|---------|
| **Crítico** (items 1-2): RLS tablas sin protección | **1h** | Elimina riesgo de fuga de datos entre tenants |
| **Alta** (items 3-9): APK producción + headers web + RLS fixes | **5h** | Requisito antes de Play Store |
| **Media** (items 10-14): Rate limiting + middleware + policies | **6h** | Reduce superficie de ataque operativa |
| **Baja / mejoras** (items 15-19): Watermarking + cleanup | **6h** | Trazabilidad y hardening adicional |
| **TOTAL** | **~18h de desarrollo** | |

### Secuencia recomendada

```
Semana 1 (antes de cualquier nueva feature):
  Día 1: Items 1, 2, 7, 8, 9 (SQL migrations — 2h)
  Día 2: Items 3, 4, 5, 16, 17 (APK release config — 3h)
  Día 3: Item 6 (security headers web — 1h) + tests E2E

Semana 2:
  Items 10-14 (rate limiting + policies restantes — 6h)

Semana 3 (opcional):
  Items 15, 18, 19 (watermarking + mejoras — 6h)
```

---

## 8. Consulta de verificación — estado actual en producción

Ejecutar en Supabase Studio → SQL Editor para verificar el estado real de RLS (las migraciones pueden diferir de la DB actual si se aplicaron cambios manuales):

```sql
-- Estado RLS de todas las tablas
SELECT 
    t.tablename,
    t.rowsecurity AS rls_enabled,
    COUNT(p.policyname) AS policy_count,
    STRING_AGG(p.policyname || '(' || p.cmd || ')', ', ' ORDER BY p.policyname) AS policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity ASC, t.tablename;
```

```sql
-- Tablas con RLS habilitado pero 0 políticas (máximo riesgo)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  )
ORDER BY tablename;
```

---

*Documento generado por Claude Code (Sonnet 4.6) el 2026-05-11 como parte del audit de seguridad pre-distribución APK y consolidación post-cutover.*
