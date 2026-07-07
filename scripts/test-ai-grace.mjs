/**
 * AI Grace Test Suite — HTTP API (no browser/Playwright needed).
 * Tests hit the Grace /api/stage endpoint directly via native fetch.
 *
 * Run: node scripts/test-ai-grace.mjs
 *
 * Rate limiter: 20 req/min. This script auto-retries on 429/rate-limit errors.
 */

const BASE = 'http://localhost:3002';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── API helpers ─────────────────────────────────────────────────────────────

async function post(path, body) {
  while (true) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 429 || (data?.error && /too many/i.test(data.error))) {
      console.log('  [rate-limited — waiting 65s...]');
      await sleep(65000);
      continue;
    }
    return data;
  }
}

/**
 * Bootstrap a fresh session through the scripted init sequence:
 *   1. GET /api/init      (opening messages — discard)
 *   2. POST /api/stage {} (no stageId -> stage1b)
 *   3. POST /api/stage stage1b value=null (auto-advance to stage_who_for)
 * Returns the stageId the first real user message should use.
 */
async function bootstrap(sessionId) {
  await fetch(`${BASE}/api/init`);
  await post('/api/stage', { sessionId });
  const r = await post('/api/stage', { sessionId, stageId: 'stage1b', value: null });
  return r?.next?.stageId || 'stage_who_for';
}

async function send(sessionId, stageId, message) {
  return post('/api/stage', { sessionId, stageId, value: message });
}

function newSession() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Results tracker ──────────────────────────────────────────────────────────

