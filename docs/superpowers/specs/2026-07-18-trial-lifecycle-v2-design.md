# Trial Lifecycle v2 — Design Spec (Sub-proyecto A)

**Fecha:** 2026-07-18
**Proyecto:** reportaweb3 (portable a IMPULSAR — ver `docs/PLAYBOOK-GROWTH-ENGINE.md`)
**Estado:** En revisión
**Reemplaza/evoluciona:** `docs/superpowers/specs/2026-06-02-trial-onboarding-design.md`

---

## Resumen

Evoluciona el trial self-service de 10 días existente a un **ciclo de vida de leads de
25 días con onboarding adaptativo al avance real**, cierre por engagement (no por
lock-out) y **auto-borrado seguro** de los datos si el lead no convierte.

Ciclo: **15 días ACTIVE + 7 días DECISION + 3 días WARNING → borrado** (o `converted`
en cualquier momento si paga). Las tres fases tienen **acceso total** — el estado
controla **comunicación y cuenta regresiva**, no permisos. No se implementa modo
solo-lectura (decisión de diseño: mantener al lead usando el producto convierte mejor
que bloquearlo, y elimina la pieza más invasiva del build).

Este sub-proyecto (A) define el ciclo de vida y los estados sobre los que se apoyan
B (alta sales-led), C (Stripe) y D (onboarding post-pago).

---

## 1. Máquina de estados

```
NULL (tenant real migrado: CISE / GRUAS) → NUNCA entra al ciclo, intocable
                        ┌──────────────── paga → CONVERTED ─────────────────┐
  alta lead → [ACTIVE 15d] ──→ [DECISION 7d] ──→ [WARNING 3d] ──→ 🗑️ borrado
              acceso total     acceso total       acceso total
              onboarding+plan   cierre: "datos     aviso diario
              diario adaptativo seguros, paga"     "borramos en X días"
```

| `trial_status` | Fase | Acceso | Foco de comunicación |
|----------------|------|--------|----------------------|
| `active` | Días 0–15 | Total | Onboarding guiado, plan diario adaptativo |
| `decision` | Días 15–22 | Total | Cierre: "tus datos están seguros → paga para conservarlos"; plan extra para quien quiere profundizar |
| `warning` | Días 22–25 | Total | 3 avisos diarios de borrado inminente |
| `converted` | — | Total | Cliente pago; sale del ciclo (fechas de borrado a NULL) |
| `NULL` | — | Total | Tenant real; el ciclo jamás lo toca |

**Nota de compatibilidad:** el estado `expired` del modelo anterior se migra a
`decision`. La constraint `companies_trial_status_check` se amplía.

---

## 2. Modelo de datos

### 2.1 Columnas en `companies` (migración nueva)

```sql
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS trial_active_until   TIMESTAMPTZ,  -- start + 15d (fin ACTIVE)
    ADD COLUMN IF NOT EXISTS trial_decision_until TIMESTAMPTZ,  -- + 7d  (fin DECISION → inicia WARNING)
    ADD COLUMN IF NOT EXISTS trial_delete_at      TIMESTAMPTZ,  -- + 3d  (momento del auto-borrado)
    ADD COLUMN IF NOT EXISTS engagement_score     INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS engagement_alerted_at TIMESTAMPTZ; -- para no repetir alerta Telegram

-- trial_expires_at (existente) se mapea a trial_active_until en la migración de datos.
-- trial_start_at (existente) = inicio del ciclo.

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_trial_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_trial_status_check
    CHECK (trial_status IS NULL OR trial_status IN
           ('active', 'decision', 'warning', 'converted'));
```

Se guardan las 3 fechas de frontera **explícitas** (en vez de calcularlas desde
`trial_start_at`) para que crons y UI muestren "te quedan X días en esta fase" sin
recomputar, y para poder extender una fase puntual sin recalcular el resto.

Duraciones (constantes de aplicación, `lib/trial-config.ts`):
`ACTIVE_DAYS = 15`, `DECISION_DAYS = 7`, `WARNING_DAYS = 3`.

### 2.2 `trial_plan_steps` — plan global de onboarding (nueva)

Plan único para todos los leads, definido por proyecto (portable). Un registro por
paso/día.

