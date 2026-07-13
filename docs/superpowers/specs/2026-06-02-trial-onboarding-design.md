# Trial Onboarding — Design Spec
**Fecha:** 2026-06-02  
**Proyecto:** reportaweb3  
**Estado:** Aprobado

---

## Resumen

Sistema de self-service trial de 10 días para prospectos de REPORTA. El prospecto se registra en `/registro`, recibe datos demo pre-cargados coherentes con su tipo de flota, y recibe 6 correos en Tono B durante el trial. Al vencer, ve una página de expiración con CTA de conversión.

---

## 1. Modelo de datos

### Columnas nuevas en `companies`

```sql
trial_status      TEXT DEFAULT 'active'   -- 'active' | 'expired' | 'converted'
trial_start_at    TIMESTAMPTZ             -- timestamp de registro
trial_expires_at  TIMESTAMPTZ             -- trial_start_at + 10 días
fleet_type        TEXT                    -- 'gruas' | 'excavadoras' | 'compactadoras' | 'mezcladoras' | 'mixta' | null
fleet_size        INT                     -- 1-5 | 6-20 | 21-50 | 50+ (almacenado como número representativo)
```

`NULL` en `trial_expires_at` = tenant regular sin trial (comportamiento actual sin cambios).

### Tabla nueva: `trial_emails_log`

```sql
CREATE TABLE trial_emails_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    dia         INT NOT NULL,           -- 1 | 2 | 4 | 6 | 8 | 10
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, dia)
);
```

La constraint `UNIQUE(tenant_id, dia)` garantiza idempotencia — el cron nunca reenvía el mismo correo.

---

## 2. Página de registro (`/registro`)

### Ruta
`app/registro/page.tsx` — pública, sin autenticación requerida.

### Campos del formulario

**Bloque 1 — Requeridos:**
- Nombre del administrador (text)
- Email (email, único en Supabase Auth)
- Contraseña (password, mínimo 8 caracteres)
- Nombre de la empresa (text)
- País (dropdown: Perú, Colombia, Chile, Ecuador, Bolivia, Otro)

**Bloque 2 — Opcionales (para personalización):**
- Tipo de maquinaria (dropdown: Grúas, Excavadoras, Compactadoras, Mezcladoras, Flota mixta)
- Tamaño de flota (radio: 1–5, 6–20, 21–50, 50+)
- Nota: *"Usamos esto para personalizar tu experiencia. Puedes cambiarlo después."*

### Server action: `registerTrial()`

Ubicación: `lib/actions/trial.ts`

Pasos en orden:
1. Validar email único (Supabase Auth)
2. Crear registro en `companies` con `trial_status='active'`, `trial_start_at=now()`, `trial_expires_at=now()+10d`, `fleet_type`, `fleet_size`
3. Crear usuario en Supabase Auth con rol `admin_tenant`
4. Ejecutar `seedDemoData(tenantId, fleetType, companyName, adminName)`
5. Ejecutar `setupTenantConfig(tenantId)` (función existente del onboarding)
6. Registrar y enviar correo Día 1 (inmediato)
7. Retornar sesión y redirigir a `/planificacion?trial=new`

### Post-registro

Banner en el dashboard (solo si `?trial=new` en URL o si `trial_status='active'` y `trial_start_at < 1h`):
> *"🎉 Tu trial de 10 días ha comenzado. Tienes datos demo cargados — puedes editarlos o reemplazarlos cuando quieras desde Configuración."*

---

## 3. Seed de datos demo

### Función: `seedDemoData(tenantId, fleetType, companyName, adminName)`

Ubicación: `lib/trial-seed.ts`

Crea los siguientes registros usando el `tenantId` y el nombre real de la empresa:

### Maquinarias (5) — por `fleetType`

