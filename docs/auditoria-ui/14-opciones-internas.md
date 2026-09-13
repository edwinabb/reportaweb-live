# 14 — Opciones Internas (Sistema + Sistema de Superadmin)

**Fecha:** 2026-09-13
**Módulo:** 15/15 del roadmap original (`RETRO-PILOTO-2026-07-14.md`)
**Tenant Bubble a auditar:** GRUAS (`reporta.la`, usuario `edwinb@reporta.la`)
**Fuente de datos:** Supabase PROD `fqwhagryqkkhbgznxtwf` vía MCP, 2026-09-13
**Fuente de UI reportaweb3:** código en `master` (`af6c149`), no se levantó dev local
**Fuente de UI Superadmin:** `C:\Proyectos\reporta-admin` `master` local (`ec57021`)
**Estado:** 🟡 **EN CURSO** — lado reportaweb3 + Superadmin inventariado por código y datos; lado Bubble pendiente (ver DUDA OI-01)

---

## Resumen ejecutivo

"Opciones Internas" de Bubble hoy vive repartido en **dos apps**: la sección **Sistema** del sidebar de reportaweb3 (5 ítems para `reporta_admin`, 2 para `admin_tenant`) y el **Sistema de Superadmin** (`reporta-admin`, 2 módulos: Plantillas de sistema y Formatos cross-tenant, con PIN). Ambos lados están construidos y con auth por rol verificada en código. La comparación 1:1 contra Bubble **no se pudo hacer todavía** porque no hay acceso a Bubble en esta sesión y no existe ningún documento del repo que liste qué contiene "Opciones Internas" en Bubble.

Sin Bubble, los datos ya muestran **3 hallazgos**: 24 tenants basura activos en PROD que contaminan el selector de Tenant y el listado de Onboarding (TK-OI1), un tenant INGEM activo sin usuarios de origen desconocido (DUDA OI-04), y `system_document_templates` + bucket `system-templates` en 0 (ya registrado en `TECHNICAL_DEBTS.md`, no es hallazgo nuevo, pero bloquea el módulo Plantillas del Superadmin a nivel funcional).

---

## Alcance (corrección 2026-09-09 del plan)

Este módulo se audita contra **dos** destinos, no uno:

| Destino | Ruta | Quién lo ve | Estado |
|---|---|---|---|
| Sistema (reportaweb3) | `/sistema/*` + shortcut `/formatos` | `reporta_admin` (todo) · `admin_tenant` (solo Permisos + Formatos) | En PROD (código), sin uso real aún |
| Sistema de Superadmin | `reporta-admin` → `/templates/*`, `/formatos/*` | Solo `reporta_admin` (1 usuario en PROD) | Solo local, repo sin remoto, sin deploy (`sadm.reportar.app` futuro) |

---

## 1. Sistema (reportaweb3)

### 1.1 Inventario de sub-páginas

Fuente: `components/dashboard/sidebar.tsx:256-267` (ítems hardcodeados, NO vienen de `sistema_recursos`), páginas en `app/(dashboard)/sistema/`.

| Ítem sidebar | Ruta | Rol | Qué hace | Opciones de página (regla de exhaustividad) |
|---|---|---|---|---|
| Gestión | `/sistema` | `reporta_admin`, `admin_tenant` | Home de Sistema: banner de tenant activo + cards (Tenant / Permisos / Onboarding) | Cards con botón; sin filtros, sin export |
| Tenant | `/sistema/tenant` | solo `reporta_admin` | Selector de empresa activa (cookie `managed_tenant_id`) | Grid de cards con logo/RUC + botón "Seleccionar"; **sin buscador, sin filtro, sin paginación** (ver TK-OI1) |
| Permisos | `/sistema/permisos` | `reporta_admin`, `admin_tenant` | Permisos por Cargo: matriz cargo × recurso (`cargo_permisos` ↔ `sistema_recursos`) | Select de cargo + toggles; auto-seed si el cargo no tiene filas |
| Onboarding | `/sistema/onboarding` | solo `reporta_admin` | Listado de tenants con estado de onboarding + tabla de trials | Botón "Nuevo"; wizard de 6 pasos (Empresa · Usuarios · Terceros · Maquinaria · Servicios · Config) en `/sistema/onboarding/[tenantId]`, alta en `/sistema/onboarding/nuevo` |
| Formatos | `/formatos` | ambos | Shortcut al módulo ya auditado en `09-formatos.md` | Fuera de alcance acá |

