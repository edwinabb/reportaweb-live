-- Fix uk_formatos_informes_correlativo: scope unique constraint to (tenant_id, codigo_informe)
-- Previously was globally unique on codigo_informe alone, which caused conflicts
-- when multiple tenants use the same INF-xxx numbering sequences.
DROP INDEX IF EXISTS uk_formatos_informes_correlativo;
CREATE UNIQUE INDEX uk_formatos_informes_correlativo
    ON formatos_informes (tenant_id, codigo_informe)
    WHERE codigo_informe IS NOT NULL;
