import fetch from 'node-fetch';

async function testFlow() {
    const sessionId = `test-complete-${Date.now()}`;
    console.log(`Testing with session: ${sessionId}\n`);

    // Step 1: Initialize
    console.log('Step 1: Initialize...');
    let res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    });
    let data = await res.json();
    console.log(`Response: stage=${data.next.stageId}, inputType=${data.next.inputType}`);

    // Step 2: who_for = myself
    console.log('\nStep 2: who_for = myself...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage_who_for', value: 'myself' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    // Step 3: track = substance
    console.log('\nStep 3: track = substance...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage4a', value: 'substance' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    // Step 4: struggle = alcohol  
    console.log('\nStep 4: struggle = alcohol...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage4c', value: 'alcohol' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    // Skip through AUDIT-C quickly
    console.log('\nStep 5: AUDIT-C Q1...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'audit_c_q1', value: '2' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 6: AUDIT-C Q2...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'audit_c_q2', value: '2' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 7: AUDIT-C Q3...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'audit_c_q3', value: '1' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    // Continue through more stages quickly  
    console.log('\nStep 8: treatment_history...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage5', value: 'no' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    // Skip health_notes (inputType: text, requires /api/chat)
    console.log('\nStep 9: Skipping to medical_aid...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage6', value: 'yes' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    // Continue through contact info
    console.log('\nStep 10: medical_provider...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage6b', value: 'discovery' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 11: member_number...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage6c', value: '12345678' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 12: location...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage6d', value: 'Cape Town' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 13: readiness...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage7', value: 'week' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 14: urgency...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage7b', value: 'managing' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 15: notes...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'notes', value: null })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 16: contact_name...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'contact_name', value: 'Test User' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 17: contact_phone...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'contact_phone', value: '0821111111' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 18: contact_email...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'contact_email', value: 'test@example.com' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}`);

    console.log('\nStep 19: FINAL - call_time...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId: 'stage8', value: 'any' })
    });
    data = await res.json();
    console.log(`Response: stage=${data.next.stageId}, ended=${data.ended}, qualified=${data.qualified}`);
    console.log(`\nConversation complete! Session: ${sessionId}`);

    // Wait for background processing
    console.log('\nWaiting for background lead creation...');
    await new Promise(r => setTimeout(r, 2000));

    // Check if lead was created
    console.log('Checking if lead was created...');
    res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    });
    data = await res.json();
    const metadata = data.metadata;
    console.log(`Lead created: ${metadata?.lead_created}, Lead ID: ${metadata?.lead_id}`);
}

testFlow().catch(err => console.error('Test failed:', err.message));
