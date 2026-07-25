# UPDATED HANDOFF — POST WIDGET + EMPATHY SESSION
## Date: 25 July 2026

---

## STATUS SUMMARY

This session completed three things and discovered one critical architectural
gap that must be resolved before any Railway deployment makes sense.

**Completed:**
1. Suicide escalation pattern fix in `escalationDetector.js`
2. Grace empathy improvements in `grace.system.js`
3. Widget updated to call `/api/v2/message` directly (`public/widget.html`)
4. All changes committed to local git (commits `d670e22`, `194393b`)

**Critical discovery:**
WhatsApp is the primary caller channel (social media ads → WhatsApp button →
Grace conversation), but `whatsapp.js` routes through a completely separate,
older engine — never touching `conversationEngine.js`. Everything built in
recent sessions (`conversationEngine.js`, `/api/v2/message`, widget changes)
has zero effect on WhatsApp traffic. This must be resolved before deployment.

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

## WHAT WAS VERIFIED THIS SESSION (with raw evidence)

### 1. Suicide escalation fix — VERIFIED
**Problem:** `checkSuicideRisk()` used exact substring `"end my life"` —
didn't catch `"ending my life"`.

**Fix:** Replaced `criticalWords` array with regex patterns:
```javascript
const criticalPatterns = [
  /suicide|suicidal/,
  /kill\s+my?self/,
  /end(?:ing)?\s+my\s+life/,
  /no\s+reason\s+to\s+live/,
];
```

**Evidence (raw test output):**
```
User message: I'm thinking about ending my life. I can't go on anymore.
escalationFlag: True  ← was False before fix
```
Confirmed across two separate test runs. Commit `d670e22`.

### 2. Violence escalation — VERIFIED (was already working)
```
User message: I'm going to hurt my partner. I can't take this anymore.
escalationFlag: True ✓
```

### 3. Natural wrap-up — VERIFIED
Conversation ends naturally at Turn 11 when sufficient info captured
(`ended: True`). Invite URL displays in Grace's closing message.
Confirmed across multiple test runs.

### 4. Grace empathy improvements — VERIFIED (better, not perfect)
**Changes made to `grace.system.js`:**
- Reflection before questions strengthened — Grace must acknowledge
  emotional content before asking follow-up
- Character limits split: web widget 300-400 chars, WhatsApp 150-200
- No-repeat-questions rule added to Tone section
- Location ask: ask once only, graceful exit if unanswered
- Name/phone protocol: ask sequentially, never bundle repeated requests
- "What made you reach out today?" removed entirely from DO ask list

**What improved:** Reflections are warmer, Grace remembers context,
closing message is clinically appropriate and warm.

**What remains imperfect:** Model still sometimes asks "what brought
you here today" in variations (turns 4, 5, 6 in test). Prompt
instructions alone cannot reliably fix this — needs structural fix
in `conversationEngine.js` (question tracking). See open items below.

### 5. Widget updated to `/api/v2/message` — VERIFIED
`public/widget.html` now:
- Calls `/api/v2/message` for all text submissions (`postV2Message()`)
- Handles v2 response shape via `renderV2Response()`
- Supports optional buttons via `renderV2Buttons()`
- Button clicks send label as next message via `submitV2Button()`
- Bootstrap calls `/api/init` then enables text input (no stage bootstrap)
- Legacy `postStage()`/`postChat()`/`renderResponse()` kept for compatibility

Confirmed: `Select-String` finds `postV2Message` in the file on disk.
Committed `194393b`.

---

## CRITICAL ARCHITECTURAL GAP DISCOVERED THIS SESSION

### WhatsApp handler is completely disconnected from `conversationEngine.js`

`src/whatsapp.js` handles the primary caller channel (social media ads →
WhatsApp button → Grace conversation). It routes through:

1. **Crisis detection** → `detectCrisis()` from `claude-client.js` (old system)
2. **First message** → scripted welcome + `getWhatsAppInitialStage()` from
   `whatsapp-stages.js` (scripted, not AI)
3. **Subsequent messages** → `advanceWhatsAppStage()` (scripted stages)
4. **Fallback** → `chat()` from `claude-client.js` (old AI system)
5. **Never touches** `conversationEngine.js` at all

**This means:**
- All recent work (`conversationEngine.js`, `/api/v2/message`, widget
  changes) has zero effect on WhatsApp traffic
- Real callers from social media ads are going through the old scripted
  engine, not the new conversational AI
- Deploying to Railway now would not improve the experience for any
  real caller coming through WhatsApp

### NeoModus website embed (widget path) is secondary
The widget (`public/widget.html`) is for website embedding by NeoModus —
a secondary channel. NeoModus can do this in a week once widget is ready,
but it is NOT the primary traffic source.

---

## RAILWAY / DEPLOYMENT STATUS

**Current Railway deployment:**
- URL: `grace-bot-production.up.railway.app`
- Last deployed: July 9, 2026 via `railway up` CLI
- Status: ACTIVE — serving real callers
- Deployed by: CLI (`railway up`), NOT from GitHub auto-deploy

