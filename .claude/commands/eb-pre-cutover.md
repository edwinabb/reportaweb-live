# EB-pre-cutover — Verificar pre-requisitos antes del cutover

Verifica los 50 pre-requisitos de datos en Supabase para ambos tenants (CISE y GRUAS) antes del cutover 2026-05-07.

## Pasos

1. Ejecuta `npm run check:pre-cutover` y captura la salida completa.
2. Clasifica cada resultado en: ✅ OK | ⚠️ Warning | 🔴 Bloqueante.
3. Reporta solo los ⚠️ y 🔴 con el mensaje exacto, la tabla/campo afectado y el tenant.
4. Si hay 0 bloqueantes: confirma que el sistema está listo para cutover el 2026-05-07.
5. Si hay bloqueantes: lista los pasos concretos para resolverlos (migración de datos, fix de código, seed faltante).