```sql
CREATE TABLE trial_plan_steps (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier              TEXT NOT NULL CHECK (tier IN ('core','advanced')),
    day               INT  NOT NULL,          -- 1..15 en core; 1..7 en advanced
    module_key        TEXT NOT NULL,          -- 'planificacion' | 'maquinaria' | 'terceros' | 'reportes' | 'valorizacion' | ...
    title             TEXT NOT NULL,          -- asunto del correo
    body              TEXT NOT NULL,          -- cuerpo (tarea del día)
    cta_label         TEXT NOT NULL,
    cta_path          TEXT NOT NULL,          -- ruta interna del CTA
    completion_signal TEXT NOT NULL,          -- qué actividad cuenta como "hecho" (ver 2.4)
    UNIQUE (tier, day)
);
```

`tier='core'` = los 15 pasos del onboarding. `tier='advanced'` = ~7 pasos extra para
quien termina antes (features profundas: informes avanzados, valorización, etc.).

### 2.3 `trial_module_progress` — avance real por lead (nueva)

```sql
CREATE TABLE trial_module_progress (
    tenant_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_key   TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, module_key)
);
```

Marca cuándo el lead **usó de verdad** cada módulo. Lo puebla el cron (2.4).

### 2.4 `trial_emails_log` — idempotencia por PASO (evoluciona)

El modelo anterior era `UNIQUE(tenant_id, dia)`. Se cambia a por paso de plan, porque
el drip es guiado por avance, no por fecha:

```sql
-- Migración: agregar step_id, migrar filas viejas, cambiar unique.
ALTER TABLE trial_emails_log ADD COLUMN step_id UUID REFERENCES trial_plan_steps(id);
-- (nuevas filas usan step_id; la unique pasa a (tenant_id, step_id))
```

Garantiza: nunca se reenvía el correo de un paso, ni se envía un paso ya completado.

### 2.5 `trial_deletions_log` — auditoría de borrados (nueva)

```sql
CREATE TABLE trial_deletions_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,        -- sin FK: el tenant ya no existe
    company_name  TEXT,
    admin_email   TEXT,
    counts        JSONB,                -- { reportes, tareas, maquinarias, terceros }
    deleted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Queda registro de qué se borró aunque el tenant desaparezca.

---

## 3. Onboarding adaptativo (motor de drip)

### 3.1 Detección de avance real (en el cron, diario)

Para cada lead activo, para cada `module_key` del plan que aún no esté en
`trial_module_progress`: consultar si el tenant ya generó el dato que define
`completion_signal` (ej. `planificacion` → existe ≥1 `tareas`; `reportes` → existe ≥1
`reportes`; `maquinaria` → ≥1 `maquinarias` creada por el lead, etc.). Si sí → insertar
en `trial_module_progress`.

### 3.2 Selección del correo del día (por lead)

```
expected_day  = clamp(días_desde(trial_start_at), 1, 15)
completed     = { module_key ∈ trial_module_progress[tenant] }
core_steps    = trial_plan_steps WHERE tier='core' ORDER BY day

step_del_dia  = core_steps[expected_day]

CASO A — al día:
    step_del_dia.module_key ∉ completed
    Y no hay pasos anteriores incompletos
    → enviar step_del_dia (framing normal)

CASO B — atrasado:
    step_del_dia.module_key ∉ completed
    Y hay pasos anteriores incompletos (días < expected_day)
    → enviar step_del_dia con framing recordatorio:
      "Tenés pendientes los días {lista}; el plan de hoy es {módulo}."

CASO C — adelantado:
    step_del_dia.module_key ∈ completed
    → felicitar por los módulos adelantados
      + saltar al primer core_step con module_key ∉ completed
      → enviar ese step (si no fue ya enviado); si no hay → pasar a tier 'advanced'

CASO D — completó el core:
    todos los core_steps ∈ completed
    → enviar siguiente paso 'advanced' no enviado (o correo de felicitación final)

