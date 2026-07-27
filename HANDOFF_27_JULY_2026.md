# HANDOFF — POST WHATSAPP ROUTING + INVITE API SESSION
## Date: 27 July 2026

---

## STATUS SUMMARY

This session completed the WhatsApp routing rewrite and invite API fix.
Grace now routes real callers through the AI conversation engine.
Railway is deployed and live with the new code.

**Completed this session:**
1. `whatsapp.js` rewritten — routes through `conversationEngine.js` (old scripted engine retired)
2. Model switched to `claude-haiku-4-5-20251001` in `conversationEngine.js`
3. `inviteUrl` captured from `notifyTherapist()` and sent back to WhatsApp caller at conversation end
4. Grace invite API fixed (`/api/invite/grace/route.ts` in sobriety-support) — uses `PatientInviteToken` table, correct `/activate/` URL, callerType mapping, `involves_minor` on `PatientReferral`
5. `GRACE_WEBHOOK_SECRET` generated and set in Vercel, Railway, `.env.local`
6. `SJ_WEBHOOK_URL` set in Railway and `.env.local`
7. Invite API tested end-to-end — returns `{ success, inviteUrl, patientId, personId }` ✅
8. Deployed to Railway — healthcheck passed ✅
9. Test records cleaned from production DB

---

## CRITICAL DATABASE-ENVIRONMENT WARNING (STANDING RULE)

Before any database command in `sobriety-support`, confirm which Supabase
project you are targeting. Two projects exist:
- `ueunhazboxzoujxdefwc` — confirmed production (real patient data)
- `dfeuinekmnrjjidxcmaq` — confirmed dev (`sobriety-support-dev`)

`.env` and `.env.local` disagree on which is which. This warning must be
checked before every database command, every session, indefinitely.

---

## WHAT IS NOW LIVE ON RAILWAY

URL: `grace-bot-production.up.railway.app`
Deployed: 27 July 2026 via `railway up`

**New flow (live):**
```
Twilio webhook (inbound WhatsApp)
  → whatsapp.js
  → engine.getConversationHistory(callerId)   ← loads history from grace_conversations
  → engine.conductIntake(callerId, messages)  ← AI engine (Haiku)
  → sendWhatsApp(From, result.graceResponse)  ← sends Grace's reply
  → if escalationFlag → notifyTherapist()     ← receptionist alert
  → if CREATE_LEAD → notifyTherapist()        ← receptionist alert + inviteUrl sent to caller
```

**Retired (no longer used):**
- `advanceWhatsAppStage()` from `whatsapp-stages.js`
- `detectCrisis()` from `claude-client.js`
- `chat()` from `claude-client.js`
- Hardcoded scripted welcome message
- `loadConversation()` / `saveConversation()` / `createLead()` from `database.js`

---

## WHAT STILL NEEDS DOING BEFORE REAL CALLERS HIT NEW ENGINE

### Blocker 1: Meta Verification Pending
- WhatsApp Business number `+27728703487` submitted for Meta verification
- Until approved, Railway uses sandbox number `+14155238886` (not active)
- Once Meta approves: update `TWILIO_WHATSAPP_NUMBER` in Railway from
  `whatsapp:+14155238886` to `whatsapp:+27728703487`
- Also configure Twilio console webhook URL:
  `https://grace-bot-production.up.railway.app/api/whatsapp/webhook`

### Blocker 2: sobriety-support invite API not on main
- Fix is on `feature/v2.0` (commit `7d4b9c6`)
- Production (main) still has old code — generates `/join/` URLs instead of `/activate/`
- `/join/` page does not exist → 404 when caller clicks invite link
- Need to cherry-pick `7d4b9c6` onto main

**WARNING: sobriety-support workspace is messy before cherry-pick:**
- Uncommitted changes to `.gitignore` and `prisma/seed.ts`
- 60+ untracked script files (some contain patient data references)
- Must be cleaned before any branch operations
- Do NOT merge `feature/v2.0` to main — 15 commits, not all verified ready

**Cherry-pick plan (do this first in next session):**
```powershell
# 1. Check workspace state
git -C C:\Users\attie\Projects\sobriety-support status

# 2. Stash or commit the .gitignore and seed.ts changes
git -C C:\Users\attie\Projects\sobriety-support stash

# 3. Switch to main
git -C C:\Users\attie\Projects\sobriety-support checkout main

# 4. Cherry-pick only the Grace invite fix
git -C C:\Users\attie\Projects\sobriety-support cherry-pick 7d4b9c6

# 5. Push to trigger Vercel deployment
git -C C:\Users\attie\Projects\sobriety-support push origin main

# 6. Verify in production — test invite API returns /activate/ URL
$body = @{
    name = "Test Caller"
    phone = "+27821234567"
    email = ""
    role = "deciding"
    source = "grace"
    callerType = "self"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "https://app.sobrietyjourney.org/api/invite/grace" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ "x-webhook-secret" = $secret } `
    -Body $body

$response
# Expected: inviteUrl contains /activate/ not /join/

