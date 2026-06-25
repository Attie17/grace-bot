-- Migration 006: minor handling
-- Adds guardian capture and minor flag to leads table
-- Run against: grace-bot Supabase project

ALTER TABLE leads ADD COLUMN IF NOT EXISTS involves_minor BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS caller_age_band TEXT; -- adult / minor_self / minor_other
ALTER TABLE leads ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS guardian_relation TEXT;
