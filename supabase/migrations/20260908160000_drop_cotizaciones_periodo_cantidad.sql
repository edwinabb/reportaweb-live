-- TK-C2 (docs/auditoria-ui/06-cotizaciones.md): columna muerta, sin uso en código
-- (única referencia era types/supabase.ts autogenerado). Confirmar antes de aplicar
-- que `periodo`/`periodo_unidad` siguen cubriendo el caso de uso real.
-- NOTA: preparada pero NO aplicada en PROD/TEST — el intento vía
-- mcp__claude_ai_Supabase__apply_migration fue denegado por el clasificador de
-- Claude Code (DDL destructivo). Aplicar manualmente cuando el usuario lo autorice.
ALTER TABLE cotizaciones DROP COLUMN IF EXISTS periodo_cantidad;
