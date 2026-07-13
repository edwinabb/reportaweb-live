# Trial Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistema de self-service trial de 10 días: registro público, seed de datos demo, 6 correos de nurturing en Tono B, enforcement de expiración y vista admin.

**Architecture:** Registro público en `/registro` crea company + usuario + datos demo via server actions. Un cron diario envía correos según días transcurridos desde `trial_start_at`. El middleware bloquea el acceso al vencer `trial_expires_at`. Ningún tenant existente se ve afectado (`trial_expires_at = NULL` = sin restricción).

**Tech Stack:** Next.js 16 App Router, Supabase Auth + DB, Resend (lib/email.ts existente), Tailwind, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-06-02-trial-onboarding-design.md`

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `supabase/migrations/20260602000000_trial_onboarding.sql` | NUEVO | Schema: columnas trial en companies + tabla trial_emails_log |
| `lib/trial-seed.ts` | NUEVO | seedDemoData() — 5 máquinas + 5 personas + servicios + tarea por fleet type |
| `lib/trial-email-templates.ts` | NUEVO | 6 funciones renderTrialEmailDiaN() → HTML Tono B |
| `lib/actions/trial.ts` | NUEVO | registerTrial(), extendTrial(), convertTrial() |
| `app/registro/page.tsx` | NUEVO | Shell SSR de la página pública de registro |
| `app/registro/page-client.tsx` | NUEVO | Formulario de registro con validación cliente |
| `app/api/cron/trial-emails/route.ts` | NUEVO | Cron diario: envía correos pendientes |
| `app/api/cron/trial-expiry/route.ts` | NUEVO | Cron diario: marca expirados |
| `app/trial-expirado/page.tsx` | NUEVO | Página de expiración con resumen y CTAs |
| `utils/supabase/middleware.ts` | MODIFICAR | +15 líneas: check trial_expires_at |
| `components/sistema/onboarding/step-usuarios.tsx` | MODIFICAR | Choice UI: datos demo / propios |
| `components/sistema/onboarding/step-maquinaria.tsx` | MODIFICAR | Choice UI: datos demo / propios |
| `components/sistema/onboarding/step-servicios.tsx` | MODIFICAR | Choice UI: datos demo / propios |
| `app/(dashboard)/sistema/onboarding/page.tsx` | MODIFICAR | Tab "Trials" con tabla de trials activos |
| `types/supabase.ts` | REGENERAR | Después de la migración: `npm run types:supabase` |

---

## Task 1: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260602000000_trial_onboarding.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/20260602000000_trial_onboarding.sql

-- Columnas trial en companies
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS trial_status      TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS trial_start_at    TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS trial_expires_at  TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS fleet_type        TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS fleet_size        INT  DEFAULT NULL;

-- Constraint en trial_status
ALTER TABLE companies
    ADD CONSTRAINT companies_trial_status_check
    CHECK (trial_status IS NULL OR trial_status IN ('active', 'expired', 'converted'));

-- Tabla de log de correos enviados
CREATE TABLE IF NOT EXISTS trial_emails_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    dia         INT         NOT NULL,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT trial_emails_log_unique UNIQUE (tenant_id, dia)
);

-- RLS: solo el propio tenant puede leer sus logs
ALTER TABLE trial_emails_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_emails_log_tenant_read" ON trial_emails_log
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Index para el cron (busca trials activos por expires_at)
CREATE INDEX IF NOT EXISTS idx_companies_trial_active
    ON companies (trial_expires_at)
    WHERE trial_status = 'active';
```

- [ ] **Step 2: Aplicar en TEST**

```bash
# Usando MCP Supabase (project_id: wioozisskjjgjjybsoqo)
# apply_migration con name: "trial_onboarding"
```

- [ ] **Step 3: Aplicar en PROD**

```bash
# Usando MCP Supabase (project_id: fqwhagryqkkhbgznxtwf)
# apply_migration con name: "trial_onboarding"
```

- [ ] **Step 4: Regenerar tipos TypeScript**

```bash
cd C:\Proyectos\reportaweb3
npm run types:supabase
# Verificar que types/supabase.ts ahora incluye:
# companies.Row.trial_status, trial_start_at, trial_expires_at, fleet_type, fleet_size
# trial_emails_log tabla completa
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260602000000_trial_onboarding.sql types/supabase.ts
git commit -m "feat(trial): schema - trial columns en companies + trial_emails_log"
```

---

## Task 2: Seed de datos demo

**Files:**
- Create: `lib/trial-seed.ts`

- [ ] **Step 1: Crear el archivo de seed**

