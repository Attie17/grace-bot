# Grace Bot — Stabilis Treatment Centre

AI-powered patient intake assistant. Handles the first conversation between a person seeking help and the Stabilis team — across the website widget and WhatsApp.

- **Production:** https://grace-bot-production.up.railway.app
- **Widget embed:** `<script src="https://grace-bot-production.up.railway.app/widget/embed.js"></script>`
- **Stack:** Node.js 24 · Express · Claude Haiku 4.5 · Supabase PostgreSQL · Meta WhatsApp Cloud API · Railway

---

## Running locally

```bash
cp .env.example .env.local   # fill in all values
npm install
npm start                    # http://localhost:3000
npm test                     # Jest — 21 tests
```

## Deploying

```bash
railway up
```

The healthcheck endpoint is `GET /health`. Railway auto-restarts on failure.

---

## Environment variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API — conversation generation |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Database |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Meta Cloud API — outbound sending |
| `META_WHATSAPP_ACCESS_TOKEN` | Meta permanent system user token |
| `META_WHATSAPP_APP_SECRET` | Webhook HMAC-SHA256 verification |
| `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Meta webhook challenge verification |
| `THERAPIST_WHATSAPP` | Number to alert on urgent/crisis leads |
| `RECEPTION_WHATSAPP` | Number to notify on every completed lead |
| `RECEPTION_EMAIL` / `CEO_EMAIL` | Email recipients (secondary — SMTP unreliable) |
| `GRACE_WEBHOOK_SECRET` / `SJ_APP_URL` | Sobriety Journey webhook integration |
| `ADMIN_API_KEY` | `/api/admin/stats` endpoint auth |

Set `WHATSAPP_PROVIDER=twilio` to roll back to the dormant Twilio path without a code change.

---

## Source files

| File | Purpose |
|---|---|
| `server.js` | Express app, all HTTP routes, middleware |
| `conversationEngine.js` | `GraceConversationEngine` — the AI intake loop (widget + WhatsApp) |
| `fieldExtractor.js` | Extracts name, phone, substance, urgency etc. from conversation history |
| `escalationDetector.js` | Crisis/safety detection — triggers immediate human alert |
| `sentimentAnalyzer.js` | Conversation quality and emotional trajectory tracking |
| `handoff.js` | `notifyTherapist()` — WhatsApp alerts (primary) + email (secondary) |
| `whatsapp.js` | Inbound WhatsApp handler — parses Meta/Twilio payloads, replies via Grace |
| `whatsapp-meta.js` | Meta Cloud API client — send, verify signature, parse webhook body |
| `clinicalScoring.js` | Readiness score, programme recommendation, AUDIT-C, review flags |
| `database.js` | Supabase client, `grace_conversations` and `leads` table access |
| `scheduler.js` | Daily 17:00 / weekly 08:00 CSV email to reception |
| `stages.js` | Legacy scripted stage engine (widget `/api/stage` path) |
| `ai-grace.js` | Legacy `GRACE_MODE=ai` handler |
| `claude-client.js` | Low-level Anthropic API wrapper |