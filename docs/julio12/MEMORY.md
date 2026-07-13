# Memory Index — Reporta Web 3

## 🟢 DATABASE VALIDATION: COMPLETO ✅ (2026-07-12)
- [🎉 Validación Exhaustiva COMPLETADA](GAPS_AND_ACTIONS.md) — 342k tokens | 5 archivos | 12 gaps identificados (3 ALTA, 5 MEDIA, 4 BAJA)
- **[⭐ LEER PRIMERO:](GAPS_AND_ACTIONS.md)** Síntesis final con hallazgos priorizados + roadmap v3.11/v3.12
- [📋 v3.11 TICKETS LISTOS](v3.11-TICKETS.md) — 6 tickets (15.5h) | 3 críticos + 3 media | Ready for backlog
- [🔍 AUDITORÍA BUBBLE](AUDITAR_BUBBLE_NO_MIGRADOS.md) — Guía paso-a-paso para auditar Bubble (año + tenant de NO migrados)
- [📊 GAPS CONFIRMADOS](GAPS_CONFIRMADOS_MIGRACION.md) — Gaps reales del mapeo (cuál auditar, cuál ignorar, cuál aplazar)
- [1️⃣ Backend Dependencies](BACKEND_DEPS.md) — 200+ funciones analizadas (13 módulos)
- [2️⃣ UI Dependencies](UI_DEPS.md) — 50+ componentes analizados (25+ páginas)
- [3️⃣ Schema Validation](SCHEMA_VALIDATION.md) — 150 tablas OK | 14/14 críticas presentes | 93% multi-tenancy
- [4️⃣ Bubble Comparison](BUBBLE_COMPARISON.md) — 71% migrado OK | 3 gaps críticos | 50 archivos PDF faltantes
- [📊 Summary Stats](RECOVERY_STATUS_UPDATE.md) — BD intacta | No corrupciones | Listo para cutover

## Estado actual
- [Estado post-cutover 2026-05-06](project_estado_post_cutover.md) — Sistema en prod v3.7.13/v1.5.1. Plan: fix E2E v1 → suite v2 → distribución app → nuevas features

## Proyecto
- [Dominios producción](project_dominios_produccion.md) — reporta.la = sistema VIEJO (NO tocar). reporta.app = sistema NUEVO (reportaweb3)
- [Contexto del proyecto Reporta macro](project_reporta_context.md) — Ecosistema, stack, módulos y arquitectura del sistema Reporta (web + app + Supabase + n8n)
- [Infra y deploy](project_infra_deploy_2026-04-21.md) — Vercel Pro, DNS Cloudflare, Resend. Runbook en DEPLOYMENT.md
- [Config de informes por tenant](project_informes_config_por_tenant.md) — config_informe_* para jornadas/riggers/firmas/fotos; 1 fila por tenant, siempre upsert

## Lecciones técnicas
- [Patrones de queries Supabase](lessons_supabase_query_patterns.md) — FK ambiguo planes_accion, join roto getTareas, enum maquinaria_propietario, buckets storage
- [Trampas Supabase Studio + tooling](lessons_supabase_studio_y_tooling.md) — Dollar-quotes únicos, SELECT INTO no funciona, ADD CONSTRAINT en DO block, regen types
- [Trampas PostgREST embeds + schema mismatches](lessons_supabase_postgrest_embeds.md) — PGRST200/PGRST201, insert columna inexistente, Turbopack root Next 16

## Feedback de trabajo
- [Campos no encontrados → pendientes](feedback_campos_no_encontrados.md) — No asumir cuando falta un campo de foto/PDF; documentar en pendientes_por_resolver.md
- [⚠️ REGLA CRÍTICA: Scope de migración (2 tenants solamente)](rule_migracion_tenants_scope.md) — Solo CISE + GRUAS migraron. Auditorías/PDFs/datos: filtrar por estos 2 tenants

## Configuración
- [Credenciales y config Supabase](config_credentials_supabase.md) — project-id wioozisskjjgjjybsoqo, comando regen types, buckets activos
