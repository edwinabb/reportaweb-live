-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- REP-3.11-006: Seed Missing Catalogs v3.11
-- ═══════════════════════════════════════════════════════════════════════════════════════════
--
-- Purpose: Ensure all tenant-scoped catalogs have minimum required values
--          for UI dropdowns to function properly
--
-- Scope: CISE + GRUAS tenants only (2 migrated tenants)
--
-- Tables Affected:
--   - rubros
--   - servicios_tipo_precios
--   - contactos_cargo
--   - personal_cargos
--   - contactos_area
--   - sitios_tipo
--
-- Safety: Uses ON CONFLICT to idempotently insert/reactivate items
--         No data deletion, only activation of inactive records
--
-- ═══════════════════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Get migrated tenant IDs
WITH migrated_tenants AS (
  SELECT
    id,
    nombre
  FROM companies
  WHERE nombre IN (
    'CISE del Perú SAC',
    'GRUAS del PACIFICO SAC'
  )
)

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 1. RUBROS: Seed common business sectors
-- ─────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO rubros (id, tenant_id, nombre, is_active, created_at)
SELECT
  COALESCE(
    (SELECT id FROM rubros WHERE tenant_id = mt.id AND nombre = item.nombre LIMIT 1),
    gen_random_uuid()
  ),
  mt.id,
  item.nombre,
  true,
  NOW()
FROM migrated_tenants mt
CROSS JOIN (
  VALUES
    ('Transportes'),
    ('Construcción'),
    ('Minería'),
    ('Manufactura'),
    ('Comercio'),
    ('Servicios'),
    ('Agricultura'),
    ('Telecomunicaciones'),
    ('Energía'),
    ('Finanzas'),
    ('Educación'),
    ('Salud'),
    ('Otro')
) item(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM rubros r
  WHERE r.tenant_id = mt.id
  AND LOWER(r.nombre) = LOWER(item.nombre)
);

-- Reactivate any inactive rubros
UPDATE rubros
SET is_active = true
WHERE tenant_id IN (SELECT id FROM migrated_tenants)
AND is_active = false;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 2. SERVICIOS_TIPO_PRECIOS: Seed common price types
-- ─────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO servicios_tipo_precios (id, tenant_id, codigo, nombre)
SELECT
  COALESCE(
    (SELECT id FROM servicios_tipo_precios WHERE tenant_id = mt.id AND nombre = item.nombre LIMIT 1),
    gen_random_uuid()
  ),
  mt.id,
  item.codigo,
  item.nombre
FROM migrated_tenants mt
CROSS JOIN (
  VALUES
    ('HORA', 'Por Hora'),
    ('DIA', 'Por Día'),
    ('MES', 'Por Mes'),
    ('FIJO', 'Precio Fijo'),
    ('VAR', 'Precio Variable')
) item(codigo, nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM servicios_tipo_precios s
  WHERE s.tenant_id = mt.id
  AND LOWER(s.nombre) = LOWER(item.nombre)
);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 3. CONTACTOS_CARGO: Seed contact position titles
-- ─────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO contactos_cargo (id, tenant_id, nombre, is_active, created_at)
SELECT
  COALESCE(
    (SELECT id FROM contactos_cargo WHERE tenant_id = mt.id AND nombre = item.nombre LIMIT 1),
    gen_random_uuid()
  ),
  mt.id,
  item.nombre,
  true,
  NOW()
FROM migrated_tenants mt
CROSS JOIN (
  VALUES
    ('Gerente'),
    ('Jefe de Proyecto'),
    ('Coordinador'),
    ('Operario'),
    ('Supervisor'),
    ('Director'),
    ('Ejecutivo'),
    ('Representante')
) item(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM contactos_cargo cc
  WHERE cc.tenant_id = mt.id
  AND LOWER(cc.nombre) = LOWER(item.nombre)
);

-- Reactivate any inactive contactos_cargo
UPDATE contactos_cargo
SET is_active = true
WHERE tenant_id IN (SELECT id FROM migrated_tenants)
AND is_active = false;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 4. PERSONAL_CARGOS: Seed staff job titles
-- ─────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO personal_cargos (id, tenant_id, nombre, is_active, created_at)
SELECT
  COALESCE(
    (SELECT id FROM personal_cargos WHERE tenant_id = mt.id AND nombre = item.nombre LIMIT 1),
    gen_random_uuid()
  ),
  mt.id,
  item.nombre,
  true,
  NOW()