| fleetType | Nombres generados |
|-----------|------------------|
| gruas | Grúa Liebherr LTM 1050, Grúa Grove GMK-5150L, Grúa Manitowoc 2250, Grúa Tadano ATF 60G, Grúa Terex AC 80 |
| excavadoras | Excavadora CAT 320, Excavadora Komatsu PC200, Excavadora Volvo EC220, Excavadora Hitachi ZX200, Excavadora JD 350G |
| compactadoras | Compactadora Dynapac CA250, Compactadora Bomag BW211, Rodillo HAMM HD12, Compactadora Sakai SV540, Rodillo CAT CS64 |
| mezcladoras | Mixer Schwing S34X, Mixer Putzmeister M38-5, Mixer SANY SY5310GJB, Mixer Liebherr HTM 1204, Mixer Zoomlion 9m³ |
| mixta | 1 grúa + 1 excavadora + 1 compactadora + 1 camión + 1 generador |

Todos con `codigo_interno` generado (e.g., `GRU-001`), `is_active=true`.

### Personal (5)

- 1 Supervisor: "Carlos Demo" (supervisor)
- 2 Operarios: "Luis Demo", "Pedro Demo" (member)
- 1 Planner: "Ana Demo" (planner)
- 1 Admin: el propio `adminName` del registro (admin_tenant) — ya creado en paso 2

Todos con contraseña demo `demo2026*` y email `[rol].[tenant_slug]@demo.reportar.app`.

### Terceros (2 clientes)
- "[companyName] - Cliente Demo A" (tipo: CLIENTE)
- "[companyName] - Cliente Demo B" (tipo: CLIENTE)

### Servicios (3) — por `fleetType`
Ejemplos para grúas: "Alquiler de grúa con operador", "Transporte de carga pesada", "Montaje de estructura"

### Tarea demo (1)
- Fecha: mañana (`todayInTZ + 1 día`)
- Título: "Tarea de demostración — [tipo maquinaria]"
- Asignada a: operario demo + maquinaria demo #1
- Estado: CONFIRMADA

---

## 4. Modificación del wizard de onboarding

Solo aplica cuando `trial_status = 'active'`. Tenants regulares no ven cambios.

En los pasos 2 (Personal), 4 (Maquinaria) y 5 (Servicios), antes del contenido actual se muestra:

```
┌─────────────────────────────────────────────────────────┐
│ ¿Cómo quieres cargar tu [Maquinaria / Personal / Servicios]? │
│                                                           │
│ ● Usar datos demo (ya tenemos 5 [items] listos)          │
│ ○ Cargar mis propios datos                               │
│                                                           │
│ 💡 Puedes editar y agregar más en cualquier momento       │
│    desde Configuración → [sección].                       │
└─────────────────────────────────────────────────────────┘
```

- Opción "datos demo" seleccionada por defecto
- Si elige "datos propios": muestra el contenido actual del paso (Excel upload)
- Si elige "datos demo": muestra lista read-only de los 5 items ya creados + botón "Continuar"

---

## 5. Secuencia de correos (6 emails, Tono B)

### Motor
Resend vía `lib/email.ts` existente. Cron diario en `/api/cron/trial-emails/route.ts`.

### Lógica del cron

```
Para cada company con trial_status='active':
    días_transcurridos = floor((now - trial_start_at) / 1 día)
    Para cada día de email [1, 2, 4, 6, 8, 10]:
        si días_transcurridos >= día_email
        Y no existe trial_emails_log(tenant_id, día_email):
            enviar correo
            insertar trial_emails_log(tenant_id, día_email)
```

### Contenido de los 6 correos

| Día | Asunto | CTA |
|-----|--------|-----|
| 1 | *Bienvenido a REPORTA, [Nombre]* — Tu trial de 10 días empieza hoy | Ir al dashboard |
| 2 | *¿Conoces todos los servicios que puedes facturar con tu flota?* | Ver módulo Servicios |
| 4 | *Tu equipo ya puede ver las tareas de esta semana* | Abrir Planificación |
| 6 | *El cliente pide el reporte y tú lo tienes listo en 2 minutos* | Ver módulo Reportes |
| 8 | *¿Sabes cuánto generó tu flota este mes?* | Ver Valorización |
| 10 | *Tu trial de 10 días termina hoy, [Nombre]* | Activar cuenta / Necesito más tiempo |

El correo del Día 10 incluye dos CTAs:
- "Activar mi cuenta" → `/contacto?origen=trial` (formulario que notifica al admin)
- "Necesito más tiempo" → endpoint que extiende el trial 3 días Y envía notificación al admin de REPORTA

