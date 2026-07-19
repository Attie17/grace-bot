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

## STILL OUTSTANDING (CARRIED FORWARD, UNCHANGED)

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

## WORKING METHOD — UNCHANGED, STILL APPLIES

All 10 rules from the prior handoff still apply, including rule 10 (no new
functionality on a module with an unresolved structural blocker — the ESM
blocker is now resolved, so this restriction is lifted for
`conversationEngine.js` / `fieldExtractor.js` specifically, but the general
principle — fix and verify before adding — still governs all future work).

New observation to carry forward: raw terminal output pasted cleanly by the
user is significantly more reliable evidence than Copilot's own inline
narrative summary of what it did. Where possible, prefer asking for the
former.

---
*This document supersedes "UPDATED HANDOFF FOR NEW CHAT" from the same
build session. Prepared after ESM conversion, real import verification, and
guardian extraction testing (with noted evidence-quality caveats).*
