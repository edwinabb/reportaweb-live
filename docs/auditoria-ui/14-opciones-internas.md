# 14 — Opciones Internas (Sistema + Sistema de Superadmin)

**Fecha:** 2026-09-13
**Módulo:** 15/15 del roadmap original (`RETRO-PILOTO-2026-07-14.md`)
**Tenant Bubble auditado:** GRUAS (`reporta.la`, usuario `edwinb@reporta.la`, sesión Playwright en vivo)
**Fuente de datos:** Supabase PROD `fqwhagryqkkhbgznxtwf` vía MCP, 2026-09-13
**Fuente de UI reportaweb3:** código en `master`, no se levantó dev local
**Fuente de UI Superadmin:** `C:\Proyectos\reporta-admin` `master` local (`ec57021`)
**Screenshots:** `docs/auditoria-ui/screenshots/14-opciones-internas/` (9 capturas)
**Estado:** 🟢 **CERRADO** — las 4 DUDAs resueltas por el usuario (2026-09-13); TK-OI6 (mapeo de roles) ejecutado y verificado en PROD; TK-OI7 (numeración de cotizaciones) tiene plan de implementación listo (`docs/superpowers/plans/2026-09-13-tk-oi7-numeracion-cotizaciones.md`), pendiente ejecutar — no bloquea el cierre de esta auditoría

---

## Resumen ejecutivo

"Opciones Internas" de Bubble tiene 7 ítems; el usuario definió auditar 3 (Empresas Interno, Usuarios Interno, Informes Interno) y descartar 4 (API, Blog, Videos, Cerrar Sesiones). En reportaweb3 eso vive repartido en **dos apps**: la sección **Sistema** del sidebar (5 ítems para `reporta_admin`) y el **Sistema de Superadmin** (`reporta-admin`, Plantillas + Formatos cross-tenant).

Paridad funcional: **Empresas Interno ≈ 90%** (5 de 6 tabs cubiertos por Sistema + Configuración + Onboarding; el gating de módulos por tenant del tab 2 se acepta cubierto por permisos por cargo, OI-06 resuelto). **Usuarios Interno = reorganizado, aceptado** (v3 no tiene listado cross-tenant, se cambia de tenant y se usa Usuarios; OI-07 resuelto: sí). **Informes Interno: no verificable**, en Bubble la página nunca carga — el usuario pidió no seguir insistiendo (OI-08 resuelto: no cargarlo).

**Dos hallazgos de datos ALTA** que no son de UI y salieron de esta comparación:
- **TK-OI6 (🟢 cerrado 2026-09-13):** el perfil de Bubble nunca se había mapeado a `profiles.role`. Corregido: 18 usuarios (AdminEmpresa/AdminSistema) pasaron a `admin_tenant` y 1 (Gestor) a `supervisor`, aplicado en PROD y verificado por conteo (CISE 8 admin_tenant, GRUAS 11 admin_tenant + 1 supervisor + 1 reporta_admin intacto). Colaborador/Integrante ya eran `member`, sin cambio. Proveedor: 0 usuarios reales hoy, sin código pendiente.
- **TK-OI7 (🟡 plan listo):** la numeración de cotizaciones de v3 no continúa la de Bubble (formato distinto, `companies_consecutives` sin usar). Formato confirmado por el usuario: `CT-XXXX-YYYY`. Plan de implementación en `docs/superpowers/plans/2026-09-13-tk-oi7-numeracion-cotizaciones.md`.

Además se ejecutó la limpieza autorizada: **25 tenants residuales borrados de PROD** (24 trials basura + INGEM), quedan solo CISE y GRUAS.

---

## Alcance

| Destino | Ruta | Quién lo ve | Estado |
|---|---|---|---|
| Bubble → Opciones Internas | menú lateral, último ítem | AdminSistema | 7 sub-ítems, 3 en alcance |
| Sistema (reportaweb3) | `/sistema/*` + shortcut `/formatos` | `reporta_admin` (todo) · `admin_tenant` (Permisos + Formatos) | En PROD (código), sin uso real |
| Sistema de Superadmin | `reporta-admin` → `/templates/*`, `/formatos/*` | Solo `reporta_admin` (1 usuario) | Solo local, repo sin remoto, deploy futuro `sadm.reportar.app` |

---

## 1. Empresas Interno (Bubble `/empresas`)

### 1.1 Listado

