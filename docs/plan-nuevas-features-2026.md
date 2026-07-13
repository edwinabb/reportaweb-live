# Plan de Nuevas Features — REPORTA 2026

**Versión:** 1.0  
**Fecha:** 2026-05-11  
**Autor:** Edwin Abb  
**Estado:** Borrador para revisión

---

## Índice

1. [Feature 1: Offline-First Web](#feature-1-offline-first-web)
   - [Descripción](#f1-descripción)
   - [Flujos de usuario](#f1-flujos-de-usuario)
   - [Wireframes](#f1-wireframes)
   - [Diseño técnico](#f1-diseño-técnico)
   - [Schema DB](#f1-schema-db)
   - [Estimación de esfuerzo](#f1-estimación-de-esfuerzo)
   - [Dependencias](#f1-dependencias)

2. [Feature 2: Web Responsive (3 breakpoints)](#feature-2-web-responsive-3-breakpoints)
   - [Descripción](#f2-descripción)
   - [Flujos de usuario](#f2-flujos-de-usuario)
   - [Wireframes](#f2-wireframes)
   - [Diseño técnico](#f2-diseño-técnico)
   - [Estimación de esfuerzo](#f2-estimación-de-esfuerzo)
   - [Dependencias](#f2-dependencias)

3. [Feature 3: App en Play Store](#feature-3-app-en-play-store)
   - [Descripción](#f3-descripción)
   - [Flujos de usuario](#f3-flujos-de-usuario)
   - [Wireframes](#f3-wireframes)
   - [Diseño técnico](#f3-diseño-técnico)
   - [Estimación de esfuerzo](#f3-estimación-de-esfuerzo)
   - [Dependencias](#f3-dependencias)

4. [Feature 4: Correos desde la App](#feature-4-correos-desde-la-app)
   - [Descripción](#f4-descripción)
   - [Flujos de usuario](#f4-flujos-de-usuario)
   - [Wireframes](#f4-wireframes)
   - [Diseño técnico](#f4-diseño-técnico)
   - [Schema DB](#f4-schema-db)
   - [Estimación de esfuerzo](#f4-estimación-de-esfuerzo)
   - [Dependencias](#f4-dependencias)

5. [Tabla resumen y priorización](#tabla-resumen-y-priorización)

---

## Feature 1: Offline-First Web

### F1 Descripción

La web admin de REPORTA debe funcionar sin conexión a internet. El objetivo es garantizar que operadores de campo (con conectividad intermitente o nula) puedan continuar registrando datos críticos — principalmente en planificación, checklists y partes diarios — y que esos registros se sincronicen automáticamente al recuperar conexión.

**Alcance:**

| Módulo | Offline Read | Offline Write |
|--------|-------------|--------------|
| Planificación (calendario + tareas) | Sí | Sí (crear/editar tarea) |
| Formatos / Checklist | Sí (catálogos) | Sí (completar checklist) |
| Maquinaria | Sí (catálogo) | No |
| Personal / Colaboradores | Sí (catálogo) | No |
| Terceros / Clientes | Sí (catálogo) | No |
| Cotizaciones | No | No |
| Ventas / Compras | No | No |
| EPP | No | No |
| Settings | Sí (solo lectura config) | No |

**Fuera de alcance:** Módulos financieros (cotizaciones, ventas, compras) — requieren validación en tiempo real. Reportes PDF.

---

### F1 Flujos de usuario

**Flujo A — Login con carga inicial de datos:**

```
1. Usuario ingresa credenciales → clic "Ingresar"
2. Supabase Auth valida (requiere conexión)
3. Aparece pantalla de progreso: "Sincronizando datos..."
4. Se descargan en background: maquinarias, personal, terceros,
   job_titles, tareas (últimos 3 meses), cargo_permisos, config tenant
5. Progreso barra: [============================] 100%
6. Redirige al dashboard normal
```

**Flujo B — Operación offline (conexión perdida):**

```
1. Header muestra badge rojo "Sin conexión"
2. Usuario navega a Planificación → carga desde IndexedDB
3. Usuario crea/edita una tarea → se guarda localmente en outbox
4. Toast: "Guardado localmente. Se sincronizará al reconectar."
5. Badge en icono de sync muestra número de cambios pendientes
```

**Flujo C — Reconexión y sincronización:**

```
1. Se detecta reconexión (navigator.onLine + ping activo)
2. Header cambia badge a amarillo "Sincronizando..."
3. Outbox se procesa: cada write pendiente ejecuta Server Action
4. Si hay conflicto (registro editado en otro dispositivo):
   - Estrategia: "last write wins" por updated_at
   - Toast de advertencia: "1 registro actualizado por otro usuario"
5. Badge verde "Sincronizado" por 5 segundos, luego desaparece
```

**Flujo D — Sincronización incremental (usuario conectado):**

```
1. Cada 5 minutos en background: fetch cambios desde Supabase
   (WHERE updated_at > last_sync_at)
2. Actualiza IndexedDB silenciosamente
3. Si usuario está viendo datos actualizados: re-render automático
   (React Query / SWR revalidation)
```

**Flujo E — Carga fallida post-login:**

```
1. Error de red durante descarga inicial
2. Toast: "No se pudo sincronizar algunos datos. Modo offline limitado."
3. Se usa lo que haya en caché previo (si existe)
4. Botón "Reintentar sincronización" en header
```

---

### F1 Wireframes

**Pantalla de carga post-login (progreso de sincronización):**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [LOGO REPORTA]                       │
│                                                         │
│              Preparando tu espacio de trabajo           │
│                                                         │
│   ┌───────────────────────────────────────────────┐     │
│   │ ████████████████████████░░░░░░░░░░░░░░░░░░░░ │     │
│   └───────────────────────────────────────────────┘     │
│                    68% completado                       │
│                                                         │
│   ✓  Perfil y permisos                                  │
│   ✓  Configuración empresa                              │
│   ✓  Maquinaria (47 equipos)                            │
│   ✓  Personal (23 colaboradores)                        │
│   ⟳  Tareas planificación (últimos 3 meses)...          │
│   ○  Terceros y clientes                                │
│   ○  Catálogos EPP                                      │
│                                                         │
│        Este proceso solo ocurre la primera vez          │
│           o cuando hay nuevos datos que cargar          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Header — indicadores de estado de conexión:**

```
CONECTADO (normal — sin badge):
┌────────────────────────────────────────────────────────────────┐
│ [≡] REPORTA  Planificación  │ Buscador... │  [⚙] [🔔] [👤 JR] │
└────────────────────────────────────────────────────────────────┘

OFFLINE — cambios pendientes:
┌────────────────────────────────────────────────────────────────┐
│ [≡] REPORTA  Planificación  │ [🔴 Sin conexión]  │ [↑3] [👤 JR]│
└────────────────────────────────────────────────────────────────┘
                                  ^                  ^
                                  Badge rojo         Outbox badge
                                  siempre visible    (3 pendientes)

SINCRONIZANDO:
┌────────────────────────────────────────────────────────────────┐
│ [≡] REPORTA  Planificación  │ [🟡 Sincronizando...]│ [↑0] [👤]│
└────────────────────────────────────────────────────────────────┘

SINCRONIZADO (5s luego desaparece):
┌────────────────────────────────────────────────────────────────┐
│ [≡] REPORTA  Planificación  │ [🟢 Sincronizado]   │      [👤] │
└────────────────────────────────────────────────────────────────┘
```

**Panel de outbox (clic en badge de cambios pendientes):**

```
┌──────────────────────────────────────────────────┐
│  Cambios pendientes de sincronizar          [×]  │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  │
│  │ ↑  Tarea "Mantto. grúa GR-01"             │  │
│  │    Editada hace 23 min    [Planificación]  │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │ ↑  Checklist "Inspección diaria #2847"    │  │
│  │    Completado hace 1h     [Formatos]       │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │ ↑  Tarea "OT-0482 - Faena Sur"            │  │
│  │    Creada hace 2h         [Planificación]  │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  Se sincronizará automáticamente al reconectar   │
│                                  [Reintentar]    │
└──────────────────────────────────────────────────┘
```

**Toast de conflicto:**

```
┌──────────────────────────────────────────────────┐
│  ⚠  Conflicto al sincronizar                    │
│  "Tarea OT-0477" fue editada por otro usuario.  │
│  Se conservó la versión más reciente.           │
│                         [Ver detalle]  [Cerrar] │
└──────────────────────────────────────────────────┘
```

---

### F1 Diseño técnico

#### Stack seleccionado

**Dexie.js** (wrapper de IndexedDB) — razón: API reactiva con `useLiveQuery()`, soporte TypeScript nativo, manejo de versiones/migraciones de schema, peso ~40KB gzip.

**No se usa Service Worker** para writes — los Server Actions de Next.js no son REST, por lo que no se puede interceptar con SW. El SW se usa solo para cache de assets estáticos y páginas shell.

#### Arquitectura de capas

```
┌─────────────────────────────────────────────────────┐
│                  Componentes React                  │
│         useLiveQuery() / useOfflineData()           │
├─────────────────────────────────────────────────────┤
│              Capa de abstracción                    │
│     lib/offline/data-service.ts                     │
│   getAll() → IndexedDB si offline, Supabase si on   │
├──────────────────┬──────────────────────────────────┤
│   IndexedDB      │      Supabase                    │
│   (Dexie.js)     │   (Server Actions)               │
│                  │                                  │
│   - maquinaria   │   - Auth                         │
│   - personal     │   - Writes (cuando online)       │
│   - tareas       │   - Sync incremental             │
│   - outbox       │                                  │
└──────────────────┴──────────────────────────────────┘
```

#### Schema IndexedDB (Dexie)

```typescript
// lib/offline/db.ts
import Dexie, { Table } from 'dexie'

export class ReportaOfflineDB extends Dexie {
  maquinaria!: Table<MaquinariaLocal>
  personal!: Table<PersonalLocal>
  terceros!: Table<TerceroLocal>
  tareas!: Table<TareaLocal>
  job_titles!: Table<JobTitleLocal>
  cargo_permisos!: Table<CargoPermisoLocal>
  config_tenant!: Table<ConfigTenantLocal>
  outbox!: Table<OutboxItem>
  sync_meta!: Table<SyncMeta>

  constructor() {
    super('reporta_offline_v1')
    this.version(1).stores({
      maquinaria:    'id, tenant_id, updated_at',
      personal:      'id, tenant_id, updated_at',
      terceros:      'id, tenant_id, updated_at',
      tareas:        'id, tenant_id, fecha_inicio, updated_at',
      job_titles:    'id, tenant_id',
      cargo_permisos:'id, cargo_id, tenant_id',
      config_tenant: 'tenant_id',
      outbox:        '++id, tabla, record_id, created_at, status',
      sync_meta:     'tabla',
    })
  }
}

export interface OutboxItem {
  id?: number
  tabla: string
  record_id: string
  operacion: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Record<string, unknown>
  created_at: string
  status: 'pending' | 'syncing' | 'error'
  error_msg?: string
  retry_count: number
}

export interface SyncMeta {
  tabla: string
  last_sync_at: string // ISO timestamp
}
```

#### Flujo de sincronización incremental

```typescript
// lib/offline/sync.ts
export async function syncTable(
  tabla: string,
  fetchFn: (since: string) => Promise<unknown[]>,
  db: ReportaOfflineDB
) {
  const meta = await db.sync_meta.get(tabla)
  const since = meta?.last_sync_at ?? '1970-01-01T00:00:00Z'
  
  const rows = await fetchFn(since)
  
  if (rows.length > 0) {
    await db.table(tabla).bulkPut(rows)
    await db.sync_meta.put({
      tabla,
      last_sync_at: new Date().toISOString()
    })
  }
}
```

#### Server Action para sync (con `updated_at` delta)

```typescript
// lib/actions/offline-sync.ts
'use server'
export async function syncMaquinaria(tenantId: string, since: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('maquinarias')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('updated_at', since)
  return data ?? []
}
```

#### Outbox processor

```typescript
// lib/offline/outbox-processor.ts
export async function processOutbox(db: ReportaOfflineDB) {
  const pending = await db.outbox
    .where('status').equals('pending')
    .sortBy('created_at')
  
  for (const item of pending) {
    await db.outbox.update(item.id!, { status: 'syncing' })
    try {
      await applyServerAction(item)
      await db.outbox.delete(item.id!)
    } catch (err) {
      await db.outbox.update(item.id!, {
        status: 'error',
        error_msg: String(err),
        retry_count: item.retry_count + 1
      })
    }
  }
}
```

#### Hook de detección de conexión

```typescript
// lib/offline/use-network-status.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  useEffect(() => {
    const handleOnline = async () => {
      // Ping real para evitar falsos positivos (captive portals)
      try {
        await fetch('/api/ping', { cache: 'no-store' })
        setIsOnline(true)
      } catch { setIsOnline(false) }
    }
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return isOnline
}
```

#### Archivos a crear/modificar

```
lib/offline/
  db.ts                    — Schema Dexie
  sync.ts                  — Sincronización incremental
  outbox-processor.ts      — Procesador de cola de writes
  use-network-status.ts    — Hook estado de conexión
  data-service.ts          — Abstracción read online/offline
  sync-on-login.ts         — Carga inicial post-login

lib/actions/
  offline-sync.ts          — Server Actions para sync delta

components/offline/
  SyncStatusBadge.tsx      — Badge en header
  OutboxPanel.tsx          — Panel de cambios pendientes
  SyncProgressScreen.tsx   — Pantalla de carga post-login

app/
  login/page.tsx           — Modificar: iniciar sync post-auth
  layout.tsx               — Agregar: OutboxPanel, SyncStatusBadge

api/ping/route.ts          — Endpoint de health check para detectar conexión real
```

---

### F1 Schema DB

No requiere cambios en Supabase (schema existente). Solo schema local IndexedDB descrito arriba.

Se agrega una tabla opcional en Supabase para auditoría de conflictos:

```sql
-- Tabla de log de conflictos de sincronización (opcional, auditoría)
CREATE TABLE IF NOT EXISTS sync_conflict_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES companies(id),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  tabla        TEXT NOT NULL,
  record_id    UUID NOT NULL,
  version_local JSONB,
  version_server JSONB,
  resolucion   TEXT DEFAULT 'server_wins',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sync_conflict_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant isolation" ON sync_conflict_log
  USING (tenant_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

---

### F1 Estimación de esfuerzo

| Tarea | Días |
|-------|------|
| Setup Dexie.js, schema IndexedDB, migraciones | 1.5 |
| Server Actions para sync delta (todas las tablas) | 2.0 |
| Pantalla de carga post-login (`SyncProgressScreen`) | 1.0 |
| Hook `useNetworkStatus` + ping endpoint | 0.5 |
| `SyncStatusBadge` + `OutboxPanel` en header | 1.0 |
| `data-service.ts` — abstracción read online/offline | 1.5 |
| Integración en módulo Planificación (offline read+write) | 2.5 |
| Integración en módulo Formatos/Checklist (offline write) | 2.0 |
| Outbox processor + manejo de conflictos | 2.0 |
| Sync incremental en background (5 min interval) | 1.0 |
| Testing offline (PWA DevTools, throttle) + bugfixes | 2.0 |
| **Total estimado** | **17 días** |

Rango honesto: 15–22 días. El mayor riesgo es la integración con Server Actions (Next.js no expone REST directamente).

---

### F1 Dependencias

- `dexie` v4 + `dexie-react-hooks`
- Ningún cambio de schema Supabase obligatorio
- Prerequisito: los módulos de Planificación y Formatos deben estar estabilizados (sin cambios de schema grandes pendientes)
- Feature 2 (Responsive) es independiente y puede ejecutarse en paralelo
- El outbox de la app móvil (SQLite/Drizzle) sirve como referencia de implementación — revisar `c:\Proyectos\reporta-app\lib\services`

---

---

## Feature 2: Web Responsive (3 breakpoints)

### F2 Descripción

La web admin actualmente está diseñada exclusivamente para desktop. El objetivo es hacerla completamente usable en los 3 formatos:

- **Phone** (`sm`): < 640px — acceso rápido desde campo, operaciones básicas
- **Tablet** (`md`): 640px – 1024px — uso completo, navegación compacta
- **Desktop** (`lg`+): > 1024px — experiencia actual sin cambios disruptivos

**Convenciones Tailwind para este proyecto:**

```
sm: → phone     (< 640px)   — mobile-first, sin prefijo = phone
md: → tablet    (≥ 640px)
lg: → desktop   (≥ 1024px)
xl: → wide      (≥ 1280px)
```

Se usa enfoque **mobile-first**: el CSS base es para phone, se agrega complejidad en `md:` y `lg:`.

---

### F2 Flujos de usuario

**Flujo A — Phone: acceso a listado de tareas**

```
1. Usuario abre reporta.app en celular
2. Ve sidebar oculto (hamburger en top-left)
3. Ve tabla convertida en tarjetas verticales
4. Toca una tarjeta → abre dialog full-screen
5. Edita campos en form de 1 columna → Guardar
6. Vuelve al listado
```

**Flujo B — Tablet: navegación con rail**

```
1. Usuario abre en tablet (landscape o portrait)
2. Sidebar reducido a rail (iconos + tooltips)
3. Toca ícono "Planificación" → navega
4. Ve tabla con columnas prioritarias (las menos importantes ocultas)
5. Toca fila → dialog de tamaño estándar (no full-screen)
```

**Flujo C — Phone: timeline de planificación**

```
1. Usuario navega a Planificación
2. Vista semanal del timeline colapsada a 1 día visible
3. Swipe horizontal para ver otros días
4. Toca bloque → mini-card con detalle
5. Botón "Vista lista" para cambiar a listado de tareas del día
```

---

### F2 Wireframes

#### Sidebar — 3 variantes

**Phone (oculto por defecto — hamburger menu):**

```
┌─────────────────────────────────────┐
│ [≡]  REPORTA              [🔔] [👤] │  ← Header fijo
└─────────────────────────────────────┘
│                                     │
│         [Contenido principal]       │
│                                     │

Al tocar [≡]:
┌──────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐     │
│ │ [×]   REPORTA                                │     │
│ │       CISE Grúas                             │     │
│ │ ──────────────────────────────────────────── │     │
│ │   📅  Planificación                          │     │
│ │   💰  Cotizaciones                           │     │
│ │   📊  Ventas                                 │     │
│ │   🛒  Compras                                │     │
│ │   📋  Formatos                               │     │
│ │   🦺  EPP                                    │     │
│ │   👥  Terceros                               │     │
│ │   🚛  Maquinaria                             │     │
│ │   👤  Usuarios                               │     │
│ │   ✅  Planes de Acción                       │     │
│ │   🎫  Soporte                                │     │
│ │ ──────────────────────────────────────────── │     │
│ │   ⚙   Settings                              │     │
│ └──────────────────────────────────────────────┘     │
│ [Área oscura — toca para cerrar]                     │
└──────────────────────────────────────────────────────┘
Implementación: sheet/drawer desde la izquierda (Radix Sheet)
Overlay oscuro cubre el contenido
```

**Tablet (rail — iconos + label corto):**

```
┌──────┬────────────────────────────────────────┐
│  R   │  Header: REPORTA          [🔔] [👤]   │
├──────┼────────────────────────────────────────┤
│  📅  │                                        │
│ Plan │                                        │
│  💰  │                                        │
│ Cot. │         [Contenido principal]          │
│  📊  │                                        │
│ Ven. │                                        │
│  🛒  │                                        │
│ Com. │                                        │
│  📋  │                                        │
│ Form │                                        │
│  🦺  │                                        │
│ EPP  │                                        │
│  👥  │                                        │
│ Ter. │                                        │
│  🚛  │                                        │
│ Maq. │                                        │
│      │                                        │
│  ⚙  │                                        │
│ Set. │                                        │
└──────┴────────────────────────────────────────┘
Ancho rail: 64px
Tooltip al hover: nombre completo del módulo
Item activo: fondo primario + texto coloreado
```

**Desktop (sidebar completo — estado actual):**

```
┌────────────────┬───────────────────────────────────────────┐
│  REPORTA       │  Header                      [🔔] [👤 JR] │
│  CISE Grúas    ├───────────────────────────────────────────┤
├────────────────┤                                           │
│ 📅 Planif...   │                                           │
│ 💰 Cotizac...  │                                           │
│ 📊 Ventas      │         [Contenido principal]             │
│ 🛒 Compras     │                                           │
│ 📋 Formatos    │                                           │
│ 🦺 EPP         │                                           │
│ 👥 Terceros    │                                           │
│ 🚛 Maquinaria  │                                           │
│ 👤 Usuarios    │                                           │
│ ✅ Planes AC.  │                                           │
│ 🎫 Soporte     │                                           │
├────────────────┤                                           │
│ ⚙  Settings   │                                           │
└────────────────┴───────────────────────────────────────────┘
Ancho: 240px (actual)
```

---

#### Listado/Tabla — 3 variantes

**Phone (tarjetas verticales):**

```
┌─────────────────────────────────────┐
│ Maquinaria                    [+ ]  │
│ ┌─────────────────────────────────┐ │
│ │ Búsqueda...               [🔍] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ GR-01 · Grúa Telescópica        │ │
│ │ Liebherr LTM 1100 · 2019        │ │
│ │ 🟢 Operativa          [Ver >]  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ GR-02 · Grúa Articulada         │ │
│ │ Tadano ATF 130G-5 · 2021        │ │
│ │ 🟡 Mantenimiento      [Ver >]  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ EX-01 · Excavadora              │ │
│ │ Caterpillar 320 · 2020          │ │
│ │ 🔴 Fuera de servicio  [Ver >]  │ │
│ └─────────────────────────────────┘ │
│                                     │
│            [Cargar más]             │
└─────────────────────────────────────┘
Implementación: ocultar <Table> en sm:, mostrar lista de cards
Cada card: componente MaquinariaCard con props del row
```

**Tablet (tabla con columnas prioritarias):**

```
┌──────┬──────────────────────────────────────────────────────────┐
│ Rail │                                                          │
│      │  Maquinaria                              [+ Nueva]       │
│      │  ┌────────────────────────────────────────────────────┐  │
│      │  │ Búsqueda...                              [🔍]      │  │
│      │  └────────────────────────────────────────────────────┘  │
│      │  ┌──────────┬─────────────────┬──────────┬──────────┐    │
│      │  │ Código   │ Descripción     │ Tipo     │ Estado   │    │
│      │  ├──────────┼─────────────────┼──────────┼──────────┤    │
│      │  │ GR-01    │ Grúa Telescó... │ Grúa     │ 🟢 Op.  │    │
│      │  │ GR-02    │ Grúa Articul... │ Grúa     │ 🟡 Mto. │    │
│      │  │ EX-01    │ Excavadora      │ Excav.   │ 🔴 F.S. │    │
│      │  └──────────┴─────────────────┴──────────┴──────────┘    │
│      │  [Columnas ocultas: Marca, Modelo, Año — ver en detalle]  │
└──────┴──────────────────────────────────────────────────────────┘
Columnas ocultas con class "hidden md:table-cell" / "hidden lg:table-cell"
Scroll horizontal disponible si overflow
```

**Desktop (tabla completa — estado actual):**

```
┌────────────┬────────────────────────────────────────────────────────────────┐
│  Sidebar   │  Maquinaria                                       [+ Nueva]    │
│  completo  │  ┌────────────────────────────────────────────────────────┐    │
│            │  │ Búsqueda...   [Tipo ▼]  [Estado ▼]          [🔍]      │    │
│            │  └────────────────────────────────────────────────────────┘    │
│            │  ┌──────┬─────────────────┬──────┬───────┬──────┬────────┐    │
│            │  │ Cód. │ Descripción     │ Tipo │ Marca │ Año  │ Estado │    │
│            │  ├──────┼─────────────────┼──────┼───────┼──────┼────────┤    │
│            │  │ GR01 │ Grúa Telescó... │ Grúa │ Lieb. │ 2019 │ 🟢 Op │    │
│            │  │ GR02 │ Grúa Articul... │ Grúa │ Tad.  │ 2021 │ 🟡 Mt │    │
│            │  │ EX01 │ Excavadora      │ Exc. │ CAT   │ 2020 │ 🔴 FS │    │
│            │  └──────┴─────────────────┴──────┴───────┴──────┴────────┘    │
└────────────┴────────────────────────────────────────────────────────────────┘
```

---

#### Dialog / Form — 3 variantes

**Phone (full-screen):**

```
┌─────────────────────────────────────┐
│ [← Volver]   Nueva Tarea            │  ← Header fijo
├─────────────────────────────────────┤
│                                     │
│  Descripción *                      │
│  ┌─────────────────────────────────┐│
│  │ Mantención preventiva GR-01    ││
│  └─────────────────────────────────┘│
│                                     │
│  Fecha inicio *                     │
│  ┌─────────────────────────────────┐│
│  │ 11/05/2026                 [📅]││
│  └─────────────────────────────────┘│
│                                     │
│  Maquinaria *                       │
│  ┌─────────────────────────────────┐│
│  │ GR-01 Grúa Telescópica     [▼] ││
│  └─────────────────────────────────┘│
│                                     │
│  Responsable                        │
│  ┌─────────────────────────────────┐│
│  │ Juan Rodríguez             [▼] ││
│  └─────────────────────────────────┘│
│                                     │
│  Cliente (Tercero)                  │
│  ┌─────────────────────────────────┐│
│  │ CISA Minera S.A.           [▼] ││
│  └─────────────────────────────────┘│
│                                     │
│  Observaciones                      │
│  ┌─────────────────────────────────┐│
│  │                                ││
│  │                                ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│ [Cancelar]              [Guardar]   │  ← Footer fijo
└─────────────────────────────────────┘
Implementación: Radix Dialog con className="sm:max-w-full sm:h-full sm:rounded-none"
```

**Tablet (dialog estándar, 2 columnas):**

```
┌──────┬─────────────────────────────────────────────────────────┐
│ Rail │  ┌───────────────────────────────────────────────────┐  │
│      │  │  Nueva Tarea                                [×]   │  │
│      │  ├───────────────────────────────────────────────────┤  │
│      │  │                                                   │  │
│      │  │  Descripción *                                    │  │
│      │  │  ┌───────────────────────────────────────────┐   │  │
│      │  │  │ Mantención preventiva GR-01               │   │  │
│      │  │  └───────────────────────────────────────────┘   │  │
│      │  │                                                   │  │
│      │  │  ┌──────────────────┐  ┌──────────────────────┐  │  │
│      │  │  │ Fecha inicio *   │  │ Maquinaria *          │  │  │
│      │  │  │ [11/05/2026 📅] │  │ [GR-01           ▼]  │  │  │
│      │  │  └──────────────────┘  └──────────────────────┘  │  │
│      │  │                                                   │  │
│      │  │  ┌──────────────────┐  ┌──────────────────────┐  │  │
│      │  │  │ Responsable      │  │ Cliente              │  │  │
│      │  │  │ [Juan R.     ▼] │  │ [CISA Minera...  ▼]  │  │  │
│      │  │  └──────────────────┘  └──────────────────────┘  │  │
│      │  │                                                   │  │
│      │  │  Observaciones                                    │  │
│      │  │  ┌───────────────────────────────────────────┐   │  │
│      │  │  │                                           │   │  │
│      │  │  └───────────────────────────────────────────┘   │  │
│      │  │                                                   │  │
│      │  │             [Cancelar]         [Guardar]          │  │
│      │  └───────────────────────────────────────────────────┘  │
└──────┴─────────────────────────────────────────────────────────┘
```

---

#### Timeline de Planificación — Phone y Tablet

**Phone (1 día visible, swipe horizontal):**

```
┌─────────────────────────────────────────┐
│  [←]  Lunes 11 May 2026  [→]   [Lista] │  ← Navegación de días
├─────────────────────────────────────────┤
│  07:00  ┌─────────────────────────────┐ │
│         │ GR-01 · Mantto. Preventivo  │ │
│         │ Juan R. · 8h               │ │
│         └─────────────────────────────┘ │
│  08:00  ┌─────────────────────────────┐ │
│         │ GR-02 · OT-482 Faena Sur    │ │
│         │ Carlos M. · 9h             │ │
│         └─────────────────────────────┘ │
│  09:00                                  │
│  10:00  ┌─────────────────────────────┐ │
│         │ EX-01 · Movimiento tierra   │ │
│         │ Pedro L. · 6h              │ │
│         └─────────────────────────────┘ │
│  11:00                                  │
│  12:00                                  │
│  ...                                    │
├─────────────────────────────────────────┤
│              [+ Nueva tarea]            │
└─────────────────────────────────────────┘

Vista Lista alternativa (botón [Lista]):
┌─────────────────────────────────────────┐
│  [←]  Lunes 11 May 2026  [→] [Timeline]│
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ GR-01 · Mantto. Preventivo       │  │
│  │ 07:00 – 15:00 · Juan R.          │  │
│  │ Cliente: CISA Minera      [Ver>] │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ GR-02 · OT-482 Faena Sur         │  │
│  │ 08:00 – 17:00 · Carlos M.        │  │
│  │ Cliente: Antapaccay       [Ver>] │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Tablet (3 días visibles, scroll horizontal suave):**

```
┌──────┬─────────────────────────────────────────────────────────┐
│ Rail │  Planificación — Semana 11-17 Mayo 2026                  │
│      │  [← Sem. ant.]                          [Sem. sig. →]   │
│      ├───────────┬───────────┬───────────┬──────────────────── │
│      │  Lun 11  │  Mar 12  │  Mié 13  │  [scroll →]           │
│      ├───────────┼───────────┼───────────┤                     │
│      │ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │                     │
│      │ │GR-01  │ │ │GR-01  │ │ │GR-02  │ │                     │
│      │ │Mto.   │ │ │OT-482 │ │ │Faena  │ │                     │
│      │ │8h     │ │ │9h     │ │ │9h     │ │                     │
│      │ └───────┘ │ └───────┘ │ └───────┘ │                     │
│      │ ┌───────┐ │           │ ┌───────┐ │                     │
│      │ │EX-01  │ │           │ │EX-01  │ │                     │
│      │ │Mov.   │ │           │ │Tierra │ │                     │
│      │ │6h     │ │           │ │6h     │ │                     │
│      │ └───────┘ │           │ └───────┘ │                     │
└──────┴───────────┴───────────┴───────────┴─────────────────────┘
overflow-x: auto en el contenedor del timeline
```

---

### F2 Diseño técnico

#### Convenciones Tailwind

```typescript
// tailwind.config.ts — breakpoints (mantener los de Tailwind, no customizar)
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
// CONVENCIÓN EN REPORTA:
// - Sin prefijo = mobile (phone < 640px)
// - sm: = tablet portrait (≥ 640px)  
// - md: = tablet landscape (≥ 768px)
// - lg: = desktop (≥ 1024px)
```

#### Patrones de implementación

**1. Sidebar responsive:**

```tsx
// components/layout/AppSidebar.tsx
export function AppSidebar() {
  return (
    <>
      {/* Phone: Sheet (drawer) */}
      <Sheet>
        <SheetTrigger className="lg:hidden" asChild>
          <Button variant="ghost" size="icon"><Menu /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      
      {/* Tablet: Rail fijo */}
      <nav className="hidden sm:flex lg:hidden w-16 flex-col border-r">
        <SidebarRail />
      </nav>
      
      {/* Desktop: Sidebar completo */}
      <nav className="hidden lg:flex w-60 flex-col border-r">
        <SidebarContent />
      </nav>
    </>
  )
}
```

**2. Tabla responsive:**

```tsx
// Ocultar columnas por breakpoint
<TableHead className="hidden lg:table-cell">Marca</TableHead>
<TableHead className="hidden md:table-cell">Año</TableHead>

// En phone: reemplazar con cards
<div className="sm:hidden space-y-3">
  {rows.map(row => <MaquinariaCard key={row.id} row={row} />)}
</div>
<div className="hidden sm:block">
  <Table>...</Table>
</div>
```

**3. Dialog responsive:**

```tsx
<DialogContent className={cn(
  "sm:max-w-lg",                              // tablet+: modal estándar
  "max-w-full h-full rounded-none sm:h-auto sm:rounded-lg" // phone: full screen
)}>
```

**4. Forms responsive:**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FormField name="fecha_inicio" ... />
  <FormField name="maquinaria" ... />
</div>
```

#### Plan de rollout por módulo

| Prioridad | Módulo | Complejidad | Días |
|-----------|--------|-------------|------|
| 1 | Layout base (sidebar, header) | Media | 2.0 |
| 2 | Maquinaria (listado + form) | Baja | 1.0 |
| 3 | Personal / Colaboradores | Baja | 1.0 |
| 4 | Terceros | Baja | 0.5 |
| 5 | Formatos / Checklist | Media | 1.5 |
| 6 | EPP | Baja | 1.0 |
| 7 | Cotizaciones (tabla + form) | Media | 2.0 |
| 8 | Ventas / Compras | Media | 2.0 |
| 9 | Usuarios + Settings | Media | 1.5 |
| 10 | Planes de Acción | Media | 1.5 |
| 11 | Planificación (timeline) | Alta | 4.0 |
| 12 | Dashboard | Media | 1.5 |
| — | QA cross-device (BrowserStack) | — | 2.0 |

**El timeline de planificación es el componente más complejo** por su naturaleza bidireccional (scroll horizontal + vertical). Se trabaja último para no bloquear el resto.

---

### F2 Estimación de esfuerzo

**Total estimado: 21 días**

Rango honesto: 18–26 días. El mayor riesgo es el timeline de planificación y los dialogs con formularios muy complejos (muchos campos interdependientes).

Nota: se puede hacer un release incremental módulo a módulo sin necesidad de entregar todo junto.

---

### F2 Dependencias

- No requiere cambios de backend ni schema
- Radix UI ya tiene soporte responsive nativo en Sheet/Dialog
- TanStack Table ya soporta column visibility — `columnVisibility` por breakpoint
- Prerequisito soft: tener Feature 1 (offline) estabilizado para no hacer doble refactor
- Testing: BrowserStack (5 dispositivos mínimo: iPhone SE, iPhone 14, iPad Air, Galaxy S23, Pixel 7)

---

---

## Feature 3: App en Play Store

### F3 Descripción

Publicar la aplicación REPORTA (Expo 54 / React Native) en Google Play Store para distribución oficial a los usuarios de CISE y GRUAS. Actualmente existe una APK debug generada localmente (83MB, debug keystore), lo que impide la distribución sin instalación manual.

**Objetivo:** APK / AAB de producción firmada con keystore productivo, publicada en Play Store (internal testing primero, luego producción).

**Package name definitivo:** `com.reporta.app`

---

### F3 Flujos de usuario

**Flujo de instalación para el usuario final:**

```
1. Admin envía link de Play Store al operador
2. Operador busca "REPORTA" en Play Store
3. Instala desde Play Store (sin habilitar "orígenes desconocidos")
4. Abre app → Login con credenciales Supabase
5. Onboarding si es primera vez
```

**Flujo de actualización (OTA vs full build):**

```
OTA update (Expo Updates — cambios JS/assets):
1. App inicia → verifica updates en background
2. Si hay update: descarga silenciosamente
3. Al siguiente reinicio de app: aplica update
4. Sin intervención del usuario, sin pasar por Play Store

Full build (cambios nativos — permisos, dependencias nativas):
1. Generar nuevo AAB con EAS Build
2. Subir a Play Console
3. Revisión Google (1-7 días para producción, <1h internal testing)
4. Rollout gradual: 10% → 50% → 100%
```

---

### F3 Wireframes

**Pantalla de actualización disponible (OTA manual si se quiere mostrar):**

```
┌─────────────────────────────────────────┐
│                                         │
│            [LOGO REPORTA]               │
│                                         │
│      Nueva versión disponible           │
│             v1.5.2 → v1.6.0             │
│                                         │
│  • Mejoras en planificación offline     │
│  • Corrección en cálculo de horas       │
│  • Nuevo reporte semanal por email      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      Actualizar ahora           │    │
│  └─────────────────────────────────┘    │
│                                         │
│         Más tarde (recordar en 24h)     │
│                                         │
└─────────────────────────────────────────┘
```

**Play Store listing (referencia visual del contenido):**

```
┌─────────────────────────────────────────┐
│  [←]  Google Play                       │
├─────────────────────────────────────────┤
│  ┌────┐                                 │
│  │    │  REPORTA - Gestión Operativa    │
│  │LOGO│  Reporta Technologies S.A.C.   │
│  └────┘  ★★★★★  |  +10 reseñas         │
│                                         │
│  [Instalar]                             │
│                                         │
│  ─────────────────────────────────────  │
│  Screenshots:                           │
│  [S1] [S2] [S3] [S4] [S5]              │
│                                         │
│  Descripción:                           │
│  REPORTA es la plataforma de gestión   │
│  operativa para empresas de grúas y    │
│  maquinaria pesada...                  │
│                                         │
│  Calificación de contenido: Para todos  │
│  Permisos: Cámara, Ubicación, Archivos  │
└─────────────────────────────────────────┘
```

---

### F3 Diseño técnico

#### Paso 1 — Preparar keystore de producción

```bash
# Generar keystore de producción (GUARDAR EN LUGAR SEGURO — 1Password)
keytool -genkeypair \
  -alias reporta-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore reporta-prod.keystore

# Información a completar:
# - CN (nombre): Reporta Technologies S.A.C.
# - OU: Engineering
# - O: Reporta Technologies S.A.C.
# - L: Lima
# - ST: Lima
# - C: PE

# CRÍTICO: hacer backup del .keystore + contraseña
# Si se pierde, NUNCA se puede actualizar la app en Play Store
```

#### Paso 2 — Configurar EAS Build

```bash
# En c:\Proyectos\reporta-app
npm install -g eas-cli
eas login  # cuenta Expo del proyecto

# Inicializar EAS
eas init
```

**`eas.json` configuración:**

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

#### Paso 3 — Configurar `app.json`

```json
{
  "expo": {
    "name": "REPORTA",
    "slug": "reporta-app",
    "version": "1.5.1",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "package": "com.reporta.app",
      "versionCode": 15100,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "expo-camera",
      "expo-location",
      ["expo-updates", {
        "url": "https://u.expo.dev/[project-id]"
      }]
    ],
    "updates": {
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/[project-id]"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "extra": {
      "eas": {
        "projectId": "[EAS_PROJECT_ID]"
      }
    }
  }
}
```

#### Paso 4 — Build de producción con EAS

```bash
# Build AAB para Play Store
eas build --platform android --profile production

# El proceso toma ~10-15 min en servidores EAS
# Resultado: .aab en https://expo.dev/accounts/.../builds/...
```

#### Paso 5 — Google Play Console

```
1. Crear cuenta Google Play Console (u$s 25, pago único)
   → Usar cuenta corporativa: admin@reportatechnologies.com

2. Crear aplicación:
   → Título: REPORTA - Gestión Operativa
   → Idioma: Español (Latinoamérica)
   → Tipo: App (no juego)
   → Distribución gratuita

3. Completar ficha de Play Store:
   → Descripción corta (80 chars): "Gestión operativa para grúas y maquinaria pesada"
   → Descripción larga (4000 chars): ver sección assets
   → Capturas de pantalla: 8 screenshots (ver checklist)
   → Icono de la app: 512×512px PNG
   → Imagen destacada: 1024×500px
   → Categoría: Productividad → Business

4. Configurar distribución:
   → Países: Perú (inicialmente)
   → Rating de contenido: completar cuestionario (resultado: Everyone)
   → Política de privacidad: URL (ver sección assets)

5. Subir AAB:
   → Internal testing → crear track
   → Subir el .aab generado por EAS
   → Agregar testers: emails de CISE + GRUAS

6. Publicar internal testing:
   → Revisión: casi inmediata para internal testing
   → Compartir link con testers
```

#### Checklist de assets necesarios

```
ÍCONOS:
[ ] icon.png — 1024×1024px, sin transparencia, fondo blanco/color
[ ] adaptive-icon.png — 1024×1024px (solo foreground, con padding 20%)
[ ] splash.png — 2048×2048px (logo centrado)
[ ] Play Store icon — 512×512px PNG (sin transparencia)

SCREENSHOTS (mínimo 2, máximo 8 por tipo de dispositivo):
[ ] Phone screenshots: 1080×1920px o 1242×2208px (mín. 2)
    - Pantalla de login
    - Dashboard / home
    - Planificación (calendar view)
    - Checklist en uso
    - Maquinaria listado

TEXTOS (Play Store):
[ ] Nombre de la app: "REPORTA - Gestión Operativa" (50 chars max)
[ ] Descripción corta: ≤ 80 caracteres
[ ] Descripción larga: ≤ 4000 caracteres
[ ] Novedades de la versión (changelog): ≤ 500 chars

LEGAL:
[ ] URL de Política de Privacidad (OBLIGATORIO para Play Store)
    Sugerencia: publicar en reporta.la/privacidad
[ ] URL de Términos de Servicio (recomendado)

TÉCNICO:
[ ] google-services.json (Firebase, si se usa Google Analytics)
[ ] Keystore de producción (guardado en 1Password)
[ ] Contraseña del keystore (guardada en 1Password)
[ ] Service Account JSON para Play Console API (para eas submit)
```

#### Estrategia de actualizaciones

```
TIER 1 — OTA Update (Expo Updates):
  Cuándo: cambios en lógica JS, UI, queries, textos
  Tiempo hasta usuario: minutos (siguiente apertura de app)
  Sin revisión de Google
  Comando: eas update --branch production --message "Fix: ..."

TIER 2 — Full Build (EAS Build + Play Console):
  Cuándo: nuevas dependencias nativas, cambios en permisos,
          upgrade de SDK, cambios en app.json
  Tiempo hasta usuario: 1-7 días (revisión Google)
  Comando: eas build --platform android --profile production
           eas submit --platform android

VERSIONADO:
  version: "1.5.1"      → semántico, para usuarios
  versionCode: 15100    → entero, para Play Store (debe incrementar siempre)
  Formato versionCode: MAJOR*10000 + MINOR*100 + PATCH
  Ejemplo: 1.6.0 → 16000, 1.6.1 → 16001
```

#### Timeline estimado

```
Semana 1:
  Día 1: Generar keystore producción + configurar EAS + app.json
  Día 2: Primer EAS Build (debug) → verificar que compila
  Día 3: Diseñar/preparar assets (iconos, screenshots, textos)
  Día 4: EAS Build production → generar AAB
  Día 5: Crear cuenta Play Console + configurar ficha

Semana 2:
  Día 1-2: Subir a Internal Testing → probar con equipo CISE + GRUAS
  Día 3:   Fixes de bugs encontrados en testing → nuevo build
  Día 4:   Aplicar a "Closed Testing" (track alpha) con grupo extendido
  Día 5:   Revisión Google para Open Testing / Production (1-7 días)

Total técnico estimado: 6-8 días de trabajo
Revisión Google Play: 1-7 días adicionales (no controlable)
```

---

### F3 Estimación de esfuerzo

| Tarea | Días |
|-------|------|
| Keystore producción + EAS setup + app.json | 1.0 |
| Preparar assets (iconos, screenshots, textos) | 1.5 |
| Primer EAS Build exitoso (debugging) | 1.0 |
| Google Play Console — setup cuenta + ficha | 1.0 |
| Internal testing + fixes | 2.0 |
| Política de privacidad (página web) | 0.5 |
| Submit a producción + seguimiento revisión | 0.5 |
| **Total estimado** | **7.5 días** |

Más: 1-7 días de revisión Google (bloqueante pero no trabajo activo).

---

### F3 Dependencias

- Cuenta Expo con plan que permita EAS Build (plan Free incluye 30 builds/mes)
- Cuenta Google Play Console (u$s 25 pago único)
- Assets de diseño: logo vectorial, screenshots de pantallas reales
- Dominio `reporta.la` para política de privacidad
- CRÍTICO: backup seguro del keystore antes de cualquier build de producción

---

---

## Feature 4: Correos desde la App

### F4 Descripción

La app móvil y el backend de REPORTA deben generar y enviar reportes automáticos por email a gerencia y/o al cliente. El objetivo es que los supervisores/operadores no tengan que generar manualmente reportes — el sistema los envía automáticamente al cierre del día y al inicio de la semana.

**Tipos de reporte:**

1. **Reporte Diario** — enviado a las 8:00pm (hora del tenant, usando timezone configurado)
2. **Reporte Semanal** — enviado los lunes a las 8:00am

**Canales:**
- Supabase Edge Function (cron) como trigger principal
- n8n como alternativa/fallback para lógica compleja
- Resend para envío (ya configurado en web, domain: reporta.la)
- Trigger manual desde app móvil (con preview)

---

### F4 Flujos de usuario

**Flujo A — Reporte automático diario:**

```
1. 8:00pm hora del tenant → Edge Function `send-daily-report` se ejecuta
2. Consulta todos los tenants con reportes activos y timezone
3. Por cada tenant activo en ese momento (ajuste tz):
   a. Extrae datos del día: tareas completadas, personal, horas, checklists
   b. Calcula KPIs: total horas, utilización flota, puntaje checklist
   c. Genera HTML del email con template
   d. Envía via Resend a destinatarios configurados
4. Registra en tabla `email_log` el resultado (ok/error)
```

**Flujo B — Envío manual desde app:**

```
1. Operador abre app → sección "Reportes" (icono en tab bar o settings)
2. Selecciona "Reporte Diario" o "Reporte Semanal"
3. Selecciona fecha (por defecto: hoy)
4. Toca "Vista previa" → app genera preview del email en pantalla
5. Revisa contenido
6. Toca "Enviar ahora"
7. Llamada a Edge Function `send-report-manual` con parámetros
8. Toast: "Reporte enviado a 3 destinatarios"
```

**Flujo C — Configuración de reportes (admin web):**

```
1. Admin entra a Settings → sección "Reportes por email"
2. Activa/desactiva reporte diario y semanal
3. Configura destinatarios:
   - Opción "Administradores del tenant" (auto)
   - Agregar emails adicionales (clientes, gerencia externa)
4. Configura hora de envío del reporte diario (default: 8:00pm)
5. Guarda → upsert en config_reportes_email
```

---

### F4 Wireframes

#### App móvil — Pantalla de configuración de reportes

```
┌─────────────────────────────────────────┐
│  [←]  Reportes por Email                │
├─────────────────────────────────────────┤
│                                         │
│  REPORTE DIARIO                         │
│  ┌─────────────────────────────────┐    │
│  │ Activo                    [✓] ──────┤ Toggle ON
│  └─────────────────────────────────┘    │
│                                         │
│  Hora de envío                          │
│  ┌─────────────────────────────────┐    │
│  │ 20:00 (8:00 PM)            [▼] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  REPORTE SEMANAL                        │
│  ┌─────────────────────────────────┐    │
│  │ Activo                    [✓] ──────┤ Toggle ON
│  └─────────────────────────────────┘    │
│                                         │
│  Día y hora de envío                    │
│  ┌─────────────────────────────────┐    │
│  │ Lunes 08:00 AM             [▼] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  DESTINATARIOS                          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ✓ Administradores del tenant    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Emails adicionales:                    │
│  ┌─────────────────────────────────┐    │
│  │ gerencia@cise.com.pe       [×] │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ cliente@antapaccay.com     [×] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [+ Agregar email]                      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         Guardar cambios         │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

#### App móvil — Pantalla de envío manual

```
┌─────────────────────────────────────────┐
│  [←]  Enviar Reporte                    │
├─────────────────────────────────────────┤
│                                         │
│  Tipo de reporte                        │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │  ● Diario    │  │  ○ Semanal       │ │
│  └──────────────┘  └──────────────────┘ │
│                                         │
│  Fecha del reporte                      │
│  ┌─────────────────────────────────┐    │
│  │ Hoy — Lunes 11 May 2026   [📅] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Destinatarios (3 configurados)         │
│  ┌─────────────────────────────────┐    │
│  │ admin@cise.com.pe               │    │
│  │ gerencia@cise.com.pe            │    │
│  │ cliente@antapaccay.com          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        Vista previa             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         Enviar ahora            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Último envío: Domingo 10 May, 8:02pm   │
│                                         │
└─────────────────────────────────────────┘
```

#### App móvil — Preview del reporte (dentro de app)

```
┌─────────────────────────────────────────┐
│  [←]  Preview: Reporte Diario           │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │ [LOGO REPORTA]                  │    │
│  │                                 │    │
│  │ REPORTE DIARIO                  │    │
│  │ CISE S.A.C. · 11 Mayo 2026     │    │
│  │ Sitio: Faena Antapaccay        │    │
│  ├─────────────────────────────────┤    │
│  │ PERSONAL                        │    │
│  │ Grúeros:    3  │ Horas: 24h    │    │
│  │ Riggers:    2  │ Horas: 16h    │    │
│  │ Operarios:  4  │ Horas: 32h    │    │
│  ├─────────────────────────────────┤    │
│  │ MAQUINARIA                      │    │
│  │ GR-01  8h ██████████           │    │
│  │ GR-02  9h ███████████          │    │
│  │ EX-01  6h ████████             │    │
│  ├─────────────────────────────────┤    │
│  │ CHECKLIST                       │    │
│  │ Puntaje: 94/100  ✓              │    │
│  │ Items críticos pendientes: 0    │    │
│  ├─────────────────────────────────┤    │
│  │ PLANES DE ACCIÓN                │    │
│  │ Generados hoy: 2                │    │
│  │ • Revisar hidráulico GR-02     │    │
│  │ • Reemplazar EPP operario #3   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         Enviar ahora            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### Template HTML del email — Reporte Diario

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Diario - REPORTA</title>
</head>
<body style="font-family: -apple-system, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: #1e40af; padding: 24px; text-align: center;">
      <img src="https://reporta.app/logo-white.png" alt="REPORTA" height="40">
      <h1 style="color: white; margin: 12px 0 4px; font-size: 20px;">Reporte Diario</h1>
      <p style="color: #bfdbfe; margin: 0; font-size: 14px;">{{empresa}} · {{fecha_formato}}</p>
    </div>
    
    <!-- Resumen ejecutivo -->
    <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
      <h2 style="color: #111; font-size: 16px; margin: 0 0 16px;">Resumen del día</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center;">
        <div style="background: #f0f9ff; border-radius: 8px; padding: 16px;">
          <div style="font-size: 28px; font-weight: 700; color: #1e40af;">{{total_horas}}</div>
          <div style="font-size: 12px; color: #6b7280;">Horas trabajadas</div>
        </div>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px;">
          <div style="font-size: 28px; font-weight: 700; color: #15803d;">{{equipos_activos}}</div>
          <div style="font-size: 12px; color: #6b7280;">Equipos activos</div>
        </div>
        <div style="background: #fff7ed; border-radius: 8px; padding: 16px;">
          <div style="font-size: 28px; font-weight: 700; color: #c2410c;">{{puntaje_checklist}}%</div>
          <div style="font-size: 12px; color: #6b7280;">Puntaje checklist</div>
        </div>
      </div>
    </div>
    
    <!-- Personal y Horas -->
    <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
      <h2 style="color: #111; font-size: 16px; margin: 0 0 16px;">Personal en faena</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; color: #6b7280; font-weight: 500;">Cargo</th>
            <th style="padding: 8px 12px; text-align: right; color: #6b7280; font-weight: 500;">Personas</th>
            <th style="padding: 8px 12px; text-align: right; color: #6b7280; font-weight: 500;">Horas</th>
          </tr>
        </thead>
        <tbody>
          {{#personal_rows}}
          <tr style="border-top: 1px solid #f3f4f6;">
            <td style="padding: 10px 12px;">{{cargo}}</td>
            <td style="padding: 10px 12px; text-align: right;">{{cantidad}}</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 600;">{{horas}}h</td>
          </tr>
          {{/personal_rows}}
        </tbody>
      </table>
    </div>
    
    <!-- Maquinaria -->
    <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
      <h2 style="color: #111; font-size: 16px; margin: 0 0 16px;">Maquinaria utilizada</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; color: #6b7280; font-weight: 500;">Equipo</th>
            <th style="padding: 8px 12px; text-align: left; color: #6b7280; font-weight: 500;">Tarea</th>
            <th style="padding: 8px 12px; text-align: right; color: #6b7280; font-weight: 500;">Horas</th>
          </tr>
        </thead>
        <tbody>
          {{#maquinaria_rows}}
          <tr style="border-top: 1px solid #f3f4f6;">
            <td style="padding: 10px 12px; font-weight: 500;">{{codigo}}</td>
            <td style="padding: 10px 12px; color: #6b7280;">{{descripcion_tarea}}</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 600;">{{horas}}h</td>
          </tr>
          {{/maquinaria_rows}}
        </tbody>
      </table>
    </div>
    
    <!-- Checklist y Planes de Acción -->
    {{#has_planes_accion}}
    <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
      <h2 style="color: #111; font-size: 16px; margin: 0 0 16px;">Planes de Acción generados</h2>
      {{#planes_accion}}
      <div style="padding: 10px 12px; background: #fff7ed; border-left: 3px solid #f97316; margin-bottom: 8px; border-radius: 0 4px 4px 0;">
        <div style="font-weight: 500; font-size: 14px;">{{descripcion}}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Responsable: {{responsable}} · Vence: {{fecha_vencimiento}}</div>
      </div>
      {{/planes_accion}}
    </div>
    {{/has_planes_accion}}
    
    <!-- Footer -->
    <div style="padding: 20px 24px; background: #f9fafb; text-align: center;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        Este reporte fue generado automáticamente por <strong>REPORTA</strong><br>
        <a href="https://reporta.app" style="color: #1e40af;">reporta.app</a> · 
        <a href="{{url_desactivar}}" style="color: #6b7280;">Desactivar reportes</a>
      </p>
    </div>
    
  </div>
</body>
</html>
```

#### Template HTML — Reporte Semanal (estructura KPIs)

```
┌───────────────────────────────────────────────────────────────────┐
│  [LOGO REPORTA]                                                   │
│  REPORTE SEMANAL — Semana 19 (11-17 Mayo 2026)                   │
│  CISE S.A.C.                                                      │
├───────────────────────────────────────────────────────────────────┤
│  KPIs DE LA SEMANA                                                │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐ │
│  │  340 h         │ │    85%         │ │        96%             │ │
│  │  Horas totales │ │  Util. flota   │ │  Puntaje checklist     │ │
│  └────────────────┘ └────────────────┘ └────────────────────────┘ │
│  ┌────────────────┐ ┌────────────────┐                           │
│  │    12          │ │     3          │                           │
│  │  OTs cerradas  │ │  Planes acción │                           │
│  └────────────────┘ └────────────────┘                           │
├───────────────────────────────────────────────────────────────────┤
│  HORAS POR DÍA (gráfico de barras en texto)                       │
│  Lun  ████████████████████████  60h                              │
│  Mar  ██████████████████        54h                              │
│  Mié  ████████████████████████  62h                              │
│  Jue  ██████████████████        54h                              │
│  Vie  █████████████████████     58h                              │
│  Sáb  ████████                  24h                              │
│  Dom  —                          0h (descanso)                   │
├───────────────────────────────────────────────────────────────────┤
│  UTILIZACIÓN FLOTA                                                │
│  GR-01  48h / 60h disponibles   80%  ████████████████░░░░       │
│  GR-02  54h / 60h disponibles   90%  ██████████████████░        │
│  EX-01  36h / 60h disponibles   60%  ████████████░░░░░░░░       │
├───────────────────────────────────────────────────────────────────┤
│  EPP PENDIENTES                                                   │
│  • 2 operarios sin casco renovado (vence 15 Mayo)               │
│  • 1 arnés vencido — GR-01 operador                             │
├───────────────────────────────────────────────────────────────────┤
│  Ver detalle completo en REPORTA → [Ver en app]                  │
│  © 2026 Reporta Technologies · Desactivar reportes              │
└───────────────────────────────────────────────────────────────────┘
```

---

### F4 Diseño técnico

#### Decisión: Edge Function Supabase vs n8n

| Criterio | Edge Function | n8n |
|----------|--------------|-----|
| Latencia | Baja (edge global) | Media (servidor propio) |
| Cron scheduling | Supabase cron (pg_cron) | Nativo en n8n |
| Acceso directo a DB | Sí (mismo proyecto) | Via API |
| Multi-tenant timezone | Manual en código | Más fácil con loops n8n |
| Mantenimiento | Más simple | Más visual |
| Costo | Incluido en Supabase | Servidor adicional |

**Decisión: Edge Function Supabase** como implementación principal.
- pg_cron para scheduling
- Acceso directo a DB sin latencia extra
- n8n queda como opción para flujos más complejos en el futuro

#### Arquitectura del sistema

```
pg_cron (cada día 20:00 UTC)
    │
    ▼
Edge Function: send-daily-report
    │
    ├── SELECT config_reportes_email WHERE activo = true
    │   AND hora_envio_utc = current_hour
    │
    ├── Por cada tenant activo:
    │   ├── Recopilar datos del día (tareas, personal, maquinaria)
    │   ├── Calcular KPIs
    │   ├── Renderizar template HTML (Handlebars/Mustache)
    │   ├── Enviar via Resend API
    │   └── Log en email_log
    │
    └── Respuesta: { sent: N, errors: M }

Trigger manual (app móvil):
    │
    ▼
POST /functions/v1/send-report-manual
    {
      tenant_id, tipo, fecha,
      destinatarios_override: string[] // opcional
    }
```

#### Edge Function — estructura

```typescript
// supabase/functions/send-daily-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "npm:resend"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
  
  // Obtener configs activas para este momento
  const { data: configs } = await supabase
    .from('config_reportes_email')
    .select('*, companies(name, timezone)')
    .eq('reporte_diario_activo', true)
  
  const results = []
  
  for (const config of configs ?? []) {
    try {
      // Verificar si es hora de envío para este tenant (ajuste timezone)
      const now = new Date()
      const tenantHour = parseInt(
        new Intl.DateTimeFormat('es', {
          timeZone: config.companies.timezone,
          hour: 'numeric', hour12: false
        }).format(now)
      )
      
      if (tenantHour !== config.hora_envio_diario) continue
      
      // Recopilar datos del día
      const reportData = await buildDailyReport(supabase, config.tenant_id)
      
      // Renderizar HTML
      const html = renderDailyTemplate(reportData, config.companies.name)
      
      // Enviar via Resend
      const destinatarios = await getDestinatarios(supabase, config)
      
      await resend.emails.send({
        from: 'REPORTA <reportes@reporta.la>',
        to: destinatarios,
        subject: `Reporte Diario — ${config.companies.name} — ${reportData.fecha_formato}`,
        html,
      })
      
      // Log
      await supabase.from('email_log').insert({
        tenant_id: config.tenant_id,
        tipo: 'diario',
        destinatarios,
        status: 'sent',
        sent_at: now.toISOString(),
      })
      
      results.push({ tenant_id: config.tenant_id, status: 'ok' })
    } catch (err) {
      await supabase.from('email_log').insert({
        tenant_id: config.tenant_id,
        tipo: 'diario',
        status: 'error',
        error_msg: String(err),
      })
      results.push({ tenant_id: config.tenant_id, status: 'error', error: String(err) })
    }
  }
  
  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

#### Configuración pg_cron

```sql
-- Ejecutar en Supabase SQL Editor

-- Reporte diario: cada hora, chequeamos si algún tenant necesita envío
SELECT cron.schedule(
  'send-daily-reports',
  '0 * * * *',  -- cada hora en punto
  $$
  SELECT net.http_post(
    url := 'https://wioozisskjjgjjybsoqo.supabase.co/functions/v1/send-daily-report',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

-- Reporte semanal: lunes 8am UTC (= 3am Lima, ajustable)
SELECT cron.schedule(
  'send-weekly-reports',
  '0 13 * * 1',  -- lunes 13:00 UTC = 8:00am Lima (UTC-5)
  $$
  SELECT net.http_post(
    url := 'https://wioozisskjjgjjybsoqo.supabase.co/functions/v1/send-weekly-report',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

#### Server Action para trigger manual (web)

```typescript
// lib/actions/reportes-email.ts
'use server'
export async function sendManualReport(params: {
  tenantId: string
  tipo: 'diario' | 'semanal'
  fecha: string
  destinatariosOverride?: string[]
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-report-manual`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    }
  )
  
  if (!response.ok) throw new Error('Error al enviar reporte')
  return response.json()
}
```

---

### F4 Schema DB

```sql
-- Configuración de reportes por email (1 fila por tenant — upsert)
CREATE TABLE IF NOT EXISTS config_reportes_email (
  tenant_id                 UUID PRIMARY KEY REFERENCES companies(id),
  
  -- Reporte diario
  reporte_diario_activo     BOOLEAN DEFAULT false,
  hora_envio_diario         SMALLINT DEFAULT 20  -- hora local del tenant (0-23)
    CHECK (hora_envio_diario >= 0 AND hora_envio_diario <= 23),
  
  -- Reporte semanal  
  reporte_semanal_activo    BOOLEAN DEFAULT false,
  dia_envio_semanal         SMALLINT DEFAULT 1   -- 1=lunes, 7=domingo (ISO)
    CHECK (dia_envio_semanal >= 1 AND dia_envio_semanal <= 7),
  hora_envio_semanal        SMALLINT DEFAULT 8
    CHECK (hora_envio_semanal >= 0 AND hora_envio_semanal <= 23),
  
  -- Destinatarios
  incluir_admins_tenant     BOOLEAN DEFAULT true,
  emails_adicionales        TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config_reportes_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation config_reportes_email"
  ON config_reportes_email
  USING (tenant_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Log de envíos de email
CREATE TABLE IF NOT EXISTS email_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES companies(id),
  tipo            TEXT NOT NULL CHECK (tipo IN ('diario', 'semanal', 'manual')),
  fecha_reporte   DATE,               -- fecha a la que corresponde el reporte
  destinatarios   TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL CHECK (status IN ('sent', 'error', 'skipped')),
  error_msg       TEXT,
  resend_id       TEXT,               -- ID de Resend para tracking
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  triggered_by    TEXT DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual'))
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation email_log"
  ON email_log
  USING (tenant_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Índices
CREATE INDEX idx_email_log_tenant_tipo ON email_log(tenant_id, tipo, sent_at DESC);
CREATE INDEX idx_config_reportes_diario ON config_reportes_email(reporte_diario_activo)
  WHERE reporte_diario_activo = true;
```

---

### F4 Estimación de esfuerzo

| Tarea | Días |
|-------|------|
| Schema DB + RLS + migraciones | 0.5 |
| Edge Function `send-daily-report` | 2.0 |
| Edge Function `send-weekly-report` | 1.5 |
| Edge Function `send-report-manual` | 1.0 |
| Templates HTML (diario + semanal) | 2.0 |
| pg_cron scheduling + configuración | 0.5 |
| Server Action para trigger manual (web) | 0.5 |
| UI Settings en web admin (config destinatarios) | 1.5 |
| Pantalla configuración en app móvil | 1.5 |
| Pantalla envío manual + preview en app | 2.0 |
| Testing end-to-end (envíos reales, revisar emails) | 1.5 |
| **Total estimado** | **14.5 días** |

Rango honesto: 13–18 días. El mayor riesgo es la calidad del template HTML en distintos clientes de email (Outlook/iOS Mail/Gmail tienen bugs CSS conocidos).

---

### F4 Dependencias

- Resend ya configurado con dominio `reporta.la` — verificar que `reportes@reporta.la` esté habilitado
- pg_cron debe estar habilitado en el proyecto Supabase (verificar en Extensions)
- `companies.timezone` ya existe y está poblado — se usa para ajuste de horas de envío
- `net.http_post` requiere la extensión `pg_net` en Supabase (verificar)
- Para preview en app: renderizar HTML simplificado via WebView (Expo WebView)
- Feature 3 (Play Store) debe estar completada si se quiere distribuir la pantalla de configuración via Play Store

---

---

## Tabla resumen y priorización

### Resumen de esfuerzo

| # | Feature | Esfuerzo estimado | Rango |
|---|---------|------------------|-------|
| 1 | Offline-First Web | 17 días | 15–22 días |
| 2 | Web Responsive | 21 días | 18–26 días |
| 3 | App en Play Store | 7.5 días | 7–10 días |
| 4 | Correos desde la App | 14.5 días | 13–18 días |
| **TOTAL** | | **~60 días** | **53–76 días** |

### Priorización sugerida

| Prioridad | Feature | Justificación | Prerequisitos |
|-----------|---------|---------------|---------------|
| 🟢 **1 — Alta** | **Feature 3: Play Store** | Mayor impacto inmediato / menor esfuerzo. Desbloquea distribución oficial a usuarios. Esfuerzo bajo (7.5d). | Ninguno |
| 🟢 **2 — Alta** | **Feature 4: Correos** | Alto valor para retención de clientes (gerencia recibe KPIs sin abrir la app). Supabase ya tiene Resend configurado. | Datos limpios en tareas/checklist |
| 🟡 **3 — Media** | **Feature 2: Responsive** | Mejora experiencia en campo (supervisores con tablet). No bloquea operaciones actuales — ya funciona en desktop. Se puede hacer incremental. | Ninguno (puede ir en paralelo con F1) |
| 🔴 **4 — Diferir** | **Feature 1: Offline-First** | Mayor esfuerzo y complejidad técnica. La app móvil ya cubre el caso de uso offline en campo. Útil si usuarios reportan problemas de conectividad en web. | Módulos estabilizados |

### Secuencia recomendada

```
MES 1 (Junio):
  Semanas 1-2: Feature 3 — Play Store (publicar y distribuir)
  Semanas 3-4: Feature 4 — Correos, backend (Edge Functions + schema + templates)

MES 2 (Julio):
  Semanas 1-2: Feature 4 — Correos, frontend (UI web + app)
  Semanas 3-4: Feature 2 — Responsive, rollout módulos simples (layout, maquinaria, personal)

MES 3 (Agosto):
  Semanas 1-2: Feature 2 — Responsive, módulos complejos (planificación, cotizaciones)
  Semanas 3-4: Feature 2 — QA cross-device + bugfixes

MES 4 (Septiembre) — si se aprueba:
  Semanas 1-4: Feature 1 — Offline-First (diseño + implementación core)

MES 5 (Octubre) — si se aprueba:
  Semanas 1-2: Feature 1 — Integración módulos
  Semanas 3-4: Feature 1 — QA + testing offline
```

### Riesgos y mitigaciones

| Riesgo | Feature | Probabilidad | Impacto | Mitigación |
|--------|---------|-------------|---------|------------|
| Revisión Google Play demora >7 días | F3 | Media | Alto | Empezar con Internal Testing (no requiere revisión) |
| Template email roto en Outlook | F4 | Alta | Medio | Usar MJML o Cerberus como base del template |
| Timeline planificación difícil de hacer responsive | F2 | Alta | Alto | Vista alternativa "lista" como fallback |
| Conflictos de sincronización offline complejo | F1 | Alta | Alto | Empezar solo read-only offline, agregar writes en v2 |
| EAS Build falla por configuración nativa | F3 | Media | Medio | Build local con gradlew como backup |
| pg_cron no disponible en plan Supabase | F4 | Baja | Alto | Usar n8n o GitHub Actions como scheduler alternativo |

---

*Documento generado el 2026-05-11. Versión 1.0 — pendiente de aprobación.*
