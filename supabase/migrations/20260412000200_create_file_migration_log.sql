-- MIG-VALIDACION Bloque B: control table for Bubble S3 → Supabase Storage migration.
-- Tracks per (table, row, field) the source URL, destination bucket/path,
-- resulting public URL, status and any error — so the migration script is idempotent
-- and can be resumed/retried safely. Used by scripts/migrate-files-to-storage.ts.

CREATE TABLE IF NOT EXISTS public.file_migration_log (
    table_name      TEXT NOT NULL,
    row_id          UUID NOT NULL,
    field           TEXT NOT NULL,
    bubble_url      TEXT NOT NULL,
    storage_bucket  TEXT,
    storage_path    TEXT,
    public_url      TEXT,
    content_type    TEXT,
    size_bytes      BIGINT,
    status          TEXT NOT NULL DEFAULT 'pending',
    error           TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT file_migration_log_pkey PRIMARY KEY (table_name, row_id, field),
    CONSTRAINT file_migration_log_status_chk
        CHECK (status IN ('pending', 'done', 'error', 'skipped'))
);

CREATE INDEX IF NOT EXISTS file_migration_log_status_idx
    ON public.file_migration_log (status);

CREATE INDEX IF NOT EXISTS file_migration_log_table_status_idx
    ON public.file_migration_log (table_name, status);

ALTER TABLE public.file_migration_log ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role key may read/write this table.
