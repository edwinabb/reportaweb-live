-- Strict Financial RLS v2
-- Separates Parent Tables (Direct Tenant ID) vs Child Tables (Join Check)
-- Ensures only Admins see financial data.
-- BLOCK 1: PARENT TABLES (Have tenant_id)
DO $$
DECLARE t text;
tables_parent text [] := ARRAY ['cotizaciones', 'facturas_venta'];
BEGIN FOREACH t IN ARRAY tables_parent LOOP EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
EXECUTE format(
    'DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON %I;',
    t
);
EXECUTE format(
    'DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON %I;',
    t
);
EXECUTE format(
    'DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON %I;',
    t
);
EXECUTE format(
    'DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON %I;',
    t
);
EXECUTE format(
    '
            CREATE POLICY "Admin Tenant Access SELECT" ON %I
            FOR SELECT TO authenticated
            USING ( (tenant_id::text = get_auth_tenant_id()::text AND is_admin()) OR (current_setting(''request.jwt.claim.role'', true) = ''service_role'') );',
    t
);
-- Simplified Write Policies (same using logic)
EXECUTE format(
    '
            CREATE POLICY "Admin Tenant Access INSERT" ON %I FOR INSERT TO authenticated
            WITH CHECK ((tenant_id::text = get_auth_tenant_id()::text AND is_admin()));',
    t
);
EXECUTE format(
    '
            CREATE POLICY "Admin Tenant Access UPDATE" ON %I FOR UPDATE TO authenticated
            USING ((tenant_id::text = get_auth_tenant_id()::text AND is_admin()));',
    t
);
RAISE NOTICE 'Fixed P-RLS for %',
t;
END LOOP;
END $$;
-- BLOCK 2: CHILD TABLES (Join to Parent)
-- cotizaciones_detalle -> cotizaciones (cotizacion_id)
-- facturas_venta_item -> facturas_venta (factura_venta_id)
-- factura_venta_pagos -> facturas_venta (factura_venta_id) -- Assuming this FK name
DO $$ BEGIN -- COTIZACIONES DETALLE
ALTER TABLE cotizaciones_detalle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON cotizaciones_detalle;
CREATE POLICY "Admin Tenant Access SELECT" ON cotizaciones_detalle FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM cotizaciones p
            WHERE p.id = cotizaciones_detalle.cotizacion_id
                AND p.tenant_id::text = get_auth_tenant_id()::text
                AND is_admin()
        )
        OR (
            current_setting('request.jwt.claim.role', true) = 'service_role'
        )
    );
-- FACTURAS VENTA ITEM (Singular)
ALTER TABLE facturas_venta_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON facturas_venta_item;
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='factura_venta_id') THEN
    CREATE POLICY "Admin Tenant Access SELECT" ON facturas_venta_item FOR
    SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM facturas_venta p WHERE p.id = facturas_venta_item.factura_venta_id AND p.tenant_id::text = get_auth_tenant_id()::text AND is_admin())
        OR (current_setting('request.jwt.claim.role', true) = 'service_role')
    );
END IF;
-- FACTURA VENTA PAGOS (Singular)
ALTER TABLE factura_venta_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON factura_venta_pagos;
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='factura_venta_id') THEN
    CREATE POLICY "Admin Tenant Access SELECT" ON factura_venta_pagos FOR
    SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM facturas_venta p WHERE p.id = factura_venta_pagos.factura_venta_id AND p.tenant_id::text = get_auth_tenant_id()::text AND is_admin())
        OR (current_setting('request.jwt.claim.role', true) = 'service_role')
    );
END IF;
RAISE NOTICE 'Fixed Child RLS';
END $$;