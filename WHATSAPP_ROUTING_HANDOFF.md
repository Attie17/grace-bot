# CONTEXT FOR NEW CHAT — WhatsApp Routing to conversationEngine.js
## Date: 25 July 2026

---

## STATUS SUMMARY

We have spent three days building Grace — a conversational AI intake bot for
Stabilis Treatment Centre. The primary caller channel is WhatsApp: people click
a button on a social media ad, which opens a WhatsApp conversation with Grace.

**The problem we need to solve in this session:**

The WhatsApp handler (`src/whatsapp.js`) routes callers through an old scripted
engine (`stages.js` via `whatsapp-stages.js`). This means callers clicking the
ad get numbered options ("Reply 1 for alcohol, 2 for drugs...") — a form, not
a conversation.

Everything we built — `conversationEngine.js`, `grace.system.js` (MI-driven,
trauma-informed, empathetic), the escalation fixes — is completely disconnected
from WhatsApp. Real callers never reach it.

**The goal of this session:**
Rewrite `whatsapp.js` to route incoming WhatsApp messages through
`conversationEngine.js` instead of `advanceWhatsAppStage()`.

---

## CRITICAL DATABASE-ENVIRONMENT WARNING (STANDING RULE)

Before any database command in `sobriety-support`, confirm which Supabase
project you are targeting. Two projects exist:
- `ueunhazboxzoujxdefwc` — confirmed production (real patient data)
- `dfeuinekmnrjjidxcmaq` — confirmed dev (`sobriety-support-dev`)

`.env` and `.env.local` disagree on which is which. A migration command
was run against production believing it targeted dev — only failed to cause
damage because it errored out on an unrelated issue. This warning must be
checked before every database command, every session, indefinitely.

---

## WHAT YOU NEED TO READ BEFORE TOUCHING ANYTHING

1. `src/whatsapp.js` — the current WhatsApp handler. Routes through old
   scripted engine. This is the file we're rewriting.

2. `src/whatsapp-stages.js` — thin adapter over `stages.js`, converts buttons
   to numbered text. Will be retired once `conversationEngine.js` is wired in.

3. `src/conversationEngine.js` — the target engine. Has
   `conductIntake(callerId, messages, conversationId)` as the main entry point.

4. `src/escalationDetector.js` — already fixed this session. Has
   `detectEscalation(message)`. Replaces the old `detectCrisis()` from
   `claude-client.js`.

5. `src/fieldExtractor.js` — extracts structured data from freeform AI
   conversation. Coverage confirmed (see gap note below).

---

## KEY DECISIONS ALREADY MADE

### Decision 1: Model — Switch to Haiku
`conversationEngine.js` currently uses `claude-sonnet-4-6` (line 26).
**Change to `claude-haiku-4-5-20251001`.** Already tested with Haiku —
quality is sufficient for intake conversations. Cost-effectiveness matters.

### Decision 2: Welcome Message — Retire Hardcoded, Let AI Generate
The scripted welcome message in `whatsapp.js` (lines 90–98) is **retired**.
Grace's opening now comes from `conductIntake()`.

**Implementation note:** `conductIntake()` expects a user message in the
messages array — it doesn't generate an unprompted opening. For first-time
WhatsApp callers, pass a synthetic first message to trigger Grace's opening.
Approach: when `messages.length === 0`, call `conductIntake()` with a
synthetic message like:
```javascript
[{ role: 'user', content: '[New WhatsApp conversation opened]' }]
```
Grace's system prompt will handle this naturally — she knows how to open
a conversation warmly.

### Decision 3: AUDIT-C Gap — Accepted
The scripted `stages.js` asks 3 structured AUDIT-C screening questions
(drinking frequency, typical quantity, binge frequency), scores them 0–12,
and assigns a tier (universal/selective/indicated).

`fieldExtractor.js` has **no AUDIT-C equivalent**. The AI conversation will
naturally cover drinking patterns but won't produce a formal score.

