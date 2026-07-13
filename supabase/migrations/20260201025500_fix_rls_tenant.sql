-- Fix RLS Policy for Reportes Maquinaria & Others - USING HELPER FUNCTION
-- Problem: 'tenant_id' column type varies (UUID vs TEXT).
-- Solution: Use get_auth_tenant_id() helper and compare as TEXT for safety.
DO $$
DECLARE tables_transactional text [] := ARRAY [
    'reportes_maquinaria', 
    'tareas', 
    'maquinarias', 
    'cotizaciones', 
    'cotizaciones_detalle',
    'facturas_venta',
    'terceros'
];
DECLARE t text;
BEGIN FOREACH t IN ARRAY tables_transactional LOOP EXECUTE format(
    'DROP POLICY IF EXISTS "Access Policy" ON %I;',
    t
);
-- New Policy: Admin OR Created_By OR Tenant Match (via Helper Function)
-- We cast both sides to TEXT to handle both UUID and TEXT columns gracefully.
EXECUTE format(
    '
            CREATE POLICY "Access Policy" ON %I
            FOR ALL
            TO authenticated
            USING (
                (is_admin()) 
                OR (created_by::text = auth.uid()::text)
                OR (tenant_id::text = get_auth_tenant_id()::text)
            );',
    t
);
RAISE NOTICE 'Updated policy for % (Using get_auth_tenant_id)',
t;
END LOOP;
-- VIEW grant moved to 20260598000001_grant_view_permissions.sql (runs after views are created)
END $$;