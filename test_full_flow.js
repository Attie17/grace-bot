/**
 * Test Complete Medical Intake Flow
 */

import { advanceWhatsAppStage } from './src/whatsapp-stages.js';

async function testCompleteFlow() {
    console.log('=== Complete Medical Intake Flow Test ===\n');

    let leadData = {};
    let stage = 'stage5b';  // Starting after user selected medical aid as "Yes"

    // Stage 5b: Which medical aid?
    console.log('Stage 5b: Which medical aid?');
    console.log('User input: "1" (Discovery Health)\n');
    let result = advanceWhatsAppStage(stage, '1', leadData);
    console.log('Response:', result.formattedMessage.substring(0, 80) + '...');
    console.log('Next stage:', result.nextStageId);
    leadData = result.leadData;
    stage = result.nextStageId;

    if (stage !== 'stage5c') {
        console.log('❌ ERROR: Expected stage5c but got', stage);
        return;
    }

    // Stage 5c: Medical member number
    console.log('\n📝 Stage 5c: Medical member number?');
    console.log('User input: "MEMBER12345"\n');
    result = advanceWhatsAppStage(stage, 'MEMBER12345', leadData);
    if (result.error) {
        console.log('❌ Error:', result.error);
        return;
    }
    console.log('Response:', result.formattedMessage.substring(0, 80) + '...');
    console.log('Next stage:', result.nextStageId);
    leadData = result.leadData;
    stage = result.nextStageId;

    if (stage !== 'stage_city') {
        console.log('❌ ERROR: Expected stage_city but got', stage);
        return;
    }

    // Stage city: Which city/town?
    console.log('\n📝 Stage City: Which city/town?');
    console.log('User input: "5" (Johannesburg - assuming it\'s option 5)\n');
    result = advanceWhatsAppStage(stage, '5', leadData);
    if (result.error) {
        console.log('❌ Error:', result.error);
        return;
    }
    console.log('Response (first 100 chars):', result.formattedMessage.substring(0, 100) + '...');
    console.log('Next stage:', result.nextStageId);
    leadData = result.leadData;

    console.log('\n✅✅✅ COMPLETE FLOW WORKING ✅✅✅');
    console.log('\nFinal leadData:');
    console.log(JSON.stringify(leadData, null, 2));
}

testCompleteFlow().catch(e => console.error(e));
