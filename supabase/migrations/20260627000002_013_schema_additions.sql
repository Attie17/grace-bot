-- Migration 013: Schema additions for centres and leads
-- Adds capacity tracking and funding source fields

ALTER TABLE centres ADD COLUMN IF NOT EXISTS total_capacity INTEGER DEFAULT 0;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS can_accept_detox BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS funding_source TEXT;
