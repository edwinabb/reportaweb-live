# App `reporta-admin` — Panel superadmin de plantillas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la app `reporta-admin` (repo nuevo) donde el rol `reporta_admin` gestiona plantillas `.docx` por tenant/tipo/versión con auditoría, y conectar `reportaweb3` para que resuelva esas plantillas desde Supabase Storage en vez de `fs`, cerrando el bloqueo Critical #1 de la Fase 0 del cutover.

**Architecture:** Next.js 16 App Router nuevo en `C:\Proyectos\reporta-admin`, mismo proyecto Supabase que `reportaweb3` (comparten `profiles`/`app_role`/tenants). Una tabla nueva (`system_document_templates`) + un bucket privado nuevo (`system-templates`) viven en esa base compartida — la migración se escribe y aplica desde el repo `reportaweb3` (fuente única de schema), aunque la UI que la consume está en el repo nuevo. `reportaweb3/lib/bubble-docx-pdf.ts` pasa de `fs.readFileSync(public/templates/bubble/...)` a resolver `tenant_id + tipo → storage_path` contra esa tabla y descargar de Storage.

**Tech Stack:** Next.js 16.1.2, React 19.2.0, TypeScript 5, Tailwind CSS 4 (sin Radix/shadcn — UI mínima con HTML+Tailwind, YAGNI para un panel interno), `@supabase/ssr` 0.8.0 + `@supabase/supabase-js` 2.86.2 (mismas versiones que reportaweb3), Cloudflare Workers vía `@opennextjs/cloudflare` (mismo patrón de deploy que reportaweb3).

**Spec:** `docs/superpowers/specs/2026-09-06-reporta-admin-design.md`

## Global Constraints

- Rol requerido para TODO en `reporta-admin`: `profiles.role === 'reporta_admin'` (ya existe en el `app_role` enum — no se crea ningún rol nuevo).
- Tenants válidos (scope confirmado del proyecto): CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b`, GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`.
- Tipos de plantilla válidos (lista fija, `CHECK` constraint): `cotizacion`, `valorizacion_venta`, `valorizacion_compra`, `reporte_maquinaria`, `reporte_horas_maquinaria`, `reporte_personal`.
- Storage: bucket `system-templates`, **privado** (nunca público), ruta `docs/{tenant_slug}/{tipo}-{version}.docx`.
- Toda migración de schema se aplica a TEST (`oyrokyyaeaeqzlsgxtto`) y PROD (`fqwhagryqkkhbgznxtwf`) vía Supabase MCP `apply_migration`.
- Nunca commitear secretos (`.env.local` gitignored en ambos repos).
- Solo una versión activa por `(tenant_id, tipo)` — se aplica con un índice único parcial en DB, no solo en la UI.

---

## File Map

