-- Add categoria column to maquinaria_tipos_docs
ALTER TABLE maquinaria_tipos_docs 
ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'sin_vencimiento';

-- Ideally we should use an ENUM, but text with check constraint is also fine for flexibility or simple enum
-- CREATE TYPE doc_categoria AS ENUM ('seguro', 'con_vencimiento', 'sin_vencimiento');
-- ALTER TABLE maquinaria_tipos_docs ADD COLUMN categoria doc_categoria DEFAULT 'sin_vencimiento';

-- For now, letting it be text to match the code's flexibility or adding a check constraint
ALTER TABLE maquinaria_tipos_docs 
ADD CONSTRAINT check_categoria CHECK (categoria IN ('seguro', 'con_vencimiento', 'sin_vencimiento'));
