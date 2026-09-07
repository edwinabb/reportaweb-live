-- supabase/migrations/20260906130000_extend_pdf_jobs_bubble_bridge.sql

ALTER TABLE public.pdf_jobs
    ADD COLUMN IF NOT EXISTS doc_category  TEXT,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS callback_url  TEXT,
    ADD COLUMN IF NOT EXISTS template_key  TEXT,
    ADD COLUMN IF NOT EXISTS payload       JSONB;

ALTER TABLE public.pdf_jobs
    ADD CONSTRAINT pdf_jobs_doc_category_check
    CHECK (doc_category IS NULL OR doc_category IN ('comercial', 'operativo'));

CREATE INDEX IF NOT EXISTS pdf_jobs_next_retry_idx
    ON public.pdf_jobs (next_retry_at)
    WHERE status = 'pending';

INSERT INTO storage.buckets (id, name, public)
VALUES ('bubble-pdfs', 'bubble-pdfs', true)
ON CONFLICT (id) DO NOTHING;
