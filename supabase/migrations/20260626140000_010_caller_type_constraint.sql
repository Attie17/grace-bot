-- Migration 010: Update caller_type constraint for professional flow
-- Expands allowed values to include professional roles

-- Drop existing constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_caller_type_check;

-- Add updated constraint with professional role values
ALTER TABLE leads
ADD CONSTRAINT leads_caller_type_check
CHECK (caller_type IS NULL OR caller_type IN (
    'myself',
    'under_18',
    'i_am_under_18',
    'family_member',
    'cbo_school',
    'school',
    'social_worker',
    'healthcare',
    'cbo',
    'community',
    'other'
));

COMMENT ON COLUMN leads.caller_type IS 'Caller type: myself, under_18, i_am_under_18, family_member, cbo_school (legacy), or professional roles (school, social_worker, healthcare, cbo, community, other)';
