-- Add cotizacion_item_id FK to tareas — links a task to a specific quotation line item.
-- Referenced by view_ventas_pendientes_facturar and related views.
ALTER TABLE public.tareas
    ADD COLUMN IF NOT EXISTS cotizacion_item_id UUID REFERENCES public.cotizaciones_detalle(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tareas_cotizacion_item ON public.tareas(cotizacion_item_id);

-- Add horas_trabajadas to reportes_maquinaria — actual worked hours vs reported hours.
-- Used in ventas/compras panel views for billing calculations.
ALTER TABLE public.reportes_maquinaria
    ADD COLUMN IF NOT EXISTS horas_trabajadas NUMERIC(8,2);
