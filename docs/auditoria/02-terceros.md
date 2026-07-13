# Auditoría módulo — Terceros (Catálogos #2)

**Fecha:** 2026-04-19
**Cutover:** 2026-04-26 (7 días)
**Screenshots referencia:** `2- Reporta Next - Terceros.pdf`

**Decisión de diseño ya confirmada por el usuario** (texto literal):
> "No tiene submenu, en cada tercero se tiene el detalle. En tanto en Next, estan los submenu y en cada tercero se tiene el detalle."
> "la version nueva es mas versatil"

→ El submenú Directorio / Contactos / Personal / Sitios de Next se acepta como **mejora**, no gap. El audit se enfoca en gaps funcionales, no de información arquitectónica.

---

## 2.1 Terceros (Directorio)

**Archivos Next:** [app/(dashboard)/terceros/page.tsx](../../app/(dashboard)/terceros/page.tsx) · [terceros-client.tsx](../../app/(dashboard)/terceros/terceros-client.tsx) · [columns.tsx](../../app/(dashboard)/terceros/columns.tsx) · [new/page.tsx](../../app/(dashboard)/terceros/new/page.tsx) · [[id]/edit/page.tsx](../../app/(dashboard)/terceros/[id]/edit/page.tsx) · [components/terceros/tercero-form.tsx](../../components/terceros/tercero-form.tsx)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Columnas: razón social, RUC, rubro, tipo (badge Cliente/Proveedor), estado (ACTIVO/HABIDO), dirección, ciudad, departamento | Logo, Razón Social, RUC, Rubro, País, Tipo, Estado, Dirección, Ubicación | Parity OK (Next muestra logo extra). Falta columna `ciudad` separada de `departamento` | 🟢 | 20 min |
| 2 | Búsqueda por nombre de empresa + búsqueda por RUC (dos campos dedicados) | Un solo campo de búsqueda por nombre | No hay búsqueda dedicada por RUC | 🟢 | 30 min |
| 3 | Filtros: Empresa, Tipo de Tercero, Rubro(s), Estado/Departamento, Ciudad, Estado SUNAT | Sólo tabs Activos/Papelera | **Falta panel de filtros avanzado** (con 338 terceros, es UX blocker real) | 🟡 | 2.5h |
| 4 | Descargar Excel | ❌ | Falta export Excel | 🟡 | 1.5h |
| 5 | Formulario crear/editar: **wizard 4 pasos** (Inf. Básica → Contactos → Personal → Sitios) | Single-page + 3 tabs (General / Contactos / Sitios); Personal NO está en el form del tercero | Workflow distinto. Personal accesible sólo via `/terceros/personal`. Acorde con filosofía "submenú más versátil" del usuario | 🟢 (intencional) | — |
| 6 | **RUC → autofill SUNAT** (estado ACTIVO/INACTIVO + condición HABIDO/NO HABIDO) con botón de búsqueda | Captura manual de estado | **Falta integración SUNAT** — cargar nuevos clientes es friccionoso | 🟡 | 3h |
| 7 | Logo empresa upload 200×80 | Logo upload | ✅ | ✅ | — |
| 8 | Dirección: dirección fiscal + Ciudad + Estado/Depto + País | Dirección + País + cascading Departamento/Provincia/Distrito (ubigeo) | Next usa modelo más granular (ubigeo). **Mejora** — pero significa que el campo "Ciudad" plano de Bubble se migró a Distrito | 🟢 | — |
| 9 | Menú fila: Ver, Editar, Deshabilitar | Ver, Editar, Deshabilitar (con papelera) | ✅ (Ver existe aquí) | ✅ | — |
| 10 | Logo compress/format validation | Upload a Supabase storage | ✅ | ✅ | — |

**Total Terceros:** ~7h (todo 🟡 — sin bloqueadores).

---

## 2.2 Contactos de Terceros

