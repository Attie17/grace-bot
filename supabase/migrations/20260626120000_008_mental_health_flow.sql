-- Migration 008: Add mental health flow fields
-- Adds mh_description and urgency_level to support new mental health intake flow

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS mh_description TEXT,
ADD COLUMN IF NOT EXISTS urgency_level TEXT CHECK (urgency_level IN ('stable', 'urgent', 'crisis'));

COMMENT ON COLUMN leads.mh_description IS 'Free-text description from mental health flow (stage_mh_opening)';
COMMENT ON COLUMN leads.urgency_level IS 'Safety/urgency level from mental health flow: stable, urgent, or crisis';