**Environment variables confirmed in Railway:**
- `GRACE_MODE=ai` — routes to `ai-grace.js` (old system)
- `ANTHROPIC_API_KEY` — set ✓
- `SJ_WEBHOOK_URL` — NOT set (invite URL flow won't work until this is added)
- Twilio variables — present but `TWILIO_WHATSAPP_NUMBER` may have wrong
  name (handoff noted `WHATSAPP_FROM` vs `WHATSAPP_NUMBER` mismatch —
  not yet resolved)

**GitHub remote:**
- Remote URL is in `.env.local` (not confirmed in this session)
- No remote configured in local git (`git remote -v` returns empty)
- `railway up` deploys from local disk, not from GitHub

**Decision: do not deploy until WhatsApp routing is resolved.**
Deploying today's changes would not reach real callers (WhatsApp path
unchanged) and would push untested code to a live clinical system.

---

## OPEN ITEMS — PRIORITISED FOR NEXT SESSION

### Priority 1: Route WhatsApp through `conversationEngine.js`
This is the blocker for everything else. `whatsapp.js` must be rewritten
to call `conductIntake()` from `conversationEngine.js` instead of the
old scripted `advanceWhatsAppStage()` path.

Approach:
1. Read `whatsapp-stages.js` to understand what the scripted flow does
2. Map `whatsapp.js`'s session management to `conductIntake()`'s expected
   inputs (sessionId, messages array, conversationId)
3. Replace `advanceWhatsAppStage()` + `chat()` calls with single
   `conductIntake()` call
4. Keep crisis detection (`detectCrisis()`) as first-pass pre-filter, or
   replace with `escalationDetector.js`'s `detectEscalation()` (preferred —
   it's already fixed and verified)
5. Test with real WhatsApp-shaped messages (phone number as sessionId,
   WhatsApp message format)
6. Only after this is verified: deploy to Railway

### Priority 2: Fix question-repetition in `conversationEngine.js`
Structural fix, not prompt-based. Track which topics have been asked per
conversation and inject "already asked about X — do not ask again" into
the system context dynamically. This requires:
- A `askedTopics` set maintained across turns in `conductIntake()`
- Detection of which topic each Grace question covers
- Injection into system prompt as: "Topics already covered: [list]"

### Priority 3: `medical_aid_type` / `medical_aid` field mismatch
Still sending `null` for `medical_aid` to SJ. Minor, low priority,
carry forward from previous handoff.

### Priority 4: `extractName()` "worried" bug
Caller saying "I'm worried about..." can cause "worried" to be extracted
as the caller's name. Needs stopword list for common non-name words
following "I'm". Carried forward from previous handoff.

### Priority 5: WhatsApp invite code sending
Once WhatsApp routing works and Railway is deployed, add invite URL
sending via WhatsApp at conversation end. Plumbing in `handoff.js`
is mostly ready (`notifySobrietyJourney()` returns `inviteUrl`).
The right moment: after `wrapUpConversation()` fires and returns
`inviteUrl`, send it via `sendWhatsApp()` to the caller's number.
This is a v2.0 item — do not attempt before Priority 1 is done.

---

## GIT STATE

**StabilisBot — local only, no remote configured**
```
194393b (HEAD -> master) feat: update widget to call /api/v2/message directly
d670e22 fix: escalation detection, Grace empathy improvements, handoff invite URL, v2 test script
bea5a29 docs: add note about downloaded-file versioning near-miss
0420b45 docs: final session update — v2 route with 4 bugs found/fixed via live testing
e40fe6c feat: wire calculateClinicalScores() output into buildGraceLeadPayload()
```

**Files changed this session:**
- `src/escalationDetector.js` — suicide regex fix
- `prompts/grace.system.js` — empathy improvements
- `src/handoff.js` — invite URL return (from prior session, now committed)
- `public/widget.html` — v2 API routing
- `test-v2-message.ps1` — end-to-end test script (new)
- `GRACE_README_COMPLETE.md` — deleted (superseded by main README)
- `config/schema.sql` — reverted (unexplained prior-session change, no
  corresponding migration, dangerous to commit)

**GitHub remote URL:** in `.env.local`. Not yet added as git remote.
Add before next Railway deployment session.

---

## TEST SCRIPT

`test-v2-message.ps1` is committed at the root of StabilisBot. Run it
at the start of any session to verify the three critical paths:

```powershell
cd C:\Users\attie\source\StabilisBot
npm start   # in one terminal
.\test-v2-message.ps1   # in another terminal
```

Expected output:
- TEST 1: `escalationFlag: True` (suicide message)
- TEST 2: `escalationFlag: True` (violence message)
- TEST 3: `ended: True` at Turn 11, invite URL in Grace's reply

---

## WORKING METHOD (CARRY FORWARD — UNCHANGED)

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
`Select-String` before committing. If bad commit happens, `git commit
--amend` cleanly replaces it.

**Observation 4 (new this session):** `config/schema.sql` was found with
unexplained changes from an unknown prior session — no corresponding
migration, no commit message explaining it. Always check `git diff` for
unexpected changes before committing. If origin is unknown, revert rather
than commit. Schema files that don't match Supabase reality are dangerous.

---

## WHAT "DON'T DISTURB THE PRESENT BUILD" MEANS HERE

Railway is live at `grace-bot-production.up.railway.app` serving real
callers. Every change must be:
- Tested locally first (use `test-v2-message.ps1`)
- Committed to git with a clear message
- Deployed via `railway up` only after local verification
- Never deployed without understanding what the change does to the
  WhatsApp path (primary channel) specifically

The next deployment should only happen after Priority 1 (WhatsApp routing)
is complete and verified locally.

---

*This document supersedes "UPDATED HANDOFF — POST ESM CONVERSION SESSION".*
*Prepared: 25 July 2026, after widget routing + empathy session.*
*Next review: after WhatsApp routing session (Priority 1 above).*
