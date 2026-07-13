-- supabase/migrations/20260602000000_trial_onboarding.sql

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS trial_status      TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS trial_start_at    TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS trial_expires_at  TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS fleet_type        TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS fleet_size        INT  DEFAULT NULL;

ALTER TABLE companies
    DROP CONSTRAINT IF EXISTS companies_trial_status_check;
ALTER TABLE companies
    ADD CONSTRAINT companies_trial_status_check
    CHECK (trial_status IS NULL OR trial_status IN ('active', 'expired', 'converted'));

CREATE TABLE IF NOT EXISTS trial_emails_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    dia         INT         NOT NULL,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT trial_emails_log_unique UNIQUE (tenant_id, dia)
);

ALTER TABLE trial_emails_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_emails_log_tenant_read" ON trial_emails_log
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Note: INSERT/UPDATE/DELETE on trial_emails_log are performed exclusively via
-- service_role key (createAdminClient in lib/actions/trial.ts and cron routes).
-- No permissive write policies are needed for the authenticated role.

CREATE INDEX IF NOT EXISTS idx_companies_trial_active
    ON companies (trial_expires_at)
    WHERE trial_status = 'active';
