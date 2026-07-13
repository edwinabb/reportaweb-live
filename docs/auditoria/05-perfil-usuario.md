# Auditoría módulo — Perfil de Usuario (Catálogos #5)

**Fecha:** 2026-04-19
**Cutover:** 2026-04-26 (7 días)
**Screenshots:** `5- Reporta Next - Perfil de Usuario.pdf`

Self-service: cualquier usuario logueado edita su propia información. En Bubble es entrada top-level. En Next **NO EXISTE** ruta equivalente (TAREAS_PRIORIZADAS §4.5).

---

## 5.1 Diseño acordado con el usuario

Simplificar el wizard 3-step de Bubble a **una sola página** con secciones + bloques protegidos para datos sensibles:

```
/settings/perfil
┌──────────────────────────────────────────────────┐
│ MI PERFIL                                        │
├──────────────────────────────────────────────────┤
│ Foto + nombre + cargo + email (read-only)        │
│                                                  │
│ [Sección "Datos personales"]                     │
│   1º/2º nombre, 1º/2º apellido, país nac,        │
│   doc tipo+num, fecha nac + edad, phone          │
│   [Guardar]                                      │
│                                                  │
│ [Sección "Contacto"]                             │
│   Dirección residencia                           │
│   Contacto emergencia (nombres/parentesco/phone) │
│   [Guardar]                                      │
│                                                  │
│ [Sección "Seguridad"]          🔒                │
│   Firma electrónica  [Editar firma]              │
│   PIN de seguridad   [Cambiar PIN]               │
│   (ambos requieren re-auth con password)         │
│                                                  │
│ [Sección "Mis documentos"]                       │
│   Listado + subir nuevo                          │
└──────────────────────────────────────────────────┘
```

**Seguridad para firma + PIN** (cambio respecto al diseño Bubble):

- Los campos NO se muestran en el form regular.
- Botones separados "Editar firma" y "Cambiar PIN" disparan un **re-auth dialog** que pide la contraseña de login antes de permitir ver/editar.
- El PIN nunca se renderiza en claro — sólo un input con máscara al momento de editar, nunca se muestra el valor actual.
- Aplica tanto en **/settings/perfil** (self-service) como en **/users/[id]/edit** (admin).

---

## 5.2 Cobertura actual de datos (revelevante para priorización)

| Campo | CISE (101) | GRUAS (218) | Comentario |
|---|---|---|---|
| signature_url | 94 (93%) | 33 (15%) | Importante. Si un user entra a firmar una entrega EPP y no puede editar firma, problema. |
| pin | 100 (99%) | 218 (100%) | Casi todos tienen. El bloque "Seguridad" debe funcionar. |
| contacto_emergencia_* | 13 (13%) | 1 (0.5%) | Poco poblado. Incluirlo como opcional en la sección Contacto sin bloquear. |
| middle_name | 63 (62%) | 57 (26%) | Mixto. El form debe exponer el campo. |
| second_last_name | 95 (94%) | 77 (35%) | Idem. |

---

## 5.3 Gaps

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Ruta /perfil self-service | No existe | **Falta módulo completo** | 🔴 | 4h |
| 2 | Wizard 3-step Inf/Contacto/Docs | — | Se reemplaza por página única seccionada (acordado) | — | incluido en #1 |
| 3 | Firma electrónica editable con pad | Sólo file-upload en user-form, sin re-auth | Necesitamos signature pad + re-auth | 🟡 pad · 🔴 re-auth | 3-4h pad + 1.5h re-auth |
| 4 | PIN editable con máscara | Sin UI | Input masked + re-auth | 🔴 | incluido en re-auth |
| 5 | Contacto emergencia en wizard | No renderizado | Baja densidad (13% + 0.5%). Incluir como opcional | 🟡 | 30 min |
| 6 | Documentos propios (step 3) | N/A | Reusar componente de /users/documents con filtro por user actual | 🟡 | 1h |

---

## 5.4 Resumen pre-cutover

### 🔴 BLOQUEA-CUTOVER (~5.5h)

1. **Ruta /settings/perfil con página única** (4h) — sin esto usuarios no pueden auto-gestionarse.
2. **Dialog de re-auth con password** (1.5h) — protege edición de firma y PIN (cross-módulo con admin `/users/[id]/edit`).

### 🟡 POST-CUTOVER (~5h)

- Signature pad canvas drawing (3-4h, cross-módulo con audits 02-terceros y 04-usuarios — un solo componente sirve para los 3 lugares).
- Contacto emergencia como sección opcional (30 min).
- Mis documentos self-service (1h).

---

## 5.5 Cross-módulo acumulado

- **Re-auth dialog** — **NUEVO componente** `components/common/re-auth-dialog.tsx` que pide password y devuelve token transitorio. Se reusa en:
  - /settings/perfil → botón "Editar firma" / "Cambiar PIN"
  - /users/[id]/edit → sección Seguridad (admin editando firma/PIN de otro usuario si tiene permisos, o sólo permitir self-edit)
- **Signature pad** — componente separado `components/common/signature-pad.tsx`. Reusa en: perfil, admin users edit, terceros personal.
- Ambos son parte del mismo sprint — hacerlos juntos amortiza.
