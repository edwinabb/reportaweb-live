# Auditoría UI ↔ Datos — 09 · Gestión Formatos

**Fecha:** 2026-09-10 · **Módulo 8/15** (roadmap original, ver `00-sidebar.md` fila 10, DUDA D-02)
**Fuente datos:** `mcp__claude_ai_Supabase__execute_sql` contra PROD (`fqwhagryqkkhbgznxtwf`)
**Fuente UI:** código en `app/(dashboard)/formatos/**`, `components/formatos/**`, `lib/actions/formatos.ts` (dev local)

> **Nota de alcance:** sin sesión en vivo contra Bubble. El hallazgo y cierre de este módulo vino de DUDA D-02 (`00-sidebar.md`, abierta desde 2026-07-14) más un pedido explícito del usuario de extender la gestión de Formatos a `reporta-admin` (Sistema de Superadmin) — no de una comparación 1:1 de pantallas contra Bubble.

## Resumen Ejecutivo

El módulo (catálogo de plantillas de inspección/checklist: `formatos` → `formatos_versiones` → `formatos_preguntas` → `formatos_opciones`) ya existía y funcionaba en reportaweb3 antes de esta sesión — no era un gap de datos ni de construcción, sino de **visibilidad**: DUDA D-02 preguntaba si debía ser visible para usuarios de tenant (como en Bubble) o quedarse solo en Sistema/admin. Resuelto: sí, visible para `admin_tenant` (PR #3). Además, a pedido del usuario, se construyó gestión cross-tenant completa desde el Sistema de Superadmin (repo `reporta-admin`), con una capa extra de verificación por PIN — ver `docs/superpowers/plans/2026-09-10-formatos-reporta-admin.md` para el detalle completo de esa pieza (RLS, PIN, CRUD).

## Datos

Sin gap de datos — `formatos`/`formatos_versiones`/`formatos_preguntas`/`formatos_opciones` no tienen un flujo de migración desde Bubble activo en este módulo (son plantillas gestionadas nativamente en v3, `bubble_id` presente en el schema pero no es el foco de este cierre).

## UI — DUDA D-02 y su resolución

| Pregunta | Antes | Ahora |
|---|---|---|
| ¿"Gestión Formatos" visible para usuarios de tenant, como en Bubble? | ❌ Solo aparecía en el sidebar dentro de "Sistema" (`reporta_admin`). La ruta `/formatos` existía y funcionaba, pero sin ningún link visible para `admin_tenant`, y **sin guard real** — cualquier autenticado podía entrar por URL directa. | ✅ Agregada al menú principal (`lib/config/menu.ts`, sección Recursos) — ya tenía fila en `sistema_recursos` (orden 8, junto a Terceros/Maquinaria/Usuarios), solo faltaba el ítem de menú. PR [#3](https://github.com/edwinabb/reportaweb3/pull/3), mergeado. |
| ¿Gestión cross-tenant desde el Sistema de Superadmin? | No existía nada equivalente (el repo `reporta-admin` solo tenía `/templates`, un concepto distinto — `system_document_templates`, plantillas de documento, no de checklist). | ✅ Construido: RLS cross-tenant (PRs [#4](https://github.com/edwinabb/reportaweb3/pull/4)/[#5](https://github.com/edwinabb/reportaweb3/pull/5)), PIN de verificación por email, CRUD completo (listado/alta/detalle/editor de versión). Detalle completo, incluido un incidente de seguridad durante la construcción (contenido, revocado, verificado), en `docs/superpowers/plans/2026-09-10-formatos-reporta-admin.md`. |

## Gaps y tickets

| ID | Severidad | Descripción | Acción | Estado |
|---|---|---|---|---|
| TK-F1 (= DUDA D-02) | Media | Formatos no visible para tenant admins, sin guard real en la ruta | Agregado al menú principal | ✅ Cerrado |

## DUDAs

Ninguna abierta (D-02 resuelta).

## Cierre

🟢 **Cerrado 2026-09-10.** PR #3 mergeado (visibilidad reportaweb3). La pieza de Sistema de Superadmin sigue su propio seguimiento en `docs/superpowers/plans/2026-09-10-formatos-reporta-admin.md` (pendientes: key de Resend, prueba en vivo, decisión sobre rotar service-role key) — no bloquea el cierre de este módulo del roadmap de auditoría UI, que es específicamente sobre reportaweb3.
