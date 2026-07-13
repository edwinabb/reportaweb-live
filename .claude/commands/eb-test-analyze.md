# EB-test-analyze — Correr suite E2E y analizar resultados

Ejecuta la suite completa de Playwright, espera los resultados y los analiza agrupando los fallos por categoría.

## Pasos

1. Elimina `.auth/admin.json`, `.auth/planner.json`, `.auth/viewer.json` si existen (fuerza re-autenticación fresca).
2. Ejecuta `npm run test:e2e` en background (puede tardar ~54 minutos).
3. Cuando termine, lee la salida y agrupa los fallos en:
   - **Grupo A** — flows 02-06: form planificación rediseñado (no bloquean cutover)
   - **Grupo B** — EPP/Formatos/Cron: locators viejos o CRON_SECRET faltante
   - **Grupo C** — RBAC: textos de sidebar o botones que cambiaron
   - **Grupo F** — "patrón de sesión": admin/viewer ven tabla vacía (probable tenant mismatch)
   - **Grupo G/H** — pre-cutover admin/viewer: datos o locators desactualizados
4. Actualiza `docs/test-results-mayo-2026.md` con la nueva tabla de resultados y una sección de fixes aplicados si corresponde.
5. Reporta resumen: total pasaron / fallaron / omitidos + tabla de grupos + lista de bloqueantes para cutover (si hay).
