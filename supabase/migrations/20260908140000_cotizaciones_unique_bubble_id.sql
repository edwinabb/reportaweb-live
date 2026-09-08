-- Cotizaciones nunca tuvo delta-sync desde el cutover de mayo 2026. El script
-- original (migrate-cotizaciones-bubble.ts, ver git history) usaba
-- `.upsert(..., { onConflict: 'bubble_id' })` pero NUNCA existio un constraint
-- UNIQUE real sobre bubble_id en ninguna de las 5 tablas del modulo -- solo
-- (tenant_id, numero, version) en `cotizaciones`. Sin el constraint, cualquier
-- upsert por bubble_id fallaria con 42P10 (mismo patron ya visto en
-- formatos_preguntas durante la migracion de Informes/Checklist).
--
-- Confirmado: 0 bubble_id duplicados en las 5 tablas (TEST y PROD), seguro
-- agregar el indice unico sin limpieza previa.

CREATE UNIQUE INDEX IF NOT EXISTS uk_cotizaciones_bubble_id ON cotizaciones (bubble_id) WHERE bubble_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cotizaciones_detalle_bubble_id ON cotizaciones_detalle (bubble_id) WHERE bubble_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cotizaciones_matriz_bubble_id ON cotizaciones_matriz_responsabilidad (bubble_id) WHERE bubble_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cotizaciones_ofertas_prov_bubble_id ON cotizaciones_ofertas_proveedores (bubble_id) WHERE bubble_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cotizaciones_ofertas_items_bubble_id ON cotizaciones_ofertas_items (bubble_id) WHERE bubble_id IS NOT NULL;
