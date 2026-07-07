import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const sessionId = `diagnostic-${Date.now()}`;
  console.log(`\n🔍 DIAGNOSTIC TEST - Session: ${sessionId}\n`);

  // Step 1: Initialize with the test
  console.log('Step 1: Initialize conversation...');
  let res = await fetch('http://localhost:3002/api/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  let data = await res.json();
  console.log(`✓ Got first stage: ${data.next.stageId}\n`);

  // Quick path through to stage8
  const quickSteps = [
    { stage: 'stage_who_for', value: 'myself' },
    { stage: 'stage_track', value: 'substance' },
    { stage: 'stage3', value: 'Alcohol' },
    // AUDIT-C questions
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
    { stage: 'stage7a', value: 'DiagTest' },
    { stage: 'stage7b', value: '0821111111' },
    { stage: 'stage7c', value: 'diag@test.com' }
  ];

  for (const step of quickSteps) {
    res = await fetch('http://localhost:3002/api/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, stageId: step.stage, value: step.value })
    });
    data = await res.json();
    console.log(`✓ ${step.stage} → ${data.next.stageId}`);
  }

  // Critical step: call_time selection
  console.log('\n🔴 CRITICAL STEP: Call time selection...');
  console.log('Sending POST /api/stage with stageId=stage8, value=any');
  res = await fetch('http://localhost:3002/api/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, stageId: 'stage8', value: 'any' })
  });
  data = await res.json();
  console.log(`✓ Response received`);
  console.log(`  - ended: ${data.ended}`);
  console.log(`  - qualified: ${data.qualified}`);
  console.log(`  - saved: ${data.saved}`);
  console.log(`  - next.stageId: ${data.next?.stageId}`);

  // Wait for async operations
  console.log('\n⏳ Waiting for background lead creation...');
  await new Promise(r => setTimeout(r, 3000));

  // Check database state
  console.log('\n📊 Checking database state...\n');

  // Check conversation
  const { data: convData } = await supabase
    .from('conversations')
    .select('messages, metadata')
    .eq('session_id', sessionId)
    .single();

  if (convData) {
    const lastMsg = convData.messages?.[convData.messages.length - 1];
    console.log('Conversation:');
    console.log(`  - Message count: ${convData.messages?.length}`);
    console.log(`  - Last message: [${lastMsg?.role}] ${lastMsg?.content?.substring(0, 60)}`);
    console.log(`  - Lead created: ${convData.metadata?.lead_created}`);
    console.log(`  - Lead ID: ${convData.metadata?.lead_id}`);
    console.log(`  - Contact name: ${convData.metadata?.leadData?.contact_name}`);
    console.log(`  - Contact phone: ${convData.metadata?.leadData?.contact_phone}`);
    console.log(`  - Call time: ${convData.metadata?.leadData?.call_time}`);
  } else {
    console.log('❌ No conversation found!');
  }

  // Check if lead exists
  const { data: leadData } = await supabase
    .from('leads')
    .select('id, contact_name, created_at')
    .eq('contact_name', 'DiagTest')
    .single();

  if (leadData) {
    console.log('\nLead:');
    console.log(`  ✅ LEAD EXISTS! ID: ${leadData.id}`);
    console.log(`  - Created: ${leadData.created_at}`);
  } else {
    console.log('\nLead:');
    console.log('  ❌ NO LEAD CREATED');
  }

  console.log('\n' + '='.repeat(50));
  if (convData?.metadata?.lead_created && leadData) {
    console.log('✅ TEST PASSED - Lead creation working!');
  } else {
    console.log('❌ TEST FAILED - Lead not created');
    console.log(`   - Conv messages end at: ${convData?.messages?.[convData.messages.length - 1]?.content?.substring(0, 40)}`);
  }
  console.log('='.repeat(50));
})().catch(err => console.error('ERROR:', err.message));
