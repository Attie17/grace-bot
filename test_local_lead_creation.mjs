import fetch from 'node-fetch';

const LOCAL_URL = 'http://localhost:3002';
const sessionId = `local-test-${Date.now()}`;

console.log(`\n🚀 Testing lead creation on LOCAL server`);
console.log(`Session: ${sessionId}\n`);

async function test() {
  try {
    // Initialize
    let res = await fetch(`${LOCAL_URL}/api/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    let data = await res.json();
    console.log('✓ Init complete');

    // Quick path to stage8 (call time selection)
    const steps = [
      { stage: 'stage_who_for', value: 'myself' },
      { stage: 'stage_track', value: 'sud' }, // This should now work!
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
      { stage: 'stage7a', value: 'LocalTest' },
      { stage: 'stage7b', value: '0821111111' },
      { stage: 'stage7c', value: 'localtest@test.com' }
    ];

    for (const step of steps) {
      res = await fetch(`${LOCAL_URL}/api/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: step.stage, value: step.value })
      });
      data = await res.json();
      
      if (!data.next || !data.next.stageId) {
        console.log(`❌ ${step.stage} failed - no next stage`);
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 300));
        return;
      }
      
      console.log(`✓ ${step.stage}`);
    }

    // Critical: Call time selection (stage8) - should trigger lead creation
    console.log('\n🔴 CRITICAL: Sending stage8 (call time)...');
    res = await fetch(`${LOCAL_URL}/api/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, stageId: 'stage8', value: 'any' })
    });
    data = await res.json();
    console.log(`✓ stage8 response received`);
    console.log(`  ended: ${data.ended}, qualified: ${data.qualified}`);

    console.log('\n⏳ Waiting 3 seconds for background lead creation...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n✅ Checking database...\n');

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
  }
}

test();