**Archivos Next:** [app/(dashboard)/terceros/contactos/](../../app/(dashboard)/terceros/contactos/) · [components/terceros/contacto-dialog.tsx](../../components/terceros/contacto-dialog.tsx)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 11 | Form: empresa (auto), nombre completo, correo, phone1 (país+num), **phone2 WhatsApp** (país+num), cargo, área | empresa, nombre completo, correo, teléfono (un campo), cargo, área | **Falta phone2 / WhatsApp**. Phone1 no tiene prefijo país explícito | 🟡 | 1h |
| 12 | Columnas list: nombre, cargo, contacto (icono email + icono WhatsApp), área, empresa | empresa, nombre completo, email, teléfono, cargo, área | Sin icono WhatsApp visible (consecuencia de #11) | 🟢 | 30 min |
| 13 | Scope: contactos viven dentro del wizard de su tercero padre | Módulo independiente (se puede crear sin tercero asociado si empresa es required) | Diferencia de scope — **Next es más versátil** | 🟢 (intencional) | — |
| 14 | Cargo / Área con autocomplete + "+" para agregar al vuelo | Mismo patrón (select + "+") via `/settings/terceros` (Cargos de Personal, Áreas de Contacto) | ✅ | ✅ | — |

**Total Contactos:** ~1.5h. El único gap real es phone2/WhatsApp.

---

## 2.3 Personal (de terceros)

**Archivos Next:** [app/(dashboard)/terceros/personal/](../../app/(dashboard)/terceros/personal/) · [components/terceros/personal-dialog.tsx](../../components/terceros/personal-dialog.tsx)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 15 | Primer nombre + **segundo nombre** + primer apellido + **segundo apellido** | nombres (combinado) + apellidos (combinado) | **Falta segundo_nombre + segundo_apellido** — si Bubble tenía data separada, ya se combinó en la migración | 🟡 | 1h (schema + UI) |
| 16 | Foto circular con upload | foto upload (ImageUpload) | ✅ | ✅ | — |
| 17 | **Firma electrónica — signature pad drawing** | `firma_url` como string URL (sin pad drawing) | **Falta componente de firma digital** — crítico para documentos SST (EPP, ATS, etc). Relevante también para el módulo EPP recién implementado | 🟡 | 3-4h |
| 18 | Cargo (autocomplete + "+") | Mismo patrón via `/settings/terceros` → Cargos | ✅ | ✅ | — |
| 19 | Contratista (si es personal externo) → select empresa | tercero_id (CONTRATISTA select, required) | ✅ | ✅ | — |
| 20 | Correo + **WhatsApp con prefijo país** | correo + teléfono simple | Mismo gap que #11 | 🟡 | — (incluido en #11) |
| 21 | País de nacionalidad | país (select Peru/Colombia/Chile…) | ✅ | ✅ | — |

**Total Personal:** ~4-5h. Firma electrónica es el gap más pesado y con mayor impacto post-cutover (EPP PDFs, ATS).

---

## Resumen y recomendación pre-cutover

### 🔴 BLOQUEA-CUTOVER

**Ninguno.** El sistema funciona end-to-end para operación diaria de Terceros.

### 🟡 POST-CUTOVER (total ~14h)

Orden sugerido de impacto:
1. **Phone2 / WhatsApp en contactos + personal** (1h) — comunicación diaria, obviamente crítico post-cutover.
2. **Panel de filtros en Terceros** (2.5h) — 338 terceros sin filtros es molesto pero vivible.
3. **SUNAT RUC autofill** (3h) — un clic evita 5 minutos de copy/paste. Proveedor externo o mock, según presupuesto.
4. **Firma electrónica signature pad** (3-4h) — **importante para EPP/ATS** ya que las entregas deben firmarse. Lo dejamos como blocker del **rollout de EPP a producción** aunque no bloquea el cutover del 2026-04-26.
5. **Segundo nombre / apellido en personal** (1h schema + UI).
6. **Export Excel** (1.5h).

### 🟢 MEJORAS aceptadas

- Submenú Directorio/Contactos/Personal/Sitios **en vez de wizard 4-step** — confirmado por el usuario.
- Ubigeo (Dep/Prov/Distrito) **en vez de texto plano "Ciudad"**.
- Contactos/Personal independientes del padre en vez de scope por tercero.

### Nota cruzada con EPP

El módulo EPP recién implementado genera PDFs GP-SST-FR con sección "Firma del colaborador". Actualmente el PDF muestra solo el nombre en línea de firma (sin imagen). Cuando se resuelva el gap #17 (signature pad), el PDF puede embedd la firma real en vez del placeholder.