| Bubble | reportaweb3 | Status | Nota |
|---|---|---|---|
| Buscador (texto libre) | `/sistema/tenant`: sin buscador | 🟡 TK-OI2 | Con 2 tenants reales no bloquea |
| Botón "Nueva Empresa" | `/sistema/onboarding/nuevo` (wizard 6 pasos) | ✅ mejora | El wizard de v3 crea empresa + usuarios + terceros + maquinaria + servicios + config |
| Card por empresa: nombre, RUC, dirección | Card: nombre, logo, RUC | ✅ | |
| Botón 1 (editar, 6 tabs) | Ver 1.2 | ver abajo | |
| Botón 2 (ver, solo lectura) | No existe vista solo-lectura | ⚪ | Innecesario en v3: el mismo `reporta_admin` edita |
| 22 empresas listadas | 2 tenants (tras limpieza) | ✅ | Regla del proyecto: solo CISE y GRUAS migran |

### 1.2 Formulario de empresa (6 tabs, capturas 02-07)

| Tab Bubble | Contenido | Equivalente reportaweb3 | Status |
|---|---|---|---|
| 1. Información general | RUC, nombre, email, teléfono, web, dirección, ciudad, país, logo | `companies.*` (todas las columnas existen) editable en Onboarding paso Empresa y en Configuración → Empresa | ✅ |
| 2. Módulos del sistema | 20 toggles por tenant en 4 grupos (Reporta.la / Alquiler de maquinaria / Bases de datos / Otros). GRUAS: 13 on, 7 off (Formatos, Sensores, Ejecución, Seguimiento, Proyectos, Inventario, COVID-19) | **No existe gating por tenant.** v3 gatea por **cargo** (`cargo_permisos` × `sistema_recursos`, 15 recursos) en `/sistema/permisos`. `companies` no tiene columnas de módulos | ✅ **Resuelto (OI-06): permisos por cargo cubre el caso** — el usuario confirmó que no hace falta gating adicional a nivel empresa |
| 3. Catálogos del sistema | 12 listas (Áreas, Cargos, Formas de Pago, Monedas, Nombres de Mínimos-Precios, Nombres de Precios, Plazos de Pago, Productos y Servicios, Rubros, Tipos de Servicios, Tipos de Sitios, Unidades de Tiempo) + correlativos de Cotización / O.T. / Informe PDF (prefijo, secuencia, sufijo) | Listas: todas existen como tablas por tenant y se gestionan en **Configuración** (auditado en `05-configuracion.md`). Correlativos: `companies_consecutives` existe pero **vacía de valor** (COTIZACION, prefijo ∅, último 0) y **ningún código la lee** — el fix de TK-OI7 no usa esta tabla, calcula el máximo real desde `cotizaciones.numero` | Listas ✅ · Correlativos 🟡 TK-OI7 (plan listo) |
| 4. Perfiles de usuarios | Dropdown con solo "CISE PERU SAC" + 3 botones "Subir datos CotizaCise / CotizaItemCise / InformeCise" | Herramienta de carga masiva de desarrollo, no funcionalidad de producto | ✅ no migrar |
| 5. Matriz de responsabilidad | CRUD de ítems (descripción corta/larga) | `actividades_matriz` (GRUAS 36 filas) gestionado en Cotizaciones/Configuración, ya auditado (`06-cotizaciones.md`) | ✅ |
| 6. Formato de cotización | Textos de aceptación/facturación/matriz, imagen de cuentas bancarias, usuario autorizado + firma | `cotizaciones_configuracion` (GRUAS 1 fila). **En Bubble GRUAS tampoco tiene imagen de banco ni firma cargadas** (placeholders vacíos, captura 07) | ✅ · residual cerrado |

### 1.3 Cobertura de datos (PROD, tras limpieza)

| Tabla | Filas | Estado |
|---|---|---|
| `companies` | **2** (CISE, GRUAS) | ✅ Limpieza 2026-09-13: 25 borradas (24 trials basura + INGEM) con sus dependencias (job_titles, terceros, servicios, tareas, configs, catálogos). Verificado 0 usuarios y 0 datos operativos reales antes de borrar |
| `companies_consecutives` | 2 (una por tenant, vacías) | 🟡 sin usar — TK-OI7 no la necesita (ver plan) |
| `actividades_matriz` GRUAS | 36 | ✅ |
| `cotizaciones_configuracion` GRUAS | 1 | ✅ |
| `sistema_recursos` | 15 | ✅ coinciden con rutas reales |
| `cargo_permisos` | CISE 32 · GRUAS 15 | ✅ configuración nueva de v3 (confirmado por el usuario, DUDA OI-05) |

---

## 2. Usuarios Interno (Bubble `/usuarios_interno`, captura 09)

