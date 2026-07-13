-- Fix Audit Columns to be TEXT to support Bubble IDs (e.g. 1615838099980x5872765459583001800)
-- 1. Drop potential Foreign Keys (if they exist)
ALTER TABLE reportes_maquinaria DROP CONSTRAINT IF EXISTS reportes_maquinaria_created_by_fkey;
ALTER TABLE reportes_maquinaria DROP CONSTRAINT IF EXISTS reportes_maquinaria_updated_by_fkey;
-- 2. Alter Columns to TEXT (only if they exist and are not already text)
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='reportes_maquinaria' AND column_name='created_by' AND data_type<>'text') THEN
        ALTER TABLE reportes_maquinaria ALTER COLUMN created_by TYPE text USING created_by::text;
    END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='reportes_maquinaria' AND column_name='updated_by' AND data_type<>'text') THEN
        ALTER TABLE reportes_maquinaria ALTER COLUMN updated_by TYPE text USING updated_by::text;
    END IF;
END $$;