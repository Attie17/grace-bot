# Setup Guide — Stabilis Intake Bot

**From zero to running bot in 90 minutes.**

## Phase 1: Environment

### 1.1 Install Node.js 20+
```bash
node --version  # Should be v20.0.0 or higher
```

### 1.2 Set up the project
```bash
cd C:\Users\attie\source\StabilisBot
npm install
cp .env.example .env
code .
```

## Phase 2: Get Your API Keys

### 2.1 Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create account (or sign in)
3. Go to **API Keys** → **Create Key**
4. Copy key to `.env`

### 2.2 Supabase (Database)
1. Go to [supabase.com](https://supabase.com) → **Start your project**
2. Create new project (free tier is fine)
3. Go to **Project Settings** → **API**
4. Copy URL and `service_role` key to `.env`
5. Go to **SQL Editor** → paste contents of `config/schema.sql` → **Run**

### 2.3 Twilio (WhatsApp)
1. Sign up at [twilio.com](https://twilio.com)
2. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Follow sandbox setup
4. Copy credentials to `.env`

### 2.4 Email (Therapist Alerts)
Use Brevo (formerly Sendinblue) — free tier includes 300 emails/day.
1. Sign up at [brevo.com](https://brevo.com)
2. Go to **SMTP & API** → Get SMTP credentials
3. Add to `.env`

## Phase 3: Run Locally

```bash
npm run dev
```

Open `http://localhost:3000/widget/widget.html` — you should see the chat widget.

## Phase 4: Deploy

### Railway (Recommended)
1. Sign up at [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Add environment variables
4. Deploy — you get a URL like `stabilis-bot.up.railway.app`

### Add to Stabilis website
Paste before `</body>`:
```html
<script src="https://bot.stabilistc.co.za/widget/embed.js" async></script>
```

## Cost Estimate (2,000 conversations/month)

| Service | Cost |
|---------|------|
| Anthropic API | R800-R2,000 |
| Supabase | R0 (free tier) |
| Twilio WhatsApp | R0.50/msg x 10,000 = R5,000 |
| Email (Brevo) | R0 (free tier) |
| Railway hosting | R150-R400 |
| **Total** | **R6,000-R8,000/month** |
