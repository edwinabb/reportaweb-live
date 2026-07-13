# Plan de Implementación — REPORTA App Móvil (reporta-app)

App para operarios de campo (internos y de terceros). Stack: Expo 54 + expo-router + expo-sqlite + Drizzle ORM + Supabase JS. Offline-first: toda acción se graba en SQLite local y se sincroniza cuando hay red.

---

## 1. Stack y Design System

| Capa | Tecnología |
|------|-----------|
| Framework | Expo 54 + expo-router |
| Local DB | expo-sqlite + Drizzle ORM |
| Backend | Supabase JS client |
| Sync | Outbox pattern + expo-background-fetch |
| Tipografías | Space Grotesk (headlines) + Work Sans (body) |
| Cámara | expo-camera + expo-image-picker |
| GPS | expo-location |
| Firma | expo-signature-canvas |
| Biometría | expo-local-authentication |
| PDF | expo-print + expo-sharing |
| Notificaciones | expo-notifications |

**Design System (mismos colores que la web):**
```
primary:    #FF5500   naranja REPORTA
background: #f7f9fb
text:       #191c1e
border:     #e0e3e5
error:      #ba1a1a
success:    #2e7d32
```

---

## 2. Arquitectura de Navegación

```
app/
├── login.tsx
├── (tabs)/
│   ├── _layout.tsx        ← Bottom tabs (4)
│   ├── hoy.tsx            ← Tab 1: Plan del Día
│   ├── reportar.tsx       ← Tab 2: Hub de acciones
│   ├── resumen.tsx        ← Tab 3: Resumen mensual + KPIs
│   └── perfil.tsx         ← Tab 4: Perfil + Mi EPP
└── (stack)/
    ├── llegada.tsx
    ├── salida.tsx
    ├── inicio-jornada.tsx
    ├── fin-jornada.tsx
    ├── checklist.tsx
    ├── combustible.tsx
    ├── parada.tsx
    ├── informe-personal.tsx
    ├── informe-maquinaria.tsx
    ├── epp-entregar.tsx        ← Pantalla A EPP
    ├── epp-mi-epp.tsx          ← Pantalla B EPP
    ├── epp-confirmar.tsx       ← Pantalla C EPP
    └── epp-respuesta-admin.tsx ← Pantalla D EPP
```

---

## 3. Pantalla: Login

```
┌─────────────────────────────────────┐
│  [Foto excavadora — clip diagonal]  │  h=309px
│  fade bottom a #f7f9fb             │
├─────────────────────────────────────┤
│         [Logo REPORTA]              │
│  Bienvenido                         │  Space Grotesk 24px/600
│  Accede a tu plataforma de...       │
│  CORREO ELECTRÓNICO                 │
│  [✉ usuario@reporta.com       ]     │  h=56 rounded-lg focus orange
│  CONTRASEÑA                         │
│  [🔒 ••••••••           👁 ]        │
│  ☐ Recordarme    ¿Olvidaste tu...?  │
│  [  INICIAR SESIÓN  →  ]            │  naranja full-width pill
│  @2026 REPORTA                      │
└─────────────────────────────────────┘
```

Auth: `supabase.auth.signInWithPassword`. Sesión persistida en AsyncStorage. Al login: pull catálogos (tareas ±7 días, maquinarias, perfil, EPP, festivos).

---

## 4. Tab 1: HOY — Plan del Día

```
┌─────────────────────────────────────┐
│  Viernes, 02 Mayo 2026              │
│  Buenos días, Edwin ☀              │
│  [🎌 Hoy: Día del Trabajo]          │  banner si festivo (app_calendario_festivos)
├─────────────────────────────────────┤
│  TAREA ACTIVA                       │
│  T-2026-0164  ●MEDIA                │
│  Camion pluma 12tn                  │
│  📍 Abengoa Perú S.A.               │
│  🕐 3 May — 7 May                   │
│  [▶ Registrar Llegada]              │  CTA naranja si no marcó llegada
├─────────────────────────────────────┤
│  PENDIENTE HOY                      │
│  ○ Checklist maquinaria             │
│  ○ Informe personal                 │
│  ○ Informe maquinaria               │
│  ○ EPP pendiente de confirmar 🦺    │
│  ○ Admin respondió observación EPP  │  si hay Pantalla D pendiente
├─────────────────────────────────────┤
│  COMPLETADO HOY                     │
│  ✓ Registro de llegada  08:05am     │
│  ✓ Combustible registrado           │
└─────────────────────────────────────┘
```