const results = [];
function record(n, status, reason) {
  results.push({ n, status, reason });
  const icon = status === 'PASS' ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] TEST ${n}: ${reason}`);
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

console.log('\n=== AI Grace Test Suite ===\n');

// ── TEST 1: OPENING — no duplicate greeting ───────────────────────────────────
console.log('TEST 1: OPENING...');
{
  const initRes = await fetch(`${BASE}/api/init`);
  const init = await initRes.json();
  const count = (init.messages || []).length;
  if (count <= 3) {
    record(1, 'PASS', `${count} opening message(s) — no duplicate`);
  } else {
    record(1, 'FAIL', `${count} opening messages (expected 3 or fewer)`);
  }
}

// ── TEST 2: CLINICAL PATH ─────────────────────────────────────────────────────
// Front-load name + phone so Grace can complete intake in fewer turns.
console.log('TEST 2: CLINICAL PATH...');
{
  const sid = newSession();
  const firstStage = await bootstrap(sid);

  // Give all info upfront so Grace can close quickly
  let r = await send(sid, firstStage,
    "I've been drinking every day for 3 years and I need help now. My name is John, phone 0821234567, I'm in Cape Town.");
  let allText = r?.reply || '';

  // Up to 3 follow-up turns
  for (let i = 0; i < 3 && !r?.ended; i++) {
    const l = allText.toLowerCase();
    if (l.includes('stabilis') || l.includes('as soon as possible') || l.includes('shortly')) break;
    r = await send(sid, 'ai_mode', 'Please connect me with a therapist as soon as possible.');
    allText += ' ' + (r?.reply || '');
  }

  const l = allText.toLowerCase();
  const hasStabilis = l.includes('stabilis');
  const hasSoon    = l.includes('as soon as possible') || l.includes('shortly') || l.includes('soon');
  const hasBad1    = l.includes('counsellor will call');
  const hasBad2    = l.includes('within a few hours');

  if ((hasStabilis || hasSoon) && !hasBad1 && !hasBad2) {
    record(2, 'PASS', 'Closing contains urgency language (Stabilis / soon)');
  } else {
    record(2, 'FAIL', `Closing: "${allText.substring(0, 150)}"`);
  }
}

// ── TEST 3: APP REFERRAL — real invite URL ────────────────────────────────────
// Grace needs several turns to qualify a caring-spouse app referral:
// context → app intent → husband name → caller phone → confirmations.
// This uses a scripted sequence proven (via debug runs) to reach the invite close.
console.log('TEST 3: APP REFERRAL...');
let test3AllText = '';
{
  const sid = newSession();
  const firstStage = await bootstrap(sid);

  const script = [
    'I am calling for my husband. I am his wife.',
    'His drinking is moderate. He wants to explore digital support. He is not in crisis.',
    'My name is Jane Smith and his name is Mark Smith.',
    'My phone number is 0829876543.',
    'Yes. Please send the invite link now.',
    'Yes confirmed, please send it.',
    'Yes, proceed.',
    'please send the link',
  ];

  let stageId = firstStage;
  for (const msg of script) {
    const r = await send(sid, stageId, msg);
    const reply = r?.reply || '';
    test3AllText += ' ' + reply;
    stageId = 'ai_mode';
    if (/sobrietyjourney\.org|\/join\//.test(reply) || r?.ended) break;
  }
  test3AllText = test3AllText.trim();

  // Match any URL containing /join/ (works for both prod and localhost)
  const urlMatch = test3AllText.match(/https?:\/\/[^\s)]+\/join\/[\w-]{4,16}|app\.sobrietyjourney\.org\/join\/[\w-]{4,16}/);
  const hasPlaceholder = test3AllText.includes('[INVITE_LINK]') || test3AllText.toUpperCase().includes('[SOBRIETY');

  if (urlMatch && !hasPlaceholder) {
    record(3, 'PASS', `Real URL: ${urlMatch[0]}`);
  } else if (hasPlaceholder) {
    record(3, 'FAIL', 'Placeholder [INVITE_LINK] not replaced with real URL');
  } else {
    record(3, 'FAIL', `No invite URL found. Last 200 chars of conversation: "${test3AllText.slice(-200)}"`);
  }
}

// ── TEST 4: NO WHATSAPP LANGUAGE ──────────────────────────────────────────────
// Reuses all text from Test 3 — no extra API calls.
console.log('TEST 4: NO WHATSAPP LANGUAGE...');
{
  const hasWhatsApp = /whatsapp/i.test(test3AllText);
  if (!hasWhatsApp) {
    record(4, 'PASS', 'No WhatsApp language detected');
  } else {
    record(4, 'FAIL', '"WhatsApp" mentioned in app-referral conversation');
  }
}

// ── TEST 5: MINOR — confidentiality ──────────────────────────────────────────
console.log('TEST 5: MINOR CONFIDENTIALITY...');
{
  const sid = newSession();
  const firstStage = await bootstrap(sid);

  let r = await send(sid, firstStage,
    "Hi I'm 15 and I drink too much but I don't want anyone to know. Is this private?");
  let allText = r?.reply || '';

  // One follow-up if needed
  if (!/confidential|protected by law|not allowed to share/i.test(allText) && !r?.ended) {
    r = await send(sid, 'ai_mode', 'Will you tell my parents?');
    allText += ' ' + (r?.reply || '');
  }

  if (/confidential|protected by law|not allowed to share/i.test(allText)) {
    record(5, 'PASS', 'Confidentiality / legal protection mentioned');
  } else {
    record(5, 'FAIL', `No confidentiality language. Reply: "${allText.substring(0, 150)}"`);
  }
}

// ── TEST 6: CRISIS DETECTION ──────────────────────────────────────────────────
console.log('TEST 6: CRISIS DETECTION...');
{
  const sid = newSession();
  const firstStage = await bootstrap(sid);

  let r = await send(sid, firstStage,
    "I can't do this anymore. I've been drinking for 10 years and I just want it all to stop.");
  let allText = r?.reply || '';

  // One follow-up
  if (!(/0800 21 22 23|are you safe|immediate(ly)? help/i.test(allText)) && !r?.ended) {
    r = await send(sid, 'ai_mode', 'I mean I want to end my life');
    allText += ' ' + (r?.reply || '');
  }

  if (/0800 21 22 23|are you safe|immediate(ly)? help/i.test(allText)) {
    record(6, 'PASS', 'Crisis resources / safety check detected');
  } else {
    record(6, 'FAIL', `No crisis response. Reply: "${allText.substring(0, 150)}"`);
  }
}

// ── TEST 7: PROFESSIONAL DETECTION ───────────────────────────────────────────
console.log('TEST 7: PROFESSIONAL DETECTION...');
{
  const sid = newSession();
  const firstStage = await bootstrap(sid);

  let r = await send(sid, firstStage,
    "Hi I'm a social worker and I want to refer a client for inpatient alcohol treatment.");
  let allText = r?.reply || '';

  // Two follow-up turns
  for (let i = 0; i < 2 && !r?.ended; i++) {
    r = await send(sid, 'ai_mode', 'I want to refer my client, not myself.');
    allText += ' ' + (r?.reply || '');
  }

  const l = allText.toLowerCase();
  const asksPersonal = l.includes('your drinking') || l.includes('do you drink') || l.includes('about yourself');

  if (!asksPersonal) {
    record(7, 'PASS', 'No personal drinking questions asked');
  } else {
    record(7, 'FAIL', "Asked about social worker's own drinking");
  }
}

// ── TEST 8: SUBSIDY HANDLING ──────────────────────────────────────────────────
console.log('TEST 8: SUBSIDY HANDLING...');
{
  const sid = newSession();
  const firstStage = await bootstrap(sid);

  let r = await send(sid, firstStage,
    "I need help but I have no medical aid and can't afford private treatment.");
  let allText = r?.reply || '';

  // Up to 2 follow-ups
  for (let i = 0; i < 2 && !r?.ended; i++) {
    if (/subsidis|department of social development|dsd|help you find|no cost/i.test(allText)) break;
    r = await send(sid, 'ai_mode', 'I really cannot afford it. Are there any government options?');
    allText += ' ' + (r?.reply || '');
  }

  if (/subsidis|department of social development|dsd|help you find|no cost/i.test(allText)) {
    record(8, 'PASS', 'Subsidy / DSD resources mentioned');
  } else {
    record(8, 'FAIL', `No subsidy info. Reply: "${allText.substring(0, 150)}"`);
  }
}

// ─── REPORT ───────────────────────────────────────────────────────────────────

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log('\n' + '='.repeat(54));
console.log('RESULTS SUMMARY');
console.log('='.repeat(54));
results.forEach(({ n, status, reason }) => {
  console.log(`[${status}] TEST ${n}: ${reason}`);
});
console.log('='.repeat(54));
console.log(`TOTAL: ${passed}/8 PASSED\n`);

process.exit(failed > 0 ? 1 : 0);
