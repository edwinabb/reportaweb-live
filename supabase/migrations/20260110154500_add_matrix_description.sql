-- Add descripcion column to actividades_matriz (Catalog)
ALTER TABLE "public"."actividades_matriz" ADD COLUMN IF NOT EXISTS "descripcion" text;

-- Add descripcion column to cotizaciones_matriz_responsabilidad (Instance)
ALTER TABLE "public"."cotizaciones_matriz_responsabilidad" ADD COLUMN IF NOT EXISTS "descripcion" text;
