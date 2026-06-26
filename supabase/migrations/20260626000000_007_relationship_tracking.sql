-- Migration 007: relationship and referral tracking
-- Adds who_for, caller_relation, and referred_name to leads table
-- Run against: grace-bot Supabase project

ALTER TABLE leads ADD COLUMN IF NOT EXISTS who_for TEXT; -- myself / someone_else / professional
ALTER TABLE leads ADD COLUMN IF NOT EXISTS caller_relation TEXT; -- child / partner / family / friend / other
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_name TEXT; -- first name of person being referred
