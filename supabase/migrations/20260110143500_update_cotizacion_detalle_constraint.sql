-- Drop existing constraint
ALTER TABLE "public"."cotizaciones_detalle" DROP CONSTRAINT "cotizaciones_detalle_precio_seleccionado_check";

-- Add new constraint allowing 0, 1, 2, 3
ALTER TABLE "public"."cotizaciones_detalle" ADD CONSTRAINT "cotizaciones_detalle_precio_seleccionado_check" CHECK (precio_seleccionado IN (0, 1, 2, 3));
