-- Add missing columns to cotizaciones_ofertas_proveedores
ALTER TABLE public.cotizaciones_ofertas_proveedores
ADD COLUMN IF NOT EXISTS proveedor_id uuid NULL REFERENCES terceros(id),
    ADD COLUMN IF NOT EXISTS contacto_id uuid NULL REFERENCES terceros_contactos(id),
    ADD COLUMN IF NOT EXISTS fecha_oferta date NULL,
    ADD COLUMN IF NOT EXISTS moneda text NULL,
    ADD COLUMN IF NOT EXISTS forma_pago text NULL,
    ADD COLUMN IF NOT EXISTS plazo_pago text NULL,
    ADD COLUMN IF NOT EXISTS fecha_inicio_preliminar date NULL,
    ADD COLUMN IF NOT EXISTS descripcion_general text NULL;
create index IF not exists idx_ofertas_proveedores_proveedor on public.cotizaciones_ofertas_proveedores using btree (proveedor_id);
create index IF not exists idx_ofertas_proveedores_contacto on public.cotizaciones_ofertas_proveedores using btree (contacto_id);