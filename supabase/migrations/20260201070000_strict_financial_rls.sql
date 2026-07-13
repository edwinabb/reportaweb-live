-- Strict Financial RLS
-- Requirement: Only Admins (Tenant Admin or Global Admin) can see Sales/Finance data.
-- Tables: cotizaciones, cotizaciones_detalle, facturas_venta, facturas_venta_items, facturas_venta_pagos
DO $$
DECLARE t text;
tables_finance text [] := ARRAY [
        'cotizaciones', 
        'cotizaciones_detalle', 
        'facturas_venta',
        'facturas_venta_item',
        'factura_venta_pagos'
    ];
BEGIN FOREACH t IN ARRAY tables_finance LOOP
EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
EXECUTE format('DROP POLICY IF EXISTS "Tenant Access SELECT" ON %I;', t);
EXECUTE format('DROP POLICY IF EXISTS "Tenant Access INSERT" ON %I;', t);
EXECUTE format('DROP POLICY IF EXISTS "Tenant Access UPDATE" ON %I;', t);
EXECUTE format('DROP POLICY IF EXISTS "Tenant Access DELETE" ON %I;', t);
-- Only create tenant_id-based policies for tables that have the column
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tenant_id') THEN
    EXECUTE format(
        'CREATE POLICY "Admin Tenant Access SELECT" ON %I FOR SELECT TO authenticated
         USING ((tenant_id::text = get_auth_tenant_id()::text AND is_admin()) OR (current_setting(''request.jwt.claim.role'', true) = ''service_role''));',
        t
    );
    EXECUTE format(
        'CREATE POLICY "Admin Tenant Access INSERT" ON %I FOR INSERT TO authenticated
         WITH CHECK (tenant_id::text = get_auth_tenant_id()::text AND is_admin());',
        t
    );
    EXECUTE format(
        'CREATE POLICY "Admin Tenant Access UPDATE" ON %I FOR UPDATE TO authenticated
         USING (tenant_id::text = get_auth_tenant_id()::text AND is_admin());',
        t
    );
    RAISE NOTICE 'Secured table % for Admins only', t;
ELSE
    RAISE NOTICE 'Skipped % — no tenant_id column', t;
END IF;
END LOOP;
END $$;