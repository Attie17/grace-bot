-- Enables row-level security on conversations, leads, and events,
-- and switches the lead_dashboard view to security_invoker so it honours
-- the caller's RLS policies on the underlying leads table.
--
-- Run once in the Supabase SQL editor against an existing schema.
-- Idempotent: uses DROP POLICY IF EXISTS so re-runs are safe.
--
-- Server code uses the service_role key (SUPABASE_SERVICE_KEY) which
-- bypasses RLS entirely — these policies are for client-side access
-- via the anon and authenticated roles.

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

-- Dashboard view: honour the caller's RLS rather than the view owner's.
ALTER VIEW lead_dashboard SET (security_invoker = true);