**This gap is accepted.** Do not attempt to fix it in this session. Flag it
as a known limitation. The WhatsApp routing is the blocker — not AUDIT-C.

---

## TARGET FLOW AFTER THIS SESSION

```
Twilio webhook (inbound WhatsApp message)
  → whatsapp.js (receives Body, From, ProfileName)
  → First-time caller? Pass synthetic message to conductIntake()
  → Returning caller? Load history, append new message, call conductIntake()
  → conductIntake() handles:
      - Escalation detection (detectEscalation() — already fixed)
      - AI response generation (Claude Haiku)
      - Field extraction (fieldExtractor.js)
      - Sentiment analysis
      - Conversation state persistence (grace_conversations table)
      - Wrap-up + invite link + lead creation (when complete)
  → Send result.graceResponse back via sendWhatsApp()
  → If result.escalationFlag → also notify therapist
```

---

## WHAT STAYS UNCHANGED

- `sendWhatsApp()` function in `whatsapp.js` — works correctly, don't touch
- `sendOutboundWhatsApp()` — works, don't touch
- `notifyTherapist()` in `handoff.js` — called by conversationEngine on
  escalation, already working
- `TWILIO_WHATSAPP_NUMBER` env var — note: prior handoff flagged possible
  name mismatch (`WHATSAPP_FROM` vs `TWILIO_WHATSAPP_NUMBER`), confirm
  before testing

## WHAT GETS RETIRED (from whatsapp.js imports)

- `advanceWhatsAppStage()` from `whatsapp-stages.js`
- `getWhatsAppInitialStage()` from `whatsapp-stages.js`
- `formatStageForWhatsApp()` from `whatsapp-stages.js`
- `chat()` from `claude-client.js`
- `detectCrisis()` from `claude-client.js`
- `loadConversation()` from `database.js` (conversationEngine manages its own state)
- `saveConversation()` from `database.js` (conversationEngine manages its own state)
- `createLead()` from `database.js` (conversationEngine handles lead creation in wrapUp)
- The hardcoded welcome message (lines 90–98)
- All `metadata.currentStage` / `metadata.leadData` tracking

## WHAT GETS ADDED (to whatsapp.js imports)

- `GraceConversationEngine` from `conversationEngine.js`
- Supabase client (needed to instantiate GraceConversationEngine)
- Logger instance (needed to instantiate GraceConversationEngine)

---

## SESSION MANAGEMENT MAPPING

| Current (`whatsapp.js`) | New (via `conversationEngine.js`) |
|---|---|
| `detectCrisis()` from `claude-client.js` | `detectEscalation()` inside `conductIntake()` — already handles this |
| Hardcoded welcome + `getWhatsAppInitialStage()` | Synthetic first message → `conductIntake()` generates opening |
| `advanceWhatsAppStage()` scripted stages | `conductIntake()` with full message history |
| `chat()` fallback for post-intake | `conductIntake()` handles everything |
| `loadConversation()` / `saveConversation()` from `database.js` | `conductIntake()` saves internally via `saveConversation()` + `getConversationHistory()` on `GraceConversationEngine` class |
| `createLead()` + `notifyTherapist()` | `wrapUpConversation()` inside `conductIntake()` handles lead + invite |
| State in `metadata.currentStage` + `metadata.leadData` | State is message history + `extractedFields` in `grace_conversations` table |
| Session ID: `wa_${From.replace('whatsapp:', '')}` | Same — use as `callerId` parameter |

---

## fieldExtractor.js COVERAGE (CONFIRMED)

All critical fields from the scripted flow are covered by regex or AI
extraction in `fieldExtractor.js`:

- ✅ who_for, caller_type, involves_minor, caller_relation, referred_name
- ✅ primary_substance, previous_treatment, medical_conditions
- ✅ medical_aid_type, funding_source
- ✅ city_town, urgency_level, readiness_for_treatment, best_call_time
- ✅ name, phone
- ✅ guardian details (AI extraction when minor involved)
- ✅ track (SUD / mental_health), living_situation, employment, support_system

