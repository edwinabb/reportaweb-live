# Notificaciones Documentos Vencidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daily cron at 6 AM that marks expired documents (maquinaria + personal) as VENCIDO and emails configured recipients per tenant with a list of expired and soon-to-expire documents.

**Architecture:** New `notificaciones_receptores` table stores per-tenant email recipients per notification type. A Vercel Cron at `/api/cron/documentos-vencidos` runs daily at 06:00 UTC, updates `maquinaria_documentos.estado` to VENCIDO for past-due docs, queries both tables for a 15-day window, and sends HTML emails via Resend following the existing EPP alert pattern. A management page at `/configuracion/notificaciones` lets admins add/remove recipients.

**Tech Stack:** Next.js 14 App Router, Supabase (service role), Resend, Vercel Cron, inline HTML email templates (same pattern as `lib/epp-email-templates.ts`)

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/20260524100000_notificaciones_receptores.sql` |
| Create | `lib/notificaciones-email-templates.ts` |
| Create | `app/api/cron/documentos-vencidos/route.ts` |
| Modify | `vercel.json` |
| Create | `lib/actions/notificaciones.ts` |
| Create | `app/(dashboard)/configuracion/notificaciones/page.tsx` |
| Create | `components/notificaciones/receptores-table.tsx` |
| Create | `components/notificaciones/add-receptor-dialog.tsx` |
| Modify | `lib/config/menu.ts` |

---

### Task 1: DB Migration — notificaciones_receptores

**Files:**
- Create: `supabase/migrations/20260524100000_notificaciones_receptores.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260524100000_notificaciones_receptores.sql

CREATE TABLE IF NOT EXISTS public.notificaciones_receptores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_correo TEXT NOT NULL,
    -- e.g. 'DOCUMENTOS_MAQUINARIA_VENCIDOS', 'DOCUMENTOS_PERSONAL_VENCIDOS'
    email       TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    frecuencia  TEXT NOT NULL DEFAULT 'DIARIA', -- 'DIARIA' | 'SEMANAL'
    dia_semana  SMALLINT,                        -- 0=Dom..6=Sab, solo para SEMANAL
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_receptores_tenant
    ON public.notificaciones_receptores (tenant_id, tipo_correo, is_active);

-- RLS
ALTER TABLE public.notificaciones_receptores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation" ON public.notificaciones_receptores
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones_receptores TO authenticated;

