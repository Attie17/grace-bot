# UPDATED HANDOFF — POST GRACE COMPLETION SESSION
## Date: 4 August 2026

---

## 🟢 GRACE BOT IS LIVE AND READY FOR REAL CALLERS

**URL:** grace-bot-production.up.railway.app
**Status:** Active, all tests passing
**Last deployment:** 4 August 2026 (commit 8cfbaed)
**Deploy method:** GitHub auto-deploy (push to master → live in ~2 minutes)
**GitHub repo:** https://github.com/Attie17/grace-bot.git

**Verified live production test (4 August 2026):**
```
Request:  POST /api/v2/message { message: "Hi I need help" }
Response: "Hi there. I'm so glad you reached out. 💙
           What's been going on for you?"
```
No double greeting. Warm. Correct.

---

## CRITICAL DATABASE-ENVIRONMENT WARNING (STANDING RULE)

Before any database command, confirm which Supabase project you are targeting.

| Project ID | Repo | Purpose |
|---|---|---|
| `dtmtrbirhdxijpfuzntr` | StabilisBot | Grace Bot — grace_conversations, leads |
| `ueunhazboxzoujxdefwc` | sobriety-support | SJ PRODUCTION — real patient data |
| `dfeuinekmnrjjidxcmaq` | sobriety-support | SJ DEV — safe for testing |

### Critical: sobriety-support/.env.local is split
- Prisma (DATABASE_URL) → `dfeuinekmnrjjidxcmaq` — DEV
- Supabase client (NEXT_PUBLIC_SUPABASE_URL) → `ueunhazboxzoujxdefwc` — PRODUCTION

### Supabase dashboard URLs
- Grace Bot:     https://supabase.com/dashboard/project/dtmtrbirhdxijpfuzntr
- SJ Production: https://supabase.com/dashboard/project/ueunhazboxzoujxdefwc
- SJ Dev:        https://supabase.com/dashboard/project/dfeuinekmnrjjidxcmaq

---

## WHAT'S WORKING END-TO-END (VERIFIED 4 AUGUST 2026)

### Automated test suite: 13/13 passing
Run with: `node test-grace-full.cjs` (server must be on port 3002)

| Test | What it verifies |
|---|---|
| 4.1 | Server health |
| 2.1–2.4 | API validation (bad/good requests) |
| 1.1 | No double greeting on "Hi" |
| 1.2 + 1.2b | No double greeting on substantive message |
| 1.3 | Crisis escalation triggers emergency numbers |
| 3.1 | Contact capture within 10 exchanges |
| 1.4 | Full conversation ends after name + phone captured |
| 1.5 | Invite URL returned in wrap-up response |
| 1.6 | Returning user on completed session handled correctly |

