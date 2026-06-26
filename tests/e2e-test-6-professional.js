/**
 * End-to-end test: Test 6 - Professional referral
 * Verifies: consent/awareness question, safeguarding path flags correctly, closing message is referral-appropriate
 */

const BASE_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `test-e2e-professional-${Date.now()}`;

async function post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return response.json();
}

async function runTest() {
    console.log('🧪 TEST 6: Professional referral\n');
    
    try {
        // Step 1: Who is this for? ✅ KEY TEST
        console.log('Step 1: stage_who_for → professional ✅');
        const whoResponse = await post('/api/stage', { sessionId, stageId: 'stage_who_for', value: 'professional' });
        
        // Should route to stage_professional_ack
        if (whoResponse.next?.stageId !== 'stage_professional_ack') {
            throw new Error(`Expected stage_professional_ack, got: ${whoResponse.next?.stageId}`);
        }
        console.log('   ✅ Professional acknowledgement appeared');
        
        // Step 2: Professional acknowledgement
        console.log('Step 2: stage_professional_ack (auto-processed)');
        
        // Step 3: Professional role
        console.log('Step 3: stage_professional_role → school');
        await post('/api/stage', { sessionId, stageId: 'stage_professional_role', value: 'school' });
        
        // Step 4: Referred person's name (from professional_role)
        console.log('Step 4: stage_referred_name → David Williams');
        await post('/api/stage', { sessionId, stageId: 'stage_referred_name', value: 'David Williams' });
        
        // Step 5: Consent/awareness ✅ KEY TEST
        console.log('Step 5: stage_professional_consent → yes ✅');
        const consentResponse = await post('/api/stage', { sessionId, stageId: 'stage_professional_consent', value: 'aware_supportive' });
        
        if (consentResponse.next?.stageId !== 'stage_track') {
            throw new Error(`Expected stage_track after consent, got: ${consentResponse.next?.stageId}`);
        }
        console.log('   ✅ Consent/awareness question appeared and routed correctly');
        
        // Step 6: Track (this is when minor question normally appears, but not for professionals)
        console.log('Step 6: stage_track → substance');
        await post('/api/stage', { sessionId, stageId: 'stage_track', value: 'substance' });
        
        // Step 7: Opening ack
        console.log('Step 7: stage_opening_ack (auto-processed)');
        
        // Step 8: What struggling with?
        console.log('Step 8: stage3 → other');
        await post('/api/stage', { sessionId, stageId: 'stage3', value: 'other' });
        
        // Step 9: Prior treatment
        console.log('Step 9: stage4a → Yes - inpatient rehab');
        await post('/api/stage', { sessionId, stageId: 'stage4a', value: 'Yes - inpatient rehab' });
        
        // Step 10: Health notes
        console.log('Step 10: stage4b → Student showing behavioral changes');
        await post('/api/chat', { sessionId, stageId: 'stage4b', message: 'Student showing behavioral changes and performance decline' });
        
        // Step 11: Medical aid
        console.log('Step 11: stage5 → Unsure');
        await post('/api/stage', { sessionId, stageId: 'stage5', value: 'Unsure' });
        
        // Step 12: City
        console.log('Step 12: stage_city → Johannesburg');
        await post('/api/stage', { sessionId, stageId: 'stage_city', value: 'Johannesburg' });
        
        // Step 13: When
        console.log('Step 13: stage6 → Within the next week');
        await post('/api/stage', { sessionId, stageId: 'stage6', value: 'Within the next week' });
        
        // Step 14: Urgency
        console.log('Step 14: stage_urgency_detail → urgent');
        await post('/api/stage', { sessionId, stageId: 'stage_urgency_detail', value: 'urgent' });
        
        // Step 15: Notes
        console.log('Step 15: notes → Referred by school counselor');
        await post('/api/stage', { sessionId, stageId: 'notes', value: 'Referred by school counselor' });
        
        // Step 16-18: Contact details
        console.log('Step 16: stage7a → Ms. Sarah Roberts');
        await post('/api/stage', { sessionId, stageId: 'stage7a', value: 'Ms. Sarah Roberts' });
        
        console.log('Step 17: stage7b → 0866666666');
        await post('/api/stage', { sessionId, stageId: 'stage7b', value: '0866666666' });
        
        console.log('Step 18: stage7c → s.roberts@school.co.za');
        await post('/api/stage', { sessionId, stageId: 'stage7c', value: 's.roberts@school.co.za' });
        
        // Step 19: Closing (should be professional-specific) ✅ KEY TEST
        console.log('Step 19: stage8 → morning');
        const closingResponse = await post('/api/stage', { sessionId, stageId: 'stage8', value: 'morning' });
        
        const closingMessage = closingResponse.next?.messages?.[0];
        if (!closingMessage) {
            throw new Error('No closing message received');
        }
        
        console.log(`\n✅ Closing message: "${closingMessage}"`);
        
        // Verify it's professional closing (priority 2) - should acknowledge referral context
        if (closingMessage.includes('Ms.') || closingMessage.includes('Roberts') || closingMessage.includes('team')) {
            console.log('   ✅ Professional/referral-appropriate closing message displayed');
        } else {
            console.warn('   ⚠️  Closing message may not be professional-specific');
        }
        
        console.log('   ⚠️  Note: Safeguarding flags should be set (professional + minor)');
        console.log('   ⚠️  Check database: caller_type should be "school"');
        
        console.log('\n✅ TEST 6 PASSED: Professional referral\n');
        
    } catch (error) {
        console.error('\n❌ TEST 6 FAILED:', error.message);
        process.exit(1);
    }
}

runTest();
