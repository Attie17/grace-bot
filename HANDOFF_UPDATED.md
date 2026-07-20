# UPDATED HANDOFF — POST ESM CONVERSION SESSION

## STATUS

**ESM/CommonJS blocker: RESOLVED.**

`package.json` has `"type": "module"`, meaning every `.js` file in the repo is
treated as an ES module regardless of internal syntax. Five files were
converted from CommonJS (`require`/`module.exports`) to ESM (`import`/`export`):

- `src/conversationEngine.js`
- `src/fieldExtractor.js`
- `src/escalationDetector.js`
- `src/sentimentAnalyzer.js`
- `prompts/grace.system.js`

All five pass `node --check` (syntax) **and** a real import test:

```powershell
node --input-type=module -e "import { GraceConversationEngine } from './src/conversationEngine.js'; console.log('IMPORT OK:', typeof GraceConversationEngine);"
```
→ `IMPORT OK: function` — confirmed against the real files, real dependencies,
no mocks, under the project's actual `"type": "module"` config.

No logic was changed in this conversion, with one narrow exception (see
"Incidental fix" below).

## WHAT WAS ACTUALLY VERIFIED, AND HOW STRONGLY

**Strong evidence (raw output seen directly):**
- ESM import chain resolves end-to-end — real files, real deps, real config.
- `deriveInvolvesMinor()` — real, unmocked run — correctly returned
  `{ value: true, confidence: 0.9, source: "explicit" }` for a caller who
  said "I'm 16."
- `deriveTrack()` — real, unmocked run — correctly returned
  `{ value: "substance", confidence: 0.8, source: "primary_substance" }`
  for a conversation mentioning alcohol.

**Strong evidence (raw output seen directly — UPDATED, previously weaker):**
- `extractGuardianDetailsWithAI()` — clean, isolated re-run confirmed real
  Haiku output: `guardian_name: "Linda"`, `guardian_phone: "0821234567"`,
  `guardian_relation: "mother"`, confidence 0.95,
  `guardian_extraction_status: "captured"`, `source: "ai_extraction"` (not
  a mock artifact — `ai_extraction_failed` would appear if the mock or a
  parsing failure were involved). This gap from the original write-up is
  now closed.

**Not tested at all:**
- The full `conductIntake()` flow through `server.js`'s actual routes (only
  a standalone test script has been run).
- `wrapUpConversation()` — the wrap-up path with a real Sonnet call.
- `saveConversation()` against a real Supabase instance (only mocked so far).
- Guardian extraction behavior in the `not_shared` and repeated
  `ai_extraction_failed` cases (only the success path has been observed).

## INCIDENTAL FIX MADE DURING TESTING (NOT ESM-RELATED)

`extractGuardianDetailsWithAI()` in `fieldExtractor.js` originally did:
```js
const parsed = JSON.parse(raw);
```

Haiku sometimes wraps its JSON response in markdown code fences
(` ```json ... ``` `) despite the prompt instructing "Respond ONLY in this
exact JSON format." This caused every real guardian extraction call to fail
and fall into `ai_extraction_failed` until fixed. The fix strips a leading/
trailing triple-backtick fence before parsing:

