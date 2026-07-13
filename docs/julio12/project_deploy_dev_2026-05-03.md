---
name: Deploy dev a nube 2026-05-03
description: Mañana (2026-05-03) se publica la versión dev en Vercel para que el usuario cliente pruebe antes del cutover del 2026-05-07
type: project
---

El día 2026-05-03 se hace el primer deploy de la versión dev a Vercel para que el usuario cliente pueda probar la aplicación en la nube antes del cutover oficial.

**Why:** El cutover definitivo es el 2026-05-07. Este deploy sirve como UAT (User Acceptance Testing) en ambiente de nube real, no localhost.

**How to apply:** Al iniciar la sesión del 2026-05-03, priorizar el deploy a Vercel y confirmar que el usuario puede acceder. Seguir el runbook en `DEPLOYMENT.md`. Verificar variables de entorno en Vercel (NEXT_PUBLIC_SENTRY_DSN, SENTRY_DSN, SUPABASE_*, RESEND_API_KEY, etc).