**Observaciones de código (no son gaps hasta comparar con Bubble):**

- El breadcrumb del header (`components/dashboard/header.tsx:61-62`) solo conoce `/sistema/permisos`; Tenant y Onboarding muestran "Sistema" genérico.
- `/sistema/onboarding` redirige a `/planificacion` si no es `reporta_admin`; el resto de Sistema redirige a `/`. Inconsistente pero inocuo.
- `sistema_recursos` tiene 15 rutas base y todas existen como carpeta en `app/(dashboard)/` (incluida `/inspecciones`). ✅

### 1.2 Cobertura de datos (PROD)

| Tabla | Filas | Detalle | Regla 5 |
|---|---|---|---|
| `companies` | 27 activas | 2 reales (CISE 109 usuarios, GRUAS 237) + INGEM (0 usuarios, 2026-05-13) + **24 trials basura** (0 usuarios, creadas 2026-06-04 a 06-07: "Demo Trial Company S.A.C." ×21, "Empresa" ×2, "Tu Empresa") | 🔴 ver TK-OI1 |
| `profiles` rol `reporta_admin` | 1 | El usuario único del Superadmin | ✅ |
| `sistema_recursos` | 15 | Coincide con rutas reales | ✅ |
| `cargo_permisos` | CISE 32 · GRUAS 15 | Ambos tenants reales con permisos configurados | ✅ (cobertura por cargo no verificada contra Bubble) |
| `formatos` | 6 en 2 tenants | Auditado en `09-formatos.md` | — |

---

## 2. Sistema de Superadmin (`reporta-admin`)

### 2.1 Inventario de sub-páginas

Fuente: `app/**/page.tsx` del repo, nav en `app/layout.tsx:25-28`. Middleware exige `role = 'reporta_admin'` en toda la app salvo `/login`.

| Nav | Ruta | Qué hace | Opciones de página |
|---|---|---|---|
| — | `/login` | Email + password | — |
| — | `/` | Home mínimo | — |
| Plantillas de sistema | `/templates` | Listado de plantillas `.docx` por tenant/tipo/versión | Columnas: Tenant · Tipo · Versión · Activa · Creado · Actualizado · Acciones (descargar / activar). Botones "Copiar desde otro tenant" y "Nueva". **Sin filtro por tenant, sin buscador** |
| | `/templates/nueva` | Subir `.docx` (tenant, tipo, versión) | Formulario |
| | `/templates/copiar` | Duplicar set activo de un tenant a otro | Formulario |
| Formatos | `/formatos` | Listado cross-tenant de formatos de inspección | Columnas: Tenant · Código · Nombre · Versión actual · Estado · Preguntas · Versiones · Informes · Activo · Acciones. Botón "Nuevo". **Sin filtro por tenant, sin buscador** |
| | `/formatos/verificar` | PIN de 6 dígitos por email (Resend), cookie de sesión `formatos_verified` | Verificar / Reenviar |
| | `/formatos/nueva`, `/formatos/[id]`, `/formatos/[id]/versiones/nueva`, `/formatos/[id]/versiones/[versionId]` | CRUD completo (ver plan `2026-09-10-formatos-reporta-admin.md`) | Editor de preguntas/opciones con subir/bajar |

### 2.2 Cobertura de datos (PROD)

| Tabla / bucket | Filas | Estado |
|---|---|---|
| `system_document_templates` | **0** | 🔴 Módulo Plantillas sin datos. Ya registrado en `TECHNICAL_DEBTS.md` (sección reporta-admin, "Poblar system_document_templates"): falta origen de 5 de los 6 `.docx`. El bridge de PDF para Bubble (`lib/bubble-docx-pdf.ts`) lanza `BubbleTemplateNotFoundError` para todo, pero **no está en uso**: `pdf_jobs` tiene 0 filas en PROD, Bubble sigue con docmaker. No es incidente, es Fase 0 sin activar. |
| bucket `system-templates` | 0 objetos | Idem |
| `admin_formatos_pin` | 0 | Consistente: el PIN nunca se probó en vivo (key de Resend inválida, 401) |
| `formatos` (cross-tenant) | 6 en 2 tenants | ✅ visible vía RLS de PR #4/#5 |