| File | Repo | Action | Purpose |
|---|---|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind` global CSS, `.gitignore`, `.env.example` | reporta-admin | **Create** | Scaffold del proyecto |
| `wrangler.toml` | reporta-admin | **Create** | Deploy a Cloudflare Workers (`admin.reporta.la`) |
| `utils/supabase/server.ts`, `client.ts`, `middleware.ts` | reporta-admin | **Create** | Clientes Supabase (mismo patrón que reportaweb3) |
| `middleware.ts` | reporta-admin | **Create** | Gate de auth + rol `reporta_admin` en toda ruta salvo `/login` |
| `app/login/page.tsx` | reporta-admin | **Create** | Login email+password |
| `app/layout.tsx`, `app/globals.css` | reporta-admin | **Create** | Layout raíz mínimo |
| `app/templates/page.tsx` | reporta-admin | **Create** | Listado + descargar + activar |
| `app/templates/actions.ts` | reporta-admin | **Create** | Server actions: activar, generar signed URL de descarga |
| `app/templates/nueva/page.tsx` | reporta-admin | **Create** | Formulario de subida |
| `app/templates/nueva/actions.ts` | reporta-admin | **Create** | Server action: subir archivo + insertar fila |
| `app/templates/copiar/page.tsx` | reporta-admin | **Create** | Formulario "copiar desde otro tenant" |
| `app/templates/copiar/actions.ts` | reporta-admin | **Create** | Server action: duplicar set activo de un tenant a otro |
| `lib/tenants.ts` | reporta-admin | **Create** | `TENANT_SLUGS`, `TIPOS_PLANTILLA` (constantes compartidas) |
| `supabase/migrations/20260906140000_system_document_templates.sql` | reportaweb3 | **Create** | Tabla + RLS + bucket (fuente única de schema) |
| `lib/bubble-docx-pdf.ts` | reportaweb3 | **Modify** | Resolver plantilla desde DB+Storage en vez de `fs` |
| `app/api/bubble/pdf/generate/route.ts` | reportaweb3 | **Modify** | Pasar `tenant_id` a `renderBubbleDocxPdf` |
| `app/api/cron/pdf-jobs/route.ts` | reportaweb3 | **Modify** | Pasar `job.tenant_id` a `renderBubbleDocxPdf` |

---

### Task 1: Scaffold del proyecto `reporta-admin`

**Files:**
- Create: `C:\Proyectos\reporta-admin\package.json`
- Create: `C:\Proyectos\reporta-admin\tsconfig.json`
- Create: `C:\Proyectos\reporta-admin\next.config.ts`
- Create: `C:\Proyectos\reporta-admin\postcss.config.mjs`
- Create: `C:\Proyectos\reporta-admin\app\globals.css`
- Create: `C:\Proyectos\reporta-admin\app\layout.tsx`
- Create: `C:\Proyectos\reporta-admin\app\page.tsx`
- Create: `C:\Proyectos\reporta-admin\.gitignore`
- Create: `C:\Proyectos\reporta-admin\.env.example`

**Interfaces:**
- Produces: proyecto Next.js ejecutable con `npm run dev`, listo para que las tareas siguientes agreguen rutas.

- [ ] **Step 1: Crear la carpeta e inicializar git**

```bash
mkdir -p "C:\Proyectos\reporta-admin"
cd "C:\Proyectos\reporta-admin"
git init
```

- [ ] **Step 2: Crear `package.json`**

```json
{
  "name": "reporta-admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "build:cf": "npx opennextjs-cloudflare build",
    "deploy": "npm run build:cf && npx wrangler deploy"
  },
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.86.2",
    "next": "^16.1.2",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@opennextjs/cloudflare": "^1.20.1",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 3: Instalar dependencias**

```bash
cd "C:\Proyectos\reporta-admin"
npm install
```

- [ ] **Step 4: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Crear `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 6: Crear `postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 7: Crear `app/globals.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 8: Crear `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reporta Admin",
  description: "Panel superadmin de Reporta",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Crear `app/page.tsx` (redirect simple a /templates)**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/templates");
}
```

- [ ] **Step 10: Crear `.gitignore`**

```
node_modules/
.next/
.open-next/
.env.local
.env*.local
.wrangler/
```

- [ ] **Step 11: Crear `.env.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 12: Verificar que arranca**

```bash
cd "C:\Proyectos\reporta-admin"
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 13: Commit inicial**

```bash
cd "C:\Proyectos\reporta-admin"
git add -A
git commit -m "chore: scaffold inicial de reporta-admin (Next.js 16 + Tailwind 4)"
```

---

### Task 2: Migración de base de datos (tabla + RLS + bucket)

**Files:**
- Create: `C:\Proyectos\reportaweb3\supabase\migrations\20260906140000_system_document_templates.sql`

**Interfaces:**
- Produces: tabla `public.system_document_templates` (columnas: `id, tenant_id, tipo, version, is_active, storage_path, created_by, created_at, updated_by, updated_at`), bucket `system-templates` (privado).

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/20260906140000_system_document_templates.sql

CREATE TABLE public.system_document_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    tipo          TEXT NOT NULL CHECK (tipo IN (
                      'cotizacion', 'valorizacion_venta', 'valorizacion_compra',
                      'reporte_maquinaria', 'reporte_horas_maquinaria', 'reporte_personal'
                  )),
    version       INT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT false,
    storage_path  TEXT NOT NULL,
    created_by    UUID NOT NULL REFERENCES auth.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by    UUID REFERENCES auth.users(id),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, tipo, version)
);

CREATE UNIQUE INDEX system_document_templates_active_unique
    ON public.system_document_templates (tenant_id, tipo)
    WHERE is_active = true;

ALTER TABLE public.system_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sdt_reporta_admin_only" ON public.system_document_templates
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin');

GRANT ALL ON public.system_document_templates TO service_role;
GRANT ALL ON public.system_document_templates TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('system-templates', 'system-templates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "st_reporta_admin_only" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'system-templates' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin')
    WITH CHECK (bucket_id = 'system-templates' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin');
```

- [ ] **Step 2: Aplicar a TEST**

Vía Supabase MCP `apply_migration` sobre `oyrokyyaeaeqzlsgxtto`.

- [ ] **Step 3: Aplicar a PROD**

