# StabilisBot — Repo Summary

## What this repo is (high level)

- **Purpose**: An **AI-powered patient intake bot** for **Stabilis Treatment Centre** (Pretoria, South Africa) that chats with people via a **website widget** and **WhatsApp**, gathers a structured **clinical intake brief**, and **alerts a therapist** when a lead is qualified or a crisis is detected.
- **Stack**: **Node.js (>=20)** + **Express** server, **Anthropic Claude** for responses, **Supabase/Postgres** for persistence, **Twilio WhatsApp** for messaging, **SMTP (Nodemailer)** for therapist email alerts.

## How it works (short notes)

- **Web widget UI**: `public/widget.html`
  - Renders the chat UI and calls `POST /api/chat` with `{ sessionId, message }`.
  - Creates a browser session id like `web_<timestamp>_<rand>` stored in localStorage.
- **Embeddable launcher**: `public/embed.js`
  - Floating “chat” button that opens an iframe to `.../widget/widget.html` (intended to be embedded on the clinic website).

- **Main server**: `src/server.js`
  - Serves static widget files at `GET /widget/*`
  - **API endpoints**:
    - `POST /api/chat`: main web chat endpoint
    - `POST /api/whatsapp/webhook`: Twilio webhook receiver for incoming WhatsApp
    - `GET /api/conversation/:sessionId`: fetch stored conversation history (for therapist review)
    - `GET /health`: health check
    - `GET /api/admin/stats`: admin stats endpoint (currently returns zeros; TODO to implement)
  - **Safety**: rate limiting, Helmet, CORS.

- **LLM behavior (“Hope”)**: `src/prompts.js`
  - Defines a staged intake flow (who it’s for → situation → history → **medical aid** → readiness → contact capture → handover).
  - Strong safety rules: no diagnosis, no medical advice, brief tone, crisis handling rules.
  - Outputs a `<clinical_brief>{...}</clinical_brief>` JSON block **only at handover**.

- **Crisis detection**: `src/claude-client.js` + `src/server.js` / `src/whatsapp.js`
  - Runs a fast classifier prompt first (`detectCrisis`), and if confidence > 0.9, returns emergency instructions and **immediately notifies the therapist**.

- **Persistence + lead creation**: `src/database.js` + `config/schema.sql`
  - Stores full chat transcripts in `conversations` (JSONB).
  - When the clinical brief is complete, inserts into `leads` (structured fields like urgency, substance, medical aid, callback time, etc.).
  - Schema also includes `events` (analytics) and a `lead_dashboard` view.

- **Therapist handoff**: `src/handoff.js`
  - Sends therapist alerts via:
    - **WhatsApp** for **CRISIS/HIGH** priority (Twilio)
    - **Email** for all qualified leads (full HTML brief via SMTP)
  - Priority expectations are documented in the module header.

- **WhatsApp channel**: `src/whatsapp.js`
  - Receives Twilio webhook payload, uses session id like `wa_<phone>`.
  - Uses the same Claude chat engine + DB save flow as the web widget.
  - Sends replies back via Twilio.

## Intended runtime/config

- **Entrypoint**: `src/server.js` (see `package.json` `dev`/`start`)
- **Setup doc**: `docs/SETUP.md` (keys for Anthropic, Supabase, Twilio, SMTP; deploy suggestion: Railway)
- **Environment variables**: `.env.example` shows required config (Anthropic key/model, Supabase URL/service key, Twilio creds, therapist contact targets, webhook/admin secrets, clinic info).

## Notable doc/process bits

- **Clinical review process**: `docs/CLINICAL.md` describes how clinicians should review conversations weekly and adjust `src/prompts.js`.
- **Prompt review note**: `docs/HOPE-PROMPTS-REVIEW.txt` documents a known issue around the widget’s preloaded welcome messages vs what Claude sees (and notes a fix approach).