### Templates
Ubicación: `lib/trial-email-templates.ts` — una función por correo: `renderTrialEmailDia1(data)`, etc.

---

## 6. Enforcement del trial en middleware

Insertar en `utils/supabase/middleware.ts` **después** de verificar autenticación y **antes** de verificar permisos de cargo:

```typescript
// Check trial expiration
if (profile?.tenant_id) {
    const { data: company } = await supabase
        .from('companies')
        .select('trial_expires_at, trial_status')
        .eq('id', profile.tenant_id)
        .single()
    
    if (company?.trial_expires_at 
        && new Date(company.trial_expires_at) < new Date()
        && company?.trial_status === 'active') {
        // Marcar como expirado (fire and forget)
        await supabase.from('companies')
            .update({ trial_status: 'expired' })
            .eq('id', profile.tenant_id)
        return NextResponse.redirect(new URL('/trial-expirado', request.url))
    }
    if (company?.trial_status === 'expired' 
        && !request.nextUrl.pathname.startsWith('/trial-expirado')) {
        return NextResponse.redirect(new URL('/trial-expirado', request.url))
    }
}
```

Rutas excluidas del check: `/trial-expirado`, `/login`, `/api/`, `/registro`.

---

## 7. Página de expiración (`/trial-expirado`)

### Contenido
- Header: "Tu período de prueba ha terminado"
- Resumen del trial:
  - Días de uso
  - N° de reportes creados
  - N° de tareas planificadas
- Dos CTAs principales:
  - **"Activar mi cuenta"** → `/contacto?origen=trial-expirado`
  - **"Hablar con el equipo"** → Link a WhatsApp / email
- Texto: *"Tus datos están seguros. Al activar tu cuenta, todo lo que configuraste durante el trial estará disponible."*

El admin de REPORTA puede acceder a los datos del tenant expirado desde `/sistema`.

---

## 8. Vista de trials en `/sistema`

Nueva pestaña "Trials" en `/sistema/onboarding`:

Columnas: Empresa · Admin · Tipo flota · Flota size · Registrado · Días restantes · Correos enviados · Estado

Acciones por fila:
- **Extender** (+7 días) → actualiza `trial_expires_at`
- **Convertir** → `trial_status = 'converted'`, `trial_expires_at = null`
- **Eliminar** → soft delete

---

## 9. Archivos nuevos / modificados

| Archivo | Acción |
|---------|--------|
| `app/registro/page.tsx` | NUEVO — página pública |
| `app/registro/page-client.tsx` | NUEVO — formulario cliente |
| `app/trial-expirado/page.tsx` | NUEVO — página expiración |
| `lib/actions/trial.ts` | NUEVO — registerTrial(), extendTrial(), convertTrial() |
| `lib/trial-seed.ts` | NUEVO — seedDemoData() por fleet type |
| `lib/trial-email-templates.ts` | NUEVO — 6 templates HTML Tono B |
| `app/api/cron/trial-emails/route.ts` | NUEVO — cron diario de emails |
| `app/api/cron/trial-expiry/route.ts` | NUEVO — cron diario marca expirados |
| `utils/supabase/middleware.ts` | MODIFICADO — +15 líneas trial check |
| `components/sistema/onboarding/step-usuarios.tsx` | MODIFICADO — opción demo/propio |
| `components/sistema/onboarding/step-maquinaria.tsx` | MODIFICADO — opción demo/propio |
| `components/sistema/onboarding/step-servicios.tsx` | MODIFICADO — opción demo/propio |
| `app/(dashboard)/sistema/onboarding/page.tsx` | MODIFICADO — tab Trials |
| `supabase/migrations/YYYYMMDD_trial_onboarding.sql` | NUEVO — schema changes |

---

## 10. Fuera de alcance (esta versión)

- Cobro / billing — al activar cuenta, el admin de REPORTA gestiona manualmente
- Email de "Necesito más tiempo" extiende el trial automáticamente (+3 días) pero no hay autoservicio de pago
- App móvil — no hay pantalla de trial expirado en la app (se muestra un mensaje genérico de acceso denegado)
- Landing page — cambios sugeridos en sesión separada