---

## 3. Gaps y tickets

| ID | Severidad | Descripción | Acción |
|---|---|---|---|
| TK-OI1 | **ALTA** (higiene de datos) | 24 `companies` basura activas en PROD con `trial_status='active'`, 0 usuarios, creadas 2026-06-04/07 (residuo de pruebas del flujo de trial del Growth Engine; no hay fixture en `tests/` ni `scripts/` que las nombre). Aparecen como 24 cards en `/sistema/tenant` y 24 filas en `/sistema/onboarding`, y cuentan para cualquier métrica de trials. | Confirmar con el usuario (DUDA OI-03) y borrar en PROD con el patrón dry-run → conteo → aplicar → conteo. Después: agregar buscador/filtro al selector de Tenant solo si el volumen real lo justifica (hoy son 3). |
| TK-OI2 | MEDIA | `/sistema/tenant` y `/sistema/onboarding` no aplican el estándar v1.2 de listados (sin buscador multicampo, sin embudos, sin paginación). Con 3 tenants reales no bloquea; se vuelve problema con el Growth Engine. | Diferir hasta que haya >10 tenants reales. Registrar en `docs/UI-TEMPLATE-LISTADOS.md` como excepción consciente. |
| TK-OI3 | MEDIA | Superadmin `/templates` y `/formatos` sin filtro por tenant ni buscador. Mismo razonamiento que TK-OI2. | Diferir, misma condición. |
| TK-OI4 | BAJA | Breadcrumb genérico "Sistema" para Tenant y Onboarding (`header.tsx`). | Agregar 2 entradas al mapa manual. |
| TK-OI5 | BAJA | Redirect inconsistente al fallar rol (`/planificacion` en Onboarding vs `/` en el resto). | Unificar a `/`. |
| — | (ya en deudas) | `system_document_templates` vacía + 5 `.docx` sin origen; PIN sin probar por key de Resend inválida; repo `reporta-admin` sin remoto ni deploy. | Ver `TECHNICAL_DEBTS.md` y plan `2026-09-10-formatos-reporta-admin.md` § Pendiente para el usuario. No se duplican acá. |

---

## 4. DUDAs

| ID | Pregunta | Resolución |
|---|---|---|
| OI-01 | ¿Cómo hacemos el lado Bubble? (a) el usuario navega "Opciones Internas" en Bubble y pasa screenshots a `c:/tmp/screenshots/reportar/14 opciones internas/`, o (b) comparte credenciales para usar Playwright. Misma pregunta abierta desde el plan del 2026-09-09. | |
| OI-02 | ¿Qué contiene exactamente "Opciones Internas" en Bubble? No hay ningún doc del repo que lo liste. Hipótesis a confirmar: selector de empresa, gestión de plantillas docmaker, permisos, alta de empresas. Cada ítem de Bubble hay que mapearlo a Sistema **o** a Superadmin, no asumir un solo lado. | |
| OI-03 | ¿Se borran las 24 empresas trial basura de PROD? Son `DELETE` sobre `companies` (con cascada a lo que tengan colgado, hoy 0 usuarios). | |
| OI-04 | ¿INGEM (activa, 0 usuarios, creada 2026-05-13) es un tenant real en espera o un residuo? Si es real, ¿por qué no tiene usuarios? | |
| OI-05 | Permisos por Cargo: ¿en Bubble existía un equivalente (permisos por cargo o por usuario)? Define si `cargo_permisos` de CISE/GRUAS hay que validarlos contra algo o son configuración nueva del sistema v3 (Regla 4: mejora sin equivalente = ✅ directo). | |

---

## 5. Cierre

Pendiente. Regla 7: no se cierra hasta que las 5 DUDAs tengan resolución escrita y la comparación contra Bubble esté hecha (o documentada como "confirmado por código y datos, no verificado en vivo" según Regla 6, si el usuario lo acepta).

**Confirmado sin Bubble (2026-09-13):** inventario completo de ambos lados, auth por rol en cada página, tablas de soporte con datos coherentes en los 2 tenants reales, y los 3 hallazgos de datos de arriba.
