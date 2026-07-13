-- Agrega constraint único en personal_cargos para permitir upsert por tenant_id + nombre
ALTER TABLE personal_cargos
    ADD CONSTRAINT personal_cargos_tenant_nombre_unique UNIQUE (tenant_id, nombre);
