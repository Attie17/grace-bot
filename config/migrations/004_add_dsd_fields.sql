-- Adds DSD-required fields: city, province, caller_type
-- Idempotent: ADD COLUMN IF NOT EXISTS

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS city        TEXT,
    ADD COLUMN IF NOT EXISTS province    TEXT,
    ADD COLUMN IF NOT EXISTS caller_type TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_caller_type_check'
    ) THEN
        ALTER TABLE leads
            ADD CONSTRAINT leads_caller_type_check
            CHECK (caller_type IS NULL OR caller_type IN (
                'myself',
                'under_18',
                'i_am_under_18',
                'family_member',
                'cbo_school'
            ));
    END IF;
END$$;