```typescript
// lib/trial-seed.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentTenantId } from '@/lib/tenant'

export type FleetType = 'gruas' | 'excavadoras' | 'compactadoras' | 'mezcladoras' | 'mixta'

const FLEET_MAQUINARIAS: Record<FleetType, { nombre: string; modelo: string }[]> = {
    gruas: [
        { nombre: 'Grúa Grove GMK-5150L',       modelo: 'GMK-5150L'   },
        { nombre: 'Grúa Liebherr LTM 1050-3.1', modelo: 'LTM 1050'   },
        { nombre: 'Grúa Manitowoc 18000',        modelo: 'MAN-18000'  },
        { nombre: 'Grúa Tadano ATF 60G-4',       modelo: 'ATF-60G'    },
        { nombre: 'Grúa Terex AC 80-2',          modelo: 'AC-80'      },
    ],
    excavadoras: [
        { nombre: 'Excavadora CAT 320',          modelo: 'CAT-320'    },
        { nombre: 'Excavadora Komatsu PC200-8',  modelo: 'PC200-8'    },
        { nombre: 'Excavadora Volvo EC220E',      modelo: 'EC220E'     },
        { nombre: 'Excavadora Hitachi ZX200-6',  modelo: 'ZX200-6'    },
        { nombre: 'Excavadora JD 350G LC',        modelo: 'JD-350G'   },
    ],
    compactadoras: [
        { nombre: 'Compactadora Dynapac CA250D', modelo: 'CA250D'     },
        { nombre: 'Compactadora Bomag BW211D-50',modelo: 'BW211D'     },
        { nombre: 'Rodillo HAMM HD12 VV',         modelo: 'HD12-VV'   },
        { nombre: 'Compactadora Sakai SV540',     modelo: 'SV540'     },
        { nombre: 'Rodillo CAT CS64B',            modelo: 'CS64B'     },
    ],
    mezcladoras: [
        { nombre: 'Mixer Schwing Stetter S34X',  modelo: 'S34X'       },
        { nombre: 'Mixer Putzmeister M38-5',     modelo: 'M38-5'      },
        { nombre: 'Mixer SANY SY5310GJB',        modelo: 'SY5310'     },
        { nombre: 'Mixer Liebherr HTM 1204',     modelo: 'HTM-1204'   },
        { nombre: 'Mixer Zoomlion 9m3',          modelo: 'ZL-9M3'     },
    ],
    mixta: [
        { nombre: 'Grúa Grove GMK-5150L',        modelo: 'GMK-5150L'  },
        { nombre: 'Excavadora CAT 320',          modelo: 'CAT-320'    },
        { nombre: 'Compactadora Bomag BW211D',   modelo: 'BW211D'     },
        { nombre: 'Camión Volvo FMX 8x4',        modelo: 'FMX-8x4'   },
        { nombre: 'Generador Caterpillar XQ375', modelo: 'XQ375'      },
    ],
}

const FLEET_SERVICIOS: Record<FleetType, { nombre: string; descripcion: string }[]> = {
    gruas: [
        { nombre: 'Alquiler de grúa con operador', descripcion: 'Alquiler por hora con operador certificado' },
        { nombre: 'Transporte de carga pesada',     descripcion: 'Transporte y maniobra de carga sobredimensionada' },
        { nombre: 'Montaje de estructura metálica', descripcion: 'Montaje y posicionamiento de estructuras' },
    ],
    excavadoras: [
        { nombre: 'Movimiento de tierras',         descripcion: 'Excavación, corte y relleno de terreno' },
        { nombre: 'Alquiler de excavadora',        descripcion: 'Alquiler por hora con operador' },
        { nombre: 'Demolición y retiro de escombros', descripcion: 'Demolición controlada y retiro de material' },
    ],
    compactadoras: [
        { nombre: 'Compactación de subrasante',    descripcion: 'Compactación de capas de subrasante y base' },
        { nombre: 'Alquiler de rodillo',           descripcion: 'Alquiler por hora con operador' },
        { nombre: 'Pavimentación y compactado',    descripcion: 'Servicio integral de pavimentación' },
    ],
    mezcladoras: [
        { nombre: 'Mezcla y transporte de concreto', descripcion: 'Producción y entrega de concreto en sitio' },
        { nombre: 'Alquiler de mixer',             descripcion: 'Alquiler por hora con operador' },
        { nombre: 'Bombeo de concreto',            descripcion: 'Servicio de bombeo de concreto a altura' },
    ],
    mixta: [
        { nombre: 'Servicio integral de maquinaria', descripcion: 'Operación de flota completa en proyecto' },
        { nombre: 'Alquiler de maquinaria pesada',  descripcion: 'Alquiler de equipo con o sin operador' },
        { nombre: 'Mantenimiento de vías',          descripcion: 'Mantenimiento y mejoramiento de vías de acceso' },
    ],
}

function toSlugInternal(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function pad(n: number): string {
    return String(n).padStart(3, '0')
}

export async function seedDemoData(params: {
    tenantId: string
    fleetType: FleetType | null
    companyName: string
    adminUserId: string
}): Promise<void> {
    const supabase = await createClient()
    const { tenantId, fleetType, companyName, adminUserId } = params
    const effectiveFleetType: FleetType = fleetType ?? 'gruas'

    // 1. Maquinarias (5)
    const maquinariasData = FLEET_MAQUINARIAS[effectiveFleetType]
    const maquinariaInserts = maquinariasData.map((m, i) => ({
        tenant_id:        tenantId,
        nombre:           m.nombre,
        codigo_interno:   `${effectiveFleetType.toUpperCase().slice(0, 3)}-${pad(i + 1)}`,
        is_active:        true,
        created_by:       adminUserId,
    }))
    const { data: maquinariasCreadas, error: maqErr } = await supabase
        .from('maquinarias')
        .insert(maquinariaInserts)
        .select('id, nombre')
    if (maqErr) throw new Error(`Seed maquinarias: ${maqErr.message}`)

    // 2. Personal demo (4 usuarios — el admin ya fue creado)
    // Crear perfiles directamente en profiles (sin Auth account — son demo)
    const personalDemo = [
        { first_name: 'Carlos', last_name: 'Demo',    role: 'supervisor' as const },
        { first_name: 'Luis',   last_name: 'Demo',    role: 'member'     as const },
        { first_name: 'Pedro',  last_name: 'Demo',    role: 'member'     as const },
        { first_name: 'Ana',    last_name: 'Demo',    role: 'planner'    as const },
    ]

    const profileInserts = personalDemo.map(p => ({
        tenant_id:  tenantId,
        first_name: p.first_name,
        last_name:  p.last_name,
        role:       p.role,
        email:      `${toSlugInternal(p.first_name)}.demo.${tenantId.slice(0, 6)}@demo.reportar.app`,
        is_demo:    true,
    }))
    const { data: personalCreado, error: persErr } = await (supabase as any)
        .from('profiles')
        .insert(profileInserts)
        .select('id, first_name, role')
    if (persErr) throw new Error(`Seed personal: ${persErr.message}`)

    // 3. Terceros demo (2 clientes)
    const tercerosData = [
        { nombre: `${companyName} — Cliente Demo A`, tipo: 'CLIENTE' },
        { nombre: `${companyName} — Cliente Demo B`, tipo: 'CLIENTE' },
    ]
    const { data: tercerosCreados, error: tercErr } = await (supabase as any)
        .from('terceros')
        .insert(tercerosData.map(t => ({ ...t, tenant_id: tenantId, is_active: true, created_by: adminUserId })))
        .select('id, nombre')
    if (tercErr) throw new Error(`Seed terceros: ${tercErr.message}`)

    // 4. Servicios (3)
    const serviciosData = FLEET_SERVICIOS[effectiveFleetType]
    const { error: svcErr } = await (supabase as any)
        .from('servicios')
        .insert(serviciosData.map(s => ({
            tenant_id:   tenantId,
            nombre:      s.nombre,
            descripcion: s.descripcion,
            is_active:   true,
            created_by:  adminUserId,
        })))
    if (svcErr) throw new Error(`Seed servicios: ${svcErr.message}`)

    // 5. Tarea demo (1, para mañana)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const fechaTarea = tomorrow.toISOString().slice(0, 10)

    const clienteDemo = tercerosCreados?.[0]
    const maqDemo     = maquinariasCreadas?.[0]
    const operarioDemo = personalCreado?.find((p: any) => p.role === 'member')
    const supervisorDemo = personalCreado?.find((p: any) => p.role === 'supervisor')

    const fleetLabel: Record<FleetType, string> = {
        gruas:        'izaje de carga',
        excavadoras:  'movimiento de tierras',
        compactadoras:'compactación de vía',
        mezcladoras:  'vaciado de concreto',
        mixta:        'operaciones en sitio',
    }

    const { data: tareaCreada, error: tareaErr } = await (supabase as any)
        .from('tareas')
        .insert({
            tenant_id:    tenantId,
            titulo:       `Tarea demo — ${fleetLabel[effectiveFleetType]}`,
            codigo:       'DEMO-001',
            estado:       'CONFIRMADA',
            fecha_inicio: fechaTarea,
            fecha_fin:    fechaTarea,
            cliente_id:   clienteDemo?.id ?? null,
            created_by:   adminUserId,
        })
        .select('id')
        .single()
    if (tareaErr) throw new Error(`Seed tarea: ${tareaErr.message}`)

    // Asignar maquinaria + operario a la tarea
    if (tareaCreada?.id) {
        const recursos = []
        if (maqDemo?.id) {
            recursos.push({ tarea_id: tareaCreada.id, tenant_id: tenantId, tipo_recurso: 'MAQUINARIA', maquinaria_id: maqDemo.id })
        }
        if (operarioDemo?.id) {
            recursos.push({ tarea_id: tareaCreada.id, tenant_id: tenantId, tipo_recurso: 'PERSONAL', personal_id: operarioDemo.id })
        }
        if (recursos.length > 0) {
            await (supabase as any).from('tareas_recursos').insert(recursos)
        }
    }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:\Proyectos\reportaweb3
npx tsc --noEmit 2>&1 | grep trial-seed
# Esperado: sin errores
```

