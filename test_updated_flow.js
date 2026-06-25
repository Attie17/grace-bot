/**
 * Test Updated Stage Flow - No Duplicate Question
 */

import { advanceWhatsAppStage, getWhatsAppInitialStage } from './src/whatsapp-stages.js';

async function testUpdatedFlow() {
    console.log('=== Testing Updated Flow (No Duplicate Question) ===\n');

    let leadData = {};
    let stage = 'stage1b';

    // Stage 1b: Track selection
    console.log('📝 Stage 1b: Track Selection');
    let result = getWhatsAppInitialStage();
    console.log('Response:', result.formattedMessage);
    console.log('\nUser input: "1" (SUD)\n');
    
    result = advanceWhatsAppStage('stage1b', '1', leadData);
    console.log('Next Stage:', result.nextStageId);
    console.log('Expected: stage_caller_type (NOT stage2)');
    
    if (result.nextStageId !== 'stage_caller_type') {
        console.log('❌ ERROR: Expected stage_caller_type but got', result.nextStageId);
        return;
    }
    
    console.log('✅ Correctly skipped stage2, going to stage_caller_type');
    console.log('Response:', result.formattedMessage);
    
    leadData = result.leadData;
    stage = result.nextStageId;

    // Stage caller_type: Who calling about
    console.log('\n📝 Stage Caller Type (No "One more quick question" prefix)');
    console.log('User input: "1" (For myself)\n');
    
    result = advanceWhatsAppStage(stage, '1', leadData);
    console.log('Ack:', result.ack);
    console.log('Next Stage:', result.nextStageId);
    console.log('Response:', result.formattedMessage.substring(0, 100) + '...');
    console.log('for_whom:', result.leadData.for_whom);
    
    if (result.nextStageId !== 'stage3') {
        console.log('❌ ERROR: Expected stage3 but got', result.nextStageId);
        return;
    }

    console.log('\n✅✅✅ NEW FLOW WORKING CORRECTLY ✅✅✅');
    console.log('\nKey Changes:');
    console.log('✓ Removed duplicate "for yourself" question');
    console.log('✓ Removed "One more quick question" prefix');
    console.log('✓ stage1b now goes directly to stage_caller_type');
    console.log('✓ stage_caller_type routes to stage3 (struggle selection)');
}

testUpdatedFlow().catch(e => console.error(e));
