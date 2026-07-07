ALTER TABLE leads
    DROP CONSTRAINT IF EXISTS leads_urgency_level_check;

ALTER TABLE leads
    ADD CONSTRAINT leads_urgency_level_check
    CHECK (urgency_level IS NULL OR urgency_level IN (
        'stable',
        'urgent',
        'crisis',
        'normal'
    ));