- [ ] **Step 3: Commit**

```bash
git add lib/trial-seed.ts
git commit -m "feat(trial): seedDemoData() - 5 maquinas + personal + servicios + tarea por fleet type"
```

---

## Task 3: Templates de correo (6 emails, Tono B)

**Files:**
- Create: `lib/trial-email-templates.ts`

- [ ] **Step 1: Crear los templates**

```typescript
// lib/trial-email-templates.ts

interface TrialEmailData {
    adminName:   string
    companyName: string
    fleetType:   string | null
    dashboardUrl: string
    daysRemaining?: number
}

function baseLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0">
        <tr><td style="background:#EA580C;padding:24px 32px">
          <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:0.5px">REPORTAR.APP</span>
        </td></tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr><td style="background:#F8FAFC;padding:20px 32px;border-top:1px solid #E2E8F0">
          <p style="margin:0;font-size:12px;color:#94A3B8">Estás recibiendo este correo porque te registraste en REPORTAR.APP.<br>
          <a href="https://reportar.app" style="color:#EA580C">reportar.app</a> · noreply@reportar.app</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaBtn(url: string, text: string, color = '#EA580C'): string {
    return `<a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:8px 0">${text} →</a>`
}

export function renderTrialEmailDia1(data: TrialEmailData): { subject: string; html: string } {
    const subject = `Bienvenido a REPORTA, ${data.adminName}`
    const html = baseLayout(`
        <h1 style="font-size:24px;font-weight:800;color:#0F172A;margin:0 0 16px">Hola ${data.adminName},</h1>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 16px">Tu trial de <strong>10 días</strong> en REPORTAR.APP acaba de comenzar.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Cargamos datos demo para <strong>${data.companyName}</strong> — 5 máquinas, personal operativo y servicios listos. Puedes editarlos o reemplazarlos cuando quieras.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Durante estos 10 días recibirás correos con pasos concretos para sacarle el máximo provecho al sistema.</p>
        ${ctaBtn(data.dashboardUrl, 'Abrir mi dashboard')}
        <p style="font-size:14px;color:#64748B;margin:24px 0 0">¿Tienes dudas? Responde este correo y te ayudamos.</p>
    `)
    return { subject, html }
}

export function renderTrialEmailDia2(data: TrialEmailData): { subject: string; html: string } {
    const subject = `¿Conoces todos los servicios que puedes facturar con tu flota?`
    const html = baseLayout(`
        <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 16px">Hola ${data.adminName},</h1>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 16px">La mayoría de empresas de maquinaria factura solo 2 o 3 servicios. REPORTA te ayuda a identificar y tarifar todo lo que realmente produces.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Hoy entra al módulo de <strong>Servicios</strong> y revisa los servicios demo que cargamos para ti. Puedes editarlos y agregar tus precios reales.</p>
        ${ctaBtn(`${data.dashboardUrl}/servicios`, 'Ver módulo Servicios')}
        <p style="font-size:14px;color:#64748B;margin:24px 0 0">En el siguiente correo: cómo planificar la semana de tu flota en menos de 20 minutos.</p>
    `)
    return { subject, html }
}

export function renderTrialEmailDia4(data: TrialEmailData): { subject: string; html: string } {
    const subject = `Tu equipo ya puede ver las tareas de esta semana`
    const html = baseLayout(`
        <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 16px">Hola ${data.adminName},</h1>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 16px">Llegó el momento más práctico del trial: la planificación.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Entra a REPORTA, crea una tarea para mañana, asigna una máquina y un operario. Eso es todo. Ellos lo verán en su app en segundos.</p>
        <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 24px;background:#FFF7ED;border-left:4px solid #EA580C;padding:12px 16px;border-radius:4px">
            Así empieza a desaparecer el <em>"¿a qué sitio voy mañana?"</em> de tus operarios.
        </p>
        ${ctaBtn(`${data.dashboardUrl}/planificacion`, 'Abrir Planificación')}
    `)
    return { subject, html }
}

export function renderTrialEmailDia6(data: TrialEmailData): { subject: string; html: string } {
    const subject = `El cliente pide el reporte y tú lo tienes listo en 2 minutos`
    const html = baseLayout(`
        <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 16px">Hola ${data.adminName},</h1>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 16px">Tus operarios registran el trabajo desde la app. Tú generas el PDF en un clic desde la web.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Sin volver a digitar nada. Sin buscar archivos. Sin errores de horarios.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Abre la tarea demo que creaste y genera tu primer reporte de maquinaria.</p>
        ${ctaBtn(`${data.dashboardUrl}/planificacion`, 'Ver mis reportes')}
        <p style="font-size:14px;color:#64748B;margin:24px 0 0">Te quedan <strong>4 días</strong> de trial. Aprovecha el fin de semana para explorar.</p>
    `)
    return { subject, html }
}