En todos los casos: NO enviar un step_id ya presente en trial_emails_log.
Máximo un correo por lead por día. Registrar step_id enviado en trial_emails_log.
```

Este motor cubre exactamente los tres ritmos: al día, adelantado (felicita + salta),
atrasado (recuerda pendientes). Los que terminan antes caen al tramo `advanced`.

### 3.3 Correos por fase (además del plan diario)

- **ACTIVE (0–15):** plan diario adaptativo (3.2).
- **DECISION (15–22):** correos de cierre — "tus datos están seguros → paga para
  conservarlos" + oferta de plan extra a quien quiere profundizar (activa tier
  `advanced` bajo demanda).
- **WARNING (22–25):** 3 avisos diarios: "borraremos tus datos en {X} días".

Templates en `lib/trial-email-templates.ts` (expande el existente).

---

## 4. Engagement score + alerta al admin (Telegram)

El cron calcula por lead un `engagement_score` (p.ej. `logins*1 + tareas*3 +
reportes*5 + valorizaciones*5`, ponderación ajustable). Cuando cruza el umbral de
"caliente" (`ENGAGEMENT_HOT_THRESHOLD`) y `engagement_alerted_at IS NULL`:
→ **dispara alerta a Telegram al admin de REPORTA** ("Lead X muy activo — buen momento
para cerrar") y setea `engagement_alerted_at = now()`.

> La integración Telegram (bot token, envío, botones inline de aprobación) se detalla y
> se comparte con el **sub-proyecto B**. En A solo se define el cálculo del score y el
> disparo. Si Telegram aún no está montado al implementar A, el disparo cae a correo
> (`ADMIN_NOTIFICATION_EMAIL`) como fallback.

---

## 5. Auto-borrado seguro

### 5.1 Función de BD `delete_lead_tenant(p_tenant_id UUID)`

Único camino de borrado. Tres guardas duras antes de tocar nada:

```
1. IF (SELECT trial_status FROM companies WHERE id = p_tenant_id) != 'warning'
       → RAISE EXCEPTION (aborta)
2. IF p_tenant_id IN (CISE_ID, GRUAS_ID)   -- IDs hardcodeados de tenants reales
       → RAISE EXCEPTION (aborta)
3. Borra en orden de dependencias, dentro de una transacción,
   y escribe trial_deletions_log con los conteos antes de borrar.
