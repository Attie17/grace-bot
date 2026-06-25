-- Adds the intake track (sud | wellness) and an optional additional_notes column
-- to leads. Run once in the Supabase SQL editor (or psql) against production.
-- Idempotent: ADD COLUMN IF NOT EXISTS, and the CHECK constraint is added in a
-- separate DO block so re-runs don't error out.

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS track            TEXT,
    ADD COLUMN IF NOT EXISTS additional_notes TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_track_check'
    ) THEN
        ALTER TABLE leads
            ADD CONSTRAINT leads_track_check
            CHECK (track IS NULL OR track IN ('sud', 'wellness'));
    END IF;
END$$;