# 7. Clean up test record after verify
# Run in Supabase SQL Editor:
# DELETE FROM "PatientInviteToken" WHERE "patientId" IN (SELECT id FROM "Patient" WHERE phone = '+27821234567');
# DELETE FROM "PatientReferral" WHERE "patientId" IN (SELECT id FROM "Patient" WHERE phone = '+27821234567');
# DELETE FROM "GraceLead" WHERE "patientId" IN (SELECT id FROM "Patient" WHERE phone = '+27821234567');
# DELETE FROM "Patient" WHERE phone = '+27821234567';
# DELETE FROM "Person" WHERE phone = '+27821234567';
```

---

## GIT STATE

### StabilisBot (master branch — deployed to Railway)
```
2ea3987 (HEAD -> master) fix: switch model from claude-sonnet-4-6 to claude-haiku-4-5-20251001
f0bda8d feat: route WhatsApp through conversationEngine.js, send inviteUrl to caller on completion
80d1f3b docs: WhatsApp routing handoff — route whatsapp.js through conversationEngine.js
a4cdeaf docs: session handoff — widget v2 routing, escalation fix, WhatsApp gap discovered
```

No remote configured (`git remote -v` returns empty).
Deploy via `railway up` from local disk.

### sobriety-support (feature/v2.0 branch)
```
7d4b9c6 fix: Grace invite API — use PatientInviteToken table, fix inviteUrl to /activate/,
              fix callerType mapping, add involves_minor to PatientReferral
b91304d docs: Section 3.0 clarified — SJ core value is aftercare continuity, v2.0 reprioritized
```

**Workspace is dirty** — do not run git operations without checking status first.

---

## ENV VAR STATUS

### Railway (Grace Bot — production)
| Variable | Status |
|---|---|
| `GRACE_WEBHOOK_SECRET` | ✅ Updated to new value (27 July) |
| `SJ_WEBHOOK_URL` | ✅ Added: `https://app.sobrietyjourney.org/api/invite/grace` |
| `TWILIO_WHATSAPP_NUMBER` | ⚠️ Still sandbox `+14155238886` — update after Meta approval |
| `TWILIO_ACCOUNT_SID` | ✅ Set |
| `TWILIO_AUTH_TOKEN` | ✅ Set |
| `ANTHROPIC_API_KEY` | ✅ Set |
| `SUPABASE_URL` | ✅ Set |
| `SUPABASE_SERVICE_KEY` | ✅ Set |

### Vercel (sobriety-support — production)
| Variable | Status |
|---|---|
| `GRACE_WEBHOOK_SECRET` | ✅ Updated to new value (27 July) |
| `STABILIS_CENTRE_ID` | ❓ Not confirmed — invite API falls back to name search if missing |
| `NEXT_PUBLIC_BASE_URL` | ❓ Not confirmed — defaults to `https://app.sobrietyjourney.org` |

### StabilisBot `.env.local`
| Variable | Status |
|---|---|
| `GRACE_WEBHOOK_SECRET` | ✅ Updated |
| `SJ_WEBHOOK_URL` | ✅ Added |
| `TWILIO_WHATSAPP_NUMBER` | ⚠️ Sandbox number |

---

## KNOWN ISSUES (CARRY FORWARD — DO NOT FIX UNLESS THEY BLOCK)

- `extractName()` "worried" false-positive bug
- `medical_aid_type` / `medical_aid` field mismatch (sends null to SJ)
- Question repetition in `conversationEngine.js` (structural fix needed — topic tracking)
- AUDIT-C scoring gap (accepted — AI covers drinking patterns but no formal score)
- Email extraction gap (accepted)
- Meta WhatsApp message template (`sobriety_support_greeting`) — in review,
  needed for outbound messages only (not for Grace's conversational replies)

---

## NEXT SESSION PRIORITIES

### Priority 1: Cherry-pick Grace invite fix to main (sobriety-support)
Clean workspace first, then cherry-pick `7d4b9c6`. See plan above.

### Priority 2: Twilio webhook configuration (after Meta approval)
- Update `TWILIO_WHATSAPP_NUMBER` in Railway to `whatsapp:+27728703487`
- Configure Twilio console to point to Railway webhook URL
- End-to-end test with real WhatsApp message from real phone

### Priority 3: sobriety-support workspace cleanup
- 60+ untracked script files need review
- Some may contain patient data — review before committing or deleting
- `.gitignore` and `prisma/seed.ts` have uncommitted changes — understand before stashing

### Priority 4: Full end-to-end test (after 1 + 2)
- Send real WhatsApp message → Grace responds via AI
- Complete full conversation → lead created → inviteUrl sent
- Click inviteUrl → `/activate/[token]` page → set PIN → correct dashboard opens

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

**Observation 1:** Raw terminal output is more reliable than AI narrative summary.
**Observation 2:** Claims from a different chat session are reports — check against primary evidence.
**Observation 3:** Downloaded handoff files accumulate numbered duplicates. Check `LastWriteTime` before copying.
**Observation 4:** Always check `git diff` for unexpected changes before committing. Revert if origin unknown.
**Observation 5 (new):** sobriety-support workspace has 60+ untracked files. Never run `git add .` — always add files explicitly by name.

---

*This document supersedes WHATSAPP_ROUTING_HANDOFF.md*
*Prepared: 27 July 2026, after WhatsApp routing + invite API session.*
*Next action: Cherry-pick `7d4b9c6` to sobriety-support main, then await Meta approval.*
