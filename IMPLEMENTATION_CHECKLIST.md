# Grace Bot UX Refactor - Implementation Checklist

## ✅ COMPLETED

- [x] **Step 1:** Restructure opening: stage_who_for, stage_relationship, stage_referred_name, stage_is_minor
- [x] **Step 2:** Add confidentiality bridges (third-party and minor versions)
- [x] **Step 3:** Move track selection to stage_track (after who-for is established)
- [x] **Step 4:** Add stage_opening_ack (Haiku call)
- [x] **Step 5:** Build mental health flow (stage_mh_*)
- [x] **Step 6:** Add stage_urgency_detail to substance flow
- [x] **Step 7:** Replace health concern empathy with Haiku call
- [x] **Step 8:** Build professional flow (stage_professional_*)
- [x] **Step 9:** Add flow-specific closing messages
- [x] **Step 10:** Update buildClinicalBrief with new fields
- [x] **Step 10:** Update createLead with new fields (track added)
- [x] **Step 10:** Update handoff.js — add crisis trigger (urgency_level === 'crisis')
- [x] **Deploy:** All changes deployed to Railway (commit 4846322)

## 🔄 IN PROGRESS

- [ ] **Apply Migration 009:** Add track column to Supabase (requires manual SQL execution)
- [ ] **End-to-end test all six flows:**
  1. Myself + Substance
  2. Myself + Mental Health (stable)
  3. Myself + Mental Health (crisis)
  4. Third-party + Child (minor)
  5. Third-party + Adult
  6. Professional + Referral

## ⚠️ MANUAL ACTION REQUIRED

**Migration 009 - Add track column:**

Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/dtmtrbirhdxijpfuzntr/sql/new):

```sql
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('substance', 'mental_health', 'digital', 'not_sure'));

COMMENT ON COLUMN leads.track IS 'Intake pathway selected: substance, mental_health, digital, or not_sure';
```

## 📊 DEPLOYMENT STATUS

- **Railway URL:** https://grace-bot-production.up.railway.app
- **Health Check:** ✅ Passing (last: 2026-06-26 17:54:35)
- **Latest Commit:** 4846322 - "feat: add track field to database and crisis urgency to alerts"
- **Migrations Applied:** 006 (minor handling), 007 (relationship tracking), 008 (mental health flow)
- **Migrations Pending:** 009 (track field) - needs manual application

## 📝 TESTING NOTES

From deployment logs, several database constraint violations detected:
- `caller_type_check` violation (professional flow)
- `urgency_level_check` violation (managing/planning values not in enum)

These suggest database constraints may be out of sync with code. Migration 009 application may resolve these issues.