---

## 5. Tab 2: REPORTAR — Hub de Acciones

```
┌──────────────────┬──────────────────┐
│  📍 Registrar    │  🚪 Registrar    │
│     Llegada      │     Salida       │
├──────────────────┼──────────────────┤
│  ▶ Inicio de    │  ⏹ Fin de        │
│    Jornada       │    Jornada       │
├──────────────────┼──────────────────┤
│  ✅ Checklist    │  ⛽ Recarga de   │
│    Maquinaria    │    Combustible   │
├──────────────────┼──────────────────┤
│  🛑 Parada de   │  🔄 Reinicio de  │
│    Maquinaria    │    Maquinaria    │
├──────────────────┼──────────────────┤
│  👤 Informe      │  🚛 Informe      │
│    Personal      │    Maquinaria    │
├──────────────────┼──────────────────┤
│  🦺 Entregar     │  🦺 Confirmar    │
│     EPP          │     EPP  [🔴 2] │
└──────────────────┴──────────────────┘
```

Cards con estado contextual:
- Fin de Jornada: habilitada solo si hay Inicio de Jornada activo
- Reinicio Maquinaria: habilitada solo si hay Parada activa
- Registrar Salida: habilitada solo si hay Llegada registrada hoy
- Confirmar EPP: badge con entregas pendientes + respuestas admin no leídas

---

## 6. Pantalla: Registrar Llegada / Salida

GPS obligatorio (captura automática al abrir). Mínimo 1 foto obligatoria. Tabla: `app_asistencias`.

```
┌─────────────────────────────────────┐
│  ← Registrar Llegada                │
│  📅 Viernes 02 Mayo  |  08:03 AM    │  timestamp auto
│  🎯 Tarea  [T-2026-0164 ▼]         │
│  📍 GPS — Capturando...             │  auto-capture
│  📷 FOTOS  (mín. 1)                 │
│  [foto1] [foto2] [+]                │
│  [📷 Cámara]  [🖼 Galería]         │
│  Notas (opcional)                   │
│  [  REGISTRAR LLEGADA  ]            │
│  ⚡ Sin conexión — se sincronizará  │  banner si offline
└─────────────────────────────────────┘
```

---

## 7. Pantalla: Checklist Maquinaria

Tabla: `inspecciones`. Scroll vertical completo.

```
┌─────────────────────────────────────┐
│  ← Checklist Maquinaria             │  scroll vertical
│  [config] Empresa / Cliente / Tarea │  oculto si tenant desactiva
│  Fecha  [04/03/2026 📅]  (oblig.)   │
│  Maquinaria  [CISE-CP-01-026 ▼]    │  (oblig.)
│  ─── INSPECCIÓN ─────────────────  │
│  ¿Funcionan los indicadores?        │
│  ○ SI  ○ NO  ○ NO APLICA           │
│  (si NO → textarea observación)     │
│  ⚠ Se creará un plan de acción      │  badge si NO
│  ... N ítems del template ...       │
│  [config] OBSERVACIONES generales   │
│  [config] MEDIDORES antes/después   │
│  [config] DECLARACIÓN al pie        │
│  [  FIRMAR Y ENVIAR  ]  → PIN       │
└─────────────────────────────────────┘
```

**Puntaje:** `count(SI) / (total - count(NO APLICA)) * 100`

**Respuestas:** SI → verde / NO → rojo + observación / NO APLICA → gris