FROM migrated_tenants mt
CROSS JOIN (
  VALUES
    ('Operario'),
    ('Supervisor'),
    ('Chofer'),
    ('Técnico'),
    ('Ayudante'),
    ('Mecánico'),
    ('Albañil'),
    ('Electricista'),
    ('Soldador'),
    ('Pintor')
) item(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM personal_cargos pc
  WHERE pc.tenant_id = mt.id
  AND LOWER(pc.nombre) = LOWER(item.nombre)
);

-- Reactivate any inactive personal_cargos
UPDATE personal_cargos
SET is_active = true
WHERE tenant_id IN (SELECT id FROM migrated_tenants)
AND is_active = false;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 5. CONTACTOS_AREA: Seed contact departments
-- ─────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO contactos_area (id, tenant_id, nombre, is_active, created_at)
SELECT
  COALESCE(
    (SELECT id FROM contactos_area WHERE tenant_id = mt.id AND nombre = item.nombre LIMIT 1),
    gen_random_uuid()
  ),
  mt.id,
  item.nombre,
  true,
  NOW()
FROM migrated_tenants mt
CROSS JOIN (
  VALUES
    ('Ventas'),
    ('Operaciones'),
    ('Administración'),
    ('Finanzas'),
    ('Recursos Humanos'),
    ('Logística'),
    ('Mantenimiento')
) item(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM contactos_area ca
  WHERE ca.tenant_id = mt.id
  AND LOWER(ca.nombre) = LOWER(item.nombre)
);

-- Reactivate any inactive contactos_area
UPDATE contactos_area
SET is_active = true
WHERE tenant_id IN (SELECT id FROM migrated_tenants)
AND is_active = false;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 6. SITIOS_TIPO: Seed site types
-- ─────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO sitios_tipo (id, tenant_id, nombre, is_active, created_at)
SELECT
  COALESCE(
    (SELECT id FROM sitios_tipo WHERE tenant_id = mt.id AND nombre = item.nombre LIMIT 1),
    gen_random_uuid()
  ),
  mt.id,
  item.nombre,
  true,
  NOW()
FROM migrated_tenants mt
CROSS JOIN (
  VALUES
    ('Oficina'),
    ('Almacén'),
    ('Obra'),
    ('Taller'),
    ('Planta'),
    ('Patio'),
    ('Mina'),
    ('Puerto')
) item(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM sitios_tipo st
  WHERE st.tenant_id = mt.id
  AND LOWER(st.nombre) = LOWER(item.nombre)
);

-- Reactivate any inactive sitios_tipo
UPDATE sitios_tipo
SET is_active = true
WHERE tenant_id IN (SELECT id FROM migrated_tenants)
AND is_active = false;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Log results
-- ─────────────────────────────────────────────────────────────────────────────────────────

-- Check counts
DO $$
DECLARE
  v_rubros_count INT;
  v_servicios_count INT;
  v_contactos_cargo_count INT;
  v_personal_cargos_count INT;
  v_contactos_area_count INT;
  v_sitios_tipo_count INT;
BEGIN
  SELECT COUNT(*) INTO v_rubros_count FROM rubros
    WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
    AND is_active = true;

  SELECT COUNT(*) INTO v_servicios_count FROM servicios_tipo_precios
    WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'));

  SELECT COUNT(*) INTO v_contactos_cargo_count FROM contactos_cargo
    WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
    AND is_active = true;

  SELECT COUNT(*) INTO v_personal_cargos_count FROM personal_cargos
    WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
    AND is_active = true;

  SELECT COUNT(*) INTO v_contactos_area_count FROM contactos_area
    WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
    AND is_active = true;

  SELECT COUNT(*) INTO v_sitios_tipo_count FROM sitios_tipo
    WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
    AND is_active = true;

  RAISE NOTICE 'REP-3.11-006: Catalog Seed Results';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'rubros: % active', v_rubros_count;
  RAISE NOTICE 'servicios_tipo_precios: % items', v_servicios_count;
  RAISE NOTICE 'contactos_cargo: % active', v_contactos_cargo_count;
  RAISE NOTICE 'personal_cargos: % active', v_personal_cargos_count;
  RAISE NOTICE 'contactos_area: % active', v_contactos_area_count;
  RAISE NOTICE 'sitios_tipo: % active', v_sitios_tipo_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- END REP-3.11-006: Seed Migration
-- ═══════════════════════════════════════════════════════════════════════════════════════════
