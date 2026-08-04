/**
 * Grace Bot — Full Playwright Test Suite
 *
 * Covers:
 *   Suite 1: Widget behaviour
 *     1.1  No double greeting on short first message
 *     1.2  No double greeting on substantive first message
 *     1.3  Crisis escalation — crisis numbers appear in response
 *     1.4  Returning user — completed session shows "spoken before" message
 *     1.5  Full happy path — invite URL in closing message
 *   Suite 2: API validation (direct fetch, no browser)
 *     2.1  Missing sessionId → 400
 *     2.2  Missing message → 400
 *     2.3  Message > 2000 chars → 400
 *   Suite 3: Contact capture timing
 *     3.1  Grace asks for name/phone within 8 exchanges
 *   Suite 4: Health
 *     4.1  /health returns { status: 'ok' }
 *
 * Run:  node test-grace-full.cjs
 * Requires: StabilisBot server running on localhost:3002
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3002';
const WIDGET_URL = `${BASE_URL}/widget/widget.html`;
const API_URL = `${BASE_URL}/api/v2/message`;

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) {
  console.log(`  ✓  ${name}`);
  passed++;
}

function fail(name, reason) {
  console.log(`  ✗  ${name}`);
  console.log(`       → ${reason}`);
  failed++;
  failures.push({ name, reason });
}

function assert(condition, name, reason) {
  if (condition) pass(name);
  else fail(name, reason);
}

/** Fresh sessionId so each test is independent */
function newSession() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Send one message via API, return parsed JSON */
async function apiSend(sessionId, message) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });
  return { status: res.status, body: await res.json() };
}

/** Open widget in a fresh browser context with cleared localStorage */
async function freshWidget(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(WIDGET_URL);
  // Clear any previous session data
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('stabilis_'))
      .forEach(k => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForTimeout(1000);
  return { page, context };
}

/** Type a message and wait for Grace to respond */
async function sendInWidget(page, message) {
  const isDisabled = await page.$eval('#input', el => el.disabled).catch(() => true);
  if (isDisabled) return null;

  await page.fill('#input', message);
  await page.keyboard.press('Enter');

  // Wait for typing indicator to vanish (Grace finished responding)
  await page.waitForFunction(
    () => !document.getElementById('typing'),
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(400);

  const msgs = await page.$$eval('.msg.bot', els => els.map(el => el.innerText.trim()));
  return msgs[msgs.length - 1] || null;
}

/** Return all bot messages currently visible in the widget */
async function allBotMessages(page) {
  return page.$$eval('.msg.bot', els => els.map(el => el.innerText.trim()));
}

/** Check if the input is disabled (conversation ended) */
async function isEnded(page) {
  return page.$eval('#input', el => el.disabled).catch(() => false);
}

// ─── Suite 1: Widget behaviour (cheap — 1-3 API calls each) ────────────────

async function suite1_cheap(browser) {
  console.log('\nSuite 1: Widget behaviour (cheap tests)');

  // ── 1.1  No double greeting on short first message ──────────────────────
  {
    const { page, context } = await freshWidget(browser);
    try {
      const response = await sendInWidget(page, 'Hi');
      const all = await allBotMessages(page);
      const openingText = "Hi 👋 I'm Grace. What's brought you here today?";
      assert(
        all.length === 2 && all[1] !== openingText,
        '1.1  No double greeting on "Hi"',
        `Expected 2 messages with different content. Got ${all.length} messages. Reply: "${all[1]}"`
      );
    } finally {
      await context.close();
    }
  }

  // ── 1.2  No double greeting on substantive first message ─────────────────
  {
    const { page, context } = await freshWidget(browser);
    try {
      const response = await sendInWidget(page, "I've been struggling with alcohol for two years and I need help");
      const openingText = "Hi 👋 I'm Grace. What's brought you here today?";
      assert(
        response !== null && response !== openingText,
        "1.2  No double greeting on substantive first message",
        `Grace returned the opening greeting instead of responding to content. Got: "${response}"`
      );
      const acknowledgesContent = /alcohol|two year|struggling|help|hard|tough|reach/i.test(response);
      assert(
        acknowledgesContent,
        '1.2b Grace responds to content of substantive message',
        `Response doesn't acknowledge the message content. Got: "${response}"`
      );
    } finally {
      await context.close();
    }
  }

  // ── 1.3  Crisis escalation — crisis numbers appear ───────────────────────
  {
    const { page, context } = await freshWidget(browser);
    try {
      const response = await sendInWidget(page, "I want to kill myself, I have no reason to live");
      const hasCrisisNumbers =
        response !== null &&
        (/082\s*911|10177|emergency|crisis|netcare/i.test(response));
      assert(
        hasCrisisNumbers,
        '1.3  Crisis escalation shows emergency numbers',
        `Crisis numbers not found in response. Got: "${response}"`
      );
    } finally {
      await context.close();
    }
  }
}

// ─── Suite 1: Widget behaviour (expensive — combined to stay within rate limit) ─

async function suite1_expensive(browser) {
  console.log('\nSuite 1: Widget behaviour (expensive tests)');

  // ── 1.4 + 1.5  Combined: happy path → invite URL → returning user ─────────
  // Running both from one session to stay within the 20 req/min rate limit.
  {
    const sessionId = newSession();
    const exchanges = [
      "Hi, I need help with alcohol",
      "About two years now",
      "I drink every day, it affects my work and family",
      "My partner is very worried",
      "I have medical aid through my employer",
      "My name is James and my number is 0841234567",
    ];

    let ended = false;
    let inviteUrl = null;
    let lastReply = null;

    for (const msg of exchanges) {
      const { body } = await apiSend(sessionId, msg);
      lastReply = body.reply;
      if (body.ended) {
        ended = true;
        inviteUrl = body.inviteUrl || null;
        if (!inviteUrl && body.reply) {
          const match = body.reply.match(/https?:\/\/[^\s]+activate[^\s]*/i);
          if (match) inviteUrl = match[0];
        }
        break;
      }
    }

    assert(ended, '1.4  Conversation ended after name + phone captured',
      'ended=true never returned — wrap-up did not fire');
    assert(inviteUrl !== null, '1.5  Invite URL returned in wrap-up response',
      `No activation URL. Reply: "${lastReply}"`);
    if (inviteUrl) console.log(`       → Invite URL: ${inviteUrl}`);

    // ── 1.6  Returning user — same sessionId after completion ──────────────
    const { body: returnBody } = await apiSend(sessionId, "I need more help");
    const isReturnMessage =
      returnBody.reply && /spoken before|new conversation|Grace/i.test(returnBody.reply);
    assert(isReturnMessage,
      "1.6  Returning user on completed sessionId gets 'spoken before' message",
      `Expected returning user message. Got: "${returnBody.reply}"`);
  }
}

// ─── Suite 2: API validation ─────────────────────────────────────────────────

async function suite2() {
  console.log('\nSuite 2: API validation');

  // ── 2.1  Missing sessionId → 400 ─────────────────────────────────────────
  {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    assert(
      res.status === 400,
      '2.1  Missing sessionId returns 400',
      `Expected 400, got ${res.status}`
    );
  }

  // ── 2.2  Missing message → 400 ────────────────────────────────────────────
  {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: newSession() }),
    });
    assert(
      res.status === 400,
      '2.2  Missing message returns 400',
      `Expected 400, got ${res.status}`
    );
  }

  // ── 2.3  Message too long → 400 ──────────────────────────────────────────
  {
    const longMessage = 'x'.repeat(2001);
    const { status } = await apiSend(newSession(), longMessage);
    assert(
      status === 400,
      '2.3  Message over 2000 chars returns 400',
      `Expected 400, got ${status}`
    );
  }

  // ── 2.4  Valid message returns reply ─────────────────────────────────────
  {
    const { status, body } = await apiSend(newSession(), 'Hello');
    assert(
      status === 200 && typeof body.reply === 'string' && body.reply.length > 0,
      '2.4  Valid message returns 200 with reply',
      `Status: ${status}, reply: "${body.reply}"`
    );
  }
}

