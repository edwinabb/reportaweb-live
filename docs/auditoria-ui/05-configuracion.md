# Auditoría UI ↔ Datos — 05 · Configuración / Catálogos

**Fecha:** 2026-09-06 · **Módulo:** 5/15 (Configuración/Catálogos)
**Formato de referencia:** `docs/auditoria-ui/03-terceros.md`
**Screenshots Bubble:** `docs/auditoria-ui/screenshots/05-configuracion/01-informacion-general.png` (única capturada — ver limitación de acceso más abajo)
**Datos BD PROD:** queries 2026-09-06, `fqwhagryqkkhbgznxtwf`, filtradas a CISE (`1cb97ec7-326c-4376-93ee-ed317d3da51b`) + GRUAS (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`)

---

## ⚠️ Limitación de acceso a Bubble (declarar antes de leer el resto)

El acceso a `https://reporta.la/version-test/configuracion` con la cuenta `edwinb@reporta.la` cerró
la sesión de forma inmediata (`Tu sesión ha finalizado`) en **cada intento** de interactuar con la
página después del primer login (clic en cualquier tab, navegación repetida, incluso `evaluate` sin
clics de por medio). Se repitió el ciclo login→configuración 5 veces con estrategias distintas
(Playwright UI, `browser_evaluate` con setters nativos, navegación directa por URL) — mismo resultado.
Esto **no** parece ser un timeout por inactividad (ocurre en <1s tras un login exitoso), sino algo
propio de esa página/cuenta en `version-test` (posible lock de sesión única, o un workflow de Bubble
que invalida la sesión al detectar acceso repetido/automatizado a `/configuracion`).

**Lo que SÍ se capturó (primer acceso, exitoso):**
- Los **6 tabs** de Configuración en Bubble y su **orden**: `1. INFORMACIÓN GENERAL` · `2. CATÁLOGOS DEL
  SISTEMA` · `3. PARÁMETROS DE PROYECTOS` · `4. OPCIONES MULTIPLES` · `5. MATRIZ DE RESPONSABILIDAD` ·
  `6. FORMATO DE COTIZACIÓN`.
- El contenido **completo** del tab 1 (Información General): ver `screenshots/05-configuracion/01-informacion-general.png`
  y detalle en la sección 1 de este documento.

**Lo que NO se pudo verificar directamente (DUDA-CONF-000, bloqueante para cerrar el módulo):**
- El contenido exacto de los tabs 2 a 6 de Bubble (qué campos/columnas/catálogos expone cada uno).
  Se infiere su alcance por el **nombre del tab** + cruce con las tablas que consume el código nuevo,
  pero es inferencia, no observación directa — está marcado como tal en cada sección.
- Se recomienda reintentar la captura con otra cuenta/sesión, o pedir al usuario capturas manuales
  de los tabs 2-6 (`c:/tmp/screenshots/reportar/5 configuracion/` como en módulos anteriores).

---

## Resumen Ejecutivo

- **Menú Bubble:** un único ítem "CONFIGURACIÓN" con **6 tabs internos** (ver arriba) — a diferencia de
  Terceros/Usuarios/Maquinaria, en Bubble Configuración YA es una sola pantalla centralizada.
- **Menú nuevo:** `Configuración` en el sidebar (`lib/config/menu.ts:148-164`) se abre en **10 sub-rutas
  independientes** bajo `/settings/*` + `/configuracion/notificaciones` — una reorganización de IA
  (más granular, pero fragmentada en 10 páginas en vez de 6 tabs):
  `Empresa` · `Usuarios` · `Terceros` · `Maquinaria` · `Cotizaciones` · `Informes` · `Valorizaciones` ·
  `Sitios` · `Tipos de Documento` · `Notificaciones`.
- **20 tablas Supabase** alimentan el módulo (ver inventario §0). Es el módulo con más superficie de
  tablas de catálogo de todo el sistema — coherente con ser el módulo que "define FKs de otros módulos".

**Hallazgos críticos (nuevos, no reportados en auditorías previas):**

1. 🔴 **`departamentos` — la tabla NO EXISTE en PROD.** `getDepartamentos()` (`lib/actions/catalogos.ts:38-47`)
   hace `.from('departamentos')`, que no existe (`relation "departamentos" does not exist`). El error se
   traga (`catch(() => [])` en `settings/sitios/page.tsx:9-10`) → el tab "Departamentos" de
   `/settings/sitios` **siempre muestra una tabla vacía**, sin error visible. Bug silencioso.

2. 🔴 **Catálogo `ubigeo` casi vacío: 41 filas totales (no ~1.874 distritos).** El propio `03-terceros.md`
   (2026-07-15) reportaba "ubigeo (catálogo global) — 1.874 distritos aprox.", pero la tabla real hoy
   tiene 41 filas. De esas, **LIMA tiene 17 combinaciones reales** (departamento/provincia/distrito);
   **el resto de los 24 departamentos tiene 1 sola fila STUB** con `provincia='-'` y `distrito='-'`
   (ej. `AREQUIPA | - | -`, `CUSCO | - | -`). Esto significa que el cascada Departamento→Provincia→Distrito
   del formulario de Terceros (`getProvincias`/`getDistritos`, ambos sobre `ubigeo`) **solo funciona
   para Lima**; para cualquier otro departamento el usuario no puede seleccionar provincia/distrito real.
   **Esto bloquea directamente TK-T2 de Terceros (DUDA-TER-003)**: no hay catálogo completo contra el
   cual re-vincular `ubicacion_ciudad`/`ubicacion_departamento` vía `ubigeo_codigo` fuera de Lima.

3. 🔴 **`config_informe_maquinaria`, `config_valorizacion_venta`, `config_valorizacion_compra`:
   0/0 filas para CISE y GRUAS** (11 filas totales en cada tabla, repartidas entre 11 tenants de
   prueba/ruido — ninguno es CISE ni GRUAS). Estas 3 tablas gobiernan: turnos/riggers/firma-cliente/
   foto-trabajo del informe de maquinaria, y el IGV/detracción/código-formato de las valorizaciones de
   venta y compra — **son la fuente de verdad que consumen los módulos 7 (Informes) y 10-11
   (Ventas/Compras)**. Sin fila, esas pantallas de settings muestran el form vacío/default y **es
   incierto si el PDF generado usa un fallback hardcodeado o directamente falla**. Bloqueante potencial
   para auditar los módulos 7, 10 y 11 — hay que confirmar el comportamiento del fallback antes.
   `config_informe_personal` (GRUAS también 0/12) y `config_checklist` (CISE y GRUAS ambos con 1 fila,
   ✅ OK) están mejor, pero no completos.

4. 🔴 **Catálogo `personal_cargos` (301 filas CISE+GRUAS) SIN pantalla de administración.** El tab
   "Cargos de Personal" de `/settings/terceros` (`app/(dashboard)/settings/terceros/client-page.tsx:80-88`)
   **está mal etiquetado**: dice "Cargos de Personal" pero su `createAction`/`deleteAction` apuntan a
   `contactos_cargo` (el catálogo de cargo de **contactos**, no de personal). La única función que
   gestiona `personal_cargos` (`getPersonalCargos`/`createPersonalCargo`, `lib/actions/catalogos.ts:173-203`)
   **no se usa en ninguna página de Configuración** — el único caller en todo `app/` es
   `planificacion/nueva/page.tsx` (alta inline al crear una tarea). No hay dónde editar/desactivar un
   cargo de personal ya creado, ni ver la lista completa de 301 registros.

5. 🟡 **`job_titles` (Usuarios) y `personal_cargos` (Terceros→Personal) son catálogos casi duplicados.**
   Para CISE: 56 `job_titles` vs 150 `personal_cargos`, con **54/56 nombres exactamente coincidentes**
   (mismo texto, mayúsculas). Se gestionan en dos pantallas distintas de Configuración
   (`/settings/users` tab "Cargos de Personal" → `job_titles`; el tab mal etiquetado de `/settings/terceros`
   → en realidad `contactos_cargo`, no `personal_cargos`). Ya señalado como sospecha en DUDA-TER-006 de
   `03-terceros.md`; esta auditoría lo confirma con datos: es muy probable que sean el mismo catálogo de
   Bubble migrado dos veces a tablas distintas.

6. 🔴 **`/settings/empresa` (nuevo) solo edita `timezone`.** Bubble tab "1. INFORMACIÓN GENERAL" edita
   RUC, Razón Social, Dirección, Ciudad, País, Logo, Email, Página Web — **8 campos**. La tabla `companies`
   sí tiene columnas para todos ellos (`ruc`, `razon_social`, `direccion`, `ubicacion_ciudad`,
   `ubicacion_pais`, `logo_url`, `email`, `website`, más `telefono`/`phone`/`gerente_general` que ni
   siquiera estaban en el tab de Bubble visto). Datos actuales CISE/GRUAS: `ruc` ✅ 2/2, `razon_social` ✅
   2/2, `direccion` ✅ 2/2, `logo_url` ✅ 2/2 — pero `ubicacion_ciudad`, `email`, `website`, `telefono`,
   `phone`, `gerente_general` = **0/2 los seis**. La UI nueva no tiene ningún formulario para completarlos
   (solo el form de timezone existe hoy en `/settings/empresa`) — si el admin de CISE/GRUAS necesita
   corregir su RUC, dirección o cargar su email corporativo, **no hay dónde hacerlo en el sistema nuevo**.

**Defectos encontrados:** 13 gaps identificados (5 críticos) · 6 DUDAs (DUDA-CONF-000 a 005)

### Inventario de tablas del módulo (§0 — regla de auditoría exhaustiva)

| Tabla | Usada por (settings/*) | CISE | GRUAS | Total | Notas |
|---|---|---:|---:|---:|---|
| `companies` | Empresa (solo timezone), Notificaciones | 1 | 1 | 27 | Tabla real del tenant (no existe `tenants`) |
| `rubros` | Terceros (tab Rubros) | 21 | 17 | 58 | Catálogo Terceros — ya auditado en 03 |
| `contactos_cargo` | Terceros (tab mal etiquetado "Cargos de Personal") | 5 | 5 | 12 | Ver hallazgo #4 |
| `contactos_area` | Terceros (tab Áreas de Contacto) | 5 | 5 | 12 | |
| `personal_cargos` | **Ninguna pantalla de Configuración** (solo alta inline en Planificación) | 150 | 151 | 389 | 🔴 sin admin UI — hallazgo #4 |
| `sitios_tipo` | Sitios (tab Tipos de Sitios) | 11 | 12 | 30 | |
| `ubigeo` | Sitios (tab Ubigeo, lectura) | — | — | 41 | 🔴 catálogo casi vacío — hallazgo #2 |
| `departamentos` | Sitios (tab Departamentos) | — | — | **tabla no existe** | 🔴 hallazgo #1 |
| `paises` | (no expuesto directo en Configuración; usado en Empresa/Terceros) | — | — | 249 | Global, OK |
| `job_titles` | Usuarios (tab Cargos de Personal) | 56 | 55 | 157 | Casi-duplicado de `personal_cargos` — hallazgo #5 |
| `document_types` | Usuarios (tab Tipos de Documento) + página propia `/settings/document-types` | 14 | 31 | 45 | Doble entrada al mismo catálogo (ver §Gaps UI) |
| `formas_pago` | Cotizaciones (tab Formas de Pago) | 4 | 6 | 14 | |
| `plazos_pago` | Cotizaciones (tab Plazos de Pago) | 53 | 21 | 83 | |
| `actividades_matriz` | Cotizaciones (tab Matriz Resp.) | 50 | 36 | 109 | |
| `cotizaciones_configuracion` | Cotizaciones (tab Documento) | 1 | 1 | 3 | ✅ ambos tenants con config |
| `cotizaciones_configuracion_doc` | Cotizaciones (fetch en page.tsx, `configDocs`) | 0 | 0 | 0 | Prop pasada pero `ConfigDocTable` **no se renderiza** en ningún tab activo — código muerto |
| `config_checklist` | Informes (tab Checklist) | 1 | 1 | 14 | ✅ OK |
| `config_informe_maquinaria` | Informes (tab Maquinaria) | 0 | 0 | 11 | 🔴 hallazgo #3 |
| `config_informe_personal` | Informes (tab Personal) | 1 | 0 | 12 | 🔴 GRUAS sin fila |
| `config_valorizacion_venta` | Valorizaciones (tab Venta) | 0 | 0 | 11 | 🔴 hallazgo #3 |
| `config_valorizacion_compra` | Valorizaciones (tab Compra) | 0 | 0 | 11 | 🔴 hallazgo #3 |

---

## 1. INFORMACIÓN GENERAL (Bubble tab 1) ↔ EMPRESA (`/settings/empresa`)

**Path Bubble:** CONFIGURACIÓN → tab "1. INFORMACIÓN GENERAL" (capturado en vivo, 2026-09-06)
**Path reportaweb3:** `/settings/empresa` · `app/(dashboard)/settings/empresa/page.tsx` ·
`components/settings/empresa-timezone-form.tsx` · `lib/actions/empresa-config.ts` (tabla `companies`)
**Datos BD:** `companies` — 1 fila por tenant (27 filas totales, incl. tenants de prueba)

| Elemento | Campo Bubble | Tabla.columna Supabase | UI nueva | Dato migrado (CISE/GRUAS) | Status | Notas |
|---|---|---|---|---|---|---|
| Código (RUC o NIT) | RUC | companies.ruc | ❌ NO visible en `/settings/empresa` | ✅ 2/2 | 🔴 **Gap UI** | Dato existe, sin dónde editarlo en el sistema nuevo |
| Nombre (Razón Social) | razon_social | companies.razon_social | ❌ NO visible | ✅ 2/2 | 🔴 **Gap UI** | |
| Dirección | direccion | companies.direccion | ❌ NO visible | ✅ 2/2 | 🔴 **Gap UI** | |
| Ciudad | ubicacion_ciudad | companies.ubicacion_ciudad | ❌ NO visible | ❌ 0/2 | 🔴 **Gap UI + dato** | |
| País | país | companies.ubicacion_pais | ❌ NO visible | ✅ 2/2 ('PE') | 🔴 **Gap UI** | |
| Logo (subir imagen) | logo | companies.logo_url | ❌ NO visible | ✅ 2/2 | 🔴 **Gap UI** | Logo sí migrado y usado en PDFs, pero no se puede re-subir desde Configuración |
| Email (corporativo) | email | companies.email | ❌ NO visible | ❌ 0/2 | 🔴 **Gap UI + dato** | |
| Página Web | website | companies.website | ❌ NO visible | ❌ 0/2 | 🔴 **Gap UI + dato** | |
| Botón GUARDAR | — | — | ⚠️ Existe, pero solo guarda `timezone` (campo NUEVO sin equivalente en Bubble) | — | ⚠️ | `EmpresaTimezoneForm` es el único form activo hoy |
| (sin equivalente Bubble) | — | companies.telefono / phone / gerente_general | ❌ Sin UI en ningún lado | ❌ 0/2 los tres | ⚪ | Columnas de schema sin UI ni dato — candidatas a limpieza o a completar el form |

**Clasificación de gaps — Información General / Empresa:**
- 🔴 **Gap UI #1-C1 (CRÍTICO):** reconstruir el formulario de datos de empresa en `/settings/empresa`
  (RUC, razón social, dirección, ciudad, país, logo, email, web) — hoy solo existe el form de timezone.
  Sin esto, un admin de tenant no tiene forma de autogestionar los datos de su propia empresa (los que
  aparecen en headers de PDF, cotizaciones, informes). [4h + DUDA-CONF-001]
- 🟡 **Gap dato #1-C2:** completar `ubicacion_ciudad`, `email`, `website` de CISE/GRUAS si existen en
  Bubble LIVE (no confirmado en esta auditoría — requiere el mismo sondeo Bubble LIVE que se hizo para
  Terceros en `03-terceros.md`, bloqueado hoy por la inestabilidad de sesión, DUDA-CONF-000).

---

## 2. CATÁLOGOS DEL SISTEMA (Bubble tab 2, inferido) ↔ TERCEROS / MAQUINARIA / SITIOS / USUARIOS (settings)

⚠️ **Inferencia, no observación directa** (DUDA-CONF-000). Se infiere que este tab agrupa los catálogos
de opciones de lista usados en varios módulos (rubro, cargo, área, tipo de sitio, tipo de maquinaria,
tipo de documento) por el nombre del tab y porque es el patrón típico de Bubble para "Opción de Lista".
En la UI nueva este único tab está **repartido en 4 páginas distintas** (`/settings/terceros`,
`/settings/maquinaria`, `/settings/sitios`, `/settings/users`, `/settings/document-types`).

### 2.1 `/settings/terceros` — tabs Rubros · Cargos de Personal (⚠️ en realidad `contactos_cargo`) · Áreas de Contacto

| Elemento | Tabla.columna Supabase | UI nueva | Dato migrado | Status | Notas |
|---|---|---|---|---|---|
| Tab "Rubros" | rubros (id, nombre, tenant_id, is_active) | ✅ `GenericCatalogTable` (crear/desactivar/restaurar) | ✅ 21/17 | ✅ OK | Ya cubierto en gaps críticos de `03-terceros.md` (rubro_id de terceros = 0/678, pero el catálogo en sí está bien administrado) |
| Tab "Cargos de Personal" | **contactos_cargo** (no `personal_cargos`) | ⚠️ `GenericCatalogTable` funcional, pero **etiqueta engañosa** | ✅ 5/5 | 🔴 **Bug de etiqueta** | Hallazgo #4 — ver DUDA-CONF-002 |
| Tab "Áreas de Contacto" | contactos_area | ✅ `GenericCatalogTable` | ✅ 5/5 | ✅ OK | |
| Sin tab: catálogo `personal_cargos` | personal_cargos | ❌ No existe ninguna pantalla | ⚠️ 150/151 (sin poder administrarse) | 🔴 **Gap UI CRÍTICO** | Hallazgo #4 |
| Sin tab: catálogo `terceros_tipos` | terceros_tipos | ❌ No expuesto en Configuración (ni en Terceros, ver DUDA-TER-001) | ✅ 10 filas | ⚪ | Mismo catálogo huérfano que señala `03-terceros.md` |

### 2.2 `/settings/maquinaria` — tabs Tipos de Documentos · Modelos

⚠️ Esta página **reutiliza componentes de `/maquinarias/types` y `/maquinarias/modelos`** en modo
`embedded` — no es un catálogo nuevo, es la misma pantalla de Maquinaria embebida dentro de Configuración
(doble entrada al mismo dato, ya señalado en `02-maquinaria.md` si existe redundancia — no re-auditado
aquí por estar fuera de scope de catálogos puros; se documenta la redundancia de navegación).

| Elemento | Tabla | UI nueva | Notas |
|---|---|---|---|
| Tab "Tipos de Documentos" | (tabla de tipos de maquinaria — ver `02-maquinaria.md`) | ✅ `TypesClientPage` embebido | Doble acceso: `/maquinarias/types` Y `/settings/maquinaria` |
| Tab "Modelos" | (tabla de modelos de maquinaria) | ✅ `ModelosClientPage` embebido | Doble acceso: `/maquinarias/modelos` Y `/settings/maquinaria` |

### 2.3 `/settings/sitios` — tabs Tipos de Sitios · Departamentos · Ubigeo

| Elemento | Tabla.columna | UI nueva | Dato | Status | Notas |
|---|---|---|---|---|---|
| Tab "Tipos de Sitios" | sitios_tipo | ✅ `GenericCatalogTable` | ✅ 11/12 | ✅ OK | |
| Tab "Departamentos" | **`departamentos` (tabla NO EXISTE)** | ⚠️ Tabla de solo lectura, siempre vacía | ❌ N/A | 🔴 **Bug CRÍTICO** | Hallazgo #1 |
| Tab "Ubigeo" | ubigeo (codigo, departamento, provincia, distrito) | ✅ `UbigeoTable` (lectura) | ⚠️ 41 filas (24 stub `-`/`-`, solo Lima con 17 reales) | 🔴 **Catálogo incompleto CRÍTICO** | Hallazgo #2 |

### 2.4 `/settings/users` — tab Cargos de Personal (⚠️ en realidad `job_titles`) + `/settings/document-types`

| Elemento | Tabla.columna | UI nueva | Dato | Status | Notas |
|---|---|---|---|---|---|
| Tab "Tipos de Documento" (dentro de `/settings/users`) | document_types | ✅ `UserDocsTable` | ✅ 14/31 | ✅ OK | Ver duplicación abajo |
| Tab "Cargos de Personal" (dentro de `/settings/users`) | **job_titles** | ✅ `GenericCatalogTable` | ✅ 56/55 | ⚠️ **Casi-duplicado** | Hallazgo #5 |
| Página independiente `/settings/document-types` | document_types (misma tabla) | ✅ `DocumentTypesTable` + alertas de vencimiento | ✅ 14/31 | ⚠️ **Acceso duplicado** | Mismo catálogo accesible desde 2 rutas del menú (`/settings/users` tab Y entrada de menú propia "Tipos de Documento") — confirmar si es intencional |
| Página independiente `/settings/users/job-titles` | job_titles (misma tabla) | ✅ `JobTitlesTable` | ✅ | ⚠️ **Acceso duplicado** | Ruta standalone que NO está en `lib/config/menu.ts` (no navegable desde el sidebar) pero sí accesible por URL directa — huérfana de navegación |

**Clasificación de gaps — Catálogos del Sistema:**
- 🔴 **Gap UI #2-C1 (CRÍTICO):** arreglar `getDepartamentos()` — tabla `departamentos` no existe; o
  bien crearla, o bien apuntar la función a `select distinct departamento from ubigeo` (pero eso
  requiere primero completar el catálogo `ubigeo`, ver #2-C2). [1h, bloqueado por DUDA-CONF-003]
- 🔴 **Gap dato #2-C2 (CRÍTICO):** completar el catálogo `ubigeo` con las ~1.874 combinaciones reales
  de departamento/provincia/distrito del Perú (hoy 41 filas, 24 de ellas stub). Bloquea el cascada de
  ubicación en Terceros (TK-T2 de `03-terceros.md`) para todo el país excepto Lima. [DUDA-CONF-004:
  ¿existe el dataset completo en algún lado (Bubble, INEI, seed anterior) o hay que cargarlo de cero?]
- 🔴 **Gap UI #2-C3 (CRÍTICO):** re-etiquetar o re-vincular el tab "Cargos de Personal" de
  `/settings/terceros` — hoy dice "Personal" pero edita `contactos_cargo`; crear la pantalla real de
  administración de `personal_cargos` (301 filas sin dónde gestionarse). [3h + DUDA-CONF-002]
- 🟡 **Gap UI #2-C4:** decidir si `job_titles` y `personal_cargos` deben unificarse en un solo catálogo
  (54/56 coincidencias de nombre en CISE) — impacta también a `03-terceros.md` DUDA-TER-006.
  [DUDA-CONF-002, compartida]
- 🟡 **Gap UI #2-C5:** limpiar accesos duplicados a `document_types` y `job_titles` (2 rutas cada uno,
  una de ellas — `/settings/users/job-titles` — huérfana de navegación). [1h]

---

## 3. PARÁMETROS DE PROYECTOS (Bubble tab 3, inferido) ↔ INFORMES / VALORIZACIONES (settings)

⚠️ **Inferencia, no observación directa** (DUDA-CONF-000). Se infiere el mapeo por el nombre del tab
+ que estos son los únicos catálogos "paramétricos" (no de opciones de lista) del módulo.

### 3.1 `/settings/informes` — tabs Checklist · Maquinaria · Personal

| Elemento | Tabla.columna | UI nueva | Dato CISE/GRUAS | Status | Notas |
|---|---|---|---|---|---|
| Tab Checklist | config_checklist | ✅ `InformesConfigTabs` | ✅ 1/1 | ✅ OK | |
| Tab Maquinaria | config_informe_maquinaria (turnos, riggers, firma cliente, foto trabajo, tipo recorrido, salida autorizada, tonelaje/placa, fotos adicionales, guía transporte, código/versión/fecha de formato) | ✅ Form completo | 🔴 **0/0** | 🔴 **Gap dato CRÍTICO** | Hallazgo #3 — el form se ve pero no hay fila guardada para ninguno de los 2 tenants reales |
| Tab Personal | config_informe_personal | ✅ Form completo | ⚠️ CISE 1/1 · **GRUAS 0/1** | 🔴 **Gap dato (GRUAS)** | |

### 3.2 `/settings/valorizaciones` — tabs Venta · Compra

| Elemento | Tabla.columna | UI nueva | Dato CISE/GRUAS | Status | Notas |
|---|---|---|---|---|---|
| Tab Venta | config_valorizacion_venta (igv_default, detraccion_default, codigo/version/fecha formato) | ✅ `ValorizacionesConfigTabs` | 🔴 **0/0** | 🔴 **Gap dato CRÍTICO** | Hallazgo #3 |
| Tab Compra | config_valorizacion_compra (mismos campos) | ✅ | 🔴 **0/0** | 🔴 **Gap dato CRÍTICO** | Hallazgo #3 |

**Clasificación de gaps — Parámetros de Proyectos:**
- 🔴 **Gap dato #3-C1 (CRÍTICO, BLOQUEANTE para módulos 7, 10, 11):** crear las filas de configuración
  para CISE y GRUAS en `config_informe_maquinaria`, `config_valorizacion_venta` y
  `config_valorizacion_compra` (con los valores reales de IGV/detracción vigentes en Perú y los
  parámetros de formato que usaban en Bubble). Sin esto, hay que confirmar primero **si el código que
  genera el PDF de Informe de Maquinaria y de Valorización tiene un fallback hardcodeado** cuando no
  hay fila — si NO lo tiene, esto puede estar **rompiendo la generación de esos PDFs en producción
  ahora mismo** para los únicos 2 tenants reales. [DUDA-CONF-005: verificar el fallback antes de asumir
  severidad; luego 2h para poblar las 6 filas faltantes]
- 🟡 **Gap dato #3-C2:** completar `config_informe_personal` para GRUAS (0/1 hoy). [30 min]

---

## 4. OPCIONES MÚLTIPLES / 5. MATRIZ DE RESPONSABILIDAD / 6. FORMATO DE COTIZACIÓN (Bubble tabs 4-6, inferidos) ↔ COTIZACIONES (settings)

⚠️ **Inferencia, no observación directa** (DUDA-CONF-000). Se infiere que "OPCIONES MÚLTIPLES" son las
formas y plazos de pago (catálogos de selección múltiple en el form de cotización), "MATRIZ DE
RESPONSABILIDAD" mapea 1:1 al nombre del tab "Matriz Resp." de la UI nueva, y "FORMATO DE COTIZACIÓN"
al tab "Documento" (config global de PDF: banco, firmas, términos y condiciones).

### 4.1 `/settings/cotizaciones` — tabs Formas de Pago · Plazos de Pago · Matriz Resp. · Documento

| Elemento | Tabla.columna | UI nueva | Dato CISE/GRUAS | Status | Notas |
|---|---|---|---|---|---|
| Tab Formas de Pago | formas_pago | ✅ `GenericCatalogTable` (crear/editar/borrar/restaurar) | ✅ 4/6 | ✅ OK | |
| Tab Plazos de Pago | plazos_pago | ✅ ídem | ✅ 53/21 | ✅ OK | |
| Tab Matriz Resp. | actividades_matriz (nombre, descripción, responsable_default, orden) | ✅ `ActividadesMatrizTable` | ✅ 50/36 | ✅ OK | |
| Tab Documento | cotizaciones_configuracion (banco, firma_autorizado_url, firma_gerente_url, forma_pago1/2, imagen_banco, imagen_firma, introduccion, mostrar_firma, pie_pagina, saludo, terminos_condiciones, despedida) | ✅ `CotizacionGlobalConfigForm` | ✅ 1/1 (existe fila; cobertura campo a campo no auditada) | ⚠️ Parcial | Fila existe para ambos tenants, pero no se verificó cobertura por columna individual (fuera de scope por tiempo — DUDA-CONF-006 si se requiere detalle) |
| (fetch sin UI) | cotizaciones_configuracion_doc | ❌ Prop `configDocs` pasada al client pero `ConfigDocTable` nunca se renderiza en ningún tab | ❌ 0/0 (tabla vacía en ambos tenants) | 🟡 **Código muerto** | Componente importado y datos fetcheados sin usarse — limpiar o completar |

**Clasificación de gaps — Opciones Múltiples / Matriz / Formato Cotización:**
- 🟡 **Gap código #4-C1:** `ConfigDocTable` importado en `settings/cotizaciones/client-page.tsx` pero
  sin tab que lo renderice; `cotizaciones_configuracion_doc` vacía en ambos tenants reales — decidir si
  se completa la funcionalidad o se retira el código muerto. [1h]
- ⚪ **DUDA-CONF-006 (no bloqueante):** verificar cobertura campo a campo de `cotizaciones_configuracion`
  (banco, firmas, textos) si se decide auditar Cotizaciones como módulo propio más adelante (módulo 6
  del plan de cutover) — se documenta la fila existe, no se hizo drill-down de columnas por estar fuera
  del foco de "catálogos" de este módulo 5.

---

## Notificaciones (`/configuracion/notificaciones`) — sin equivalente claro en Bubble

**Path reportaweb3:** `/configuracion/notificaciones` (nota: ruta INCONSISTENTE con el resto — las otras
9 sub-páginas viven bajo `/settings/*`, esta bajo `/configuracion/*`) · tabla `companies.epp_notificar_observaciones_a` (array de user IDs)

| Elemento | Tabla.columna | UI nueva | Dato CISE/GRUAS | Status | Notas |
|---|---|---|---|---|---|
| Selector de usuarios a notificar (EPP) | companies.epp_notificar_observaciones_a | ✅ `EppNotifForm` | ❌ `[]` vacío para ambos | 🟡 **Sin configurar** | Feature nueva (sin equivalente visto en Bubble tabs 1-6, puede vivir en otro tab no observado — DUDA-CONF-000) |

**Gap:** 🟡 **#N-C1:** ruta inconsistente `/configuracion/notificaciones` vs. el resto `/settings/*` — unificar prefijo. [15 min]

---

## DUDAs Abiertas (DUDA-CONF-000 a 006)

| ID | Pregunta | Impacto |
|---|---|---|
| **DUDA-CONF-000 (BLOQUEANTE del cierre del módulo)** | No se pudo mantener sesión estable en `https://reporta.la/version-test/configuracion` para capturar los tabs 2-6 (Catálogos del Sistema, Parámetros de Proyectos, Opciones Múltiples, Matriz de Responsabilidad, Formato de Cotización). El contenido de esos tabs en este documento es **inferencia por nombre + cruce de código**, no observación directa. ¿Puede el usuario capturar manualmente esos 5 tabs (screenshots) o dar acceso alternativo (otra cuenta, Bubble LIVE, export de la app Bubble)? | Confiabilidad de todo el módulo 2-6 |
| **DUDA-CONF-001** | `/settings/empresa` solo tiene el form de timezone. ¿Se reconstruye el form completo (RUC/razón social/dirección/ciudad/país/logo/email/web) igual que en Bubble, o se decide que esos campos ya no son editables desde el tenant (p. ej. los gestiona reporta_admin desde `/sistema`)? | Gap crítico #1-C1 |
| **DUDA-CONF-002** | `job_titles` (Usuarios) vs `personal_cargos` (Terceros→Personal): 54/56 coincidencias de nombre en CISE. ¿Son el mismo catálogo migrado dos veces desde Bubble, o dos catálogos legítimamente distintos que casualmente comparten texto? Si son el mismo: ¿cuál es el canónico y se retira el otro? Si son distintos: falta la pantalla de administración de `personal_cargos` (hoy sin ninguna) y corregir la etiqueta engañosa del tab de Terceros. | Gaps críticos #2-C3, #2-C4; también DUDA-TER-006 |
| **DUDA-CONF-003** | La función `getDepartamentos()` apunta a una tabla `departamentos` que no existe en PROD. ¿Existió antes y se borró, o nunca se creó? ¿Se crea la tabla, o se reemplaza la función para derivar la lista desde `ubigeo.departamento` distinct (una vez resuelto DUDA-CONF-004)? | Gap crítico #2-C1 |
| **DUDA-CONF-004** | El catálogo `ubigeo` tiene solo 41 filas (24 de ellas stub `-`/`-`); el dataset completo de ubigeo del Perú (~1.874 distritos) nunca se cargó, o se cargó y luego se perdió. ¿Existe ese dataset completo en algún backup, en Bubble, o hay que conseguirlo de una fuente pública (RENIEC/INEI)? Esto bloquea tanto este módulo como TK-T2 de `03-terceros.md`. | Gap crítico #2-C2, bloqueante cross-módulo |
| **DUDA-CONF-005** | ¿El código que genera el PDF de Informe de Maquinaria / Valorización de Venta / Valorización de Compra tiene un fallback hardcodeado cuando no existe fila en `config_informe_maquinaria`/`config_valorizacion_venta`/`config_valorizacion_compra`? CISE y GRUAS no tienen fila en ninguna de las 3. Si no hay fallback, esto puede estar afectando la generación de esos PDFs en producción hoy mismo. | Gap crítico #3-C1, potencialmente bloqueante para módulos 7/10/11 |
| **DUDA-CONF-006 (no bloqueante)** | ¿Se quiere auditar `cotizaciones_configuracion` campo a campo (banco, firmas, textos) como parte de este módulo, o se difiere al módulo 6 (Cotizaciones) del plan de cutover? | Alcance, no bloqueante |

---

## Tickets de Implementación Propuestos

### 🔴 CRÍTICO (bloquean uso real del módulo o de módulos dependientes)

1. **TK-C1:** Confirmar comportamiento de fallback en generación de PDF de Informe Maquinaria /
   Valorización Venta / Valorización Compra cuando falta config; si no hay fallback, crear urgentemente
   las filas para CISE y GRUAS en las 3 tablas (Gap #3-C1, DUDA-CONF-005). **Prioridad más alta del
   módulo** — puede estar rompiendo PDFs de producción ahora mismo. [2-4h según hallazgo]

2. **TK-C2:** Arreglar `getDepartamentos()` (tabla `departamentos` inexistente) — el tab "Departamentos"
   de `/settings/sitios` está silenciosamente vacío (Gap #2-C1, DUDA-CONF-003). [1h]

3. **TK-C3:** Completar/reconstruir el catálogo `ubigeo` (hoy 41 filas, 24 stub) con el dataset real de
   Perú — bloquea este módulo y TK-T2 de Terceros (Gap #2-C2, DUDA-CONF-004). [tamaño según fuente de
   datos disponible; estimar tras resolver la DUDA]

4. **TK-C4:** Resolver la relación `job_titles` ↔ `personal_cargos` (unificar o diferenciar) y construir
   la pantalla de administración real de `personal_cargos` (hoy sin ninguna) + corregir la etiqueta
   engañosa "Cargos de Personal" del tab de `/settings/terceros` (Gaps #2-C3/#2-C4, DUDA-CONF-002). [4h]

5. **TK-C5:** Reconstruir el formulario completo de `/settings/empresa` (RUC, razón social, dirección,
   ciudad, país, logo, email, web) — hoy solo hay timezone (Gap #1-C1, DUDA-CONF-001). [4h]

### 🟡 MEDIA

6. **TK-C6:** Completar `config_informe_personal` para GRUAS (0/1). [30 min]

7. **TK-C7:** Limpiar accesos duplicados: `document_types` (2 rutas) y `job_titles` (2 rutas, una
   huérfana de navegación en `/settings/users/job-titles`). [1h]

8. **TK-C8:** Decidir sobre `ConfigDocTable`/`cotizaciones_configuracion_doc` (código muerto, tabla
   vacía) — completar o retirar. [1h]

9. **TK-C9:** Unificar prefijo de ruta: `/configuracion/notificaciones` → `/settings/notificaciones`
   (consistencia con las otras 9 sub-páginas). [15 min]

### 🟢 BAJA

10. **TK-C10:** Recapturar los tabs 2-6 de Bubble Configuración con una sesión estable (DUDA-CONF-000)
    para confirmar/corregir las inferencias de este documento antes de dar el módulo por cerrado.

11. **TK-C11:** Auditar `cotizaciones_configuracion` campo a campo si se decide (DUDA-CONF-006).

### ⚪ OMITIDO INTENCIONAL

- `/settings/maquinaria` (tabs Tipos de Documentos y Modelos) reutiliza componentes ya auditados en
  `02-maquinaria.md` — no se re-audita el contenido de esas tablas aquí, solo se señala la doble
  entrada de navegación.

---

## Próximos Pasos

1. **Resolver DUDA-CONF-000 primero** (recapturar Bubble tabs 2-6 con sesión estable) — sin esto, las
   secciones 2 a 4 de este documento son inferencia, no verificación.
2. **Resolver DUDA-CONF-005 con urgencia** (fallback de PDFs) — puede ser un incidente de producción
   activo en CISE/GRUAS, no solo un gap de auditoría.
3. Resolver DUDA-CONF-001 a 004 (formulario Empresa, catálogo `personal_cargos`/`job_titles`,
   `departamentos`, `ubigeo`) con el usuario.
4. Ejecutar TK-C1 → TK-C5 (críticos).
5. **NO cerrar el módulo 5** en `docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md` hasta
   completar el punto 1 (sesión Bubble estable) — el estado correcto en el tracker es
   "🟡 Auditado con limitación de acceso — DUDA-CONF-000 pendiente", no "🟢 Auditado".
