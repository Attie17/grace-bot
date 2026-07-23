# Stabilis Grace Bot — Complete README

**An AI-powered patient intake bot for Stabilis Treatment Centre**

**Status**: ✅ v1.1 Sprint 1 COMPLETE — Prompt F2 deployed, ready for SJ integration  
**Current**: Running on localhost:3002 (local development)  
**Target Deployment**: Railway (awaiting Phase 1A completion)  
**Tech Stack**: Node.js 24 + Express + Claude (Haiku) + Supabase PostgreSQL + Twilio (future)

---

## TABLE OF CONTENTS

- [SECTION 0: Sprint 1 Status](#section-0-sprint-1-status)
- [SECTION 1: Getting Started](#section-1-getting-started)
- [SECTION 2: Technical Architecture](#section-2-technical-architecture)
- [SECTION 3: Testing](#section-3-testing)
- [SECTION 4: Deployment](#section-4-deployment)
- [SECTION 9: Grace → SJ Integration](#section-9-grace--sj-integration)

---

# SECTION 0: SPRINT 1 STATUS

## ✅ What's Complete

| Item | Status | Details |
|------|--------|---------|
| **Prompt F2 (6-flow redesign)** | ✅ Deployed | Mental health, substance, professional, minor, supporter flows |
| **Conversation Engine** | ✅ Operational | 38 stages, context-aware routing |
| **Field Extractor** | ✅ Operational | Parses responses, handles edge cases, negation detection |
| **grace_conversations Table** | ✅ Created | Full schema with all v1.1 fields |
| **Database** | ✅ Connected | Supabase + Prisma integration working |
| **AI Integration** | ✅ Working | Claude Haiku for health notes (stage 4b) |
| **Error Handling** | ✅ Robust | Array mutations fixed, retry logic, phone extraction |
| **Testing** | ✅ 11/11 passing | E2E flow validation complete |
| **Environment** | ✅ Configured | .env set up with SJ integration vars |
| **Localhost** | ✅ Running | Full intake flow tested end-to-end on localhost:3002 |

## 📋 Next Phase: SJ Integration

| Phase | Status | Target | Dependency |
|-------|--------|--------|-----------|
| **Phase 1A** | 📋 Ready | Week 1 | None (webhook exists) |
| **Phase 1B** | 📋 Ready | Week 2 | SJ dashboard pages |
| **Phase 2** | 📋 Planned | Week 3 | Phase 1 complete |
| **Phase 3** | 📋 Planned | Week 4 | Young People infrastructure |
| **Phase 4** | 📋 Planned | Week 5 | Young People complete |

## 🎯 Integration Sequence (This is what we're building toward)

```
PHASE 1A: Grace → SJ Webhook Integration
├── Grace calls: POST /api/invite/grace
├── SJ creates patient account
├── Grace shows link in chat (user clicks)
└── Therapist can also send link from SJ dashboard

PHASE 1B: Grace Welcomes on Dashboard
├── Create /deciding/dashboard page
├── Create /caring/dashboard page
├── Pass Grace intake context to AI Guide
└── Grace references: "I see you mentioned..."

PHASE 2: Rename "Deciding" → "In the Meantime"
├── Change display labels only (not code)
├── Keep routes/models as-is (safe approach)
└── Update UI/messaging

PHASE 3: Build Young People Group
├── Add dateOfBirth to Patient model
├── Create /patient/young-people/* routes
├── Build age-gated registration
├── Create age-appropriate dashboard

PHASE 4: Route Minors Separately
├── Grace detects: involves_minor = true
├── Routes to: Young People group (not In the Meantime)
├── Separate therapeutic experience
└── Parental tracking + confidentiality
```

---

# SECTION 1: GETTING STARTED

## 1.1 Prerequisites

- **Node.js** 20+ (recommended: 24)
- **Supabase** account with project initialized
- **Anthropic API key** for Claude Haiku
- **Git** for version control

### Optional (for future phases)
- Twilio account (WhatsApp/SMS)
- SMTP credentials (Brevo/Zoho)

## 1.2 Local Development Setup

```bash
# Clone repository
git clone https://github.com/stabilistc/StabilisBot.git
cd StabilisBot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your keys
nano .env.local

# Apply Supabase migrations
# (Supabase Dashboard → SQL Editor → paste config/schema.sql)

# Start development server
npm start

# Open widget
open http://localhost:3002/widget/widget.html
```

**Expected output:**
```
Grace Bot server listening on port 3002
✅ Supabase connected
✅ Database schema verified
✅ Ready for conversations
```

## 1.3 Environment Variables

### Required

```env
# Server
NODE_ENV=development
PORT=3002
PUBLIC_URL=http://localhost:3002

# Anthropic (Claude Haiku for health notes)
ANTHROPIC_API_KEY=sk-...
CLAUDE_MODEL=claude-haiku-4-5-20251001

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service role key)
SUPABASE_ANON_KEY=eyJhbGc... (public key)

# Logging
LOG_LEVEL=info
```

### Optional (for Phase 1B)

```env
# SJ Integration (add when Phase 1A ready)
SJ_API_BASE_URL=https://app.sobrietyjourney.org/api
SJ_API_KEY=... (provided by SJ team)
SJ_WEBHOOK_SECRET=... (for webhook security)
```

### Optional (for future email/WhatsApp)

```env
# SMTP (for email alerts - future)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-brevo-api-key

# Twilio (for WhatsApp alerts - future)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
THERAPIST_WHATSAPP=whatsapp:+27761234567
```

## 1.4 Quick Test

```bash
# Run full intake flow test
npm test

# Expected: 11/11 tests passing

# Watch mode (re-run on file change)
npm run test:watch
```

---

# SECTION 2: TECHNICAL ARCHITECTURE

## 2.1 Conversation Engine (`src/conversationEngine.js`)

**Purpose**: Orchestrates 9-stage scripted intake flow with context-aware branching.

**How It Works**:

```javascript
User sends message
    ↓
Server receives at /api/stage
    ↓
conversationEngine reads current stage
    ↓
Stage handler validates response
    ↓
fieldExtractor parses data
    ↓
Stage decides next stage
    ↓
Response + next stage returned to client
```

**38 Total Stages** (organized by pathway):

```
Relationship Flow (3 stages):
├── stage_who_for (myself / someone_else / professional)
├── stage_relationship (child / partner / family / friend)
└── stage_is_minor (under 18?)

Mental Health Flow (3 stages):
├── stage_mh_opening (free-text concern)
├── stage_mh_safety (🟢 stable / 🟠 urgent / 🔴 crisis)
└── stage_mh_prior_treatment (therapy history)

Substance Flow (4 stages):
├── stage_struggle (alcohol / drugs / other)
├── stage_previous_treatment (no / once / multiple)
├── stage_health_notes (free-text, AI-processed)
└── stage_urgency_detail (urgent / managing / planning)

Contact Capture (4 stages):
├── stage_name
├── stage_phone
├── stage_email
└── stage_best_call_time

Professional Flow (3 stages):
├── stage_professional_role (school / social worker / CBO / etc)
├── stage_referred_name
└── stage_professional_consent (guardian awareness)

Track Selection & Routing (2 stages):
├── stage_track (substance / mental_health / digital)
└── stage_opening_ack (AI personalized welcome)

Closing (1 stage):
└── stage_closing (context-aware message)
```

## 2.2 Field Extractor (`src/fieldExtractor.js`)

**Purpose**: Converts messy human text into structured data.

**Key Methods**:

| Method | Input | Output | Example |
|--------|-------|--------|---------|
| `parseChoice()` | User text + valid options | `{ success, value, confidence }` | "myself" → `{ success: true, value: "myself" }` |
| `parsePhone()` | User text | `{ success, formatted }` | "0761234567" → `"+27761234567"` |
| `parseYesNo()` | User text | `{ success, value }` | "yeah" → `true` |
| `parseMedicalAid()` | User text | `{ value, provider }` | "Discovery" → `{ yes, "Discovery" }` |
| `parseHealthNotes()` | Free-text | `{ text, summary }` | Stores raw + AI summary |

**Edge Case Handling**:

```javascript
// Negation handling (critical for crisis detection)
"I am NOT in crisis" → { isCrisis: false }

// Variations
["yes", "yeah", "yep", "definitely", "for sure"] → all true

// Partial responses
"just text me later" → asks for full phone number (doesn't guess)

// Empty responses
"" → re-prompts without frustration
```

## 2.3 Database Schema: `grace_conversations` Table

**Purpose**: Stores full transcript + structured lead data in one record.

**Key Fields**:

```sql
-- Identifiers
id UUID PRIMARY KEY
conversation_id TEXT UNIQUE

-- Transcript & Status  
messages JSONB                 -- Full chat history
status TEXT                    -- active / completed / abandoned
completion_stage TEXT          -- Which stage did they reach?

-- Relationship & Caller Type
who_for TEXT                   -- myself / someone_else / professional
caller_relation TEXT           -- child / partner / family / friend
referred_name TEXT             -- Name of person being referred
involves_minor BOOLEAN         -- Safeguarding flag
caller_type TEXT               -- school / social_worker / cbo / etc

-- Clinical Data
struggle TEXT                  -- alcohol / drugs / mental_health
previous_treatment TEXT        -- no / once / multiple
health_notes TEXT              -- Free-text concern
health_notes_summary TEXT      -- AI-summarized (Haiku)
urgency_level TEXT             -- stable / urgent / crisis
mh_description TEXT            -- Mental health free-text
track TEXT                     -- substance / mental_health / digital

-- Contact Information
contact_name TEXT
contact_phone TEXT
contact_email TEXT
best_call_time TEXT            -- morning / afternoon / evening / any_time

-- Medical & Demographics
medical_aid TEXT               -- yes / private / unsure
medical_aid_name TEXT          -- Provider name
city TEXT                      -- For routing (v1.1)
province TEXT                  -- Derived from city (v1.1)

-- SJ Integration (Phase 1)
sj_invite_url TEXT             -- Link generated by SJ webhook
sj_invite_shown BOOLEAN        -- User saw link in Grace chat
sj_invite_shown_at TIMESTAMP
sj_invite_sent BOOLEAN         -- Therapist sent link
sj_invite_sent_at TIMESTAMP
sj_invite_sent_by UUID         -- therapist_id
sj_invite_sent_method TEXT     -- "user_clicked" / "therapist_manual" / etc
sj_account_created BOOLEAN     -- Account created after user joined
sj_account_created_at TIMESTAMP
sj_patient_id TEXT             -- Links to SJ patient record

-- Flags & Metadata
is_crisis BOOLEAN              -- Crisis detected
alert_sent BOOLEAN             -- Therapist notified
created_at TIMESTAMP
updated_at TIMESTAMP
session_duration_seconds INTEGER
```

## 2.4 AI Integration: Claude Haiku

**When Used**: Stage 4b (health notes) — user enters free-text health concern.

**Model**: `claude-haiku-4-5-20251001` (fast, cheap, sufficient)

**Why Haiku, Not Sonnet?**
- Cost: ~10x cheaper per token
- Speed: <500ms response (better UX)
- Task: Summarization is well within Haiku's capability

**Implementation** (in `src/claude-client.js`):

```javascript
async function summarizeHealthNotes(userText, context = {}) {
  const systemPrompt = `You are a clinical intake assistant. Summarize the 
user's health concern in 1-2 sentences suitable for the therapist. Focus on:
- Diagnoses mentioned
- Current medications
- Acute concerns (suicidality, self-harm)

Be concise. Use clinical language. No more than 50 words.`;

  // Implementation details...
  return response.content[0].text;
}
```

**Cost**: ~$0.15 per 1,000 calls (0.015 cents per call)

## 2.5 Handoff System (`src/handoff.js`)

**Triggered When**: Conversation reaches `stage_9_closing` (complete intake).

**Workflow**:

```
Intake complete
    ↓
Build clinical brief
    ↓
Save lead to grace_conversations table
    ↓
Call SJ webhook: POST /api/invite/grace
    ↓
SJ creates patient → returns invite URL
    ↓
Show link to user (click in Grace chat)
    ↓
Therapist dashboard also gets link (can send manually)
```

---

# SECTION 3: TESTING

## 3.1 Current Test Status

**All 11 tests passing locally** ✅

```bash
npm test

# Output:
# ✓ Stage 1: Parse who_for correctly
# ✓ Stage 2: Parse struggle/track selection
# ✓ Stage 3: Parse previous treatment
# ✓ Stage 4: Parse free-text health notes
# ✓ Stage 4b: AI summarize notes (Haiku)
# ✓ Stage 5: Parse medical aid
# ✓ Stage 6: Parse readiness/urgency
# ✓ Stage 7: Parse contact details
# ✓ Stage 8: Parse call time preference
# ✓ Stage 9: Generate closing message
# ✓ Save to grace_conversations
# 
# Tests: 11 passed in 2.3s
```

## 3.2 Running Tests

```bash
# Full suite
npm test

# Watch mode
npm run test:watch

# Single file
npm test -- tests/e2e.test.js

# With coverage
npm test -- --coverage
```

## 3.3 Manual Testing Checklist

Before any deployment:

- [ ] Start server: `npm start`
- [ ] Open http://localhost:3002/widget/widget.html
- [ ] Complete intake as "myself" + substance
- [ ] Verify: Data saved to Supabase
- [ ] Complete intake as third-party + minor
- [ ] Trigger crisis: Select "I'm in crisis" at health check
- [ ] Verify: Crisis flag set in database
- [ ] Test invalid responses: Random text at stage 1 → re-prompt
- [ ] Test skipping fields: See appropriate error handling

---

# SECTION 4: DEPLOYMENT

## 4.1 Deploy to Railway

**Prerequisites**:
- Railway account created
- Grace repository linked to Railway
- Supabase migrations applied to production
- All environment variables configured

**Steps**:

```bash
# 1. Ensure code is committed
git add .
git commit -m "Grace v1.1 Sprint 1: Complete, ready for Railway"

# 2. Ensure feature branch is pushed
git push origin feature/v1.1

# 3. Install Railway CLI (if needed)
npm i -g @railway/cli

# 4. Login to Railway
railway login

# 5. Link to Railway project
railway link

# 6. Deploy
railway up

# 7. Verify deployment
open https://grace-bot-production.up.railway.app/health
# Expected response: { "status": "ok", "timestamp": "..." }
```

## 4.2 Environment Variables (Production)

Set these in Railway dashboard:

```env
NODE_ENV=production
PORT=3000
PUBLIC_URL=https://grace-bot-production.up.railway.app
ANTHROPIC_API_KEY=sk-...
CLAUDE_MODEL=claude-haiku-4-5-20251001
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
LOG_LEVEL=info
```

**For Phase 1A** (add when webhook ready):
```env
SJ_API_BASE_URL=https://app.sobrietyjourney.org/api
SJ_API_KEY=...
SJ_WEBHOOK_SECRET=...
```

## 4.3 Post-Deployment Checklist

- [ ] Service running (Railway dashboard shows "Running")
- [ ] Health check passes: GET /health → 200
- [ ] Widget loads: https://grace-bot-production.up.railway.app/widget/widget.html
- [ ] Test conversation (myself + substance)
- [ ] Data saved to production Supabase
- [ ] Logs visible in Railway dashboard

---

# SECTION 9: GRACE → SJ INTEGRATION

This section outlines all 4 phases of Grace Bot integration with Sobriety Journey. **Phases are sequential** — each builds on the previous.

---

## PHASE 1A: Grace Calls SJ Webhook Integration

**Target**: Week 1 (This week)  
**Status**: ✅ Webhook ready, implementation in progress

### What This Phase Does

Grace Bot completes intake → calls SJ webhook → SJ creates patient account → Grace shows invite link in chat.

### Current State

**SJ Webhook Exists**: `POST /api/invite/grace`

| Component | Status | Location |
|-----------|--------|----------|
| Endpoint | ✅ Exists | `src/app/api/invite/grace/route.ts` |
| Authentication | ✅ Checks webhook secret | `x-webhook-secret` header |
| Patient Creation | ✅ Creates 4 records | Person + Patient + GraceLead + PatientReferral |
| Token Generation | ✅ 30-day expiry | 8-character base64url token |
| Response | ✅ Returns invite URL | SJ sends back `{ inviteUrl, patientId }` |

### What Grace Bot Must Do

**Grace Bot Flow**:
1. Complete intake → collect: `name`, `phone`, `who_for`, `caller_type`
2. Call SJ webhook: `POST https://app.sobrietyjourney.org/api/invite/grace`
3. Receive: `{ inviteUrl, patientId }`
4. Grace Bot sends URL to patient (via chat widget or manual WhatsApp)
5. Patient clicks → joins SJ

### Invite Delivery: Current State

**Path A: Direct (User in Grace Chat)**
- User is in Grace intake conversation
- Grace shows link in chat
- User clicks in chat
- Opens SJ join page directly
- Tracked: `grace_conversations.sj_invite_shown = true`

**Path B: Therapist-Assisted (After Intake)**
- SJ webhook creates patient account
- Therapist dashboard displays invite link
- Therapist chooses delivery method:
  - Copy link (for manual WhatsApp/email)
  - (Future: Auto-send via WhatsApp/SMS/email)
- Tracked: `grace_conversations.sj_invite_sent = true`

**Until Twilio + SMTP Ready:**
- Grace Bot receives URL from SJ webhook
- Grace Bot MUST send link to patient (in chat widget or manually)
- No automatic sending from SJ side
- All delivery is Grace Bot's responsibility

### Implementation Checklist (Phase 1A)

**Grace Bot Side** (StabilisBot):
- [ ] Add SJ env vars to `.env`: `SJ_API_BASE_URL`, `SJ_API_KEY`, `SJ_WEBHOOK_SECRET`
- [ ] Create `src/sj-webhook.js` module to call `/api/invite/grace`
- [ ] At stage_9_closing, capture: `name`, `phone`, `who_for`, `caller_type`
- [ ] Prepare payload with correct structure
- [ ] Call SJ webhook with error handling
- [ ] On success: Display invite link in chat
- [ ] Update `grace_conversations.sj_invite_url` and `sj_invite_shown`
- [ ] On failure: Log error, show user message: "Hang tight, someone will reach out soon"
- [ ] Test: End-to-end from Grace intake → SJ patient created → link shown

**Testing Checklist (Phase 1A)**
- [ ] Complete Grace intake (myself + substance)
- [ ] Verify webhook called successfully
- [ ] Verify SJ returns 200 + inviteUrl
- [ ] Verify link displayed in Grace chat
- [ ] Click link → opens SJ join page
- [ ] Create account on SJ → patient record exists
- [ ] Verify `grace_conversations.sj_patient_id` populated
- [ ] Test error handling: Bad API key → graceful message
- [ ] Test timeout: Webhook slow → user sees loading spinner

### Success Criteria (Phase 1A)

- ✅ Grace Bot → SJ webhook integration working
- ✅ Patient account created in SJ
- ✅ Invite link shown in Grace chat
- ✅ User can click and join SJ
- ✅ Account created → auto-join group (In the Meantime or Supporting Someone)
- ✅ Therapist dashboard shows link for manual send

---

## PHASE 1B: Grace Welcomes on Dashboard

**Target**: Week 2  
**Status**: ⚠️ Framework ready, needs context wiring

### What This Phase Does

User creates account via invite link → lands on SJ dashboard → Grace AI greets them with context from intake.

### Current State

**FloatingAssistant Exists**: Client-side chat widget on every dashboard

| Component | Status | Details |
|-----------|--------|---------|
| Component | ✅ Exists | `src/components/FloatingAssistant.tsx` |
| System Prompts | ✅ Role-specific | "Support Guide" (deciding), "Family Support" (caring) |
| Database | ❌ Missing | No GraceLead context passed to assistant |
| Dashboards | ⚠️ Partial | `/deciding/dashboard` doesn't exist yet |

### What Needs Building

**1. Create Dashboard Pages**
   - `/app/deciding/dashboard/page.tsx`
   - `/app/caring/dashboard/page.tsx`

**2. Fetch Grace Context on Page Load**
   ```typescript
   const graceContext = await fetchGraceLeadData(patientId)
   ```

**3. Pass to FloatingAssistant**
   ```typescript
   <FloatingAssistant graceContext={graceContext} role="deciding" />
   ```

**4. Enhance System Prompt**
   ```typescript
   // Update assistant to reference intake data:
   "I remember you mentioned ${graceContext.concern}..."
   ```

**5. Test: Grace References Intake**
   ```
   User: "Hi"
   Grace: "Hi! I remember from your intake that you mentioned depression. How are you doing today?"
   ```

### Implementation Checklist (Phase 1B)

- [ ] Create `/deciding/dashboard/page.tsx`
- [ ] Create `/caring/dashboard/page.tsx`
- [ ] Query GraceLead record on page load
- [ ] Pass `graceContext` to FloatingAssistant
- [ ] Update FloatingAssistant system prompt with context
- [ ] Test: User lands on dashboard, Grace greets them with name + context
- [ ] Test: Grace can reference their intake (e.g., "You mentioned depression...")
- [ ] Test: Context persists across conversations
- [ ] Error handling: If no GraceLead found, use generic greeting

### Success Criteria (Phase 1B)

- ✅ Dashboard pages exist and load
- ✅ Grace context retrieved from database
- ✅ Grace references user's intake in conversation
- ✅ User sees personalized welcome ("I remember you mentioned...")
- ✅ Experience feels continuous (Grace Bot → SJ dashboard)

---

## PHASE 2: Rename "Deciding" → "In the Meantime"

**Target**: Week 3 (After Phase 1 complete)  
**Status**: 📋 Planned

### What This Phase Does

Change display labels from "Deciding" to "In the Meantime" while keeping code structure intact (minimal risk).

### Rationale for Safe Rename

**Current problem**: Code says "Deciding" (internal name), UI should say "In the Meantime" (user-friendly name).

**Risk of find-replace**: Could accidentally change unrelated variables or wrong contexts.

**Safe approach**: Change only display strings and group names, leave code structure alone.

### What Changes

**Display Only** (UI labels):
- "I am considering treatment" → "I am in the meantime"
- Dashboard title "Deciding" → "In the Meantime"
- Role card text updates
- System prompts updated

**Database Display Name**:
- Group name stored as value "Deciding" → "In the Meantime"

**Code** (NO CHANGES):
- Model names stay `Deciding` (prisma schema)
- Route paths stay `/deciding/*` (backward compatible)
- Auth role stays `"deciding"` (internal identifier)

### Files to Update

| File | Current | New |
|------|---------|-----|
| [src/app/(auth)/register/role-cards.tsx](src/app/(auth)/register/role-cards.tsx) | "I am considering treatment" | "I am in the meantime" |
| [src/app/deciding/dashboard/page.tsx](src/app/deciding/dashboard/page.tsx) | Page title "Deciding" | Page title "In the Meantime" |
| [src/components/FloatingAssistant.tsx](src/components/FloatingAssistant.tsx) | `deciding: { label: 'Support Guide' }` | Keep `deciding` (code), update UI display text |
| [src/app/api/assistant/route.ts](src/app/api/assistant/route.ts) | System prompt text references | Update user-facing text only |

### Implementation Checklist (Phase 2)

- [ ] Update role card display text
- [ ] Update dashboard page titles
- [ ] Update FloatingAssistant UI label
- [ ] Update system prompt user-facing text
- [ ] Test: Old URLs `/deciding/*` still work
- [ ] Test: New labels show "In the Meantime" in UI
- [ ] No database migration needed (display change only)

### Success Criteria (Phase 2)

- ✅ Users see "In the Meantime" everywhere in UI
- ✅ Code/routes unchanged (no breaking changes)
- ✅ Old links still work (`/deciding/*`)
- ✅ Zero impact on existing deployments

---

## PHASE 3: Build Young People Group (v2.0 Foundation)

**Target**: Week 4 (After Phase 2 complete)  
**Status**: ⏳ Blocked by Prompt G (Person model migration)

### What This Phase Does

Create dedicated support group for minors (under 18) with age-appropriate content and parental involvement controls.

### Prerequisites

**BLOCKED BY**: Prompt G (Person model migration)
- Add `dateOfBirth` to `Person` model
- Separate `Person` from `Lead` entity
- Enable age-based filtering

**Estimated effort**: 1-2 weeks (depends on Prompt G completion)

### What Needs Building

**1. Patient Model Enhancement**
   - Add `dateOfBirth` field (or link to Person model)
   - Add `ageGroup` computed field (minor / adult)

**2. Registration Flow**
   - Add age verification at sign-up
   - Minor flow → Young People group
   - Adult flow → In the Meantime or Supporting Someone

**3. Young People Dashboard**
   - Route: `/patient/young-people/dashboard`
   - Age-appropriate content library
   - Parent/guardian controls (if applicable)
   - Therapist specialization filters

**4. Therapist Assignment**
   - Auto-assign therapists with "Adolescents" specialization
   - Track minor-specific safeguarding flags

### Implementation Checklist (Phase 3)

- [ ] Wait for Prompt G completion
- [ ] Add `dateOfBirth` to Person or Patient model
- [ ] Create migration for new field
- [ ] Build `/patient/young-people/*` routes
- [ ] Add age verification at registration
- [ ] Create age-appropriate dashboard
- [ ] Update FloatingAssistant for "young-people" role
- [ ] Test: Minor signs up → lands on Young People dashboard

### Success Criteria (Phase 3)

- ✅ Young People group exists with own routes
- ✅ Age verification working
- ✅ Minors auto-route to Young People group
- ✅ Age-appropriate content displayed
- ✅ Parent/guardian visibility options working

---

## PHASE 4: Route Minors Separately from In the Meantime

**Target**: Week 5 (After Phase 3 complete)  
**Status**: ⏳ Depends on Phase 3

### What This Phase Does

When Grace Bot detects `involves_minor=true`, route referrals to Young People group instead of In the Meantime.

### Business Logic

```
Grace Bot completes intake
    ↓
Checks: involves_minor == true?
    ↓
YES → Creates patient in Young People group + assigns adolescent therapist
    ↓
NO → Creates patient in In the Meantime group + normal assignment

Safeguarding Flags:
├── Minor self-referral (involves_minor=true, caller_relation=myself)
├── Third-party minor (involves_minor=true, caller_relation=child)
├── Professional referral (guardian involvement tracked)
└── Confidentiality rules enforced per role
```

### Implementation Checklist (Phase 4)

- [ ] Update SJ webhook: Route based on `involves_minor`
- [ ] Dashboard auto-assigns group (Young People vs In the Meantime)
- [ ] Therapist queue filters by age specialization
- [ ] Safeguarding flags visible in therapist UI
- [ ] Test: Grace intake with minor → Young People group
- [ ] Test: Grace intake without minor → In the Meantime group

### Success Criteria (Phase 4)

- ✅ Minors route to Young People group automatically
- ✅ Adults route to In the Meantime group
- ✅ Group assignment appears correct in therapist dashboard
- ✅ Age-appropriate content served to each group
- ✅ Safeguarding rules enforced

---

# FINAL NOTES

## Current Blockers

1. **Prompt G** (Person model migration) — Required for Phase 3/4
   - Blocks: Young People group implementation
   - Target completion: End of July 2026

2. **Twilio/SMTP setup** — Optional but recommended
   - Enables automatic WhatsApp/email invite sending
   - Currently manual (user/therapist sends)
   - Can be added post-launch

## Next Immediate Actions

1. **Implement Phase 1A** — Grace → SJ webhook integration
2. **Implement Phase 1B** — Dashboard pages + context wiring
3. **Wait for Prompt G** — Then implement Phase 3/4

## Questions & Support

- **Technical**: GitHub Issues
- **Clinical**: Stabilis internal Slack
- **Deployment**: Railway dashboard + Supabase console

---

**Last Updated**: 18 July 2026  
**Version**: 1.1 (Integration Plan)  
**Maintained By**: Stabilis Development Team
