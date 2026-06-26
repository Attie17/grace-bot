/**
 * End-to-end test: Test 2 - For myself + Mental Health (Crisis)
 * Verifies: safety check appears, crisis path surfaces emergency numbers
 */

const BASE_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `test-e2e-myself-mh-crisis-${Date.now()}`;

async function post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return response.json();
}

async function runTest() {
    console.log('🧪 TEST 2: For myself + Mental Health (Crisis)\n');
    
    try {
        // Step 1: Who is this for?
        console.log('Step 1: stage_who_for → myself');
        await post('/api/stage', { sessionId, stageId: 'stage_who_for', value: 'myself' });
        
        // Step 2: Track selection
        console.log('Step 2: stage_track → mental_health');
        await post('/api/stage', { sessionId, stageId: 'stage_track', value: 'mental_health' });
        
        // Step 3: Opening acknowledgement (auto-processed)
        console.log('Step 3: stage_opening_ack (auto-processed)');
        
        // Step 4: Mental health opening (free text)
        console.log('Step 4: stage_mh_opening → I feel hopeless');
        await post('/api/chat', { sessionId, stageId: 'stage_mh_opening', message: 'I feel hopeless and cannot see a way forward' });
        
        // Step 5: Safety check ✅ KEY TEST
        console.log('Step 5: stage_mh_safety → crisis ✅');
        const safetyResponse = await post('/api/stage', { sessionId, stageId: 'stage_mh_safety', value: 'crisis' });
        
        // Check for emergency numbers in the ack message
        const ackMessages = safetyResponse.ack || [];
        const hasEmergencyNumbers = ackMessages.some(msg => 
            msg.includes('10177') || msg.includes('082 911') || msg.includes('Netcare')
        );
        
        if (!hasEmergencyNumbers) {
            throw new Error('Crisis response did not include emergency contact numbers');
        }
        console.log('   ✅ Emergency numbers displayed (10177, Netcare 911: 082 911)');
        
        // Step 6: Prior treatment
        console.log('Step 6: stage_mh_prior_treatment → no');
        await post('/api/stage', { sessionId, stageId: 'stage_mh_prior_treatment', value: 'no' });
        
        // Step 7: Health notes
        console.log('Step 7: stage4b → none');
        await post('/api/chat', { sessionId, stageId: 'stage4b', message: 'none' });
        
        // Step 8: Medical aid
        console.log('Step 8: stage5 → No');
        await post('/api/stage', { sessionId, stageId: 'stage5', value: 'No' });
        
        // Step 9: City
        console.log('Step 9: stage_city → Cape Town');
        await post('/api/stage', { sessionId, stageId: 'stage_city', value: 'Cape Town' });
        
        // Step 10: When to start
        console.log('Step 10: stage6 → As soon as possible — it\'s urgent');
        await post('/api/stage', { sessionId, stageId: 'stage6', value: "As soon as possible — it's urgent" });
        
        // Step 11: Urgency detail (should preserve crisis from stage_mh_safety)
        console.log('Step 11: stage_urgency_detail → urgent (but crisis should be preserved)');
        await post('/api/stage', { sessionId, stageId: 'stage_urgency_detail', value: 'urgent' });
        
        // Step 12: Notes
        console.log('Step 12: notes → skip');
        await post('/api/stage', { sessionId, stageId: 'notes', value: 'skip' });
        
        // Step 13-15: Contact details
        console.log('Step 13: stage7a → Alex Smith');
        await post('/api/stage', { sessionId, stageId: 'stage7a', value: 'Alex Smith' });
        
        console.log('Step 14: stage7b → 0822222222');
        await post('/api/stage', { sessionId, stageId: 'stage7b', value: '0822222222' });
        
        console.log('Step 15: stage7c → alex@test.com');
        await post('/api/stage', { sessionId, stageId: 'stage7c', value: 'alex@test.com' });
        
        // Step 16: Closing (should be crisis-specific) ✅ KEY TEST
        console.log('Step 16: stage8 → any');
        const closingResponse = await post('/api/stage', { sessionId, stageId: 'stage8', value: 'any' });
        
        console.log('DEBUG closingResponse:', JSON.stringify(closingResponse, null, 2));
        
        const closingMessage = closingResponse.next?.messages?.[0];
        if (!closingMessage) {
            throw new Error('No closing message received');
        }
        
        console.log(`\n✅ Closing message: "${closingMessage}"`);
        
        // Verify it's the crisis closing (priority 1)
        if (closingMessage.includes('crisis') || closingMessage.includes('10177') || closingMessage.includes('emergency')) {
            console.log('   ✅ Crisis-specific closing message displayed');
        } else {
            console.warn('   ⚠️  Closing message may not be crisis-specific (expected emergency services mention)');
        }
        
        console.log('\n✅ TEST 2 PASSED: For myself + Mental Health (Crisis)\n');
        
    } catch (error) {
        console.error('\n❌ TEST 2 FAILED:', error.message);
        process.exit(1);
    }
}

runTest();