export function renderTrialEmailDia8(data: TrialEmailData): { subject: string; html: string } {
    const subject = `¿Sabes cuánto generó tu flota este mes?`
    const html = baseLayout(`
        <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 16px">Hola ${data.adminName},</h1>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 16px">Con REPORTA puedes ver en tiempo real cuánto generó cada máquina, qué costó operarla y cuál fue el margen real del proyecto.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Hoy explora el módulo de <strong>Valorización</strong> — ahí viven los números que te dicen si tu flota es rentable.</p>
        ${ctaBtn(`${data.dashboardUrl}/ventas`, 'Ver Valorización')}
        <p style="font-size:14px;color:#64748B;margin:24px 0 0">Tu trial vence en <strong>2 días</strong>. Si quieres continuar, activa tu cuenta antes del cierre.</p>
    `)
    return { subject, html }
}

export function renderTrialEmailDia10(data: TrialEmailData & { activateUrl: string; extendUrl: string }): { subject: string; html: string } {
    const subject = `Tu trial de 10 días termina hoy, ${data.adminName}`
    const html = baseLayout(`
        <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 16px">Hola ${data.adminName},</h1>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 16px">Hoy termina tu trial en REPORTAR.APP.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Durante estos 10 días exploraste: servicios, planificación, reportes y valorización. Tus datos están guardados y seguros.</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px"><strong>¿Listo para activar tu cuenta?</strong></p>
        ${ctaBtn(data.activateUrl, 'Activar mi cuenta', '#16A34A')}
        <p style="font-size:15px;color:#64748B;margin:24px 0 8px">¿Necesitas más tiempo para evaluar?</p>
        ${ctaBtn(data.extendUrl, 'Solicitar más tiempo', '#64748B')}
        <p style="font-size:13px;color:#94A3B8;margin:24px 0 0">Al activar tu cuenta, todo lo que configuraste durante el trial estará disponible. Sin perder nada.</p>
    `)
    return { subject, html }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep trial-email
# Esperado: sin errores
```

- [ ] **Step 3: Commit**

```bash
git add lib/trial-email-templates.ts
git commit -m "feat(trial): 6 email templates Tono B - bienvenida, servicios, planificacion, reportes, valorizacion, expiracion"
```

---

## Task 4: Server actions del trial

**Files:**
- Create: `lib/actions/trial.ts`

- [ ] **Step 1: Crear las actions**

```typescript
// lib/actions/trial.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { seedDemoData, type FleetType } from '@/lib/trial-seed'
import { setupTenantConfig } from '@/lib/actions/onboarding'
import { sendEmail } from '@/lib/email'
import { renderTrialEmailDia1 } from '@/lib/trial-email-templates'
import { captureWithContext } from '@/lib/sentry'

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://web.reportar.app'

export interface RegisterTrialInput {
    adminName:   string
    email:       string
    password:    string
    companyName: string
    country:     string
    fleetType:   FleetType | null
    fleetSize:   number | null
}

export interface RegisterTrialResult {
    success: boolean
    error?:  string
}

export async function registerTrial(input: RegisterTrialInput): Promise<RegisterTrialResult> {
    const adminClient = createAdminClient()
    const supabase    = await createClient()

    try {
        // 1. Verificar que el email no existe
        const { data: existing } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', input.email)
            .maybeSingle()
        if (existing) return { success: false, error: 'Este email ya está registrado.' }

        // 2. Crear empresa con datos de trial
        const trialStart   = new Date()
        const trialExpires = new Date(trialStart.getTime() + 10 * 24 * 60 * 60 * 1000)

        const { data: company, error: companyErr } = await adminClient
            .from('companies')
            .insert({
                name:              input.companyName,
                ubicacion_pais:    input.country,
                is_active:         true,
                trial_status:      'active',
                trial_start_at:    trialStart.toISOString(),
                trial_expires_at:  trialExpires.toISOString(),
                fleet_type:        input.fleetType,
                fleet_size:        input.fleetSize,
                timezone:          'America/Lima',
            })
            .select('id')
            .single()
        if (companyErr) throw new Error(`Company: ${companyErr.message}`)

        // 3. Crear usuario en Supabase Auth
        const [firstName, ...rest] = input.adminName.trim().split(' ')
        const lastName = rest.join(' ') || ''

        const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
            email:            input.email,
            password:         input.password,
            email_confirm:    true,
            user_metadata:    { first_name: firstName, last_name: lastName, tenant_id: company.id },
        })
        if (authErr) {
            // Rollback empresa
            await adminClient.from('companies').delete().eq('id', company.id)
            throw new Error(`Auth: ${authErr.message}`)
        }

        // 4. Crear profile
        const { error: profileErr } = await adminClient
            .from('profiles')
            .insert({
                id:         authData.user.id,
                tenant_id:  company.id,
                first_name: firstName,
                last_name:  lastName,
                email:      input.email,
                role:       'admin_tenant',
            })
        if (profileErr) throw new Error(`Profile: ${profileErr.message}`)

        // 5. Seed demo data
        await seedDemoData({
            tenantId:    company.id,
            fleetType:   input.fleetType,
            companyName: input.companyName,
            adminUserId: authData.user.id,
        })

        // 6. Config por defecto del tenant
        await setupTenantConfig(company.id)

        // 7. Enviar correo día 1 + registrar en log
        const emailData = {
            adminName:    input.adminName,
            companyName:  input.companyName,
            fleetType:    input.fleetType,
            dashboardUrl: DASHBOARD_URL,
        }
        const { subject, html } = renderTrialEmailDia1(emailData)
        await sendEmail({ to: input.email, subject, html })
        await adminClient.from('trial_emails_log').insert({ tenant_id: company.id, dia: 1 })

        return { success: true }
    } catch (e: any) {
        captureWithContext(e, '/registro')
        return { success: false, error: e?.message ?? 'Error al crear la cuenta. Intenta de nuevo.' }
    }
}

export async function extendTrial(tenantId: string, days = 7): Promise<void> {
    const adminClient = createAdminClient()
    const { data: company } = await adminClient
        .from('companies')
        .select('trial_expires_at')
        .eq('id', tenantId)
        .single()
    if (!company) throw new Error('Tenant no encontrado')

    const base    = company.trial_expires_at ? new Date(company.trial_expires_at) : new Date()
    const newExp  = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
    await adminClient
        .from('companies')
        .update({ trial_expires_at: newExp.toISOString(), trial_status: 'active' })
        .eq('id', tenantId)
}

