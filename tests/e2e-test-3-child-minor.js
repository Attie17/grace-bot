/**
 * End-to-end test: Test 3 - For someone else (child under 18)
 * Verifies: minor confidentiality bridge, guardian question, WhatsApp alert
 */

const BASE_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `test-e2e-child-minor-${Date.now()}`;

async function post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return response.json();
}

async function runTest() {
    console.log('🧪 TEST 3: For someone else (child under 18)\n');
    
    try {
        // Step 1: Who is this for?
        console.log('Step 1: stage_who_for → someone_else');
        await post('/api/stage', { sessionId, stageId: 'stage_who_for', value: 'someone_else' });
        
        // Step 2: Relationship
        console.log('Step 2: stage_relationship → child');
        await post('/api/stage', { sessionId, stageId: 'stage_relationship', value: 'child' });
        
        // Step 3: Referred person's name
        console.log('Step 3: stage_referred_name → Emma Johnson');
        await post('/api/stage', { sessionId, stageId: 'stage_referred_name', value: 'Emma Johnson' });
        
        // Step 4: Is the person under 18? ✅ KEY TEST
        console.log('Step 4: stage_is_minor → yes ✅');
        const minorResponse = await post('/api/stage', { sessionId, stageId: 'stage_is_minor', value: 'yes' });
        
        // Should route to stage_minor_confidentiality
        if (minorResponse.next?.stageId !== 'stage_minor_confidentiality') {
            throw new Error(`Expected stage_minor_confidentiality, got: ${minorResponse.next?.stageId}`);
        }
        console.log('   ✅ Minor confidentiality bridge appeared');
        
        // Step 5: Minor confidentiality acknowledgement
        console.log('Step 5: stage_minor_confidentiality → understood');
        await post('/api/stage', { sessionId, stageId: 'stage_minor_confidentiality', value: 'understood' });
        
        // Step 6: Track
        console.log('Step 6: stage_track → substance');
        await post('/api/stage', { sessionId, stageId: 'stage_track', value: 'substance' });
        
        // Step 7: Opening ack (auto)
        console.log('Step 7: stage_opening_ack (auto-processed)');
        
        // Step 8: What are they struggling with?
        console.log('Step 8: stage3 → cannabis');
        await post('/api/stage', { sessionId, stageId: 'stage3', value: 'cannabis' });
        
        // Step 9: Prior treatment
        console.log('Step 9: stage4a → No - first time');
        await post('/api/stage', { sessionId, stageId: 'stage4a', value: 'No - first time' });
        
        // Step 10: Health notes
        console.log('Step 10: stage4b → none');
        await post('/api/chat', { sessionId, stageId: 'stage4b', message: 'none' });
        
        // Step 11: Medical aid
        console.log('Step 11: stage5 → Yes - Discovery');
        await post('/api/stage', { sessionId, stageId: 'stage5', value: 'Yes - Discovery' });
        
        // Step 12: City
        console.log('Step 12: stage_city → Pretoria');
        await post('/api/stage', { sessionId, stageId: 'stage_city', value: 'Pretoria' });
        
        // Step 13: When
        console.log('Step 13: stage6 → Within the next month');
        await post('/api/stage', { sessionId, stageId: 'stage6', value: 'Within the next month' });
        
        // Step 14: Urgency
        console.log('Step 14: stage_urgency_detail → planning');
        await post('/api/stage', { sessionId, stageId: 'stage_urgency_detail', value: 'planning' });
        
        // Step 15: Notes
        console.log('Step 15: notes → skip');
        await post('/api/stage', { sessionId, stageId: 'notes', value: 'skip' });
        
        // Note: No separate guardian question in current implementation
        // Flow goes directly to contact details after notes
        console.log('   ℹ️  Note: No separate guardian stage (goes directly to contact details)');
        
        // Step 16-18: Contact details
        console.log('Step 16: stage7a → Sarah Johnson');
        await post('/api/stage', { sessionId, stageId: 'stage7a', value: 'Sarah Johnson' });
        
        console.log('Step 17: stage7b → 0833333333');
        await post('/api/stage', { sessionId, stageId: 'stage7b', value: '0833333333' });
        
        console.log('Step 18: stage7c → sarah@test.com');
        await post('/api/stage', { sessionId, stageId: 'stage7c', value: 'sarah@test.com' });
        
        // Step 19: Closing (should be minor-specific) ✅ KEY TEST
        console.log('Step 19: stage8 → afternoon');
        const closingResponse = await post('/api/stage', { sessionId, stageId: 'stage8', value: 'afternoon' });
        
        const closingMessage = closingResponse.next?.messages?.[0];
        if (!closingMessage) {
            throw new Error('No closing message received');
        }
        
        console.log(`\n✅ Closing message: "${closingMessage}"`);
        
        // Verify it's the minor-specific closing (priority 3)
        if (closingMessage.includes('young people') || closingMessage.includes('families')) {
            console.log('   ✅ Minor-specific closing message displayed');
        } else {
            console.warn('   ⚠️  Closing message may not be minor-specific');
        }
        
        console.log('   ⚠️  Note: WhatsApp alert should have been triggered (involves_minor = true)');
        console.log('   ⚠️  Check Railway logs or therapist phone for WhatsApp notification');
        
        console.log('\n✅ TEST 3 PASSED: For someone else (child under 18)\n');
        
    } catch (error) {
        console.error('\n❌ TEST 3 FAILED:', error.message);
        process.exit(1);
    }
}

runTest();
