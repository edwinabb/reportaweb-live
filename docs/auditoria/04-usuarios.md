# Auditoría módulo — Usuarios (Catálogos #4)

**Fecha:** 2026-04-19
**Cutover:** 2026-04-26 (7 días)
**Screenshots:** `4- Reporta Next - Usuarios.pdf`

3 sub-módulos: **Usuarios**, **Tipos de Doc (Usuario)**, **Documentos (Usuario)**.

**Data coverage relevante (medido 2026-04-19):**

| Campo | CISE (101 profiles) | GRUAS (218 profiles) |
|---|---|---|
| contacto_emergencia_* | 13 (13%) | 1 (0.5%) |
| signature_url | 94 (93%) | 33 (15%) |
| pin | 100 (99%) | 218 (100%) |
| middle_name | 63 (62%) | 57 (26%) |
| second_last_name | 95 (94%) | 77 (35%) |

→ Contacto de emergencia es campo poco poblado (especialmente en GRUAS). No justifica bloquear cutover. Signature y PIN sí están ampliamente poblados.

---

## 4.1 Usuarios (directorio admin)

**Archivos Next:** [app/(dashboard)/users/](../../app/(dashboard)/users/) · [components/users/user-form.tsx](../../components/users/user-form.tsx) · [lib/actions/users.ts](../../lib/actions/users.ts)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Columnas: avatar iniciales, nombre, cargo, contacto (email+WhatsApp), identificación, proveedor | doc_number, email, full_name, role, is_active | Faltan avatar, cargo, icons contacto, proveedor | 🟡 | 1.5h |
| 2 | Búsqueda por nombre | Búsqueda por email | Por nombre es el caso común | 🟡 | 30 min |
| 3 | Filtros: Habilitados · Clasificación · Cargo · Proveedor | Tab Activos/Papelera | Falta panel (202 usuarios) | 🟡 | 2h |
| 4 | Descargar Excel | ❌ | Falta export | 🟡 | 1h |
| 5 | Row actions: Ver, Editar, **Cambiar email**, **Bienvenida**, Deshabilitar | Editar + Desactivar | Falta Ver, Cambiar email, Bienvenida | 🟡 Cambiar email (workaround admin DB) · 🟡 Bienvenida · 🟢 Ver | 3h total |
| 6 | Wizard 3-step | Single page create + tabs en edit | Workflow distinto, intencional | 🟢 | — |
| 7 | Step 1 campos: 1º/2º nombre, 1º/2º apellido, país nac, doc, fecha nac + edad auto, cargo, phone, correo | Schema en profile_details: middle_name, second_last_name, nationality, photo_url. **Verificar si el form los expone** | Posible gap de render | 🟡 verificar | 15 min + fix si falta |
| 8 | Step 2: dirección + contacto emergencia (nombres, parentesco, phone) | `profiles.contacto_emergencia_*` existe pero NO renderizado | Campo poco usado (CISE 13%, GRUAS 0.5%). Incluir como sección opcional, no bloquear cutover | 🟡 | 45 min |
| 9 | PIN con máscara + botón editar | `profiles.pin` integer sin máscara ni protección | **Seguridad:** PIN visible/editable sin re-auth. Ver nota seguridad abajo | 🟡 | incluido en perfil 🔴 |
| 10 | Firma electrónica (signature pad canvas) | Sólo file-upload | 93% de CISE + 15% GRUAS ya tienen firma migrada. Los nuevos users no pueden firmar sin pad. | 🟡 | 3-4h (cross-módulo) |

**Nota sobre seguridad (PIN + firma):** campos sensibles. Acordado con el usuario:
- No exponer en la lista de campos normales del form.
- Botones "Editar firma" / "Editar PIN" separados que requieran re-auth (confirmar password de login antes de mostrar/editar).
- Aplica tanto en /users/[id]/edit admin como en /settings/perfil self-service.

---

## 4.2 Tipos de Documento de Usuario

**Archivos Next:** [app/(dashboard)/settings/document-types/](../../app/(dashboard)/settings/document-types/)

**Observación:** Next tiene una sola tabla `document_types`. Bubble separa visualmente "Tipos Doc Maq." y "Tipos Doc Usuario". Confirmar campo de scope (aplica_a) y si el listado filtra.

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 11 | Columnas: código, documento, vence Sí/No, alerta días, seguro, individual/dual | Nombre, Categoría, Días Alerta, Estado | Falta código, seguro, individual/dual | 🟢 | 30 min |
| 12 | Row actions: Ver, Editar, Deshabilitar | Sólo Eliminar + Restaurar | **Falta Editar** (cross-módulo con 01-maquinaria #13) | 🔴 | cubierto en 01 |

---

## 4.3 Documentos de Usuario

**Archivos Next:** [app/(dashboard)/users/documents/](../../app/(dashboard)/users/documents/)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 14 | Columnas: usuario, proveedor, documento, válido desde, estado, vence días, válido hasta, archivo (599 items) | usuario, doc type, archivo, valid_from/until, status, vence días | Falta columna proveedor | 🟡 | 30 min |
| 15 | Filtros: Habilitados · Clasificación · Proveedor · Fecha vencimiento (rango) | documentTypeId · expiryStatus enum | Faltan Clasificación, Proveedor, rango fechas | 🟡 | 2h |
| 16 | Search usuario + tipo doc | Search + documentTypeId | ✅ | ✅ | — |
| 17 | Excel, ZIP, Nuevo | ✅ BulkUpload, ✅ ZIP, ✅ Excel | ✅ | ✅ | — |
| 18 | Row actions | Ver/Editar/Delete | ✅ | ✅ | — |

---

## Resumen pre-cutover

### 🔴 BLOQUEA-CUTOVER

**Ninguno específico de Usuarios.** El único 🔴 cross-módulo (Editar tipo documento, #12) ya está listado en 01-maquinaria.

### 🟡 POST-CUTOVER (~12h total Usuarios)

1. Panel de filtros avanzados (Cargo/Proveedor/Clasificación) — 2h
2. Contacto emergencia en form (sección opcional) — 45 min
3. Cambiar email action — 1.5h
4. Bienvenida resend — 1h
5. Excel export — 1h
6. Search por nombre — 30 min
7. Avatar/cargo/icons en listado — 1.5h
8. Verificar/render middle_name + second_last_name — 15 min + fix
9. Filtros Documentos (Proveedor/Clasificación/rango fechas) — 2h
10. Columna proveedor en Documentos — 30 min
11. Firma pad (cross-módulo, 3-4h)
