-- Seed personal_cargos para CISE y GRUAS
-- Cargos típicos del sector grúas / maquinaria pesada

DO $$
DECLARE
    v_cise  uuid := '1cb97ec7-326c-4376-93ee-ed317d3da51b';
    v_gruas uuid := '6f4c923a-c3b7-47c2-9dea-2a187f274f73';
    v_cargos text[] := ARRAY[
        'OPERADOR DE GRÚA',
        'RIGGER / APAREJADOR',
        'SUPERVISOR DE IZAJE',
        'OPERADOR DE MAQUINARIA',
        'OPERADOR DE MANLIFT',
        'OPERADOR DE MONTACARGAS',
        'ASISTENTE DE OPERACIONES',
        'TÉCNICO MECÁNICO',
        'TÉCNICO ELÉCTRICO',
        'INSPECTOR HSE',
        'SUPERVISOR HSE',
        'JEFE DE OPERACIONES',
        'COORDINADOR LOGÍSTICO',
        'CHOFER / TRANSPORTISTA',
        'SEÑALERO',
        'VIGÍA',
        'ALMACENERO',
        'ADMINISTRADOR',
        'GERENTE DE OPERACIONES',
        'OTRO'
    ];
    v_tenant uuid;
    v_cargo  text;
BEGIN
    FOREACH v_tenant IN ARRAY ARRAY[v_cise, v_gruas] LOOP
        FOREACH v_cargo IN ARRAY v_cargos LOOP
            INSERT INTO personal_cargos (tenant_id, nombre, is_active, created_at)
            VALUES (v_tenant, v_cargo, true, now())
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