**Planes de acción automáticos:** cada ítem con NO genera un plan en el outbox con `origen = 'CHECKLIST'`, heredando tarea/maquinaria/cliente/sitio.

---

## 8. Pantalla: Recarga de Combustible

Tabla: `app_combustible`. GPS obligatorio.

```
┌─────────────────────────────────────┐
│  ← Recarga de Combustible           │
│  📅 02 Mayo 2026  |  14:30 PM       │
│  Maquinaria  [Camión Pluma ▼]       │
│  Combustible [Diesel ▼]             │
│  Galones [___]   Horómetro [___]    │
│  Grifo [_________________]          │
│  📷 Medidor ANTES  (oblig.)         │
│  📷 Horómetro      (oblig.)         │
│  📷 Medidor DESPUÉS (oblig.)        │
│  📷 Voucher         (opcional)      │
│  📍 GPS — OBLIGATORIO               │
│  [  REGISTRAR RECARGA  ]            │
└─────────────────────────────────────┘
```

---

## 9. Pantalla: Parada de Maquinaria

Tabla: `app_paradas`. GPS obligatorio. Mínimo 1 foto.

```
┌─────────────────────────────────────┐
│  ← Parada de Maquinaria             │
│  Maquinaria  [Camión Pluma ▼]       │
│  Hora inicio [14:45  auto]          │
│  MOTIVO                             │
│  ○ Mecánica ○ Eléctrica ○ Espera   │
│  ○ Clima    ○ Operativa ○ Otro      │
│  Descripción [___________________]  │
│  📷 FOTOS (mín. 1)                  │
│  📍 GPS auto                        │
│  [  REGISTRAR PARADA  ]             │
│  ── Paradas activas ──              │
│  🔴 14:45 Espera cliente (activa)   │
│  [MARCAR COMO RESUELTA]             │
└─────────────────────────────────────┘
```

---

## 10. Pantalla: Informe Personal

Tabla: `reportes_personal`. Scroll vertical completo.

```
┌─────────────────────────────────────┐
│  ← Informe Personal                 │
│  Fecha [02/05/2026 📅]  Tarea [▼]   │
│  Maquinaria [▼]                     │
│  ⚠ Este día es domingo/feriado      │  si aplica
│  ¿Descanso compensatorio?           │
│  ○ No (pago triple) ● Sí [fecha]    │
│  JORNADA 1  Inicio [07:00] Fin [13:00]│
│  JORNADA 2  Inicio [14:00] Fin [18:00]│
│  [+ Agregar jornada 3]              │
│  HORAS CALCULADAS (solo lectura)    │
│  Total: 10.0h  Normales: 8.0h       │
│  Extras 25%: 2.0h  Extras 35%: 0h  │
│  Dominicales: 0h                    │
│  Trabajo realizado [___________]    │
│  VIÁTICOS  Desayuno/Almuerzo/Cena/  │
│  Movilidad [S/ ___]                 │
│  📷 Foto trabajo (opcional)         │
│  FIRMA + PIN  [canvas] [••••]       │
│  [  ENVIAR INFORME  ]               │
└─────────────────────────────────────┘
```

**Flujo post-submit:** firma + PIN válidos → genera PDF con expo-print → guarda en outbox → comparte via expo-sharing → sube a Supabase Storage al sincronizar.

**Cálculo de horas (función `calcular-horas.ts`):**
```
total_raw = Σ (fin - inicio) jornadas
horas_normales               = min(total_raw, 8.0)
horas_extras                 = min(max(0, total_raw - 8.0), 2.0)   → 25%
horas_extras_extraordinarias = max(0, total_raw - 10.0)             → 35%
horas_dominicales            = total_raw si es domingo/festivo Y sin descanso compensatorio
```

---

## 11. Pantalla: Informe Maquinaria

Tabla: `reportes_maquinaria`. Scroll vertical completo.

