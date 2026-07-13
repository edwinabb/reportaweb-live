---
name: Avance ejecución 2026-05-03 (v3.7.1 — Oleadas 1 y 2)
description: Oleadas 1 y 2 completadas en v3.7.1: Fases 1, 2, 3, 4, 8, 9 implementadas. Estado actual y plan Oleada 3.
type: project
---

## v3.7.1 — Oleadas 1 y 2 completadas (2026-05-03)

**Commit:** `86cf07d` · **Deploy Vercel preview:** https://reportaweb3-1xwq88jjt-andesai.vercel.app

### Oleada 1 — Fases 1, 3, 8 ✅

**Fase 1 — Informe Personal form** (`components/reportes/reporte-personal-form.tsx`)
- Datepicker Popover+Calendar con modifiers festivos (amber) — carga desde `lib/actions/festivos.ts`
- `esDomingoOFestivo` = domingo (`getDay===0`) OR fecha en `festivosMap`
- Auto-calc horas con `calcularHoras()` de `lib/utils/calcular-horas.ts` via `useEffect` — campos `total_horas`, `horas_extras`, `horas_extras_extraordinarias`, `horas_dominicales` son readOnly + bg-gray-100
- Bloque descanso compensatorio (toggle + datepicker condicional)
- Payload incluye `es_domingo_o_festivo`, `tiene_descanso_compensatorio`, `fecha_descanso_compensatorio`

**Fase 3 — Informe Maquinaria auto-calc** (`components/reportes/reporte-maquinaria-form.tsx`)
- Import `duracionJornada` de `calcular-horas.ts`
- `useEffect` watch: jornada1/2/3 inicio+fin + horas_recorrido + tipo_recorrido
- Total = suma duracionJornada(turnos activos) + recorrido (si tipo_recorrido ≠ 'NO_APLICA')
- `total_horas` readOnly

**Fase 8 — Planificación festivos** 
- `lib/actions/festivos.ts`: `getFestivosForTenant()` y `getFestivosInRange(start, end)` — lookup por `companies.ubicacion_pais` → `app_calendario_festivos`
- `resource-timeline.tsx`: prop `festivos?: Festivo[]` → columnas festivos/domingos en ámbar (header bg-amber-50, texto amber-700, nombre festivo bajo día)
- `app/(dashboard)/planificacion/page.tsx`: carga festivos en paralelo con tareas/recursos
- `nueva-tarea-form.tsx`: modifiers festivos en Calendar (bg-amber-100 text-amber-800)

### Oleada 2 — Fases 2, 4, 9 ✅

**Fase 2 — PDF Informe Personal** (`app/api/reportes-personal/[id]/pdf/route.ts`)
- Joins: `personal:profiles!reportes_personal_personal_id_fkey`, `tercero_personal:terceros_personal!...`, `creado_por:profiles!...`
- Carga `tareas` + company + `config_informe_personal` en paralelo
- Construye `ReportePersonalPdfData` → `renderReportePersonalHtml()` → `renderPdfFromHtml()`
- Upload a `formatos` bucket: `reportes-personal/{tenantId}/{year}/{month}/rp-{id8}.pdf`
- Actualiza `reportes_personal.pdf_url`

**Fase 4 — PDF Informe Maquinaria** (`app/api/reportes-maquinaria/[id]/pdf/route.ts`)
- Joins: `maquinaria:maquinarias!...`, `operador/rigger1/rigger2:profiles!...`, `creado_por:profiles!...`
- Mismo patrón que Fase 2
- Storage: `reportes-maquinaria/{tenantId}/{year}/{month}/rm-{id8}.pdf`

**Fase 9 — Settings Notificaciones** 
- `lib/actions/notificaciones-config.ts`: `getEppNotifConfig()` + `updateEppNotifConfig(userIds[])` → `companies.epp_notificar_observaciones_a`
- `components/settings/epp-notif-form.tsx`: 'use client', checkboxes usuarios (admin_tenant/supervisor/reporta_admin), useTransition
- `app/(dashboard)/settings/notificaciones/page.tsx`: server component, carga config + profiles en paralelo

**Botones PDF en tarea-detail-dialog** (`components/tareas/tarea-detail-dialog.tsx`)
- Icono `FileDown` en cada fila de reporte Personal y Maquinaria
- Link `<a href="/api/reportes-personal/{id}/pdf" target="_blank">` — abre PDF en nueva pestaña

---

## Pendiente — Oleada 3 (próxima sesión)

**Fase 5 — Checklist form** (puede ir en paralelo con Fase 7)
- Formulario llenado checklist: respuestas SI/NO/NO-APLICA por ítem, puntaje calculado automáticamente
- Al marcar NO → crear plan de acción automáticamente
- Tabla `inspecciones` (llenados) + `respuestas_inspeccion`
- Ref: `docs/plan-web.md` Fase 5

**Fase 7 — EPP badges + panel + Resend** (puede ir en paralelo con Fase 5)
- Badges de estado por ítem (`estado_item`) en `/epp/colaborador/[id]`
- Panel observaciones parcial
- Notificaciones Resend cuando operario confirma con ítems observados → `epp_notificar_observaciones_a`
- Ref: `docs/plan-web.md` Fase 7

**Fase 6 — PDF Checklist** (depende de Fase 5)
- Gotenberg, template HTML para checklist llenado
- Ref: `docs/plan-web.md` Fase 6

**Why:** Oleadas 3-5 son el cierre del ciclo web pre-app-móvil.
**How to apply:** Al iniciar Oleada 3, arrancar Fase 5 y Fase 7 en paralelo como primera acción.