| Bubble | reportaweb3 | Status | Nota |
|---|---|---|---|
| Listado **cross-tenant** de 635 usuarios, 20 por página | No existe. `reporta_admin` elige tenant en `/sistema/tenant` y usa `/users` (tenant-scoped) | ✅ Reorganizado, aceptado | El usuario confirmó (OI-07: sí) |
| Buscador "nombre completo, ID" | `/users` tiene buscador multicampo v1.2 | ✅ | |
| Dropdown inline **Empresa** por fila (mover usuario de tenant) | No existe mover usuario entre tenants | ✅ no necesario | Cubierto por la reorganización aceptada (OI-07) |
| Dropdown inline **Perfil** (AdminEmpresa · AdminSistema · Colaborador · Gestor · Integrante · Proveedor) | `profiles.role` enum `app_role`: reporta_admin · admin_tenant · supervisor · member · planner · viewer · customer. Editable en `/users` por admin | 🟢 **TK-OI6 cerrado** | Delta aplicado en PROD 2026-09-13 (ver §5) |
| Documento (DNI/CE/PTP/Cédula) | `profiles` + `profile_details` | ✅ auditado en `01-usuarios.md` | |
| Tags de equipo/proyecto (LB, NXP, ADM) | `teams` / `team_members` | ✅ | |
| Toggle activo + editar + ver + borrar | `/users`: Activos/Papelera + acciones de fila | ✅ | |
| 3 botones de toolbar (lista/tarjetas/copiar/descargar) + "Nuevo Usuario" | `/users`: XLS + Nuevo | ✅ | |

**Cobertura de roles (PROD):**

| Tenant | Roles en `profiles` |
|---|---|
| CISE | admin_tenant 1 · planner 1 · viewer 1 · member 106 |
| GRUAS | **admin_tenant 0** · reporta_admin 1 · member 236 |

En Bubble, GRUAS tiene usuarios con perfil AdminEmpresa visibles en la primera página del listado. El script `scripts/sync-fase1-usuarios.ts` no mapea el campo perfil.

---

## 3. Informes Interno

Al hacer clic en el ítem del menú, Bubble ejecuta un workflow (`/workflow/start`, `outcome: success`) pero **la página nunca termina de cargar**: overlay de carga permanente, sin navegación, esperado >2 minutos en 2 intentos. Las URLs candidatas `/informes_interno`, `/informe_interno`, `/reportes_interno`, `/informes_admin` devuelven 404. No hay equivalente en v3 (el Superadmin no tiene listado de informes cross-tenant). Se documenta como **no verificable en vivo** (Regla 6). **Resuelto (OI-08): el usuario pidió no seguir insistiendo** — se cierra sin equivalente necesario.

---

## 4. Sistema de Superadmin (`reporta-admin`) — sin equivalente directo en Bubble

| Nav | Ruta | Qué hace | Origen en Bubble |
|---|---|---|---|
| Plantillas de sistema | `/templates`, `/templates/nueva`, `/templates/copiar` | `.docx` por tenant/tipo/versión para el bridge de PDF | Reemplaza docmaker (externo a Bubble). `system_document_templates` y bucket en **0** en PROD, ya en `TECHNICAL_DEBTS.md`; el bridge no está activo (`pdf_jobs` 0 filas), no es incidente |
| Formatos | `/formatos/*` con PIN por email | CRUD cross-tenant de formatos de inspección | Bubble lo hacía desde Gestión Formatos con AdminSistema (auditado en `09-formatos.md`) |

Ambos listados sin filtro por tenant ni buscador (TK-OI3, diferido).

---

## 5. Gaps y tickets