```

Un tenant con `trial_status IS NULL` o `'converted'` es **físicamente inalcanzable**
por esta función (guarda #1). Se agregan los IDs de CISE/GRUAS como cinturón-y-tiradores
(guarda #2).

### 5.2 Borrado de usuarios en `auth.users`

`auth.users` no está en `public`; se borra desde el cron con la admin API
(`auth.admin.deleteUser`) para cada usuario del tenant, después de que
`delete_lead_tenant` limpió `public`.

---

## 6. Cron diario `trial-lifecycle`

**Un solo cron** (Cloudflare Cron Trigger, ~06:00 America/Lima). Orden por lead:

1. **Detectar avance real** → poblar `trial_module_progress` (3.1).
2. **Avanzar fase** por fecha: `active→decision` si `now > trial_active_until`;
   `decision→warning` si `now > trial_decision_until`.
3. **Enviar correo del día** según fase + motor adaptativo (3.2 / 3.3), idempotente.
4. **Calcular engagement** y disparar alerta Telegram si aplica (§4).
5. **Borrar** los `warning` con `trial_delete_at < now()` vía `delete_lead_tenant` +
   borrado de auth users (§5).

Ruta: `app/api/cron/trial-lifecycle/route.ts`, protegida por `CRON_SECRET`.

> **Dependencia de infra:** los crons deben correr en **Cloudflare Cron Triggers** (la
> migración de crons desde Vercel sigue pendiente — CLAUDE.md / TECHNICAL_DEBTS). Este
> es el primer cron a montar en Cloudflare. Config en `wrangler.live.toml`.

---

## 7. Enforcement en middleware

En `utils/supabase/middleware.ts`, después de autenticar:

- Leer `trial_status`, `trial_active_until`, `trial_decision_until`, `trial_delete_at`
  del tenant.
- **No bloquea escrituras** (todas las fases tienen acceso total).
- Expone el **modo/fase** a la UI (header o cookie) para banner + countdown.
- No hay redirect a página de expiración (se elimina `/trial-expirado` como bloqueo;
  se conserva como landing de conversión opcional accesible, no forzada).

Rutas excluidas: `/api/`, `/login`, `/registro`.

---

## 8. Vista admin — `/sistema` tab Trials

Evoluciona `components/sistema/onboarding/trials-table.tsx`.

Columnas: Empresa · Admin · **Fase** · **Días en fase** · **Engagement** · Módulos
completados · Últcorreo · Estado.

Acciones por fila:
- **Extender fase** (+N días a la frontera correspondiente)
- **Convertir** → `trial_status='converted'`, fechas de borrado a NULL
- **Borrar ahora** (fuerza `warning` + `delete_lead_tenant`, con confirmación)
- **Pausar borrado** (mueve `trial_delete_at` +30d)

El alta de lead con 1 clic + aprobación se detalla en **sub-proyecto B**.

---

## 9. Editor de plan de onboarding (SuperAdmin)

Página para que el **SuperAdmin** cree y mantenga el plan global (`trial_plan_steps`):
15 pasos core + ~7 avanzados. El plan es el mismo para todos los leads; esta página es
su única fuente de edición.

### 9.1 Acceso y ruta
- Ruta: `app/(dashboard)/sistema/plan-onboarding/page.tsx`.
- Solo rol **SuperAdmin** (guard de rol; 403 para el resto). No es por-tenant: es
  configuración global del producto.

### 9.2 Layout
- Dos pestañas: **Core (15 días)** y **Avanzado (7 pasos)**.
- Lista ordenada por `day`, cada fila = un paso, con drag-para-reordenar (o campo `day`
  editable). Botón **+ Agregar paso**.
- Panel/editor por paso (dialog o split view) con estos campos:

| Campo | Control | Notas |
|-------|---------|-------|
| Día | number | 1–15 core · 1–7 avanzado · único por tier |
| Módulo | select | catálogo: `planificacion`, `maquinaria`, `terceros`, `reportes`, `valorizacion`, `facturacion`, `configuracion`… |
| Asunto del correo | text | soporta placeholders (9.4) |
| Actividad / cuerpo | textarea (markdown) | la "tarea del día"; soporta placeholders |
| CTA — etiqueta | text | ej. "Abrir Planificación" |
| CTA — ruta | select | rutas internas válidas del producto |
| Señal de completado | select | qué actividad marca el módulo como hecho (9.3) |

- Cada paso tiene **Vista previa del correo** (renderiza el template con datos de muestra)
  y un badge de estado de validación (✅ / ⚠️ / ❌).

### 9.3 Catálogo de "señales de completado" (`completion_signal`)
Set cerrado, cada una con su detección en el cron (§3.1). Ejemplos:
`tarea_creada` · `reporte_creado` · `maquinaria_creada` · `tercero_creado` ·
`valorizacion_creada` · `usuario_invitado` · `informe_configurado`.
El editor solo ofrece señales del catálogo (no texto libre) para garantizar que el cron
sepa detectarlas.

### 9.4 Placeholders disponibles en asunto/cuerpo
`{nombre}` · `{empresa}` · `{modulo}` · `{dia_actual}` · `{dias_restantes_fase}` ·
`{cta}`. El editor los lista y valida que solo se usen estos.

### 9.5 Validación del plan ("Validar plan" + inline)
Reglas (bloquean **Publicar** si hay ❌; ⚠️ son advertencias):

1. ❌ **Secuencia completa:** core debe tener días 1–15 sin huecos ni duplicados;
   avanzado 1–7. (Falta día / día repetido = error.)
2. ❌ **Campos obligatorios** por paso: módulo, asunto, cuerpo, CTA etiqueta+ruta,
   señal de completado.
3. ❌ **Señal válida:** `completion_signal` ∈ catálogo (9.3).
4. ❌ **CTA ruta válida:** existe en el producto.
5. ❌ **Placeholders válidos:** todo `{token}` ∈ set permitido (9.4).
6. ❌ **Preview renderiza** sin error con datos de muestra.
7. ⚠️ **Cobertura de módulos:** advertir si algún módulo del producto no aparece en
   ningún paso core.
8. ⚠️ **Asunto largo** (> ~60 chars) o cuerpo vacío de CTA.

"Validar plan" corre todas las reglas y muestra la lista de ❌/⚠️ con enlace al paso.

### 9.6 Borrador vs Publicado (evita romper leads en vuelo)
- El plan tiene estado **borrador / publicado** (`trial_plan_steps` con `status` o un
  `plan_version`). Las ediciones ocurren en **borrador**; al **Publicar** (solo con 0
  errores) pasa a activo.
- Como el drip es **por módulo e idempotente por paso** (§2.4), publicar copy nuevo
  afecta **solo correos futuros**; los ya enviados no se reenvían. Los leads en vuelo no
  se rompen.

### 9.7 Simulador de recorrido (opcional, alto valor)
Botón "Simular" que, dado un patrón de avance (al día / adelantado / atrasado / terminó),
muestra **qué correo recibiría el lead cada día** — permite al SuperAdmin ver el framing
(felicitación / recordatorio) sin esperar al cron. Reusa el motor de §3.2.

---

## 10. Archivos nuevos / modificados

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/YYYYMMDD_trial_lifecycle_v2.sql` | NUEVO — columnas, tablas, constraint, `delete_lead_tenant()` |
| `lib/trial-config.ts` | NUEVO — constantes de duración + ponderación de engagement |
| `lib/actions/trial.ts` | MODIFICADO — fechas de fase en alta; `advancePhase`, `computeEngagement` |
| `lib/trial-plan.ts` | NUEVO — motor adaptativo (selección de correo del día) |
| `lib/trial-email-templates.ts` | MODIFICADO — templates por fase + framing (al día/adelantado/atrasado) |
| `app/api/cron/trial-lifecycle/route.ts` | NUEVO — cron único diario |
| `utils/supabase/middleware.ts` | MODIFICADO — expone fase a UI (sin bloqueo) |
| `components/sistema/onboarding/trials-table.tsx` | MODIFICADO — fase, engagement, acciones |
| `app/(dashboard)/sistema/plan-onboarding/page.tsx` | NUEVO — editor de plan (SuperAdmin) |
| `components/sistema/plan/plan-editor.tsx` | NUEVO — CRUD de pasos + validación + preview + simulador |
| `lib/actions/trial-plan-admin.ts` | NUEVO — server actions del editor (guardar, validar, publicar) |
| `wrangler.live.toml` | MODIFICADO — Cron Trigger |
| Seed `trial_plan_steps` | NUEVO — 15 pasos core + ~7 advanced (contenido por definir con negocio) |