```js
let cleanedJson = raw;
if (cleanedJson.startsWith('```')) {
  cleanedJson = cleanedJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
}
const parsed = JSON.parse(cleanedJson);
```

This is a genuine, necessary bugfix — not an ESM side effect — reviewed and
approved. Diffed against the original conversion to confirm it was the
**only** change beyond `module.exports` → `export`.

## ENVIRONMENT CONFIG DISCOVERY (LOG THIS — DON'T LOSE IT AGAIN)

- `.env` contains a **placeholder** `ANTHROPIC_API_KEY` (`sk-ant-xxxxx`).
- The **real** API key lives in `.env.local`, which is not loaded by default
  by the existing `load-env.js` / dotenv setup used in ad-hoc scripts.
- Any future standalone test script that needs a real API call must
  explicitly load `.env.local`, not just `.env`.
- Not yet confirmed: whether `server.js`'s actual startup path
  (`load-env.js`) already handles this correctly, or whether production
  deployment (Railway) has its own separate env var configuration that
  sidesteps this issue entirely. **Worth a five-minute check before assuming
  it's fine in production** — it may only be a local-dev gap.

## BUG FOUND, CONFIRMED REPRODUCIBLE, NOT YET FIXED

`extractName()` in `fieldExtractor.js` incorrectly extracts the word
"worried" as a caller's name. **Confirmed reproducible across two separate
runs** (one mocked, one with the real Haiku API for guardian extraction —
same result both times, ruling out a one-off fluke):
```
"name": { "value": "worried", "confidence": 0.95, "source": "explicit_introduction" }
```
Root cause: a message like "I'm worried about..." matches the
`/(?:my\s+name\s+is|I'm|I am|...)\s+([A-Z][a-zA-Z]+)/i` pattern — "worried"
was capitalized at the start of a sentence and satisfied `[A-Z][a-zA-Z]+`.

Not yet fixed. Likely fix direction: exclude common non-name words
immediately following "I'm" (a stopword list), or require the matched word
to not be a common English verb/adjective — needs its own dedicated pass,
not a quick patch. This is a real accuracy bug that would corrupt live
caller data (a caller genuinely named "Worried" is implausible but a lead
record with the wrong name field populated is a real clinical-data-quality
issue), so it should be prioritized reasonably soon, not indefinitely
deferred.

## ARCHITECTURE DECISION: conversationEngine.js WILL REPLACE ai-grace.js

**Confirmed by the project owner, deliberately, after investigation. This is
now settled — do not re-litigate from scratch next session.**

### What was discovered tonight

`server.js` currently routes production traffic (when `GRACE_MODE=ai`, which
IS the current live setting) to `ai-grace.js`'s `handleAIMessage()` — not to
`conversationEngine.js`, which has never been wired in
(`server.js` never references it, confirmed by direct read).

`ai-grace.js` and `stages.js` are NOT abandoned/legacy code. `stages.js` has
25 real commits of iterative clinical development (guardian capture for
minors, AUDIT-C, DSD funding logic, mental health flow, professional/CBO
referral flow, crisis urgency mapping). `ai-grace.js`'s most recent commit
(`b44b459`) builds on top of that. This is mature, tested, live
functionality — not dead weight.

A live field-check (checking the actual deployed bot) confirmed
`ai-grace.js` is still asking numbered 1-5 AUDIT-C questions in production,
which is NOT the desired behavior going forward.

### Two decisions that resolve the apparent conflict

1. **AUDIT-C moves out of Grace entirely.** Instead of trying to derive
   AUDIT-C-equivalent scores from natural conversation (which was proving
   fragile and was never actually implemented in either file — confirmed by
   empty grep results), AUDIT-C becomes the first questionnaire a user
   completes upon accepting the Sobriety Journey app invite. This is
   arguably clinically better (a real structured form beats an LLM
   paraphrasing a validated screening tool) and removes the single biggest
   piece of functional overlap between `ai-grace.js` and
   `conversationEngine.js`.
   - Minor open question, not urgent: DSD Objective 1 reporting wants
     helpline-level substance breakdown — if that specifically requires
     data from callers who never accept the SJ invite, there may be a
     reporting gap. Not investigated further tonight.

2. **`conversationEngine.js` IS the intended replacement for
   `ai-grace.js`'s conversational role**, confirmed directly by the project
   owner. `grace.system.js` (conversationEngine.js's system prompt) was
   independently reviewed and is consistent with this — MI-driven natural
   conversation, explicit "DO NOT ask: 'On a scale of 1-10...'" instruction,
   trauma-informed structure.

### Full gap analysis — what must be ported/fixed before wiring is safe

| Capability | Live (`ai-grace.js` + `database.js` + `handoff.js`) | `conversationEngine.js` | Status |
|---|---|---|---|
| Conversation storage | `conversations` table via `database.js` | `grace_conversations` table, dedicated schema with `extracted_fields`, `sentiment_trajectory`, `escalation_flag` as real queryable columns (not buried in JSONB) | ✅ **Resolved earlier tonight** — migration run, table verified to exist with all 12 columns, three call sites in `conversationEngine.js` confirmed correctly targeting it, real test conversation confirmed persisting end-to-end. **Not yet reachable from production** since the engine itself isn't wired in yet, but the storage layer is sound and deliberately designed (escalation/sentiment as real columns, not JSONB, for auditability). |
| Lead creation | `createLead()` in `database.js` — full ~35-field schema | Never called anywhere in `conversationEngine.js`. `wrapUpConversation()` returns `nextAction: "CREATE_LEAD"` but nothing currently consumes that signal | 🔴 Still missing — needs wiring |
| Therapist/reception notification | `notifyTherapist()` in `handoff.js` — WhatsApp (crisis + reception), email (reception + CEO), triggers SJ webhook | Never called | 🔴 Still missing — needs wiring |
| Field-shape match to `createLead()` | N/A, already matches its own schema | `fieldExtractor.js` uses different names/shapes than `createLead()` expects: `primary_substance` vs `substance_primary`, `city_town` vs `city`; and doesn't produce `for_whom`, `caller_relation`, `referred_name`, `usage_pattern`, `mental_health`, `medical_flags`, `readiness_score`, `recommended_programme`, `caller_age_band`, `funding_source`, or any UTM fields at all | 🔴 Needs a mapping/adapter layer between `fieldExtractor.js`'s output and `createLead()`'s expected input |
| Guardian fields | `createLead()` expects `guardian_name`/`guardian_phone`/`guardian_relation` | `extractGuardianDetailsWithAI()` produces exactly these names | 🟢 Already compatible, verified tonight with real Haiku API |
| Crisis handling | `detectCrisis`/`getResponseWithCrisisDetection` in `claude-client.js` → `notifyTherapist(CRISIS)` + `sendCrisisEmail()` | `detectEscalation()` exists and returns canned crisis-response text to the caller, but never calls `notifyTherapist()` or any real alerting | 🔴 Detection logic exists; the actual alerting pipeline is missing |
| SJ invite generation | **Two separate implementations exist**, not yet reconciled: `ai-grace.js`'s `generateInviteToken()` (uses `SJ_APP_URL` / `GRACE_WEBHOOK_SECRET`, calls `/api/invite/grace`) and `handoff.js`'s `notifySobrietyJourney()` (uses `SJ_WEBHOOK_URL` / `SJ_WEBHOOK_SECRET`, different payload shape) | Neither exists in `conversationEngine.js` | 🟡 Needs clarification on which is canonical (or whether both are needed for different paths) before porting |
| AUDIT-C in schema/email templates | `createLead()` and `handoff.js`'s HTML email template both still reference `audit_c_score`/`audit_c_tier` | N/A — dropped from Grace's scope per tonight's decision | 🟢 No action needed. Nulls will render as "not completed," which now correctly describes every Grace-originated intake going forward |
| 🟡 bucket fields (carried forward from original handoff) | `createLead()` confirms these are real, expected, non-optional-in-spirit fields: `medical_aid_name`, `funding_source`, `medical_member_number` | Not extracted at all | 🔴 Confirms the original handoff's flagged gap, now with certainty against the real schema |

### Prior confirmation — this was not a one-off late-night call

This decision was made and consistently restated across multiple sessions,
not decided once under tonight's momentum:

- **July 19, ~15:38 (earlier the same day, different chat)** — the project
  owner directly instructed a prior chat: *"conversationEngine.js replaces
  stages.js entirely"* and had it confirm `conversationEngine.js` was
  orphaned from `server.js` at that time too.
- **July 10 (an earlier session)** — established via direct code
  comparison that `stages.js` has AUDIT-C fully scripted (3 numbered
  questions, real scoring), while `ai-grace.js` does not ask it directly
  and instead relies on inference — useful context for why the numbered
  AUDIT-C questions seen on the live deployed bot most likely trace to a
  `stages.js` code path, separate from `ai-grace.js`'s own (also numbered)
  `handleAuditCSubflow()`.
- **A chat titled "Researching GraceBot and StabilisBot capabilities"**
  (same day as tonight, earlier) — independently investigated the same
  `ai-grace.js` vs `conversationEngine.js` question from a different
  angle and reached consistent conclusions, including the
  database-table-confusion fix documented above.
- **Tonight** — this chat independently re-derived the same tension from
  scratch (having started fresh, without that context loaded) and the
  project owner re-confirmed the same decision directly.

The apparent contradictions that surfaced during tonight's session (e.g.
one thread's claim that "stages.js is confirmed retired" without
supporting evidence) came from secondhand, summarized claims losing
precision in the retelling between sessions — not from the underlying
decisions actually being inconsistent. When traced back to primary
sources (direct owner instructions, actual git log, actual file reads),
everything lines up.



1. Build the field-mapping adapter between `fieldExtractor.js` output and
   `createLead()`'s expected shape.
2. Wire `conversationEngine.js`'s `wrapUpConversation()` to actually call
   `createLead()` and `notifyTherapist()` on `CREATE_LEAD`.
3. Resolve the two competing SJ-invite implementations — pick one, port it
   in, remove or clearly deprecate the other.
4. Add a new mode flag (e.g. `GRACE_MODE=ai_v2`) so `conversationEngine.js`
   can be tested side-by-side with the current live `ai-grace.js` path,
   without touching the default until proven.
5. Test end-to-end on the new mode flag — a full conversation through the
   actual `server.js` route, not just a standalone script — before ever
   considering flipping the default `GRACE_MODE` value in production.
6. Only after 5 succeeds repeatedly: flip the default, monitor closely,
   keep `ai-grace.js` available as an instant rollback path for a defined
   period before considering removing it.

### Process note for next session

Two Claude chat sessions were both working on this repo in parallel earlier
tonight, occasionally reaching conflicting conclusions (e.g. one asserted
"stages.js is confirmed retired" without evidence, which the actual git log
directly contradicted). Recommend consolidating to a single chat thread for
architecture-level decisions on this repo going forward — parallel sessions
without a single source of truth risk exactly this kind of drift.


- 🟡 bucket fields (`medical_aid_name`, `medical_member_number`,
  `funding_source`, `referred_name`, `caller_relation`) never checked
  against `SJ_GRACEBOX_API_INTEGRATION_MAP.md`.
- `mh_description` — confirmed unused downstream, disposition undecided.
- AUDIT-C — confirmed gap, no conversational equivalent, deferred.
- `handoff.js` template rebuild to consume new `{value, confidence, source}`
  shape and surface `guardian_extraction_status` — not started.
- Phase 1A SJ webhook relocation from old closing block to
  `conversationEngine.js`'s `wrapUpConversation()` — not started. No longer
  blocked on ESM (that's resolved), but still not started.
- `deriveTrack()` redundantly calls `extractSubstance(fullText)` twice —
  known, accepted, not urgent.

## NOT YET DONE — CORRECTING AN OVERCLAIM

An earlier AI-generated summary during this session described the system as
"production-ready for integration." **This is not accurate and should be
disregarded.** Production-readiness would require, at minimum:
- Wiring into `server.js`'s actual routes (not done — still a standalone
  test script only).
- A real end-to-end conversation through the live route, not just
  `conductIntake()` called directly.
- Resolution of every item in "Still outstanding" above.
- Confirmation of the `.env` / `.env.local` question in the actual
  deployment path (Railway), not just local dev.
- A clean, independently-verified guardian extraction re-run (see
  "weaker evidence" above).

## IMMEDIATE NEXT STEPS, IN ORDER

1. ~~Re-run the guardian extraction test cleanly~~ — **DONE.** Confirmed
   with clean raw output, `source: "ai_extraction"`, all three guardian
   fields populated correctly.
2. Fix the `extractName()` "worried" bug — now confirmed reproducible
   across two runs, not a one-off. Should be prioritized reasonably soon.
3. Confirm whether Railway's deployment env vars already resolve the
   `.env` vs `.env.local` gap, or whether this needs explicit handling before
   deploy.
4. Discuss wiring `conversationEngine.js` into `server.js`'s actual routes
   (original STEP 5 from the prior handoff) — not started yet.
5. Only after 4: Phase 1A webhook relocation into `wrapUpConversation()`.

## WORKING METHOD — FULL LIST, SELF-CONTAINED

These rules governed tonight's session and should continue to. Listed in
full here (not just referenced) so this document is self-contained even
if the next session doesn't have access to earlier handoff docs.

1. **One step at a time.** Don't bundle multiple changes or checks into a
   single request — confirm each step before moving to the next.
2. **Raw output only, pasted in-message — not summarized, not attached as
   a document.** A description of what a terminal command showed is not
   the same as the actual output. Ask for the real thing every time.
3. **No "done" without evidence.** A claim that something works needs a
   passing test, real output, or a direct check — not just an assertion
   (from Claude, from Copilot, or from anyone) that it works.
4. **Confirm understanding before making code changes.** State the plan,
   get explicit agreement, then act — don't act first and explain after.
5. **Resolve conflicts before proceeding.** If two pieces of evidence (or
   two sessions, or two files) disagree, stop and reconcile the
   disagreement with primary evidence before building on either claim.
6. **One file at a time.** Don't touch multiple files in a single change
   when they can be handled sequentially — makes each change easier to
   verify and easier to revert if wrong.
7. **See full shapes before modifying.** Read a complete file (or at
   least the complete relevant function/section) before editing it —
   don't edit based on a partial view or a remembered summary.
8. **Independently verify after changes.** After a fix is applied, check
   it actually works — don't take "it should work now" as the end state.
9. **Say "not confirmed" rather than guess.** When evidence is
   incomplete or ambiguous, say so plainly instead of filling the gap
   with a plausible-sounding assumption.
10. **Do not add new functionality to a module with a known, unresolved
    structural blocker.** Fix the blocker first, verify the fix works
    end-to-end, then resume feature work. (The ESM blocker this rule
    originally referred to is now resolved — but the general principle
    stands for any future blocker.)

**New observation to carry forward** (added during tonight's session):
raw terminal output pasted cleanly by the user is significantly more
reliable evidence than an AI assistant's own inline narrative summary of
what it did. Where possible, prefer asking for the former over accepting
the latter.

**Second new observation** (added tonight, re: the multi-session
architecture investigation): when a claim traces back to a different
chat session rather than something directly verified in the current one,
treat it as a report to be checked against primary evidence — not as
settled fact — even when it sounds confident and specific. Prefer
consolidating architecture-level decisions to a single chat thread over
letting parallel/sequential sessions each reach and assert independent
conclusions.

---
*This document supersedes "UPDATED HANDOFF FOR NEW CHAT" from the same
build session. Prepared after ESM conversion, real import verification, and
guardian extraction testing (with noted evidence-quality caveats).*
