import fetch from 'node-fetch';

const PROD_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `verify-fix-${Date.now()}`;

console.log(`\n🚀 Testing CORRECTED lead creation on PRODUCTION`);
console.log(`Session: ${sessionId}\n`);

async function test() {
  try {
    // Initialize
    let res = await fetch(`${PROD_URL}/api/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    let data = await res.json();
    console.log('✓ Init complete');

    // Quick path to stage8 (call time selection) - USING CORRECT 'sud' VALUE
    const steps = [
      { stage: 'stage_who_for', value: 'myself' },
      { stage: 'stage_track', value: 'sud' }, // FIXED: was 'substance'
      { stage: 'stage3', value: 'Alcohol' },
      { stage: 'audit_c_q1', value: '2' },
      { stage: 'audit_c_q2', value: '2' },
      { stage: 'audit_c_q3', value: '1' },
      { stage: 'stage5', value: 'no' },
      { stage: 'stage6', value: 'yes' },
      { stage: 'stage6b', value: 'discovery' },
      { stage: 'stage6c', value: '12345678' },
      { stage: 'stage6d', value: 'Cape Town' },
      { stage: 'stage7', value: 'week' },
      { stage: 'stage7b', value: 'managing' },
      { stage: 'notes', value: null },
      { stage: 'stage7a', value: 'VerifyFix' },
      { stage: 'stage7b', value: '0821111111' },
      { stage: 'stage7c', value: 'verifyfx@test.com' }
    ];

    for (const step of steps) {
      res = await fetch(`${PROD_URL}/api/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: step.stage, value: step.value })
      });
      data = await res.json();
      console.log(`✓ ${step.stage}`);
    }

    // Critical: Call time selection (stage8)
    console.log('\n🔴 CRITICAL: Sending stage8 (call time)...');
    res = await fetch(`${PROD_URL}/api/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, stageId: 'stage8', value: 'any' })
    });
    data = await res.json();
    console.log(`✓ stage8 response received`);
    console.log(`  ended: ${data.ended}`);
    console.log(`  qualified: ${data.qualified}`);

    console.log('\n⏳ Waiting 5 seconds for background lead creation...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('✅ Test complete! Check logs now:\n');
    console.log('  railway logs --tail 100\n');
    console.log(`Look for session: ${sessionId}\n`);

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
  }
}

test();