-- Seed: CISE (1cb97ec7-326c-4376-93ee-ed317d3da51b)
INSERT INTO public.notificaciones_receptores (tenant_id, tipo_correo, email, nombre, frecuencia)
VALUES
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b', 'DOCUMENTOS_MAQUINARIA_VENCIDOS', 'info@reporta.la', 'EDWIN', 'DIARIA'),
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b', 'DOCUMENTOS_PERSONAL_VENCIDOS',   'info@reporta.la', 'EDWIN', 'DIARIA'),
-- Seed: GRUAS DEL PACIFICO (6f4c923a-c3b7-47c2-9dea-2a187f274f73)
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73', 'DOCUMENTOS_MAQUINARIA_VENCIDOS', 'info@reporta.la', 'EDWIN', 'DIARIA'),
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73', 'DOCUMENTOS_PERSONAL_VENCIDOS',   'info@reporta.la', 'EDWIN', 'DIARIA')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with project_id `wioozisskjjgjjybsoqo` and the SQL above. Confirm success with `mcp__claude_ai_Supabase__list_migrations`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260524100000_notificaciones_receptores.sql
git commit -m "feat: tabla notificaciones_receptores con seed CISE + GRUAS"
```

---

### Task 2: Email Template — Maquinaria Vencidos

**Files:**
- Create: `lib/notificaciones-email-templates.ts`

This template renders a branded HTML email with two sections: ⚠️ Vencidos and ⏰ Por Vencer (within 15 days). It follows the exact pattern of `lib/epp-email-templates.ts`.

- [ ] **Step 1: Write the template file**

```typescript
// lib/notificaciones-email-templates.ts

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function diasRestantes(fechaVenc: string): number {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const venc = new Date(fechaVenc)
    venc.setHours(0, 0, 0, 0)
    return Math.ceil((venc.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export interface DocMaquinariaRow {
    maquinaria: string   // nombre/codigo del equipo
    tipo_doc: string     // tipo de documento
    numero_doc?: string
    fecha_vencimiento: string
}

export interface DocPersonalRow {
    persona: string      // nombre del colaborador
    tipo_doc: string
    numero_doc?: string
    fecha_vencimiento: string
}

// ─── MAQUINARIA ───────────────────────────────────────────────────────────────

export function renderMaquinariaVencidosEmailHtml(data: {
    nombre: string           // recipient greeting name
    tenantNombre: string
    vencidos: DocMaquinariaRow[]
    porVencer: DocMaquinariaRow[]
    siteUrl: string
}): string {
    const { nombre, tenantNombre, vencidos, porVencer, siteUrl } = data

    const rowsMaq = (rows: DocMaquinariaRow[], esVencido: boolean) =>
        rows.map(r => {
            const dias = diasRestantes(r.fecha_vencimiento)
            const badge = esVencido
                ? `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">VENCIDO</span>`
                : `<span style="background:#f97316;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${dias}d</span>`
            return `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.maquinaria)}</td>
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.tipo_doc)}</td>
                <td style="padding:8px 10px;font-size:13px;">${r.numero_doc ? escapeHtml(r.numero_doc) : '-'}</td>
                <td style="padding:8px 10px;font-size:13px;">${formatFecha(r.fecha_vencimiento)}</td>
                <td style="padding:8px 10px;text-align:center;">${badge}</td>
            </tr>`
        }).join('')

    const tableHeaders = `
        <tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Equipo</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Documento</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Número</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280;">Estado</th>
        </tr>`

    const seccionVencidos = vencidos.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#dc2626;">⚠️ Documentos Vencidos (${vencidos.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsMaq(vencidos, true)}</tbody>
        </table>`

    const seccionPorVencer = porVencer.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#ea580c;">⏰ Próximos a Vencer — 15 días (${porVencer.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsMaq(porVencer, false)}</tbody>
        </table>`

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Documentos Maquinaria</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:20px 28px;">
            <span style="color:#f97316;font-size:22px;font-weight:700;">REPORTA</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:12px;">Alerta de Documentos — Maquinaria</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 8px;font-size:15px;color:#111827;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">
              A continuación el resumen de documentos de maquinaria para <strong>${escapeHtml(tenantNombre)}</strong>
              que requieren atención.
            </p>
            ${seccionVencidos}
            ${seccionPorVencer}
            ${vencidos.length === 0 && porVencer.length === 0
                ? '<p style="color:#6b7280;font-size:14px;">No hay documentos vencidos ni próximos a vencer.</p>'
                : ''}
            <!-- CTA -->
            <div style="margin-top:32px;text-align:center;">
              <a href="${siteUrl}/maquinaria"
                 style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
                Ver Panel de Maquinaria
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Este correo fue generado automáticamente por REPORTA · <a href="${siteUrl}" style="color:#f97316;">reportar.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── PERSONAL ─────────────────────────────────────────────────────────────────

export function renderPersonalVencidosEmailHtml(data: {
    nombre: string
    tenantNombre: string
    vencidos: DocPersonalRow[]
    porVencer: DocPersonalRow[]
    siteUrl: string
}): string {
    const { nombre, tenantNombre, vencidos, porVencer, siteUrl } = data

    const rowsPersonal = (rows: DocPersonalRow[], esVencido: boolean) =>
        rows.map(r => {
            const dias = diasRestantes(r.fecha_vencimiento)
            const badge = esVencido
                ? `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">VENCIDO</span>`
                : `<span style="background:#f97316;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${dias}d</span>`
            return `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.persona)}</td>
                <td style="padding:8px 10px;font-size:13px;">${escapeHtml(r.tipo_doc)}</td>
                <td style="padding:8px 10px;font-size:13px;">${r.numero_doc ? escapeHtml(r.numero_doc) : '-'}</td>
                <td style="padding:8px 10px;font-size:13px;">${formatFecha(r.fecha_vencimiento)}</td>
                <td style="padding:8px 10px;text-align:center;">${badge}</td>
            </tr>`
        }).join('')

    const tableHeaders = `
        <tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Colaborador</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Documento</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Número</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280;">Estado</th>
        </tr>`

    const seccionVencidos = vencidos.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#dc2626;">⚠️ Documentos Vencidos (${vencidos.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsPersonal(vencidos, true)}</tbody>
        </table>`

    const seccionPorVencer = porVencer.length === 0 ? '' : `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#ea580c;">⏰ Próximos a Vencer — 15 días (${porVencer.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            <thead>${tableHeaders}</thead>
            <tbody>${rowsPersonal(porVencer, false)}</tbody>
        </table>`

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Documentos Personal</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:20px 28px;">
            <span style="color:#f97316;font-size:22px;font-weight:700;">REPORTA</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:12px;">Alerta de Documentos — Personal</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 8px;font-size:15px;color:#111827;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">
              A continuación el resumen de documentos de personal para <strong>${escapeHtml(tenantNombre)}</strong>
              que requieren atención.
            </p>
            ${seccionVencidos}
            ${seccionPorVencer}
            ${vencidos.length === 0 && porVencer.length === 0
                ? '<p style="color:#6b7280;font-size:14px;">No hay documentos vencidos ni próximos a vencer.</p>'
                : ''}
            <!-- CTA -->
            <div style="margin-top:32px;text-align:center;">
              <a href="${siteUrl}/personal"
                 style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
                Ver Panel de Personal
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Este correo fue generado automáticamente por REPORTA · <a href="${siteUrl}" style="color:#f97316;">reportar.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/notificaciones-email-templates.ts
git commit -m "feat: email templates — maquinaria y personal documentos vencidos"
```

---

### Task 3: Cron API Route — /api/cron/documentos-vencidos

**Files:**
- Create: `app/api/cron/documentos-vencidos/route.ts`

Reference: `app/api/cron/epp-alertas/route.ts` — follow the exact same security + Supabase pattern.

- [ ] **Step 1: Write the route**

```typescript
// app/api/cron/documentos-vencidos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import {
    renderMaquinariaVencidosEmailHtml,
    renderPersonalVencidosEmailHtml,
    type DocMaquinariaRow,
    type DocPersonalRow,
} from '@/lib/notificaciones-email-templates'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.reporta.la'
const POR_VENCER_DIAS = 15

export async function GET(req: NextRequest) {
    // Security: verify cron secret
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const hoyIso = hoy.toISOString().split('T')[0]

    const porVencerFecha = new Date(hoy)
    porVencerFecha.setDate(porVencerFecha.getDate() + POR_VENCER_DIAS)
    const porVencerIso = porVencerFecha.toISOString().split('T')[0]

    // 1. Get all tenants that have active receptores
    const { data: tenants } = await supabase
        .from('companies')
        .select('id, nombre_comercial, razon_social')

    if (!tenants?.length) {
        return NextResponse.json({ ok: true, message: 'No tenants found' })
    }

    const summary: Record<string, { maquinaria: number; personal: number; emails: number }> = {}

    for (const tenant of tenants) {
        const tenantId = tenant.id
        const tenantNombre = tenant.nombre_comercial || tenant.razon_social || tenantId

        // ── MAQUINARIA ──────────────────────────────────────────────────────

        // 1a. Update expired docs to VENCIDO
        await supabase
            .from('maquinaria_documentos')
            .update({ estado: 'VENCIDO', updated_at: new Date().toISOString() })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .neq('estado', 'VENCIDO')
            .lt('fecha_vencimiento', hoyIso)

        // 1b. Query vencidos
        const { data: maqVencidos } = await supabase
            .from('maquinaria_documentos')
            .select(`
                id,
                numero_doc,
                fecha_vencimiento,
                maquinarias!inner ( nombre, codigo ),
                maquinaria_tipos_docs ( nombre )
            `)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .eq('estado', 'VENCIDO')
            .not('fecha_vencimiento', 'is', null)

        // 1c. Query por vencer (next 15 days, not yet expired)
        const { data: maqPorVencer } = await supabase
            .from('maquinaria_documentos')
            .select(`
                id,
                numero_doc,
                fecha_vencimiento,
                maquinarias!inner ( nombre, codigo ),
                maquinaria_tipos_docs ( nombre )
            `)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .neq('estado', 'VENCIDO')
            .gte('fecha_vencimiento', hoyIso)
            .lte('fecha_vencimiento', porVencerIso)

        const maqVencidosRows: DocMaquinariaRow[] = (maqVencidos ?? []).map((d: any) => ({
            maquinaria: d.maquinarias?.nombre || d.maquinarias?.codigo || '—',
            tipo_doc: d.maquinaria_tipos_docs?.nombre || '—',
            numero_doc: d.numero_doc,
            fecha_vencimiento: d.fecha_vencimiento,
        }))

        const maqPorVencerRows: DocMaquinariaRow[] = (maqPorVencer ?? []).map((d: any) => ({
            maquinaria: d.maquinarias?.nombre || d.maquinarias?.codigo || '—',
            tipo_doc: d.maquinaria_tipos_docs?.nombre || '—',
            numero_doc: d.numero_doc,
            fecha_vencimiento: d.fecha_vencimiento,
        }))

        // ── PERSONAL ─────────────────────────────────────────────────────────

        // 2a. Query personal vencidos (user_documents — status computed from valid_until)
        const { data: persVencidos } = await supabase
            .from('user_documents')
            .select(`
                id,
                valid_until,
                document_types ( name ),
                profiles!inner ( nombre_completo )
            `)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .not('valid_until', 'is', null)
            .lt('valid_until', hoyIso)

        // 2b. Query personal por vencer
        const { data: persPorVencer } = await supabase
            .from('user_documents')
            .select(`
                id,
                valid_until,
                document_types ( name ),
                profiles!inner ( nombre_completo )
            `)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .not('valid_until', 'is', null)
            .gte('valid_until', hoyIso)
            .lte('valid_until', porVencerIso)

        const persVencidosRows: DocPersonalRow[] = (persVencidos ?? []).map((d: any) => ({
            persona: d.profiles?.nombre_completo || '—',
            tipo_doc: d.document_types?.name || '—',
            fecha_vencimiento: d.valid_until,
        }))

        const persPorVencerRows: DocPersonalRow[] = (persPorVencer ?? []).map((d: any) => ({
            persona: d.profiles?.nombre_completo || '—',
            tipo_doc: d.document_types?.name || '—',
            fecha_vencimiento: d.valid_until,
        }))

        summary[tenantNombre] = {
            maquinaria: maqVencidosRows.length + maqPorVencerRows.length,
            personal: persVencidosRows.length + persPorVencerRows.length,
            emails: 0,
        }

        // ── SEND EMAILS ───────────────────────────────────────────────────────

        const { data: receptores } = await supabase
            .from('notificaciones_receptores')
            .select('email, nombre, tipo_correo, frecuencia, dia_semana')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)

        for (const receptor of receptores ?? []) {
            // Check frecuencia/dia_semana — skip SEMANAL if today != dia_semana
            if (receptor.frecuencia === 'SEMANAL') {
                const diaSemanaHoy = new Date().getDay() // 0=Sun
                if (receptor.dia_semana !== null && receptor.dia_semana !== diaSemanaHoy) continue
            }

            if (receptor.tipo_correo === 'DOCUMENTOS_MAQUINARIA_VENCIDOS') {
                if (maqVencidosRows.length === 0 && maqPorVencerRows.length === 0) continue
                const html = renderMaquinariaVencidosEmailHtml({
                    nombre: receptor.nombre,
                    tenantNombre,
                    vencidos: maqVencidosRows,
                    porVencer: maqPorVencerRows,
                    siteUrl: SITE_URL,
                })
                await sendEmail({
                    to: receptor.email,
                    subject: `⚠️ Documentos Maquinaria — ${maqVencidosRows.length} vencidos · ${tenantNombre}`,
                    html,
                })
                summary[tenantNombre].emails++
            }

            if (receptor.tipo_correo === 'DOCUMENTOS_PERSONAL_VENCIDOS') {
                if (persVencidosRows.length === 0 && persPorVencerRows.length === 0) continue
                const html = renderPersonalVencidosEmailHtml({
                    nombre: receptor.nombre,
                    tenantNombre,
                    vencidos: persVencidosRows,
                    porVencer: persPorVencerRows,
                    siteUrl: SITE_URL,
                })
                await sendEmail({
                    to: receptor.email,
                    subject: `⚠️ Documentos Personal — ${persVencidosRows.length} vencidos · ${tenantNombre}`,
                    html,
                })
                summary[tenantNombre].emails++
            }
        }
    }

    return NextResponse.json({ ok: true, summary })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cron/documentos-vencidos/route.ts
git commit -m "feat: cron /api/cron/documentos-vencidos — update + email maquinaria y personal"
```

---

### Task 4: Register Cron in vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Read current vercel.json and add the new cron**

Current `vercel.json` has:
```json
{
  "crons": [
    { "path": "/api/cron/epp-alertas",        "schedule": "0 9 * * *" },
    { "path": "/api/cron/epp-reporte-semanal", "schedule": "0 8 * * 1" }
  ]
}
```

Add the new cron entry (06:00 UTC = 01:00 ET / varies by zone):

```json
{
  "crons": [
    { "path": "/api/cron/epp-alertas",             "schedule": "0 9 * * *" },
    { "path": "/api/cron/epp-reporte-semanal",     "schedule": "0 8 * * 1" },
    { "path": "/api/cron/documentos-vencidos",     "schedule": "0 6 * * *" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: vercel cron documentos-vencidos diario a las 06:00 UTC"
```

---

### Task 5: Server Actions — notificaciones

**Files:**
- Create: `lib/actions/notificaciones.ts`

- [ ] **Step 1: Write the actions**

```typescript
// lib/actions/notificaciones.ts
'use server'

import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/lib/supabase/tenant-context'

export type NotificacionReceptor = {
    id: string
    tenant_id: string
    tipo_correo: string
    email: string
    nombre: string
    frecuencia: string
    dia_semana: number | null
    is_active: boolean
    created_at: string
}

export async function getNotificacionesReceptores(): Promise<NotificacionReceptor[]> {
    const { client, tenantId } = await getTenantContext()
    if (!client || !tenantId) return []

    const { data } = await client
        .from('notificaciones_receptores')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('tipo_correo')
        .order('nombre')

    return (data ?? []) as NotificacionReceptor[]
}

export async function createNotificacionReceptor(input: {
    tipo_correo: string
    email: string
    nombre: string
    frecuencia: string
    dia_semana?: number | null
}): Promise<{ success: boolean; message?: string }> {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient.from('notificaciones_receptores').insert({
        tenant_id: tenantId,
        tipo_correo: input.tipo_correo,
        email: input.email.toLowerCase().trim(),
        nombre: input.nombre.trim().toUpperCase(),
        frecuencia: input.frecuencia,
        dia_semana: input.frecuencia === 'SEMANAL' ? (input.dia_semana ?? null) : null,
    })

    if (error) return { success: false, message: error.message }
    revalidatePath('/configuracion/notificaciones')
    return { success: true }
}

export async function deleteNotificacionReceptor(id: string): Promise<{ success: boolean; message?: string }> {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('notificaciones_receptores')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }
    revalidatePath('/configuracion/notificaciones')
    return { success: true }
}

export async function toggleNotificacionReceptor(id: string, is_active: boolean): Promise<{ success: boolean }> {
    const { adminClient, tenantId } = await getTenantContext()
    if (!adminClient || !tenantId) return { success: false }

    await adminClient
        .from('notificaciones_receptores')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    revalidatePath('/configuracion/notificaciones')
    return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/notificaciones.ts
git commit -m "feat: server actions CRUD notificaciones_receptores"
```

---

### Task 6: Management Page — /configuracion/notificaciones

**Files:**
- Create: `app/(dashboard)/configuracion/notificaciones/page.tsx`
- Create: `components/notificaciones/receptores-table.tsx`
- Create: `components/notificaciones/add-receptor-dialog.tsx`

**`page.tsx`** is a Server Component that fetches and passes data. The table and dialog are Client Components.

- [ ] **Step 1: Write the page**

```typescript
// app/(dashboard)/configuracion/notificaciones/page.tsx
import { getNotificacionesReceptores } from '@/lib/actions/notificaciones'
import { ReceptoresTable } from '@/components/notificaciones/receptores-table'
import { AddReceptorDialog } from '@/components/notificaciones/add-receptor-dialog'

export default async function NotificacionesPage() {
    const receptores = await getNotificacionesReceptores()

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Notificaciones</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Receptores de correos automáticos del sistema
                    </p>
                </div>
                <AddReceptorDialog />
            </div>
            <ReceptoresTable receptores={receptores} />
        </div>
    )
}
```

- [ ] **Step 2: Write ReceptoresTable**

```typescript
// components/notificaciones/receptores-table.tsx
'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { deleteNotificacionReceptor, toggleNotificacionReceptor } from '@/lib/actions/notificaciones'
import type { NotificacionReceptor } from '@/lib/actions/notificaciones'

const TIPO_LABELS: Record<string, string> = {
    DOCUMENTOS_MAQUINARIA_VENCIDOS: 'Maquinaria Vencidos',
    DOCUMENTOS_PERSONAL_VENCIDOS: 'Personal Vencidos',
}

const DIA_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function ReceptoresTable({ receptores }: { receptores: NotificacionReceptor[] }) {
    const [isPending, startTransition] = useTransition()

    function handleDelete(id: string) {
        startTransition(async () => {
            await deleteNotificacionReceptor(id)
        })
    }

    function handleToggle(id: string, current: boolean) {
        startTransition(async () => {
            await toggleNotificacionReceptor(id, !current)
        })
    }

    if (receptores.length === 0) {
        return (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                No hay receptores configurados. Agrega uno con el botón de arriba.
            </div>
        )
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo Notificación</TableHead>
                        <TableHead>Frecuencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {receptores.map(r => (
                        <TableRow key={r.id} className={!r.is_active ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">{r.nombre}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                    {TIPO_LABELS[r.tipo_correo] ?? r.tipo_correo}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                                {r.frecuencia === 'SEMANAL' && r.dia_semana !== null
                                    ? `Semanal · ${DIA_LABELS[r.dia_semana]}`
                                    : 'Diaria'}
                            </TableCell>
                            <TableCell>
                                <button
                                    onClick={() => handleToggle(r.id, r.is_active)}
                                    disabled={isPending}
                                    className={`text-xs font-semibold px-2 py-1 rounded ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    {r.is_active ? 'Activo' : 'Inactivo'}
                                </button>
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isPending}
                                    onClick={() => handleDelete(r.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
```

- [ ] **Step 3: Write AddReceptorDialog**

```typescript
// components/notificaciones/add-receptor-dialog.tsx
'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createNotificacionReceptor } from '@/lib/actions/notificaciones'

const TIPOS = [
    { value: 'DOCUMENTOS_MAQUINARIA_VENCIDOS', label: 'Maquinaria — Documentos Vencidos' },
    { value: 'DOCUMENTOS_PERSONAL_VENCIDOS',   label: 'Personal — Documentos Vencidos' },
]

const DIAS = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sábado' },
]

export function AddReceptorDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        tipo_correo: 'DOCUMENTOS_MAQUINARIA_VENCIDOS',
        email: '',
        nombre: '',
        frecuencia: 'DIARIA',
        dia_semana: '1',
    })
    const [error, setError] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        startTransition(async () => {
            const res = await createNotificacionReceptor({
                tipo_correo: form.tipo_correo,
                email: form.email,
                nombre: form.nombre,
                frecuencia: form.frecuencia,
                dia_semana: form.frecuencia === 'SEMANAL' ? Number(form.dia_semana) : null,
            })
            if (!res.success) {
                setError(res.message ?? 'Error al guardar')
                return
            }
            setOpen(false)
            setForm({ tipo_correo: 'DOCUMENTOS_MAQUINARIA_VENCIDOS', email: '', nombre: '', frecuencia: 'DIARIA', dia_semana: '1' })
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Agregar Receptor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Nuevo Receptor de Notificaciones</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <Label>Tipo de Notificación</Label>
                        <Select value={form.tipo_correo} onValueChange={v => setForm(f => ({ ...f, tipo_correo: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Nombre (para el saludo)</Label>
                        <Input
                            placeholder="JUAN"
                            value={form.nombre}
                            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <Label>Email</Label>
                        <Input
                            type="email"
                            placeholder="juan@empresa.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <Label>Frecuencia</Label>
                        <Select value={form.frecuencia} onValueChange={v => setForm(f => ({ ...f, frecuencia: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DIARIA">Diaria</SelectItem>
                                <SelectItem value="SEMANAL">Semanal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {form.frecuencia === 'SEMANAL' && (
                        <div>
                            <Label>Día de la semana</Label>
                            <Select value={form.dia_semana} onValueChange={v => setForm(f => ({ ...f, dia_semana: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {DIAS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/configuracion/notificaciones/page.tsx \
        components/notificaciones/receptores-table.tsx \
        components/notificaciones/add-receptor-dialog.tsx
git commit -m "feat: página /configuracion/notificaciones — gestión de receptores de correos"
```

---

### Task 7: Add Menu Entry

**Files:**
- Modify: `lib/config/menu.ts`

- [ ] **Step 1: Read lib/config/menu.ts and add the entry under the Configuración section**

Find the block where `configuracion` or `settings` items live (look for existing items like `/settings` or `/configuracion`). Add:

```typescript
{ name: 'Notificaciones', href: '/configuracion/notificaciones' },
```

as a child under the Configuración parent item (or wherever `/settings/` items are grouped). The exact insertion point depends on the current structure — search for `configuracion` or `settings` in the file and add the child there.

If the menu uses `recurso` for permission gating, add `recurso: '/configuracion/notificaciones'` to the parent group and register the resource in `sistema_recursos` via a migration if needed (follow the existing RLS/menu pattern for the project).

- [ ] **Step 2: Commit**

```bash
git add lib/config/menu.ts
git commit -m "feat: menu entry Notificaciones bajo Configuración"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Daily cron at 6 AM → Task 3 + Task 4 (`"0 6 * * *"`)
- [x] Update expired docs estado='VENCIDO' → Task 3 (maquinaria_documentos UPDATE)
- [x] Send email after update → Task 3 (sendEmail loop)
- [x] notificaciones_receptores table → Task 1
- [x] Fields: UUID, tenant_id, tipo_correo, email, nombre, frecuencia, dia_semana → Task 1
- [x] Seed CISE + GRUAS with info@reporta.la / EDWIN → Task 1
- [x] Types: DOCUMENTOS_MAQUINARIA_VENCIDOS, DOCUMENTOS_PERSONAL_VENCIDOS → Task 1
- [x] Email greeting by name ("Hola JUAN") → Task 2 (renderMaquinariaVencidosEmailHtml uses `nombre`)
- [x] Two sections: ⚠️ Vencidos + ⏰ Por Vencer (15 days) → Task 2
- [x] CTA button to system → Task 2
- [x] Management page in menu → Task 6 + Task 7
- [x] CRUD on receptores → Task 5

**No placeholder steps:** All steps include complete code.

**Type consistency:** `NotificacionReceptor` exported from `lib/actions/notificaciones.ts` and imported in both client components. `DocMaquinariaRow` / `DocPersonalRow` exported from template file and imported in cron route.