Vía Supabase MCP `apply_migration` sobre `fqwhagryqkkhbgznxtwf`.

- [ ] **Step 4: Verificar**

```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'system_document_templates';
SELECT id FROM storage.buckets WHERE id = 'system-templates';
```
Esperado: ambas filas presentes, en ambas bases.

- [ ] **Step 5: Commit (en el repo reportaweb3)**

```bash
cd "C:\Proyectos\reportaweb3"
git add supabase/migrations/20260906140000_system_document_templates.sql
git commit -m "feat(db): tabla system_document_templates + bucket privado para reporta-admin"
```

---

### Task 3: Clientes Supabase + middleware de auth en `reporta-admin`

**Files:**
- Create: `C:\Proyectos\reporta-admin\utils\supabase\server.ts`
- Create: `C:\Proyectos\reporta-admin\utils\supabase\client.ts`
- Create: `C:\Proyectos\reporta-admin\utils\supabase\admin.ts`
- Create: `C:\Proyectos\reporta-admin\utils\supabase\middleware.ts`
- Create: `C:\Proyectos\reporta-admin\middleware.ts`

**Interfaces:**
- Produces: `createClient()` (server, en `utils/supabase/server.ts`), `createClient()` (browser, en `utils/supabase/client.ts`), `createAdminClient()` (service role), `updateSession(request): Promise<NextResponse>`.

- [ ] **Step 1: `utils/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Called from a Server Component — ignorable, middleware refresca la sesión.
                    }
                },
            },
        }
    )
}
```

- [ ] **Step 2: `utils/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
```

- [ ] **Step 3: `utils/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
```

- [ ] **Step 4: `utils/supabase/middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    if (!user) {
        if (pathname !== '/login') {
            const loginUrl = new URL('/login', request.url)
            return NextResponse.redirect(loginUrl)
        }
        return response
    }

    if (pathname === '/login') {
        return NextResponse.redirect(new URL('/templates', request.url))
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'reporta_admin') {
        return new NextResponse('Acceso denegado — se requiere rol reporta_admin', { status: 403 })
    }

    return response
}
```

- [ ] **Step 5: `middleware.ts` (raíz del proyecto)**

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
```

- [ ] **Step 6: Verificar que compila**

```bash
cd "C:\Proyectos\reporta-admin"
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd "C:\Proyectos\reporta-admin"
git add utils middleware.ts
git commit -m "feat(auth): clientes Supabase + middleware que exige rol reporta_admin"
```

---

### Task 4: Página de login

**Files:**
- Create: `C:\Proyectos\reporta-admin\app\login\page.tsx`
- Create: `C:\Proyectos\reporta-admin\app\login\actions.ts`

**Interfaces:**
- Consumes: `createClient()` de `utils/supabase/server.ts` (Task 3).
- Produces: formulario en `/login` que autentica y redirige a `/templates`.

- [ ] **Step 1: `app/login/actions.ts`**

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    redirect('/templates')
}
```

- [ ] **Step 2: `app/login/page.tsx`**

```tsx
import { login } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const { error } = await searchParams

    return (
        <div className="flex min-h-screen items-center justify-center">
            <form action={login} className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-6 shadow-sm">
                <h1 className="text-lg font-semibold">Reporta Admin</h1>
                {error && (
                    <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
                )}
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full rounded border px-3 py-2 text-sm"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="w-full rounded border px-3 py-2 text-sm"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                    Ingresar
                </button>
            </form>
        </div>
    )
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Proyectos\reporta-admin"
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Proyectos\reporta-admin"
git add app/login
git commit -m "feat(auth): pagina de login"
```

---

### Task 5: Constantes compartidas (`lib/tenants.ts`)

**Files:**
- Create: `C:\Proyectos\reporta-admin\lib\tenants.ts`

**Interfaces:**
- Produces: `TENANT_SLUGS: Record<string, string>`, `TENANTS: {id: string; nombre: string}[]`, `TIPOS_PLANTILLA: {value: string; label: string}[]`.

- [ ] **Step 1: Escribir el archivo**

