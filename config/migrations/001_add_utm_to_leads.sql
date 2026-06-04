-- Adds UTM tracking columns to the leads table.
-- Run once in the Supabase SQL editor (or psql) against the production schema.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS so re-runs are safe.

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS utm_source   TEXT,
    ADD COLUMN IF NOT EXISTS utm_medium   TEXT,
    ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
    ADD COLUMN IF NOT EXISTS utm_content  TEXT,
    ADD COLUMN IF NOT EXISTS utm_term     TEXT;

-- Optional analytics indexes — uncomment if you intend to filter leads by source.
-- CREATE INDEX IF NOT EXISTS idx_leads_utm_source   ON leads(utm_source);
-- CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON leads(utm_campaign);
