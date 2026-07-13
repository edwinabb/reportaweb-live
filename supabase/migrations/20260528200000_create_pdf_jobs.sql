CREATE TABLE IF NOT EXISTS public.pdf_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    bucket          TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    html_snapshot   TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    attempts        INT  NOT NULL DEFAULT 0,
    max_attempts    INT  NOT NULL DEFAULT 3,
    last_error      TEXT,
    pdf_url         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pdf_jobs_status_idx ON public.pdf_jobs (status, created_at)
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS pdf_jobs_entity_idx ON public.pdf_jobs (entity_type, entity_id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS pdf_jobs_entity_pending_unique
    ON public.pdf_jobs (entity_type, entity_id, tenant_id)
    WHERE status = 'pending';

ALTER TABLE public.pdf_jobs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.pdf_jobs TO service_role;
