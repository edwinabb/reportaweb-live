# Reporta Web v3

Plataforma de gestión operativa para empresas de servicios (grúas, maquinaria pesada). Construida con Next.js 15, Supabase y Vercel.

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI / shadcn
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Email**: Resend
- **PDF**: Gotenberg
- **Tests E2E**: Playwright (3 roles: planner, admin, viewer)
- **Deploy**: Vercel Pro

## Módulos

| Módulo | Estado |
| ------ | ------ |
| Planificación (wizard + timeline + reportes) | ✅ |
| Cotizaciones (CRUD + aprobación PIN + tarea generada) | ✅ |
| Ventas (valoraciones + facturas + cobros + detracción) | ✅ |
| Compras (valoraciones + facturas) | ✅ |
| Formatos WEB (plantillas, llenado, firma+PIN, PDF) | ✅ |
| EPP (entregas, alertas, email Resend) | ✅ |
| Terceros (directorio + personal + sitios) | ✅ |
| Maquinaria (equipos + modelos + tipos) | ✅ |
| Usuarios (perfiles + RBAC + documentos) | ✅ |
| Planes de acción | ✅ |
| Settings por tenant (informes, valorizaciones, cotizaciones) | ✅ |

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar vars de Supabase
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Tests E2E

Requiere usuarios de prueba en Supabase Auth (ver DT-002 en `DEUDA_TECNICA.md`).

```bash
# Suite rápida (solo planner)
npm run test:e2e:smoke

# Suite completa multi-rol
npm run test:e2e

# Por rol individual
npm run test:e2e:planner
npm run test:e2e:admin
npm run test:e2e:viewer

# Reporte HTML
npm run test:e2e:report
```

## Deploy

Ver `DEPLOYMENT.md` para runbook completo (Vercel Pro + DNS Cloudflare + vars de entorno).

## Deuda técnica

Ver `DEUDA_TECNICA.md` para items activos y su prioridad.
