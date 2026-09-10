# Auditoría UI ↔ Datos — 13 · Perfil de Usuario

**Fecha:** 2026-09-10 · **Módulo 14/15** (roadmap original, ver `00-sidebar.md` fila 14 — ya marcado ⚪ Reorganizado: "Fuera del sidebar, patrón moderno")
**Fuente datos:** `profiles` (misma tabla ya auditada y cerrada en el piloto `01-usuarios.md`, 2026-07-14 — este módulo es una superficie de UI distinta (self-service) sobre datos ya cubiertos, no se re-audita cobertura de datos aquí)
**Fuente UI:** código en `app/(dashboard)/settings/perfil/**`, `components/perfil/**` (dev local)

> **Nota de alcance:** sin sesión en vivo contra Bubble (mismo patrón que 11-ventas.md/12-compras.md). La decisión de reorganización (perfil fuera del sidebar, accesible vía menú de avatar) ya estaba aceptada desde `00-sidebar.md` (2026-07-14), no es una DUDA nueva.

## Resumen Ejecutivo

Módulo de bajo riesgo, ya bien construido: 3 tabs (Datos personales, Seguridad, Documentos) cubren todo lo esperable de un perfil self-service. Reutiliza componentes ya auditados (`UserDocumentsManager` de Usuarios 01/15). Sin hallazgos de datos (cobertura ya verificada en el piloto de Usuarios). Un solo punto abierto (DUDA-PU-01, no bloqueante).

## UI — Cobertura por tab

| Tab | Contenido | Evaluación |
|---|---|---|
| **Datos personales** | Foto de perfil, nombres/apellidos, tipo+número de documento, fecha nacimiento, nacionalidad (con catálogo de países, prioriza Sudamérica), género, cargo, teléfono, dirección, contacto de emergencia (nombre/parentesco/celular). Email de solo lectura ("solo el administrador puede modificarlo"). | ✅ Completo — cubre todos los campos de `profiles` relevantes para autoedición |
| **Seguridad** | Cambio de contraseña (email de reset vía Supabase Auth), PIN de seguridad (4-6 dígitos, protege firmar informes — usado por `formatos_informes.pin_validado_at`), firma digital (upload de imagen). Ambos PIN y firma requieren re-autenticación (`ReAuthDialog`, confirma password) antes de desbloquear la edición. | ✅ Completo y con buena práctica de seguridad (re-auth antes de tocar PIN/firma) |
| **Documentos** | Reutiliza `UserDocumentsManager` — mismo componente ya auditado y cerrado en `01-usuarios.md` (sub-módulo Documentos). | ✅ Sin duplicación, reuso correcto (evita el patrón de implementación huérfana de Regla 2) |

## Acceso

- Único punto de entrada: menú de avatar (header) → "Perfil" → `/settings/perfil`. Decisión de reorganización ya aceptada en `00-sidebar.md` fila 14.
- Sin filtros/tablas/exportar en este módulo — el checklist v1.2 (embudo por columna, sin sort, exportar Excel) no aplica, no hay listados.

## DUDAs

| ID | Pregunta | Resolución |
|---|---|---|
| DUDA-PU-01 | ¿Bubble tenía preferencias de notificación por usuario (ej. email on/off por tipo de evento) dentro de Perfil? Hoy reportaweb3 solo tiene notificaciones a nivel tenant (`Configuración → Notificaciones`), no por usuario individual. No se pudo confirmar sin sesión en vivo de Bubble. | Pendiente — no bloqueante, queda documentado para cuando haya acceso a Bubble en vivo. |

## Gaps y tickets

Ninguno.

## Cierre

🟢 **Cerrado 2026-09-10.** DUDA-PU-01 documentada como no-bloqueante (Regla 6 — sesión sin acceso a Bubble en vivo), resto sin hallazgos.