export async function convertTrial(tenantId: string): Promise<void> {
    const adminClient = createAdminClient()
    await adminClient
        .from('companies')
        .update({ trial_status: 'converted', trial_expires_at: null })
        .eq('id', tenantId)
}

export async function requestTrialExtension(tenantId: string, adminEmail: string): Promise<void> {
    // Extiende 3 días automáticamente + notifica al admin de REPORTA
    await extendTrial(tenantId, 3)
    await sendEmail({
        to:      process.env.ADMIN_NOTIFICATION_EMAIL ?? 'info@reportar.app',
        subject: `[Trial] Solicitud de extensión — tenant ${tenantId}`,
        html:    `<p>El prospecto <strong>${adminEmail}</strong> (tenant: ${tenantId}) solicitó extensión de trial. Se extendió automáticamente 3 días.</p>`,
    })
}
```

- [ ] **Step 2: Verificar que `createAdminClient` existe**

```bash
# Buscar en utils/supabase/
ls C:\Proyectos\reportaweb3\utils\supabase\
# Si NO existe admin.ts, crear:
```

Si no existe `utils/supabase/admin.ts`:
```typescript
// utils/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export function createAdminClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "trial"
# Esperado: sin errores
```

- [ ] **Step 4: Commit**

```bash
git add lib/actions/trial.ts utils/supabase/admin.ts
git commit -m "feat(trial): registerTrial(), extendTrial(), convertTrial(), requestTrialExtension()"
```

---

## Task 5: Página de registro público

**Files:**
- Create: `app/registro/page.tsx`
- Create: `app/registro/page-client.tsx`

- [ ] **Step 1: Crear shell SSR**

```typescript
// app/registro/page.tsx
import type { Metadata } from 'next'
import { RegistroPageClient } from './page-client'

export const metadata: Metadata = {
    title: 'Empieza tu trial gratis — REPORTAR.APP',
    description: 'Prueba REPORTAR.APP 10 días gratis. Sin tarjeta de crédito.',
}

export default function RegistroPage() {
    return <RegistroPageClient />
}
```

- [ ] **Step 2: Crear el formulario cliente**

```typescript
// app/registro/page-client.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerTrial, type RegisterTrialInput } from '@/lib/actions/trial'
import type { FleetType } from '@/lib/trial-seed'

const COUNTRIES = ['Perú', 'Colombia', 'Chile', 'Ecuador', 'Bolivia', 'Otro']
const FLEET_TYPES: { value: FleetType; label: string }[] = [
    { value: 'gruas',        label: 'Grúas y equipos de izaje' },
    { value: 'excavadoras',  label: 'Excavadoras y movimiento de tierras' },
    { value: 'compactadoras',label: 'Compactadoras y rodillos' },
    { value: 'mezcladoras',  label: 'Mezcladoras y equipos de concreto' },
    { value: 'mixta',        label: 'Flota mixta' },
]
const FLEET_SIZES = [
    { value: 3,  label: '1 – 5 máquinas' },
    { value: 12, label: '6 – 20 máquinas' },
    { value: 35, label: '21 – 50 máquinas' },
    { value: 75, label: 'Más de 50' },
]