**Known gaps (accepted — do not fix this session):**
- ❌ AUDIT-C structured scoring (no equivalent extraction)
- ❌ Email address (stages.js captures it, fieldExtractor does not)
- ❌ Medical aid member number (stages.js asks specifically, fieldExtractor does not)

---

## KNOWN ISSUES (DO NOT FIX THIS SESSION UNLESS THEY BLOCK WHATSAPP ROUTING)

- `extractName()` "worried" false-positive bug — stopword list exists but
  may not catch all variants
- `medical_aid_type` / `medical_aid` field mismatch — sends null to SJ
- Question repetition in `conversationEngine.js` — needs structural fix
  (topic tracking), not prompt-based
- AUDIT-C scoring gap (accepted — see above)
- Email extraction gap (accepted — see above)

---

## RAILWAY / DEPLOYMENT STATUS

- URL: `grace-bot-production.up.railway.app`
- Last deployed: July 9, 2026 via `railway up` CLI
- Status: ACTIVE — serving real callers through OLD scripted engine
- `GRACE_MODE=ai` in Railway env vars
- `SJ_WEBHOOK_URL` — NOT set in Railway (invite URL flow won't work until added)
- No remote configured in local git (`git remote -v` returns empty)

**Do not deploy until WhatsApp routing is verified locally.**
Test locally first. Railway deployment is a separate step after verification.

---

## GIT STATE

Latest commit on local master:
```
a4cdeaf docs: session handoff — widget v2 routing, escalation fix, WhatsApp gap discovered
```

Files relevant to this session:
- `src/whatsapp.js` — REWRITE (main deliverable)
- `src/conversationEngine.js` — MODEL CHANGE (line 26: sonnet → haiku)
- `src/whatsapp-stages.js` — RETIRE (no longer imported by whatsapp.js)
- `src/stages.js` — KEEP (other parts of the system may still reference it)

---

## WORKING METHOD — FOLLOW THESE RULES FROM THE FIRST RESPONSE

1. One step at a time. Confirm each step before moving to the next.
2. Raw output only, pasted in-message — not summarized, not attached.
3. No "done" without evidence. Passing test, real output, or direct check.
4. Confirm understanding before making code changes.
5. Resolve conflicts before proceeding.
6. One file at a time.
7. See full shapes before modifying.
8. Independently verify after changes.
9. Say "not confirmed" rather than guess.
10. Do not add new functionality to a module with a known unresolved blocker.

**Observation 1:** Raw terminal output pasted by user is more reliable than
AI narrative summary of what it did. Prefer the former.

**Observation 2:** Claims from a different chat session are reports to be
checked against primary evidence — not settled fact, even when confident.

**Observation 3:** Downloaded handoff files accumulate numbered duplicates
in Downloads. Before copying, run `Get-ChildItem` on the filename pattern,
identify correct file by `LastWriteTime`, verify distinctive content via
`Select-String` before committing.

**Observation 4:** `config/schema.sql` was found with unexplained changes
from an unknown prior session. Always check `git diff` for unexpected
changes before committing. If origin is unknown, revert rather than commit.

---

## START INSTRUCTIONS FOR NEW CHAT

**Start by reading these files in this order:**

1. `src/conversationEngine.js` — understand `conductIntake()` interface fully
2. `src/whatsapp.js` — understand what needs to change
3. `src/escalationDetector.js` — confirm `detectEscalation()` interface
4. `prompts/grace.system.js` — confirm Grace knows how to open a conversation

Then state your understanding of the `conductIntake()` interface, get
confirmation, and plan the changes to `whatsapp.js`.

**Do not write code until you have stated your plan and received approval.**

---

*This document supersedes all prior WhatsApp routing context.*
*Prepared: 25 July 2026, after Phase 1–2 analysis in prior chat.*
*Next action: Open new chat, paste this context, begin Phase 3 (implementation).*