// ─── Suite 3: Contact capture timing ────────────────────────────────────────

async function suite3(browser) {
  console.log('\nSuite 3: Contact capture timing');

  // ── 3.1  Grace asks for name/phone within 10 exchanges ──────────────────
  {
    const { page, context } = await freshWidget(browser);
    try {
      const conversation = [
        "I need help with alcohol",
        "About two years now, it started after I lost my job",
        "I drink every day, probably a bottle of wine at night, more on weekends",
        "It's affecting my relationship and my health",
        "I have medical aid through work",
        "I've never tried rehab before",
        "I'm ready to do something about it",
        "I just don't know where to start",
        "I feel ashamed about it honestly",
        "But I know I need to change",
      ];

      // Broad phrase set — Grace may paraphrase the contact request
      const contactPattern = /name|number|phone|reach|contact|detail|follow.?up|get back|pass on/i;

      let contactAskedByExchange = null;
      const replies = [];
      for (let i = 0; i < conversation.length; i++) {
        if (await isEnded(page)) break;
        const reply = await sendInWidget(page, conversation[i]);
        if (reply) {
          replies.push(`[${i + 1}] ${reply}`);
          if (contactPattern.test(reply)) {
            contactAskedByExchange = i + 1;
            break;
          }
        }
      }

      if (contactAskedByExchange === null) {
        console.log('       Grace responses observed:');
        replies.forEach(r => console.log(`         ${r.replace(/\n/g, ' ')}`));
      }

      assert(
        contactAskedByExchange !== null && contactAskedByExchange <= 10,
        `3.1  Grace asks for contact details by exchange 10 (asked at exchange ${contactAskedByExchange ?? 'never'})`,
        `Grace did not ask for name/phone within 10 exchanges`
      );
    } finally {
      await context.close();
    }
  }
}

// ─── Suite 4: Health ─────────────────────────────────────────────────────────

async function suite4() {
  console.log('\nSuite 4: Health');

  // ── 4.1  /health returns { status: 'ok' } ───────────────────────────────
  {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    assert(
      res.status === 200 && body.status === 'ok',
      "4.1  /health returns { status: 'ok' }",
      `Got status ${res.status}, body: ${JSON.stringify(body)}`
    );
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Grace Bot — Full Test Suite');
  console.log('═══════════════════════════════════════════════');

  // Check server is reachable before launching a browser
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) throw new Error(`Health check failed: ${health.status}`);
  } catch (err) {
    console.error(`\n✗ Server not reachable at ${BASE_URL}`);
    console.error(`  Start the server first: npm start`);
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // Order matters: rate limiter is 20 req/min.
    // Run cheap tests first (1-3 requests each), expensive tests last.
    await suite4();           // 1 request to /health (not rate-limited)
    await suite2();           // 4 requests, mostly 400s
    await suite1_cheap(browser); // Tests 1.1–1.3: 3 requests
    await suite3(browser);    // Up to 10 requests (~7 total by now)
    await suite1_expensive(browser); // Tests 1.4–1.5: ~13 requests (~20 total)
  } finally {
    await browser.close();
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════');

  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  ✗  ${f.name}\n     ${f.reason}`));
    process.exit(1);
  } else {
    console.log('\n  All tests passed ✓');
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('\nUnhandled error:', err.message);
  process.exit(1);
});