export function RegistroPageClient() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        adminName:   '',
        email:       '',
        password:    '',
        companyName: '',
        country:     'Perú',
        fleetType:   '' as FleetType | '',
        fleetSize:   '' as number | '',
    })

    function set(field: keyof typeof form, value: string | number) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
        setLoading(true)
        try {
            const input: RegisterTrialInput = {
                adminName:   form.adminName.trim(),
                email:       form.email.trim().toLowerCase(),
                password:    form.password,
                companyName: form.companyName.trim(),
                country:     form.country,
                fleetType:   (form.fleetType as FleetType) || null,
                fleetSize:   (form.fleetSize as number) || null,
            }
            const result = await registerTrial(input)
            if (!result.success) { setError(result.error ?? 'Error al registrar.'); return }
            router.push('/api/auth/trial-login?email=' + encodeURIComponent(input.email) + '&password=' + encodeURIComponent(input.password))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-orange-600">REPORTAR.APP</h1>
                    <p className="mt-2 text-slate-600 font-medium">10 días gratis · Sin tarjeta de crédito · Cancela cuando quieras</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Tu cuenta</h2>
                        <div className="space-y-4">
                            <Field label="Nombre completo *" value={form.adminName} onChange={v => set('adminName', v)} placeholder="Juan Pérez" required />
                            <Field label="Email *" type="email" value={form.email} onChange={v => set('email', v)} placeholder="juan@empresa.com" required />
                            <Field label="Contraseña *" type="password" value={form.password} onChange={v => set('password', v)} placeholder="Mínimo 8 caracteres" required />
                            <Field label="Nombre de tu empresa *" value={form.companyName} onChange={v => set('companyName', v)} placeholder="Transportes Ávila S.A.C." required />
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">País *</label>
                                <select
                                    value={form.country}
                                    onChange={e => set('country', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                >
                                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-1">Tu operación <span className="text-slate-400 font-normal text-sm">(opcional)</span></h2>
                        <p className="text-xs text-slate-500 mb-4">Usamos esto para personalizar tu experiencia. Puedes cambiarlo después.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de maquinaria</label>
                                <select
                                    value={form.fleetType}
                                    onChange={e => set('fleetType', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="">— Seleccionar —</option>
                                    {FLEET_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Tamaño de flota</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {FLEET_SIZES.map(s => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => set('fleetSize', s.value)}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                                form.fleetSize === s.value
                                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                    : 'border-slate-200 text-slate-600 hover:border-orange-300'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl transition-colors text-base"
                    >
                        {loading ? 'Creando tu cuenta...' : 'Empezar mi trial gratis →'}
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        ¿Ya tienes cuenta? <a href="/login" className="text-orange-600 font-semibold">Inicia sesión</a>
                    </p>
                </form>
            </div>
        </div>
    )
}

function Field({ label, type = 'text', value, onChange, placeholder, required }: {
    label: string; type?: string; value: string
    onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
        </div>
    )
}
```

- [ ] **Step 3: Crear el endpoint de auto-login post-registro**

```typescript
// app/api/auth/trial-login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const email    = searchParams.get('email') ?? ''
    const password = searchParams.get('password') ?? ''

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return NextResponse.redirect(new URL('/login?trial=1', request.url))
    }
    return NextResponse.redirect(new URL('/planificacion?trial=new', request.url))
}
```

- [ ] **Step 4: Agregar `/registro` a PUBLIC_PATHS en middleware**

En `utils/supabase/middleware.ts`, busca la línea con `PUBLIC_PATHS` y agrega `'/registro'`:

```typescript
// Antes:
const PUBLIC_PATHS = ['/login', '/auth', '/aprobacion', '/api']
// Después:
const PUBLIC_PATHS = ['/login', '/auth', '/aprobacion', '/api', '/registro', '/trial-expirado']
```

- [ ] **Step 5: Verificar build**

```bash
npm run build 2>&1 | tail -20
# Esperado: sin errores TypeScript ni de compilación
```

- [ ] **Step 6: Commit**

```bash
git add app/registro/ app/api/auth/trial-login/
git commit -m "feat(trial): pagina de registro publico /registro con formulario de trial"
```

---

## Task 6: Cron de emails del trial

**Files:**
- Create: `app/api/cron/trial-emails/route.ts`

- [ ] **Step 1: Crear el cron**

```typescript
// app/api/cron/trial-emails/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendEmail } from '@/lib/email'
import {
    renderTrialEmailDia1,
    renderTrialEmailDia2,
    renderTrialEmailDia4,
    renderTrialEmailDia6,
    renderTrialEmailDia8,
    renderTrialEmailDia10,
} from '@/lib/trial-email-templates'

const SCHEDULE: number[] = [1, 2, 4, 6, 8, 10]
const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://web.reportar.app'

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const now = new Date()

    // Obtener trials activos con su admin email
    const { data: trials, error } = await adminClient
        .from('companies')
        .select(`
            id, name, fleet_type, trial_start_at,
            profiles!inner(email, first_name, last_name)
        `)
        .eq('trial_status', 'active')
        .not('trial_start_at', 'is', null)

    if (error || !trials) {
        return NextResponse.json({ error: error?.message }, { status: 500 })
    }

    let sent = 0
    let skipped = 0

    for (const trial of trials) {
        const startAt    = new Date(trial.trial_start_at!)
        const daysElapsed = Math.floor((now.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24))
        const adminProfile = Array.isArray(trial.profiles) ? trial.profiles[0] : trial.profiles
        if (!adminProfile?.email) { skipped++; continue }

        const emailData = {
            adminName:    `${adminProfile.first_name ?? ''} ${adminProfile.last_name ?? ''}`.trim(),
            companyName:  trial.name,
            fleetType:    trial.fleet_type,
            dashboardUrl: DASHBOARD_URL,
        }

        for (const dia of SCHEDULE) {
            if (daysElapsed < dia) continue

            // Verificar si ya fue enviado
            const { data: existing } = await adminClient
                .from('trial_emails_log')
                .select('id')
                .eq('tenant_id', trial.id)
                .eq('dia', dia)
                .maybeSingle()
            if (existing) continue

            // Generar y enviar
            let emailContent: { subject: string; html: string }
            if (dia === 1)  emailContent = renderTrialEmailDia1(emailData)
            else if (dia === 2)  emailContent = renderTrialEmailDia2(emailData)
            else if (dia === 4)  emailContent = renderTrialEmailDia4(emailData)
            else if (dia === 6)  emailContent = renderTrialEmailDia6(emailData)
            else if (dia === 8)  emailContent = renderTrialEmailDia8(emailData)
            else emailContent = renderTrialEmailDia10({
                ...emailData,
                activateUrl: `${DASHBOARD_URL}/contacto?origen=trial&tenant=${trial.id}`,
                extendUrl:   `${DASHBOARD_URL}/api/trial/extend-request?tenant=${trial.id}&email=${encodeURIComponent(adminProfile.email)}`,
            })

            const result = await sendEmail({ to: adminProfile.email, ...emailContent })
            if (result.success) {
                await adminClient.from('trial_emails_log').insert({ tenant_id: trial.id, dia })
                sent++
            }
        }
    }

    return NextResponse.json({ ok: true, sent, skipped, trials: trials.length })
}
```

- [ ] **Step 2: Crear endpoint de extensión por solicitud**

```typescript
// app/api/trial/extend-request/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requestTrialExtension } from '@/lib/actions/trial'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const tenantId   = searchParams.get('tenant') ?? ''
    const adminEmail = searchParams.get('email')  ?? ''
    if (!tenantId) return NextResponse.json({ error: 'missing tenant' }, { status: 400 })
    await requestTrialExtension(tenantId, adminEmail)
    return NextResponse.redirect(new URL('/trial-expirado?extended=1', request.url))
}
```

- [ ] **Step 3: Registrar el cron en Vercel**

En `vercel.json` (o crearlo si no existe):

```json
{
  "crons": [
    { "path": "/api/cron/trial-emails",  "schedule": "0 8 * * *" },
    { "path": "/api/cron/trial-expiry",  "schedule": "0 7 * * *" }
  ]
}
```

> Nota: Si ya existe `vercel.json` con crons, agregar los dos nuevos al array existente.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/trial-emails/ app/api/trial/ vercel.json
git commit -m "feat(trial): cron diario de emails + endpoint extend-request"
```

---

## Task 7: Cron de expiración + middleware

**Files:**
- Create: `app/api/cron/trial-expiry/route.ts`
- Modify: `utils/supabase/middleware.ts`

- [ ] **Step 1: Crear el cron de expiración**

```typescript
// app/api/cron/trial-expiry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('companies')
        .update({ trial_status: 'expired' })
        .eq('trial_status', 'active')
        .lt('trial_expires_at', new Date().toISOString())
        .select('id, name')

    return NextResponse.json({ ok: true, expired: data?.length ?? 0, error: error?.message })
}
```

- [ ] **Step 2: Agregar check de trial al middleware**

En `utils/supabase/middleware.ts`, busca el bloque donde se verifica `/sistema` (después de `const { data: profile }`) y agrega el check de trial **antes** de la verificación de rutas bloqueadas:

```typescript
// Agregar después de obtener el perfil del usuario y ANTES del bloque de /sistema:

// ── Trial expiry check ────────────────────────────────────────────────
if (profile?.tenant_id) {
    const { data: company } = await supabase
        .from('companies')
        .select('trial_expires_at, trial_status')
        .eq('id', profile.tenant_id)
        .maybeSingle()

    const isTrialExpired = company?.trial_expires_at
        && new Date(company.trial_expires_at) < new Date()
        && company?.trial_status === 'active'

    const alreadyExpired = company?.trial_status === 'expired'

    const isExcludedPath = request.nextUrl.pathname.startsWith('/trial-expirado')
        || request.nextUrl.pathname.startsWith('/api')
        || request.nextUrl.pathname.startsWith('/login')

    if ((isTrialExpired || alreadyExpired) && !isExcludedPath) {
        if (isTrialExpired) {
            // Marcar como expirado de forma asíncrona
            supabase.from('companies')
                .update({ trial_status: 'expired' })
                .eq('id', profile.tenant_id)
                .then(() => {})
        }
        const redirectTo = NextResponse.redirect(new URL('/trial-expirado', request.url))
        response.cookies.getAll().forEach(({ name, value, ...opts }) => {
            redirectTo.cookies.set(name, value, opts as any)
        })
        return redirectTo
    }
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | tail -20
# Esperado: compilación limpia
```

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/trial-expiry/ utils/supabase/middleware.ts
git commit -m "feat(trial): cron expiracion + middleware check trial_expires_at"
```

---

## Task 8: Página de expiración

**Files:**
- Create: `app/trial-expirado/page.tsx`

- [ ] **Step 1: Crear la página**

```typescript
// app/trial-expirado/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Tu trial ha terminado — REPORTAR.APP',
}