```
┌─────────────────────────────────────┐
│  ← Informe Maquinaria               │
│  ── INFO TAREA (solo lectura) ──    │
│  Tarea / Cliente / RUC / Sitio      │
│  Fecha [04/03/2026 📅]              │
│  Maquinaria [CISE-CP-01-026 ▼]     │
│  ── PERSONAL ──                     │
│  Operador/Chofer * [▼]              │
│  Rigger 1 (opc.) [▼]               │
│  Rigger 2 (opc.) [▼]               │
│  ── JORNADAS ──                     │
│  J1  Inicio [07:00]  Fin [12:00]    │
│  J2  [toggle]  Inicio  Fin          │
│  Tipo recorrido: Ida/IdaVuelta/     │
│  Vuelta/N/A   Horas recorrido [▼]  │
│  TOTAL HORAS  9.0h (solo lectura)  │
│  [config] Guía de transporte        │
│  Trabajo realizado *                │
│  [config] Foto actividad            │
│  [config] Aceptación cliente        │
│  [config] Foto reporte escrito 2K   │
│  [config] Fotos adicionales         │
│  [  ENVIAR INFORME  ]               │
└─────────────────────────────────────┘
```

---

## 12. Módulo EPP — 4 Pantallas

### Pantalla A: Registrar Entrega de EPP
Acceso: Tab 2 → "🦺 Entregar EPP"

```
┌─────────────────────────────────────┐
│  ← Registrar Entrega de EPP         │  scroll vertical
│  Fecha [02/05/2026 📅]              │
│  Colaborador * [buscar nombre/DNI ▼]│
│  ── ÍTEMS EPP ──                    │
│  EPP: [Casco ▼]  Cant: [1]          │
│  Vence: auto (fecha + dias_renovac.)│
│  Tipo: EPP [🗑]                     │
│  [+ Agregar ítem]                   │
│  Observaciones (opcional)           │
│  ── CONFIRMACIÓN DEL RECEPTOR ──    │
│  PIN del colaborador [••••]         │  receptor ingresa en mismo dispositivo
│  [  REGISTRAR ENTREGA  ]            │  bloqueado sin PIN y sin ítems
└─────────────────────────────────────┘
```

### Pantalla B: Mi EPP — Stock personal
Acceso: Tab 4 → sección "Mi EPP"

```
┌─────────────────────────────────────┐
│  ← Mi EPP                           │  scroll vertical
│  🔴 VENCIDOS (2)                    │  expandido por defecto
│  🔴 Botas  Vció: 15/03  hace 48d    │
│  🟡 PRÓXIMOS A VENCER (1)           │
│  🟡 Chaleco  Vence: 20/05  en 17d   │
│  🟢 VIGENTES (5)                    │
│  🟢 Casco  Vence: 02/05/27  en 365d │
└─────────────────────────────────────┘
```

### Pantalla C: Confirmar Recepción (ítem por ítem)
Acceso: Tab 2 → "🦺 Confirmar EPP" (badge con cantidad)

```
┌─────────────────────────────────────┐
│  ← Confirmar recepción de EPP       │  scroll vertical
│  Entrega del 02/05/2026             │
│  Por: Luis García                   │
│  ── Revisá cada ítem ──────────    │
│  [✅] Casco  Cant:1  Vence 02/05/27 │  checkbox
│  [✅] Guantes  Cant:2               │
│  [⬜] Botas  Cant:1                 │  desmarcado → expande:
│    Motivo:                          │
│    ○ No lo recibí                   │
│    ● Llegó con daños                │
│    ○ Cantidad incorrecta ○ Otro     │
│    Nota: [La suela está despegada]  │
│  ── Resumen ──                      │
│  ✅ 2 de 3 ítems OK  ⚠ 1 observado │
│  PIN personal [••••]                │
│  [  CONFIRMAR RECEPCIÓN  ]          │
└─────────────────────────────────────┘
```

Motivos disponibles: No lo recibí / Llegó con daños / Cantidad incorrecta / Otro

### Pantalla D: Respuesta del Admin
Acceso: Tab 1 pendientes / notificación push

