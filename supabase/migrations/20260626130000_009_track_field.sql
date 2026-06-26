-- Migration 009: Add track field to leads table
-- Adds track column to capture intake pathway (substance/mental_health/digital/not_sure)

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('substance', 'mental_health', 'digital', 'not_sure'));

COMMENT ON COLUMN leads.track IS 'Intake pathway selected: substance, mental_health, digital, or not_sure';
