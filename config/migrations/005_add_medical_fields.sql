-- Adds medical tracking fields: medical_aid_name, medical_member_number
-- Idempotent: ADD COLUMN IF NOT EXISTS

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS medical_aid_name        TEXT,
    ADD COLUMN IF NOT EXISTS medical_member_number   TEXT;
