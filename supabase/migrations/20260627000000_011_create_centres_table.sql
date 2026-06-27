-- Migration 011: SANCA centre registry
CREATE TABLE IF NOT EXISTS centres (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
member_org_id UUID,
province TEXT NOT NULL,
city TEXT NOT NULL,
intake_email TEXT NOT NULL,
intake_whatsapp TEXT,
bed_type TEXT[],
current_beds_available INTEGER DEFAULT 0,
accepts_dsd BOOLEAN DEFAULT TRUE,
accepts_medical_aid BOOLEAN DEFAULT TRUE,
accepts_private BOOLEAN DEFAULT TRUE,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ DEFAULT NOW()
);