| ID | Severidad | Descripción | Acción |
|---|---|---|---|
| TK-OI1 | ~~ALTA~~ 🟢 **Cerrado 2026-09-13** | 24 `companies` trial basura + INGEM (residuo confirmado por el usuario) en PROD | Borradas en una transacción con sus 25 tablas dependientes. `companies` queda en 2 filas |
| TK-OI6 | 🟢 **ALTA — cerrado 2026-09-13** | Perfil de Bubble no mapeado a `profiles.role`. GRUAS sin ningún `admin_tenant` | Mapeo confirmado (OI-06b): AdminEmpresa/AdminSistema→admin_tenant, Gestor→supervisor, Colaborador/Integrante→member (ya lo eran). Fetch a Bubble Data API (`User.profile` por `bubble_id`) + `UPDATE` directo en PROD (TEST no tiene perfiles migrados, `bubble_id` en 0 filas). Verificado: CISE 8 admin_tenant (antes 1), GRUAS 11 admin_tenant + 1 supervisor (antes 0), `reporta_admin` de `info@reporta.la` intacto. Proveedor: 0 usuarios reales en CISE/GRUAS hoy — sin código pendiente, pero el enum `app_role` no tiene un valor equivalente a "Proveedor" (solo `customer`, que es el concepto opuesto: alguien a quien le vendés, no a quien le comprás) — anotado para cuando aparezca el primer caso real |
| TK-OI7 | 🟡 **ALTA — plan listo** (cutover) | Numeración de cotizaciones: Bubble usa prefijo+secuencia+sufijo por tenant (GRUAS `CT` · 291 · `-2023`; CISE va por `CT279-2026`). v3 `generateNumeroCotizacion` genera `CT 2026-0001` (formato distinto), busca con `like 'CT 2026-%'` que no matchea los migrados `CTnnn-2026`, y toma el último por `created_at` en vez del máximo | Formato confirmado por el usuario 2026-09-13: `CT-XXXX-YYYY`, reinicio 1 de enero hora Lima. Calcula el máximo real desde `cotizaciones.numero` (no `companies_consecutives` — Bubble sigue creando cotizaciones en producción). Plan completo: `docs/superpowers/plans/2026-09-13-tk-oi7-numeracion-cotizaciones.md`. O.T./Informe PDF quedan fuera de alcance de este ticket |
| TK-OI2 | MEDIA | `/sistema/tenant` y `/sistema/onboarding` sin estándar v1.2 (buscador, embudos, paginación) | Diferir hasta >10 tenants reales |
| TK-OI3 | MEDIA | Superadmin `/templates` y `/formatos` sin filtro por tenant ni buscador | Diferir, misma condición |
| TK-OI4 | BAJA | Breadcrumb genérico "Sistema" para Tenant y Onboarding (`components/dashboard/header.tsx`) | Agregar 2 entradas al mapa manual |
| TK-OI5 | BAJA | Redirect inconsistente al fallar rol (`/planificacion` en Onboarding vs `/` en el resto) | Unificar a `/` |

---

## 6. DUDAs

| ID | Pregunta | Resolución |
|---|---|---|
| OI-01 | ¿Cómo hacemos el lado Bubble? | ✅ 2026-09-13: el usuario compartió credenciales, sesión Playwright en vivo. Capturas en `screenshots/14-opciones-internas/` |
| OI-02 | ¿Qué contiene "Opciones Internas" en Bubble? | ✅ 2026-09-13: Empresas Interno, Usuarios Interno, Informes Interno (en alcance); API, Blog, Videos, Cerrar Sesiones (descartados por el usuario) |
| OI-03 | ¿Se borran las 24 empresas trial basura? | ✅ 2026-09-13: sí. Borradas (TK-OI1) |
| OI-04 | ¿INGEM es real o residuo? | ✅ 2026-09-13: residuo. Borrada junto con las 24 |
| OI-05 | ¿Bubble tenía permisos por cargo? | ✅ 2026-09-13: no, `cargo_permisos` es configuración nueva de v3 (Regla 4, ✅ directo) |
| OI-06 | **Módulos por tenant** (tab 2 de Bubble, 20 toggles): ¿v3 necesita gating de módulos a nivel empresa además del gating por cargo? | ✅ **Resuelto 2026-09-13:** permisos por cargo. No hace falta gating adicional a nivel empresa. |
| OI-06b | **Mapeo de perfiles** Bubble→v3 para TK-OI6. | ✅ **Resuelto 2026-09-13:** Colaborador e Integrante son el mismo concepto, ambos → `member`. Proveedor y `customer` NO son equivalentes: a un Proveedor le comprás, a un `customer` le vendés — son direcciones opuestas. AdminEmpresa/AdminSistema → `admin_tenant` (no `reporta_admin`, que queda exclusivo de `info@reporta.la`). Aplicado en TK-OI6. |
| OI-07 | **Usuarios Interno cross-tenant**: ¿se acepta la reorganización de v3? | ✅ **Resuelto 2026-09-13: sí.** |
| OI-08 | **Informes Interno** en Bubble no carga. | ✅ **Resuelto 2026-09-13:** el usuario pidió no cargarlo más — cerrado sin equivalente necesario. |

---

## 7. Cierre

🟢 **CERRADO 2026-09-13.** Regla 7: las 4 DUDAs tienen resolución escrita. TK-OI6 (mapeo de roles) ejecutado y verificado en PROD. **TK-OI7 (numeración de cotizaciones) tiene plan de implementación listo** (`docs/superpowers/plans/2026-09-13-tk-oi7-numeracion-cotizaciones.md`), pendiente ejecutar — no bloquea el cierre de esta auditoría UI, que ya comparó los 3 sub-módulos en alcance 1:1 contra Bubble en vivo.

**Verificado en vivo contra Bubble (2026-09-13):** Empresas Interno (listado + 6 tabs), Usuarios Interno (listado + controles inline). **No verificable:** Informes Interno.