```
┌─────────────────────────────────────┐
│  ← Respuesta del admin — EPP        │
│  Entrega del 02/05/2026             │
│  ✅ Casco — Confirmado              │
│  ✅ Guantes — Confirmado            │
│  🔄 Botas                           │  naranja = pendiente reenvío
│     Tu obs: "Llegó con daños"       │
│     Respuesta de Luis García:       │
│     "Te enviamos un par nuevo el    │
│      lunes."                        │
│     → Se programará nuevo envío     │  label según decision_admin
│  [  ENTENDIDO  ]                    │  cierra; no requiere PIN
└─────────────────────────────────────┘
```

Labels por decisión: REENVIAR → "Se programará nuevo envío" / ANULAR → "Este ítem fue anulado" / RESOLVER_OFFLINE → "Resuelto fuera del sistema"

---

## 13. Tab 3: Resumen Mensual + KPIs

```
┌─────────────────────────────────────┐
│  ← → Mayo 2026                      │  navegación mes
│  KPIs                               │
│  🟢 Puntualidad       94%           │
│  🟡 Cobertura reportes 87%          │
│  🟢 Checklists        100%          │
│  🔴 Paradas (hrs)     3.5h          │
│  💰 Viáticos totales  S/.950        │
│  [Gráfico barras — horas/semana]    │
│  HORAS: 164h total / 12h extra / 8h domin.
│  COMBUSTIBLE: 340 gal · S/. 3,400   │
│  GASTOS: Desy S/.320 / Almu S/.480  │
└─────────────────────────────────────┘
```

---

## 14. Tab 4: Perfil

```
┌─────────────────────────────────────┐
│  [Avatar 80px]                      │
│  Edwin Bolaños                      │
│  Super Admin · CISE PERU SAC        │
│  [📷 Cambiar foto]                  │
│  🔑 PIN de Seguridad         [→]    │
│  ✍ Firma Digital             [→]    │
│  🔒 Cambiar Contraseña       [→]    │
│  Datos personales (solo lectura)    │
│  ── MI EPP ──────────────── [→]    │
│  🔴 2 vencidos  🟡 1 próximo        │
│  🟢 5 vigentes                      │
│  [  CERRAR SESIÓN  ]                │
└─────────────────────────────────────┘
```

---

## 15. Arquitectura Offline-First

```
DEVICE (SQLite/Drizzle)         SERVER (Supabase)
─────────────────────           ─────────────────
PULL cada 15min:
  tareas + fechas + recursos ←──────────────────
  maquinarias ←─────────────────────────────────
  perfil + company ←────────────────────────────
  EPP stock propio ←────────────────────────────
  festivos ←────────────────────────────────────

PUSH outbox (inmediato o cola):
  app_asistencias ──────────────────────────────→
  app_paradas ──────────────────────────────────→
  app_combustible ──────────────────────────────→
  reportes_personal + PDF ──────────────────────→
  reportes_maquinaria ──────────────────────────→
  inspecciones + planes_accion ─────────────────→
  sst_epp_entrega/item/movimiento ──────────────→
```

**Idempotencia:** `uuid_local` en cada registro. Servidor: `ON CONFLICT (uuid_local) DO NOTHING`.

**Retry:** 5s → 15s → 30s → 2min → 5min. Máximo 10 intentos.

---

## 16. Orden de Implementación Sugerido

1. Auth + perfil básico (login → home con nombre)
2. Pull catálogos (tareas, maquinarias, perfil, festivos)
3. Tab HOY — plan del día (read-only primero)
4. Llegada / Salida (outbox básico)
5. Recarga combustible
6. Parada de maquinaria + Reinicio
7. Informe personal (form + horas auto + firma + PDF)
8. Informe maquinaria
9. Checklist (formatos dinámico + planes de acción)
10. EPP — Pantallas A, B, C, D
11. Tab Resumen + KPIs
12. Perfil: cambio foto, firma, PIN
13. Sync completo offline + retry + banner
14. Notificaciones push (EPP, planes de acción)