---

## 11. Fuera de alcance de A (van en otros sub-proyectos)

- **Alta sales-led + aprobación 1-clic + Telegram** → sub-proyecto **B**
- **Cobro Stripe self-service** (el "paga" de la fase DECISION) → sub-proyecto **C**
- **Onboarding definitivo post-pago** → sub-proyecto **D**
- **Asistente virtual ventas/soporte** → sub-proyecto **E**
- **Contenido real** de los `trial_plan_steps` (copy de cada día) — se define con negocio
  antes de implementar; el spec define la estructura, no el copy.

---

## 12. Decisiones de diseño (para el playbook)

1. **Single-schema multi-tenant, no esquema separado para leads.** Un lead es un tenant
   con `trial_status`. Convertir = cambiar un estado, sin mover datos. Borrado seguro =
   DELETE scopeado + función guardada. Evita duplicar toda la BD.
2. **Sin modo solo-lectura.** Mantener al lead usando el producto convierte mejor que
   bloquearlo y elimina la pieza más invasiva. La urgencia viene del riesgo de perder
   los datos (fase WARNING), no del lock-out.
3. **Drip guiado por avance real, no por calendario.** Felicitar al que adelanta,
   recordar al que atrasa, tramo avanzado para el que termina antes.
4. **Telegram para el admin, web+correo para el cliente.** Telegram: gratis, sin
   aprobación, ideal para alertas/aprobaciones internas. Cliente en LatAm: asistente web
   in-app + correo; WhatsApp queda como opción futura (mayor alcance, mayor costo/fricción).
5. **Ciclo 15+7+3.** Corto y con empuje de uso diario; la ventana de decisión mantiene
   acceso total con foco en cierre.
