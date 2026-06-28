-- Add AUDIT-C screening fields to leads table
-- AUDIT-C: 3-question alcohol screening tool
-- Score ranges 0-12, assigned to intervention tier (universal/selective/indicated)

ALTER TABLE leads ADD COLUMN audit_c_q1 INTEGER;
ALTER TABLE leads ADD COLUMN audit_c_q2 INTEGER;
ALTER TABLE leads ADD COLUMN audit_c_q3 INTEGER;
ALTER TABLE leads ADD COLUMN audit_c_score INTEGER;
ALTER TABLE leads ADD COLUMN audit_c_tier TEXT;

-- Add comments for clarity
COMMENT ON COLUMN leads.audit_c_q1 IS 'AUDIT-C Q1: Frequency of drinking (1-5 scale)';
COMMENT ON COLUMN leads.audit_c_q2 IS 'AUDIT-C Q2: Typical drinks per drinking occasion (1-5 scale)';
COMMENT ON COLUMN leads.audit_c_q3 IS 'AUDIT-C Q3: Frequency of heavy drinking (1-5 scale)';
COMMENT ON COLUMN leads.audit_c_score IS 'AUDIT-C score: sum of (q1-1) + (q2-1) + (q3-1), range 0-12';
COMMENT ON COLUMN leads.audit_c_tier IS 'Risk intervention tier: universal (0-2), selective (3-5), or indicated (6-12)';