### Grace Bot features confirmed working
- ✅ No double greeting — widget shows hardcoded opening, Grace responds to caller's first message
- ✅ Empathetic, MI-driven conversation (grace.system.js)
- ✅ Contact capture by exchange 5-7 (section F moved from exchange 15-16)
- ✅ Early wrap-up when name + phone captured (after 10+ messages)
- ✅ Name extraction fixed (removed it'?s? false positive regex)
- ✅ Real invite URL generated and appended to closing message
- ✅ Invite URL wording: "If you follow this link you can sign in (for free) to a page where we can assist you in these times. Please click here:"
- ✅ Crisis escalation (suicide, violence, domestic, medical)
- ✅ Therapist notification on lead creation (non-blocking)
- ✅ Daily scheduler (17:00 SAST) and weekly scheduler (08:00 SAST Monday)
- ✅ GitHub auto-deploy connected
- ✅ maxExchanges = 30 (safety net — early wrap-up fires first when data complete)

### SJ Invite API confirmed working
- ✅ POST /api/invite/grace creates Person, Patient, GraceLead, PatientReferral, PatientInviteToken
- ✅ Returns real invite URL: https://app.sobrietyjourney.org/activate/{token}
- ✅ Token valid 30 days, consumed on first use

---

## RAILWAY ENVIRONMENT VARIABLES (CONFIRMED)

```
ANTHROPIC_API_KEY        — set ✓
GRACE_MODE               — ai (only affects /api/stage — not used by v2 or WhatsApp)
SJ_WEBHOOK_URL           — https://app.sobrietyjourney.org/api/invite/grace ✓
GRACE_WEBHOOK_SECRET     — set ✓
SUPABASE_URL             — dtmtrbirhdxijpfuzntr ✓
SUPABASE_SERVICE_KEY     — set ✓
TWILIO_ACCOUNT_SID       — set ✓
TWILIO_AUTH_TOKEN        — set ✓
TWILIO_WHATSAPP_NUMBER   — ⚠️ still sandbox +14155238886
                           Must update to +27728703487 after Meta approval
```

---

## GIT STATE

**StabilisBot — master branch, in sync with GitHub**
```
8cfbaed (HEAD -> master, origin/master) test: add full Grace test suite (13/13 passing)
33da50c fix: double greeting, early wrap-up on data completeness, invite URL wording
58dae0e fix: contact capture earlier, increase maxExchanges, fix name extraction
e76e719 fix: remove debug log, widen field extraction, fix WhatsApp invite flow
2d045b6 feat: show Grace opening line proactively on widget load
9828858 fix: remove conflicting opening instruction, add clean single opening line
731b80e docs: session handoff — WhatsApp routing live, invite API fixed, Railway deployed
```

---

## WHAT STILL NEEDS TO HAPPEN BEFORE WHATSAPP ADS GO LIVE

### Blocker 1: Twilio WhatsApp number (CRITICAL)
- Railway `TWILIO_WHATSAPP_NUMBER` still set to sandbox `+14155238886`
- Must be updated to `+27728703487` after Meta approval
- Without this, WhatsApp messages from real callers will not send

### Blocker 2: End-to-end WhatsApp test on live number
Once Twilio number is updated:
1. Send a real WhatsApp message to +27728703487
2. Verify Grace responds with opening line
3. Complete a full conversation
4. Verify invite URL appears in closing message
5. Clean up test records from both databases after

### Nice to have
- NeoModus embed widget on stabilistc.co.za
- Confirm STABILIS_CENTRE_ID is set in Vercel

---

## BUGS FIXED THIS SESSION

1. **Double greeting** — widget shows hardcoded line, Grace's prompt now says
   "DO NOT repeat the greeting — respond to caller's first message"
2. **Contact capture too late** — Section F moved from exchange 15-16 to 6-8
3. **Wrap-up only by message count** — early wrap-up added when name+phone captured
4. **Name extraction false positive** — removed `it'?s?` from regex
   (was capturing "is" as a name in real conversations)
5. **Invite URL wording** — updated to clearer, warmer text

---

## OPEN BUGS (KNOWN, NOT BLOCKING)

1. **Question repetition** — model sometimes repeats variations of questions
   when caller doesn't answer directly. Structural fix needed in
   conductIntake() (track asked topics, inject into context). Prompt
   instructions alone don't reliably fix this.

2. **notifyTherapist() field mismatch** — brief.contact_name/contact_phone
   vs extractedFields shape {name: {value,...}}. Non-blocking (fire and
   forget), but therapist email may have missing fields.

3. **sobriety-support workspace dirty** — 60+ untracked files. Needs cleanup.

---

## REAL CALLERS FOUND IN DATABASE (4 AUGUST 2026)

Two real conversations were found in Grace Bot Supabase during debugging:

**Conversation 1** (`web_1785836012059_xvvj7pn`):
- Man struggling with alcohol, affecting work and marriage
- Wife noticed and is disappointed
- Conversation hit 21 messages before contact capture
- Name extracted as "is" (false positive bug — now fixed)
- Phone: null — caller never gave it before wrap-up
- **No invite URL sent — caller lost**

**Conversation 2** (`web_1785405715676_tt61l0s`):
- Parent of two children (sister 16, brother 15) caught using cannabis
- Children expelled from school, need treatment
- Conversation hit 21 messages before contact capture
- Same extraction failure
- **No invite URL sent — caller lost**

**Conversation 3** (`web_1785400405613_izj8z6h`):
- Phone captured: 0828507761
- Name: null
- **No invite URL sent**

These callers received no follow-up. The fixes in this session (contact
capture earlier, name extraction fix, early wrap-up) should prevent
this from happening again. If any of these callers return, Grace will
recognise the session as new and start fresh.

---

## DEPLOYMENT PROCESS

```
1. Make changes locally
2. Test: npm start + node test-grace-full.cjs (13/13 must pass)
3. git add [files]
4. git commit -m "descriptive message"
5. git push origin master
6. Railway auto-deploys in ~2 minutes
7. Verify: Railway dashboard shows "Deployment successful"
8. Live check: POST to grace-bot-production.up.railway.app/api/v2/message
```

**To stop/restart local server:**
```powershell
Stop-Process -Name node -Force
npm start
```

---

## BUSINESS CONTEXT

### Primary market: Private rehabs
Grace can be white-labelled for any private rehab centre as a 24/7
intake assistant. Technical changes needed per client:
- `CENTRE_NAME` environment variable
- `CENTRE_PHONE` environment variable  
- Counsellor WhatsApp alert number
- One Railway service per client (or multi-tenant routing at scale)

Pricing suggested: R4,500-12,000/month depending on package.

### Secondary market: Wellness centres
Grace needs a wellness track added to grace.system.js to handle:
- Outpatient therapy enquiries
- Family member support
- Mental health (anxiety, depression, burnout)
- Different closing action (appointment, not admission)

This is one focused session — 3-4 hours of work.

### Primary caller channel
WhatsApp (social media ad button → WhatsApp → Grace conversation).
Widget is secondary (NeoModus website embed — pending).

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

**Observation 1:** Raw terminal output is more reliable than AI summary.
**Observation 2:** Claims from different chat sessions need primary evidence.
**Observation 3:** Check LastWriteTime on downloaded files before committing.
**Observation 4:** Unknown schema.sql changes — revert rather than commit.
**Observation 5:** Three Supabase projects — check reference table before
every database command. sobriety-support/.env.local is split between
DEV (Prisma) and PRODUCTION (Supabase client).
**Observation 6:** Real callers may appear in the database during testing.
Always check grace_conversations and leads tables before cleaning — some
records may be real people who need follow-up, not test data.

---

## WHAT "DON'T DISTURB THE PRESENT BUILD" MEANS NOW

Grace is live and serving real callers. Every change must:
- Pass all 13 automated tests locally before pushing
- Be committed with a clear message
- Deploy via git push (auto-deploys to Railway)
- Be verified with a live production spot-check after deploy
- Have any test records cleaned from both databases after testing

---

*This document supersedes all previous handoff documents.*
*Prepared: 4 August 2026, after Grace completion and full test suite.*
*Next action: Update Twilio WhatsApp number after Meta approval,
run full end-to-end WhatsApp test, then go live with social media ads.*
