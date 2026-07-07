ALTER TABLE leads
    DROP CONSTRAINT IF EXISTS leads_track_check;

ALTER TABLE leads
    ADD CONSTRAINT leads_track_check
    CHECK (track IS NULL OR track IN (
        'sud',
        'wellness',
        'substance',
        'mental_health',
        'digital',
        'not_sure',
        'app_referral'
    ));