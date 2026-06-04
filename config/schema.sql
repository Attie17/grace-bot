-- Stabilis Intake Bot - Database Schema
-- Run this in your Supabase SQL editor before first use.
-- POPIA-compliant: All PII encrypted at rest via Supabase.

-- Conversations: store ongoing chats
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- Leads: qualified prospects ready for therapist contact
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    
    -- Contact
    contact_name TEXT,
    contact_phone TEXT,
    preferred_callback_time TEXT,
    language_preference TEXT DEFAULT 'english',
    
    -- Clinical
    for_whom TEXT CHECK (for_whom IN ('self', 'family', 'friend', 'employer')),
    substance_primary TEXT,
    usage_pattern TEXT,
    previous_treatment TEXT CHECK (previous_treatment IN ('none', 'once', 'multiple')),
    mental_health TEXT CHECK (mental_health IN ('none', 'suspected', 'diagnosed', 'unknown')),
    medical_flags TEXT,
    
    -- Financial
    medical_aid TEXT,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,

    -- Assessment
    readiness_score INTEGER CHECK (readiness_score BETWEEN 1 AND 10),
    urgency TEXT CHECK (urgency IN ('immediate', 'soon', 'planning', 'researching')),
    recommended_programme TEXT,
    notes_for_therapist TEXT,
    
    -- Workflow
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'admitted', 'not_fit', 'lost')),
    therapist_notes TEXT,
    admitted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_urgency ON leads(urgency);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- Events: granular analytics
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- POPIA data retention: auto-delete old non-admitted conversations
-- Runs daily via Supabase cron or pg_cron
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
    -- Delete conversations older than 90 days that didn't result in admission
    DELETE FROM conversations
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND session_id NOT IN (
        SELECT session_id FROM leads WHERE status = 'admitted'
    );
END;
$$ LANGUAGE plpgsql;

-- Dashboard view for therapists.
-- security_invoker = true so the view honours the caller's RLS policies on `leads`
-- rather than running as the view owner (which would bypass RLS).
CREATE VIEW lead_dashboard WITH (security_invoker = true) AS
SELECT 
    id,
    contact_name,
    contact_phone,
    urgency,
    medical_aid,
    recommended_programme,
    readiness_score,
    status,
    notes_for_therapist,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours_since_lead
FROM leads
WHERE status IN ('new', 'contacted')
ORDER BY 
    CASE urgency
        WHEN 'immediate' THEN 1
        WHEN 'soon' THEN 2
        WHEN 'planning' THEN 3
        ELSE 4
    END,
    created_at DESC;

-- ============================================================
-- Row-Level Security
-- ============================================================
-- Server code uses the service_role key (SUPABASE_SERVICE_KEY),
-- which bypasses RLS entirely — these policies are for client-side
-- access via the anon and authenticated roles.

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;

-- conversations: anon may INSERT, authenticated may SELECT/UPDATE.
DROP POLICY IF EXISTS conversations_anon_insert ON conversations;
DROP POLICY IF EXISTS conversations_auth_select ON conversations;
DROP POLICY IF EXISTS conversations_auth_update ON conversations;

CREATE POLICY conversations_anon_insert ON conversations
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY conversations_auth_select ON conversations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY conversations_auth_update ON conversations
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- events: anon may INSERT, authenticated may SELECT/UPDATE.
DROP POLICY IF EXISTS events_anon_insert ON events;
DROP POLICY IF EXISTS events_auth_select ON events;
DROP POLICY IF EXISTS events_auth_update ON events;

CREATE POLICY events_anon_insert ON events
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY events_auth_select ON events
    FOR SELECT TO authenticated USING (true);
CREATE POLICY events_auth_update ON events
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- leads: NO anonymous access. Only authenticated may SELECT/UPDATE.
DROP POLICY IF EXISTS leads_auth_select ON leads;
DROP POLICY IF EXISTS leads_auth_update ON leads;

CREATE POLICY leads_auth_select ON leads
    FOR SELECT TO authenticated USING (true);
CREATE POLICY leads_auth_update ON leads
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
