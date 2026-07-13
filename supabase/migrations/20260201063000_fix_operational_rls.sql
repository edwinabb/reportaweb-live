-- Fix RLS on Operational Tables
-- Problem: Views perform Joins (e.g. Reporte -> Tarea -> Tercero). 
-- If 'Tareas' or 'Terceros' policies are too restrictive (e.g. 'created_by only'), the row disappears from the view.
-- Solution: Apply Standard Tenant Access (get_auth_tenant_id) to all operational tables.
DO $$
DECLARE t text;
-- Tables involved in the View Joins + others
tables_ops text [] := ARRAY [
        'tareas', 
        'terceros', 
        'maquinarias', 
        'cotizaciones', 
        'cotizaciones_detalle',
        'reportes_maquinaria' -- Doing it again to be safe
    ];
BEGIN FOREACH t IN ARRAY tables_ops LOOP -- Enable RLS (idempotent)
EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
-- Drop existing policies to avoid conflicts
EXECUTE format(
    'DROP POLICY IF EXISTS "Tenant Access SELECT" ON %I;',
    t
);
EXECUTE format(
    'DROP POLICY IF EXISTS "Tenant Access INSERT" ON %I;',
    t
);
EXECUTE format(
    'DROP POLICY IF EXISTS "Tenant Access UPDATE" ON %I;',
    t
);
EXECUTE format(
    'DROP POLICY IF EXISTS "Tenant Access DELETE" ON %I;',
    t
);
-- Also drop potentially old names
EXECUTE format(
    'DROP POLICY IF EXISTS "Enable read for users based on tenant_id" ON %I;',
    t
);
EXECUTE format(
    'DROP POLICY IF EXISTS "Enable insert for users based on tenant_id" ON %I;',
    t
);
-- CREATE SELECT POLICY (Critical for Views)
-- Using robust text casting just in case
EXECUTE format(
    '
            CREATE POLICY "Tenant Access SELECT" ON %I
            FOR SELECT
            TO authenticated
            USING (tenant_id::text = get_auth_tenant_id()::text);',
    t
);
-- CREATE INSERT POLICY
EXECUTE format(
    '
            CREATE POLICY "Tenant Access INSERT" ON %I
            FOR INSERT
            TO authenticated
            WITH CHECK (tenant_id::text = get_auth_tenant_id()::text);',
    t
);
-- CREATE UPDATE POLICY
EXECUTE format(
    '
            CREATE POLICY "Tenant Access UPDATE" ON %I
            FOR UPDATE
            TO authenticated
            USING (tenant_id::text = get_auth_tenant_id()::text);',
    t
);
-- CREATE DELETE POLICY (Optional, maybe admin only? for now allow tenant)
-- EXECUTE format('CREATE POLICY "Tenant Access DELETE" ON %I ... ', t);
RAISE NOTICE 'Fixed RLS for table: %',
t;
END LOOP;
END $$;