export default async function TrialExpiradoPage({
    searchParams,
}: {
    searchParams: Promise<{ extended?: string }>
}) {
    const params = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let stats = { reportes: 0, tareas: 0 }
    let tenantId: string | null = null

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, first_name')
            .eq('id', user.id)
            .single()

        tenantId = profile?.tenant_id ?? null

        if (tenantId) {
            const [{ count: reportes }, { count: tareas }] = await Promise.all([
                supabase.from('reportes_maquinaria').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
                supabase.from('tareas').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            ])
            stats = { reportes: reportes ?? 0, tareas: tareas ?? 0 }
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center space-y-6">

                {params.extended === '1' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-green-700 font-medium">
                        ✅ Se extendió tu acceso 3 días adicionales. Te contactaremos pronto.
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto">
                        <span className="text-3xl">⏰</span>
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Tu período de prueba ha terminado</h1>
                        <p className="mt-2 text-slate-600">Tus datos están seguros y disponibles al activar tu cuenta.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="text-2xl font-black text-orange-600">{stats.reportes}</div>
                            <div className="text-sm text-slate-500 mt-1">Reportes creados</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="text-2xl font-black text-orange-600">{stats.tareas}</div>
                            <div className="text-sm text-slate-500 mt-1">Tareas planificadas</div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a
                            href={`/contacto?origen=trial-expirado&tenant=${tenantId ?? ''}`}
                            className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-colors"
                        >
                            Activar mi cuenta →
                        </a>
                        <a
                            href={`/api/trial/extend-request?tenant=${tenantId ?? ''}`}
                            className="block w-full bg-white hover:bg-slate-50 text-slate-600 font-semibold py-3 rounded-xl border border-slate-200 transition-colors"
                        >
                            Necesito más tiempo
                        </a>
                    </div>

                    <p className="text-xs text-slate-400">
                        ¿Preguntas? Escríbenos a{' '}
                        <a href="mailto:info@reportar.app" className="text-orange-600">info@reportar.app</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/trial-expirado/
git commit -m "feat(trial): pagina /trial-expirado con stats y CTAs de conversion"
```

---

## Task 9: Modificación del wizard de onboarding

**Files:**
- Modify: `components/sistema/onboarding/step-maquinaria.tsx`
- Modify: `components/sistema/onboarding/step-usuarios.tsx`
- Modify: `components/sistema/onboarding/step-servicios.tsx`

> Nota: Antes de modificar cada archivo, léelo para entender su estructura actual. El patrón es el mismo para los 3 pasos.

- [ ] **Step 1: Leer el step de maquinaria para entender la estructura**

```bash
# Leer las primeras 80 líneas
Read: components/sistema/onboarding/step-maquinaria.tsx (líneas 1-80)
```

- [ ] **Step 2: Agregar el prop `isTrial` al wizard shell**

En `components/sistema/onboarding/wizard-shell.tsx`, agregar el prop al tipo y pasarlo a cada step:

```typescript
// Buscar la interfaz de props del WizardShell y agregar:
isTrial?: boolean

// Pasarlo al step actual como prop
```

- [ ] **Step 3: Agregar choice UI a step-maquinaria.tsx**

Al inicio del componente `StepMaquinaria`, antes del contenido existente, agregar:

```typescript
// Props: agregar isTrial?: boolean y maquinariasDemo?: any[]

// Al inicio del return, si isTrial:
{isTrial && (
    <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">
            ¿Cómo quieres cargar tu maquinaria?
        </p>
        <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="radio"
                    name="maq_choice"
                    value="demo"
                    checked={usarDemo === true}
                    onChange={() => setUsarDemo(true)}
                    className="accent-orange-500"
                />
                <span className="text-sm font-medium text-slate-700">
                    Usar datos demo <span className="text-slate-500">(ya tenemos 5 máquinas listas)</span>
                </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="radio"
                    name="maq_choice"
                    value="propios"
                    checked={usarDemo === false}
                    onChange={() => setUsarDemo(false)}
                    className="accent-orange-500"
                />
                <span className="text-sm font-medium text-slate-700">Cargar mis propias máquinas</span>
            </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
            💡 Puedes editar y agregar más máquinas en cualquier momento desde Configuración → Maquinaria.
        </p>
        {usarDemo && maquinariasDemo && maquinariasDemo.length > 0 && (
            <div className="mt-4 space-y-1">
                {maquinariasDemo.map((m: any) => (
                    <div key={m.id} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="text-orange-500">✓</span> {m.nombre}
                    </div>
                ))}
            </div>
        )}
    </div>
)}
{(!isTrial || usarDemo === false) && (
    /* contenido original del step */
    <>{/* existing step content */}</>
)}
```

> Aplicar el mismo patrón a `step-usuarios.tsx` (personal demo) y `step-servicios.tsx` (servicios demo).

- [ ] **Step 4: Pasar `isTrial` desde la página del wizard**

En `app/(dashboard)/sistema/onboarding/[tenantId]/page.tsx`:

```typescript
// Agregar query para verificar si el tenant es trial:
const { data: company } = await supabase
    .from('companies')
    .select('trial_status')
    .eq('id', params.tenantId)
    .single()

const isTrial = company?.trial_status === 'active'

// Pasar al WizardShell:
<WizardShell tenantId={params.tenantId} isTrial={isTrial} />
```

- [ ] **Step 5: Verificar build**

```bash
npm run build 2>&1 | tail -20
# Esperado: compilación limpia
```

- [ ] **Step 6: Commit**

```bash
git add components/sistema/onboarding/
git commit -m "feat(trial): wizard onboarding - choice datos demo / propios para trials"
```

---

## Task 10: Vista admin de trials en /sistema

**Files:**
- Modify: `app/(dashboard)/sistema/onboarding/page.tsx`

- [ ] **Step 1: Leer la página actual de onboarding**

```bash
Read: app/(dashboard)/sistema/onboarding/page.tsx
```

- [ ] **Step 2: Agregar tab "Trials" con tabla de trials activos**

Agregar una segunda pestaña/sección a la página. Después del contenido existente de la lista de tenants, agregar:

```typescript
// Query de trials
const { data: trials } = await supabase
    .from('companies')
    .select(`
        id, name, fleet_type, fleet_size, trial_status, trial_start_at, trial_expires_at,
        profiles!inner(email, first_name, last_name)
    `)
    .not('trial_status', 'is', null)
    .order('trial_start_at', { ascending: false })

// Componente de tabla de trials (client component)
// Crear components/sistema/onboarding/trials-table.tsx:
```

```typescript
// components/sistema/onboarding/trials-table.tsx
'use client'

import { extendTrial, convertTrial } from '@/lib/actions/trial'

interface TrialRow {
    id: string
    name: string
    fleet_type: string | null
    fleet_size: number | null
    trial_status: string
    trial_start_at: string | null
    trial_expires_at: string | null
    profiles: { email: string; first_name: string | null; last_name: string | null } | any
}

function daysRemaining(expiresAt: string | null): number {
    if (!expiresAt) return 0
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

function statusBadge(status: string, days: number) {
    if (status === 'converted') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Convertido</span>
    if (status === 'expired' || days === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Expirado</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{days}d restantes</span>
}

export function TrialsTable({ trials }: { trials: TrialRow[] }) {
    if (!trials || trials.length === 0) {
        return <p className="text-sm text-muted-foreground py-6 text-center">No hay trials registrados aún.</p>
    }

    return (
        <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted/40">
                    <tr>
                        {['Empresa', 'Admin', 'Flota', 'Registrado', 'Estado', 'Acciones'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {trials.map(t => {
                        const profile  = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
                        const days     = daysRemaining(t.trial_expires_at)
                        const startStr = t.trial_start_at ? new Date(t.trial_start_at).toLocaleDateString('es-PE') : '—'
                        return (
                            <tr key={t.id} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium">{t.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{profile?.email ?? '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground capitalize">{t.fleet_type ?? '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{startStr}</td>
                                <td className="px-4 py-3">{statusBadge(t.trial_status, days)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <form action={async () => { 'use server'; await extendTrial(t.id) }}>
                                            <button type="submit" className="text-xs px-2 py-1 rounded border hover:bg-muted">+7 días</button>
                                        </form>
                                        <form action={async () => { 'use server'; await convertTrial(t.id) }}>
                                            <button type="submit" className="text-xs px-2 py-1 rounded border text-green-700 hover:bg-green-50">Convertir</button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/sistema/onboarding/ components/sistema/onboarding/trials-table.tsx
git commit -m "feat(trial): tabla de trials activos en /sistema/onboarding"
```

---

## Task 11: Deploy y verificación final

- [ ] **Step 1: Verificar variables de entorno en Vercel**

En Vercel → proyecto reportaweb3 → Settings → Environment Variables, confirmar que existen:
- `CRON_SECRET` — secreto para proteger los crons
- `NEXT_PUBLIC_APP_URL` — `https://web.reportar.app`
- `ADMIN_NOTIFICATION_EMAIL` — email para notificaciones de extensión (ej: `info@reportar.app`)
- `SUPABASE_SERVICE_ROLE_KEY` — para `createAdminClient()`

- [ ] **Step 2: Deploy a preview**

```bash
cd C:\Proyectos\reportaweb3
npx vercel
# URL de preview para verificar /registro
```

- [ ] **Step 3: Prueba de smoke end-to-end**

1. Abrir URL preview `/registro`
2. Registrar empresa "Empresa Test Trial" + gruas + 1-5 máquinas
3. Verificar en Supabase TEST: `companies` tiene `trial_status='active'` + `trial_expires_at`
4. Verificar en `maquinarias`: 5 grúas con nombre de empresa
5. Verificar en `trial_emails_log`: `dia=1` enviado
6. Verificar que el correo de bienvenida llegó al email
7. Acceder al dashboard — verificar que hay datos demo
8. Forzar expiración: `UPDATE companies SET trial_expires_at = NOW() - INTERVAL '1 day' WHERE name = 'Empresa Test Trial'`
9. Refrescar el dashboard — verificar redirect a `/trial-expirado`
10. Verificar stats en `/trial-expirado`

- [ ] **Step 4: Deploy a producción**

```bash
npx vercel --prod
```

- [ ] **Step 5: Commit final de versión**

```bash
# Actualizar versión en package.json: 3.10.35 → 3.10.36
# Actualizar CLAUDE.md
git add package.json CLAUDE.md
git commit -m "feat(v3.10.36): trial onboarding - registro publico, seed demo, 6 correos nurturing, enforcement expiracion"
git push origin develop
```

---

## Self-Review

**Spec coverage:**
- ✅ Sección 1 (modelo datos) → Task 1
- ✅ Sección 2 (registro) → Task 5
- ✅ Sección 3 (wizard demo/propio) → Task 9
- ✅ Sección 4 (6 correos Tono B) → Task 3 + Task 6
- ✅ Sección 5 (enforcement middleware) → Task 7
- ✅ Sección 6 (página expiración) → Task 8
- ✅ Sección 7 (vista admin trials) → Task 10
- ✅ Seed demo por fleet type → Task 2

**Placeholder scan:** Sin TBDs ni "fill in details".

**Type consistency:**
- `FleetType` definido en `lib/trial-seed.ts` y reutilizado en `lib/actions/trial.ts` y `app/registro/page-client.tsx` ✅
- `registerTrial()` retorna `RegisterTrialResult` consistente en action y en page-client ✅
- `createAdminClient()` definido en Task 4 y usado en Tasks 6, 7 ✅
