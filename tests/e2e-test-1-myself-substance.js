/**
 * End-to-end test: Test 1 - For myself + Substance Use
 * Verifies: urgency question appears, closing message is personal
 */

const BASE_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `test-e2e-myself-substance-${Date.now()}`;

async function post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return response.json();
}

async function runTest() {
    console.log('🧪 TEST 1: For myself + Substance Use\n');
    
    try {
        // Step 1: Who is this for?
        console.log('Step 1: stage_who_for → myself');
        await post('/api/stage', { sessionId, stageId: 'stage_who_for', value: 'myself' });
        
        // Step 2: Track selection
        console.log('Step 2: stage_track → substance');
        await post('/api/stage', { sessionId, stageId: 'stage_track', value: 'substance' });
        
        // Step 3: Opening acknowledgement (auto-processed)
        console.log('Step 3: stage_opening_ack (auto-processed)');
        
        // Step 4: What are you struggling with?
        console.log('Step 4: stage3 → alcohol');
        await post('/api/stage', { sessionId, stageId: 'stage3', value: 'alcohol' });
        
        // Step 5: Previous treatment?
        console.log('Step 5: stage4a → No - first time');
        await post('/api/stage', { sessionId, stageId: 'stage4a', value: 'No - first time' });
        
        // Step 6: Health notes (AI-processed)
        console.log('Step 6: stage4b → none');
        await post('/api/chat', { sessionId, stageId: 'stage4b', message: 'none' });
        
        // Step 7: Medical aid?
        console.log('Step 7: stage5 → No');
        await post('/api/stage', { sessionId, stageId: 'stage5', value: 'No' });
        
        // Step 8: City
        console.log('Step 8: stage_city → Johannesburg');
        await post('/api/stage', { sessionId, stageId: 'stage_city', value: 'Johannesburg' });
        
        // Step 9: When to start?
        console.log('Step 9: stage6 → Within the next week');
        await post('/api/stage', { sessionId, stageId: 'stage6', value: 'Within the next week' });
        
        // Step 10: Urgency detail ✅ KEY TEST
        console.log('Step 10: stage_urgency_detail → managing ✅');
        const urgencyResponse = await post('/api/stage', { sessionId, stageId: 'stage_urgency_detail', value: 'managing' });
        
        if (!urgencyResponse.next || urgencyResponse.next.stageId !== 'notes') {
            throw new Error(`Expected routing to notes stage, got: ${urgencyResponse.next?.stageId}`);
        }
        console.log('   ✅ Urgency detail question appeared and routed correctly');
        
        // Step 11: Additional notes
        console.log('Step 11: notes → skip');
        await post('/api/stage', { sessionId, stageId: 'notes', value: 'skip' });
        
        // Step 12: Contact details
        console.log('Step 12: stage7a → John Doe');
        await post('/api/stage', { sessionId, stageId: 'stage7a', value: 'John Doe' });
        
        console.log('Step 13: stage7b → 0821234567');
        await post('/api/stage', { sessionId, stageId: 'stage7b', value: '0821234567' });
        
        console.log('Step 14: stage7c → john@test.com');
        await post('/api/stage', { sessionId, stageId: 'stage7c', value: 'john@test.com' });
        
        // Step 15: Callback time and closing ✅ KEY TEST
        console.log('Step 15: stage8 → morning');
        const closingResponse = await post('/api/stage', { sessionId, stageId: 'stage8', value: 'morning' });
        
        const closingMessage = closingResponse.next?.messages?.[0];
        if (!closingMessage) {
            throw new Error('No closing message received');
        }
        
        console.log(`\n✅ Closing message: "${closingMessage}"`);
        
        // Verify it's the default personal message (not crisis, not professional, not minor, not third-party, not MH)
        if (closingMessage.includes('John Doe') && !closingMessage.includes('crisis') && !closingMessage.includes('professional')) {
            console.log('   ✅ Closing message is personal and appropriate for "myself + substance"');
        } else {
            throw new Error('Closing message does not match expected pattern');
        }
        
        console.log('\n✅ TEST 1 PASSED: For myself + Substance Use\n');
        
    } catch (error) {
        console.error('\n❌ TEST 1 FAILED:', error.message);
        process.exit(1);
    }
}

runTest();