```typescript
// lib/tenants.ts

export const TENANTS = [
    { id: '1cb97ec7-326c-4376-93ee-ed317d3da51b', nombre: 'CISE', slug: 'cise' },
    { id: '6f4c923a-c3b7-47c2-9dea-2a187f274f73', nombre: 'GRUAS', slug: 'gruas' },
] as const

export const TENANT_SLUGS: Record<string, string> = Object.fromEntries(
    TENANTS.map(t => [t.id, t.slug])
)

export const TIPOS_PLANTILLA = [
    { value: 'cotizacion', label: 'Cotización' },
    { value: 'valorizacion_venta', label: 'Valorización de venta' },
    { value: 'valorizacion_compra', label: 'Valorización de compra' },
    { value: 'reporte_maquinaria', label: 'Reporte de maquinaria' },
    { value: 'reporte_horas_maquinaria', label: 'Reporte de horas de maquinaria' },
    { value: 'reporte_personal', label: 'Reporte de personal' },
] as const
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Proyectos\reporta-admin"
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Proyectos\reporta-admin"
git add lib/tenants.ts
git commit -m "feat: constantes de tenants y tipos de plantilla"
```

---

### Task 6: Listado de plantillas + descargar + activar

**Files:**
- Create: `C:\Proyectos\reporta-admin\app\templates\page.tsx`
- Create: `C:\Proyectos\reporta-admin\app\templates\actions.ts`

**Interfaces:**
- Consumes: `createClient()` (server, Task 3), `createAdminClient()` (Task 3), `TENANTS`/`TIPOS_PLANTILLA` (Task 5).
- Produces: `activarPlantilla(id: string): Promise<void>` (server action), `getSignedDownloadUrl(storagePath: string): Promise<string>` (server action).

