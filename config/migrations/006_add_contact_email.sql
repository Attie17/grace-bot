-- Add contact email field to leads table
-- Allows tracking email addresses for confirmation and resources

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Index for email lookups and follow-up
CREATE INDEX IF NOT EXISTS idx_leads_contact_email ON leads(contact_email);
