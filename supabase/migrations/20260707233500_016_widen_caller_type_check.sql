ALTER TABLE leads
    DROP CONSTRAINT IF EXISTS leads_caller_type_check;

ALTER TABLE leads
    ADD CONSTRAINT leads_caller_type_check
    CHECK (caller_type IS NULL OR caller_type IN (
        'myself',
        'under_18',
        'i_am_under_18',
        'family_member',
        'cbo_school',
        'self',
        'caring',
        'professional'
    ));