- [ ] **Step 1: `app/templates/actions.ts`**

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function activarPlantilla(id: string, tenantId: string, tipo: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    // Desactivar cualquier otra activa del mismo tenant+tipo
    await supabase
        .from('system_document_templates')
        .update({ is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('tipo', tipo)
        .eq('is_active', true)

    await supabase
        .from('system_document_templates')
        .update({ is_active: true, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', id)

    revalidatePath('/templates')
}

export async function getSignedDownloadUrl(storagePath: string): Promise<string> {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage
        .from('system-templates')
        .createSignedUrl(storagePath, 60)
    if (error || !data) throw new Error('No se pudo generar el link de descarga')
    return data.signedUrl
}
```

- [ ] **Step 2: `app/templates/page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import { TENANTS, TIPOS_PLANTILLA } from '@/lib/tenants'
import Link from 'next/link'
import { ActivarButton, DescargarButton } from './row-actions'

interface TemplateRow {
    id: string
    tenant_id: string
    tipo: string
    version: number
    is_active: boolean
    storage_path: string
    created_by: string
    created_at: string
    updated_by: string | null
    updated_at: string
}

export default async function TemplatesPage() {
    const supabase = await createClient()
    const { data: rows } = await supabase
        .from('system_document_templates')
        .select('*')
        .order('tenant_id')
        .order('tipo')
        .order('version', { ascending: false })

    const nombreTenant = (id: string) => TENANTS.find(t => t.id === id)?.nombre ?? id
    const labelTipo = (v: string) => TIPOS_PLANTILLA.find(t => t.value === v)?.label ?? v

    return (
        <div className="mx-auto max-w-5xl p-6">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Plantillas de sistema</h1>
                <div className="flex gap-2">
                    <Link href="/templates/copiar" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100">
                        Copiar desde otro tenant
                    </Link>
                    <Link href="/templates/nueva" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800">
                        Subir nueva versión
                    </Link>
                </div>
            </div>
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b text-left text-gray-500">
                        <th className="py-2">Tenant</th>
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Versión</th>
                        <th className="py-2">Activa</th>
                        <th className="py-2">Creado</th>
                        <th className="py-2">Actualizado</th>
                        <th className="py-2">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {(rows as TemplateRow[] ?? []).map(row => (
                        <tr key={row.id} className="border-b">
                            <td className="py-2">{nombreTenant(row.tenant_id)}</td>
                            <td className="py-2">{labelTipo(row.tipo)}</td>
                            <td className="py-2">v{row.version}</td>
                            <td className="py-2">
                                {row.is_active ? (
                                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Activa</span>
                                ) : (
                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactiva</span>
                                )}
                            </td>
                            <td className="py-2 text-xs text-gray-500">{new Date(row.created_at).toLocaleString('es-PE')}</td>
                            <td className="py-2 text-xs text-gray-500">{row.updated_at ? new Date(row.updated_at).toLocaleString('es-PE') : '—'}</td>
                            <td className="py-2">
                                <div className="flex gap-2">
                                    <DescargarButton storagePath={row.storage_path} />
                                    {!row.is_active && (
                                        <ActivarButton id={row.id} tenantId={row.tenant_id} tipo={row.tipo} />
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
```

- [ ] **Step 3: `app/templates/row-actions.tsx` (client component para los botones interactivos)**

```tsx
'use client'

import { useState } from 'react'
import { activarPlantilla, getSignedDownloadUrl } from './actions'

export function DescargarButton({ storagePath }: { storagePath: string }) {
    const [loading, setLoading] = useState(false)
    return (
        <button
            className="text-blue-600 hover:underline disabled:opacity-50"
            disabled={loading}
            onClick={async () => {
                setLoading(true)
                try {
                    const url = await getSignedDownloadUrl(storagePath)
                    window.open(url, '_blank')
                } finally {
                    setLoading(false)
                }
            }}
        >
            Descargar
        </button>
    )
}

export function ActivarButton({ id, tenantId, tipo }: { id: string; tenantId: string; tipo: string }) {
    const [loading, setLoading] = useState(false)
    return (
        <button
            className="text-green-700 hover:underline disabled:opacity-50"
            disabled={loading}
            onClick={async () => {
                setLoading(true)
                try {
                    await activarPlantilla(id, tenantId, tipo)
                } finally {
                    setLoading(false)
                }
            }}
        >
            Activar
        </button>
    )
}
```

- [ ] **Step 4: Verificar que compila**

```bash
cd "C:\Proyectos\reporta-admin"
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Proyectos\reporta-admin"
git add app/templates
git commit -m "feat(templates): listado con descargar y activar version"
```

---

### Task 7: Subida de nueva versión

**Files:**
- Create: `C:\Proyectos\reporta-admin\app\templates\nueva\page.tsx`
- Create: `C:\Proyectos\reporta-admin\app\templates\nueva\actions.ts`

**Interfaces:**
- Consumes: `createClient()`, `createAdminClient()` (Task 3), `TENANTS`/`TIPOS_PLANTILLA`, `TENANT_SLUGS` (Task 5).
- Produces: `subirPlantilla(formData: FormData): Promise<void>` (server action, redirige a `/templates` al terminar).

- [ ] **Step 1: `app/templates/nueva/actions.ts`**

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { TENANT_SLUGS } from '@/lib/tenants'
import { redirect } from 'next/navigation'

export async function subirPlantilla(formData: FormData) {
    const tenantId = formData.get('tenant_id') as string
    const tipo = formData.get('tipo') as string
    const file = formData.get('file') as File

    if (!tenantId || !tipo || !file || file.size === 0) {
        throw new Error('Faltan campos requeridos')
    }
    if (!file.name.toLowerCase().endsWith('.docx')) {
        throw new Error('El archivo debe ser .docx')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data: existentes } = await supabase
        .from('system_document_templates')
        .select('version')
        .eq('tenant_id', tenantId)
        .eq('tipo', tipo)
        .order('version', { ascending: false })
        .limit(1)

    const esPrimera = !existentes || existentes.length === 0
    const nuevaVersion = esPrimera ? 1 : existentes[0].version + 1

    const slug = TENANT_SLUGS[tenantId]
    const storagePath = `docs/${slug}/${tipo}-${nuevaVersion}.docx`

    const adminClient = createAdminClient()
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error: uploadError } = await adminClient.storage
        .from('system-templates')
        .upload(storagePath, bytes, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
    if (uploadError) throw new Error(`Error subiendo el archivo: ${uploadError.message}`)

    const { error: insertError } = await supabase
        .from('system_document_templates')
        .insert({
            tenant_id: tenantId,
            tipo,
            version: nuevaVersion,
            is_active: esPrimera,
            storage_path: storagePath,
            created_by: user.id,
        })
    if (insertError) throw new Error(`Error guardando el registro: ${insertError.message}`)

    redirect('/templates')
}
```

- [ ] **Step 2: `app/templates/nueva/page.tsx`**

```tsx
import { TENANTS, TIPOS_PLANTILLA } from '@/lib/tenants'
import { subirPlantilla } from './actions'

export default function NuevaPlantillaPage() {
    return (
        <div className="mx-auto max-w-lg p-6">
            <h1 className="mb-4 text-lg font-semibold">Subir nueva versión</h1>
            <form action={subirPlantilla} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="tenant_id">Tenant</label>
                    <select id="tenant_id" name="tenant_id" required className="w-full rounded border px-3 py-2 text-sm">
                        {TENANTS.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="tipo">Tipo de documento</label>
                    <select id="tipo" name="tipo" required className="w-full rounded border px-3 py-2 text-sm">
                        {TIPOS_PLANTILLA.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="file">Archivo .docx</label>
                    <input id="file" name="file" type="file" accept=".docx" required className="w-full text-sm" />
                </div>
                <p className="text-xs text-gray-500">
                    Si es la primera versión para ese tenant/tipo, queda activa automáticamente.
                    Si ya existe una versión activa, esta se sube como inactiva — activala desde el listado cuando estés listo.
                </p>
                <button type="submit" className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
                    Subir
                </button>
            </form>
        </div>
    )
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Proyectos\reporta-admin"
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Proyectos\reporta-admin"
git add app/templates/nueva
git commit -m "feat(templates): subida de nueva version con calculo automatico de version"
```

---

### Task 8: Copiar plantillas activas desde otro tenant

**Files:**
- Create: `C:\Proyectos\reporta-admin\app\templates\copiar\page.tsx`
- Create: `C:\Proyectos\reporta-admin\app\templates\copiar\actions.ts`

**Interfaces:**
- Consumes: `createClient()`, `createAdminClient()`, `TENANTS`, `TENANT_SLUGS`.
- Produces: `copiarDesdeOtroTenant(formData: FormData): Promise<void>` (server action).

- [ ] **Step 1: `app/templates/copiar/actions.ts`**

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { TENANT_SLUGS } from '@/lib/tenants'
import { redirect } from 'next/navigation'

export async function copiarDesdeOtroTenant(formData: FormData) {
    const origenId = formData.get('origen_id') as string
    const destinoId = formData.get('destino_id') as string

    if (!origenId || !destinoId || origenId === destinoId) {
        throw new Error('Elegí dos tenants distintos')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data: activas } = await supabase
        .from('system_document_templates')
        .select('tipo, storage_path')
        .eq('tenant_id', origenId)
        .eq('is_active', true)

    if (!activas || activas.length === 0) {
        throw new Error('El tenant origen no tiene plantillas activas para copiar')
    }

    const adminClient = createAdminClient()
    const destinoSlug = TENANT_SLUGS[destinoId]

    for (const plantilla of activas) {
        const nuevaRuta = `docs/${destinoSlug}/${plantilla.tipo}-1.docx`

        const { error: copyError } = await adminClient.storage
            .from('system-templates')
            .copy(plantilla.storage_path, nuevaRuta)
        if (copyError) throw new Error(`Error copiando ${plantilla.tipo}: ${copyError.message}`)

        // Si el destino ya tenía una versión de este tipo, la nueva se marca inactiva
        // (no pisar silenciosamente algo que el destino ya tenía configurado).
        const { data: existente } = await supabase
            .from('system_document_templates')
            .select('id')
            .eq('tenant_id', destinoId)
            .eq('tipo', plantilla.tipo)
            .limit(1)

        const { data: maxVersion } = await supabase
            .from('system_document_templates')
            .select('version')
            .eq('tenant_id', destinoId)
            .eq('tipo', plantilla.tipo)
            .order('version', { ascending: false })
            .limit(1)

        const nuevaVersion = maxVersion && maxVersion.length > 0 ? maxVersion[0].version + 1 : 1
        const rutaFinal = `docs/${destinoSlug}/${plantilla.tipo}-${nuevaVersion}.docx`

        if (rutaFinal !== nuevaRuta) {
            await adminClient.storage.from('system-templates').move(nuevaRuta, rutaFinal)
        }

        await supabase.from('system_document_templates').insert({
            tenant_id: destinoId,
            tipo: plantilla.tipo,
            version: nuevaVersion,
            is_active: !existente || existente.length === 0,
            storage_path: rutaFinal,
            created_by: user.id,
        })
    }

    redirect('/templates')
}
```

- [ ] **Step 2: `app/templates/copiar/page.tsx`**

```tsx
import { TENANTS } from '@/lib/tenants'
import { copiarDesdeOtroTenant } from './actions'

export default function CopiarPlantillasPage() {
    return (
        <div className="mx-auto max-w-lg p-6">
            <h1 className="mb-4 text-lg font-semibold">Copiar plantillas desde otro tenant</h1>
            <form action={copiarDesdeOtroTenant} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="origen_id">Tenant origen (copiar SUS plantillas activas)</label>
                    <select id="origen_id" name="origen_id" required className="w-full rounded border px-3 py-2 text-sm">
                        {TENANTS.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="destino_id">Tenant destino</label>
                    <select id="destino_id" name="destino_id" required className="w-full rounded border px-3 py-2 text-sm">
                        {TENANTS.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-gray-500">
                    Copia todas las plantillas activas del tenant origen hacia el destino como nuevas versiones.
                    Si el destino ya tiene una plantilla de ese tipo, la copia queda inactiva.
                </p>
                <button type="submit" className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
                    Copiar
                </button>
            </form>
        </div>
    )
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Proyectos\reporta-admin"
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Proyectos\reporta-admin"
git add app/templates/copiar
git commit -m "feat(templates): copiar plantillas activas de un tenant a otro"
```

---

### Task 9: Integración con `reportaweb3` — resolver plantillas desde DB+Storage

**Files:**
- Modify: `C:\Proyectos\reportaweb3\lib\bubble-docx-pdf.ts`
- Modify: `C:\Proyectos\reportaweb3\app\api\bubble\pdf\generate\route.ts`
- Modify: `C:\Proyectos\reportaweb3\app\api\cron\pdf-jobs\route.ts`

**Interfaces:**
- Consumes: tabla `system_document_templates` y bucket `system-templates` (Task 2).
- Produces: `renderBubbleDocxPdf(adminClient: SupabaseClient, tenantId: string, tipo: string, data: Record<string, unknown>): Promise<ArrayBuffer>` — **firma cambiada**: ahora recibe `adminClient` y `tenantId` además de `tipo` (antes `templateKey`) y `data`. `BubbleTemplateNotFoundError` se sigue lanzando igual, mensaje actualizado.

- [ ] **Step 1: Reescribir `lib/bubble-docx-pdf.ts`**

```typescript
// lib/bubble-docx-pdf.ts
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import type { SupabaseClient } from '@supabase/supabase-js'

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'https://demo-ia-gotenberg.ccralj.easypanel.host'
const TEMPLATES_BUCKET = 'system-templates'

export class BubbleTemplateNotFoundError extends Error {}

/**
 * Resuelve la plantilla ACTIVA para (tenantId, tipo) desde system_document_templates,
 * la descarga de Storage, la rellena con `data` y la convierte a PDF vía Gotenberg.
 */
export async function renderBubbleDocxPdf(
    adminClient: SupabaseClient,
    tenantId: string,
    tipo: string,
    data: Record<string, unknown>,
): Promise<ArrayBuffer> {
    const { data: row, error: queryError } = await adminClient
        .from('system_document_templates')
        .select('storage_path')
        .eq('tenant_id', tenantId)
        .eq('tipo', tipo)
        .eq('is_active', true)
        .maybeSingle()

    if (queryError || !row) {
        throw new BubbleTemplateNotFoundError(`No hay plantilla activa para tenant=${tenantId} tipo=${tipo}`)
    }

    const { data: fileBlob, error: downloadError } = await adminClient.storage
        .from(TEMPLATES_BUCKET)
        .download(row.storage_path)

    if (downloadError || !fileBlob) {
        throw new BubbleTemplateNotFoundError(`No se pudo descargar la plantilla: ${row.storage_path}`)
    }

    const content = Buffer.from(await fileBlob.arrayBuffer())
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    doc.render(data)
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    const form = new FormData()
    form.append(
        'files',
        new Blob([new Uint8Array(docxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        'merged.docx',
    )

    const response = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gotenberg conversion failed (${response.status}): ${errText}`)
    }

    return response.arrayBuffer()
}
```

- [ ] **Step 2: Actualizar `app/api/bubble/pdf/generate/route.ts`**

Cambiar la llamada (el resto del archivo no cambia):

```typescript
// Antes: const pdf = await renderBubbleDocxPdf(template_key, data)
const pdf = await renderBubbleDocxPdf(adminClient, tenant_id, template_key, data)
```

(El body sigue llamando al campo `template_key`, que ahora representa el `tipo` de la tabla — el nombre del campo en el contrato HTTP con Bubble no cambia, solo su significado interno pasa de "nombre de archivo" a "tipo de documento".)

Agregar además, junto a la validación existente de `doc_category` (misma sección, antes de la línea que ya valida `template_key` contra el regex), la validación contra los 6 tipos válidos:

```typescript
const TIPOS_VALIDOS = new Set([
    'cotizacion', 'valorizacion_venta', 'valorizacion_compra',
    'reporte_maquinaria', 'reporte_horas_maquinaria', 'reporte_personal',
])
// ... después de la validación de doc_category:
if (!TIPOS_VALIDOS.has(template_key)) {
    return NextResponse.json({ error: 'template_key debe ser uno de los tipos válidos' }, { status: 400 })
}
```
(Esto reemplaza la validación de regex genérico agregada en la Fase 0 — ya no hace falta, la lista fija es más estricta.)

- [ ] **Step 3: Actualizar `app/api/cron/pdf-jobs/route.ts`**

En la rama `bubble_docx`, cambiar la llamada:

```typescript
// Antes: const pdf = await renderBubbleDocxPdf(job.template_key, job.payload ?? {})
const pdf = await renderBubbleDocxPdf(admin, job.tenant_id, job.template_key, job.payload ?? {})
```

- [ ] **Step 4: Verificar que compila**

```bash
cd "C:\Proyectos\reportaweb3"
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Proyectos\reportaweb3"
git add lib/bubble-docx-pdf.ts app/api/bubble/pdf/generate/route.ts app/api/cron/pdf-jobs/route.ts
git commit -m "feat(pdf-bridge): resolver plantillas desde system_document_templates + Storage en vez de fs"
```

---

### Task 10: Deploy de `reporta-admin` a Cloudflare Workers + verificación end-to-end

**Files:**
- Create: `C:\Proyectos\reporta-admin\wrangler.toml`
- Create: `C:\Proyectos\reporta-admin\open-next.config.ts`

**Interfaces:**
- Produces: `reporta-admin` desplegado y accesible (dominio final `admin.reporta.la` pendiente de bindear en Cloudflare — paso manual del usuario, igual que los demás dominios del ecosistema).

- [ ] **Step 1: `open-next.config.ts`**

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

- [ ] **Step 2: `wrangler.toml`**

```toml
name = "reporta-admin"
main = ".open-next/worker.js"
compatibility_date = "2026-06-01"
compatibility_flags = ["nodejs_compat"]
minify = true

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[vars]
NEXT_PUBLIC_SUPABASE_URL = "https://fqwhagryqkkhbgznxtwf.supabase.co"
```

Nota: `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` se cargan como **Secrets** en el dashboard de Cloudflare (Worker `reporta-admin` → Settings → Variables and Secrets), igual que en `reportaweb3` — nunca en `[vars]`.

- [ ] **Step 3: Build local de verificación**

```bash
cd "C:\Proyectos\reporta-admin"
npm run build
npx opennextjs-cloudflare build
```
Expected: build sin errores.

- [ ] **Step 4: Deploy manual (primera vez) — pasos para el usuario**

1. `cd "C:\Proyectos\reporta-admin" && npx wrangler login` (si no hay sesión activa).
2. Cargar en el dashboard de Cloudflare los secrets `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` para el worker `reporta-admin` (o correr `npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` desde la terminal).
3. `npx wrangler deploy --config wrangler.toml`.
4. Bindear el dominio `admin.reporta.la` al worker `reporta-admin` desde el dashboard de Cloudflare (DNS + Custom Domain), como ya se hizo con `demo.reportar.app`/`live.reportar.app`.

- [ ] **Step 5: Smoke test end-to-end**

1. Subir una plantilla real (o la de prueba `cotizacion-bubble.docx` ya existente en `reportaweb3/public/templates/bubble/`) a `/templates/nueva` para el tenant CISE, tipo `cotizacion`.
2. Confirmar que quedó activa en el listado.
3. Repetir el `curl` de smoke test de la Fase 0 contra `demo.reportar.app` (después de deployar la Task 9 a demo) y confirmar `status: "done"` con un `pdf_url` válido — esto cierra definitivamente el bloqueo Critical #1 de la revisión final de Fase 0.

---

## Self-review

- **Cobertura del spec:** scaffold ✅ (Task 1), tabla+RLS+bucket ✅ (Task 2), auth+rol ✅ (Task 3-4), listado/descargar/activar ✅ (Task 6), subida con versión automática ✅ (Task 7), copiar entre tenants ✅ (Task 8), integración reportaweb3 ✅ (Task 9), deploy ✅ (Task 10).
- **Placeholders:** ninguno — todo el código de cada task está completo y es el que se escribe tal cual.
- **Consistencia de tipos:** `renderBubbleDocxPdf` cambia de firma (`(templateKey, data)` → `(adminClient, tenantId, tipo, data)`) — Task 9 actualiza los DOS call sites existentes (bridge route y cron) en el mismo task, no quedan desincronizados. `TENANT_SLUGS`/`TENANTS`/`TIPOS_PLANTILLA` se definen una sola vez (Task 5) y se importan igual en Tasks 6, 7, 8. `activarPlantilla(id, tenantId, tipo)` tiene la misma firma en su definición (Task 6, `actions.ts`) y en su uso (Task 6, `row-actions.tsx`).
- **Decisión de diseño explícita:** sin Radix/shadcn en `reporta-admin` — HTML+Tailwind puro, consistente con ser un panel interno de un solo usuario tipo (reporta_admin), evita replicar toda una librería de componentes para un CRUD de una sola entidad.
