-- Seed base de contactos_cargo y contactos_area para CISE y GRUAS.
-- Bubble no tiene datos de cargo/area en terceros_contactos, así que se
-- usa un catálogo razonable igual para ambos tenants.

INSERT INTO public.contactos_cargo (nombre, tenant_id)
VALUES
  ('SUPERVISOR',        '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('ASISTENTE COMPRAS', '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('GERENTE',           '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('ADMINISTRADOR',     '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('OPERADOR',          '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('GERENTE',           '1cb97ec7-326c-4376-93ee-ed317d3da51b'),
  ('ADMINISTRADOR',     '1cb97ec7-326c-4376-93ee-ed317d3da51b'),
  ('OPERADOR',          '1cb97ec7-326c-4376-93ee-ed317d3da51b')
ON CONFLICT DO NOTHING;

INSERT INTO public.contactos_area (nombre, tenant_id)
VALUES
  ('OPERACIONES',   '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('COMPRAS',       '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('ADMINISTRACIÓN','6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('LOGÍSTICA',     '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('SEGURIDAD',     '6f4c923a-c3b7-47c2-9dea-2a187f274f73'),
  ('ADMINISTRACIÓN','1cb97ec7-326c-4376-93ee-ed317d3da51b'),
  ('LOGÍSTICA',     '1cb97ec7-326c-4376-93ee-ed317d3da51b'),
  ('SEGURIDAD',     '1cb97ec7-326c-4376-93ee-ed317d3da51b')
ON CONFLICT DO NOTHING;
