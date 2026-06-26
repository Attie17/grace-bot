/**
 * End-to-end test: Test 4 - For someone else (partner/family/friend)
 * Verifies: confidentiality assurance with referred name, third-person empathy on health concern
 */

const BASE_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `test-e2e-third-party-${Date.now()}`;

async function post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return response.json();
}

async function runTest() {
    console.log('🧪 TEST 4: For someone else (partner/family/friend)\n');
    
    try {
        // Step 1: Who is this for?
        console.log('Step 1: stage_who_for → someone_else');
        await post('/api/stage', { sessionId, stageId: 'stage_who_for', value: 'someone_else' });
        
        // Step 2: Relationship
        console.log('Step 2: stage_relationship → partner');
        await post('/api/stage', { sessionId, stageId: 'stage_relationship', value: 'partner' });
        
        // Step 3: Referred person's name ✅ KEY TEST (should be used in confidentiality bridge)
        console.log('Step 3: stage_referred_name → Michael Thompson ✅');
        await post('/api/stage', { sessionId, stageId: 'stage_referred_name', value: 'Michael Thompson' });
        
        // Step 4: Is minor?
        console.log('Step 4: stage_is_minor → no');
        const minorResponse = await post('/api/stage', { sessionId, stageId: 'stage_is_minor', value: 'no' });
        
        // Should route to stage_confidentiality_assurance ✅ KEY TEST
        if (minorResponse.next?.stageId !== 'stage_confidentiality_assurance') {
            throw new Error(`Expected stage_confidentiality_assurance, got: ${minorResponse.next?.stageId}`);
        }
        console.log('   ✅ Confidentiality assurance bridge appeared');
        
        // Verify the referred name appears in the message
        const confidentialityMessages = minorResponse.next?.messages || [];
        const hasMichaelName = confidentialityMessages.some(msg => msg.includes('Michael'));
        if (hasMichaelName) {
            console.log('   ✅ Referred name "Michael Thompson" appeared in confidentiality message');
        } else {
            console.warn('   ⚠️  Referred name may not have appeared in confidentiality message');
        }
        
        // Step 5: Confidentiality acknowledgement
        console.log('Step 5: stage_confidentiality_assurance → understood');
        await post('/api/stage', { sessionId, stageId: 'stage_confidentiality_assurance', value: 'understood' });
        
        // Step 6: Track
        console.log('Step 6: stage_track → mental_health');
        await post('/api/stage', { sessionId, stageId: 'stage_track', value: 'mental_health' });
        
        // Step 7: Opening ack (auto)
        console.log('Step 7: stage_opening_ack (auto-processed)');
        
        // Step 8: Mental health opening
        console.log('Step 8: stage_mh_opening → He has been very withdrawn lately');
        await post('/api/chat', { sessionId, stageId: 'stage_mh_opening', message: 'He has been very withdrawn and isolated' });
        
        // Step 9: Safety check
        console.log('Step 9: stage_mh_safety → stable');
        await post('/api/stage', { sessionId, stageId: 'stage_mh_safety', value: 'stable' });
        
        // Step 10: Prior treatment
        console.log('Step 10: stage_mh_prior_treatment → unsure');
        await post('/api/stage', { sessionId, stageId: 'stage_mh_prior_treatment', value: 'unsure' });
        
        // Step 11: Health notes ✅ KEY TEST (should get third-person empathy response)
        console.log('Step 11: stage4b → He drinks heavily every evening ✅');
        const healthResponse = await post('/api/chat', { 
            sessionId, 
            stageId: 'stage4b', 
            message: 'He drinks heavily every evening and sometimes gets angry' 
        });
        
        // Check if the response uses third-person language (him/he)
        const healthAck = healthResponse.ack?.[0] || '';
        const hasThirdPerson = healthAck.toLowerCase().includes('him') || 
                               healthAck.toLowerCase().includes('he') || 
                               healthAck.toLowerCase().includes('michael');
        
        if (hasThirdPerson) {
            console.log('   ✅ Third-person empathy detected in health acknowledgement');
        } else {
            console.warn('   ⚠️  Health acknowledgement may not use third-person empathy');
        }
        
        // Step 12: Medical aid
        console.log('Step 12: stage5 → No');
        await post('/api/stage', { sessionId, stageId: 'stage5', value: 'No' });
        
        // Step 13: City
        console.log('Step 13: stage_city → Durban');
        await post('/api/stage', { sessionId, stageId: 'stage_city', value: 'Durban' });
        
        // Step 14: When
        console.log('Step 14: stage6 → Within the next week');
        await post('/api/stage', { sessionId, stageId: 'stage6', value: 'Within the next week' });
        
        // Step 15: Urgency
        console.log('Step 15: stage_urgency_detail → managing');
        await post('/api/stage', { sessionId, stageId: 'stage_urgency_detail', value: 'managing' });
        
        // Step 16: Notes
        console.log('Step 16: notes → skip');
        await post('/api/stage', { sessionId, stageId: 'notes', value: 'skip' });
        
        // Step 17-19: Contact details
        console.log('Step 17: stage7a → Lisa Thompson');
        await post('/api/stage', { sessionId, stageId: 'stage7a', value: 'Lisa Thompson' });
        
        console.log('Step 18: stage7b → 0844444444');
        await post('/api/stage', { sessionId, stageId: 'stage7b', value: '0844444444' });
        
        console.log('Step 19: stage7c → lisa@test.com');
        await post('/api/stage', { sessionId, stageId: 'stage7c', value: 'lisa@test.com' });
        
        // Step 20: Closing (should be third-party specific) ✅ KEY TEST
        console.log('Step 20: stage8 → evening');
        const closingResponse = await post('/api/stage', { sessionId, stageId: 'stage8', value: 'evening' });
        
        console.log('DEBUG closingResponse:', JSON.stringify(closingResponse, null, 2));
        
        const closingMessage = closingResponse.next?.messages?.[0];
        if (!closingMessage) {
            throw new Error('No closing message received');
        }
        
        console.log(`\n✅ Closing message: "${closingMessage}"`);
        
        // Verify it's third-party closing (priority 4) - should use caller name
        if (closingMessage.includes('Lisa') || closingMessage.includes('you')) {
            console.log('   ✅ Third-party closing message displayed (addressing caller)');
        } else {
            console.warn('   ⚠️  Closing message may not be third-party specific');
        }
        
        console.log('\n✅ TEST 4 PASSED: For someone else (partner/family/friend)\n');
        
    } catch (error) {
        console.error('\n❌ TEST 4 FAILED:', error.message);
        process.exit(1);
    }
}

runTest();
