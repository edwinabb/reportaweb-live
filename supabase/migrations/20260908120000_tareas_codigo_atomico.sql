-- TK-P7: eliminar race condition en la generación de tareas.codigo (T-YYYY-XXXX)
-- Antes: count(*) + 1 en el código de la app -- dos inserts concurrentes podían
-- leer el mismo count y generar el mismo código.
-- Ahora: contador atómico por (tenant_id, año) vía UPSERT con RETURNING, que
-- Postgres serializa a nivel de fila -- imposible que dos llamadas concurrentes
-- obtengan el mismo número.

CREATE TABLE IF NOT EXISTS tareas_codigo_contador (
  tenant_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  anio integer NOT NULL,
  contador integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, anio)
);

-- Protege contra duplicados en el nuevo formato T-YYYY-XXXX sin chocar con los
-- códigos legacy T-NNNN migrados de Bubble (que sí tienen algunos duplicados
-- reales de origen, confirmado 2026-09-08 -- no se puede aplicar un unique
-- constraint global sin limpiar esos primero, fuera de alcance de este fix).
CREATE UNIQUE INDEX IF NOT EXISTS uk_tareas_codigo_nuevo_formato
  ON tareas (tenant_id, codigo)
  WHERE codigo ~ '^T-\d{4}-\d{4}$';

CREATE OR REPLACE FUNCTION fn_siguiente_codigo_tarea(p_tenant_id uuid, p_anio integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_anio integer := COALESCE(p_anio, EXTRACT(YEAR FROM now())::integer);
  v_contador integer;
BEGIN
  INSERT INTO tareas_codigo_contador (tenant_id, anio, contador)
  VALUES (p_tenant_id, v_anio, 1)
  ON CONFLICT (tenant_id, anio)
  DO UPDATE SET contador = tareas_codigo_contador.contador + 1
  RETURNING contador INTO v_contador;

  RETURN 'T-' || v_anio || '-' || lpad(v_contador::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION fn_siguiente_codigo_tarea(uuid, integer) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON tareas_codigo_contador TO authenticated, service_role;
ALTER TABLE tareas_codigo_contador ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tareas_codigo_contador_tenant_isolation ON tareas_codigo_contador;
CREATE POLICY tareas_codigo_contador_tenant_isolation ON tareas_codigo_contador
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
