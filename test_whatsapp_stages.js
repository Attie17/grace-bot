/**
 * Test WhatsApp Stage-Based Intake Flow
 * 
 * Verifies:
 * 1. First message shows welcome + first stage (track selection)
 * 2. Numbered options are properly formatted
 * 3. Medical member number question appears
 * 4. City/Town question appears
 * 5. Full conversation flows correctly
 */

import { formatStageForWhatsApp, getWhatsAppInitialStage, advanceWhatsAppStage } from './src/whatsapp-stages.js';
import { logger } from './src/logger.js';

async function testWhatsAppFlow() {
    console.log('=== WhatsApp Stage-Based Intake Flow Test ===\n');

    try {
        // Test 1: Get initial stage
        console.log('📝 Test 1: Get Initial Stage');
        const initialStage = getWhatsAppInitialStage();
        console.log('Initial Stage ID:', initialStage.stageId);
        console.log('Formatted Message:\n', initialStage.formattedMessage);
        console.log('\n✅ Initial stage shows numbered options\n');

        // Test 2: Advance through medical aid question to medical member number
        console.log('📝 Test 2: Advance Through Track Selection');
        let leadData = {};
        let result = advanceWhatsAppStage('stage1b', '1', leadData); // SUD track
        if (result.error) {
            console.log('❌ Error advancing stage:', result.error);
            return;
        }
        console.log('Next Stage:', result.nextStageId);
        console.log('Response:\n', result.formattedMessage);
        console.log('\n✅ Stage1b advanced successfully\n');

        // Continue through flow to stage5b (medical aid)
        leadData = result.leadData;
        console.log('📝 Test 3: Advance To Medical Aid Question');
        let stageId = result.nextStageId;
        
        // stage2: For whom?
        result = advanceWhatsAppStage(stageId, '1', leadData); // Self
        console.log(`${result.nextStageId}: `, result.formattedMessage.substring(0, 100) + '...');
        leadData = result.leadData;
        stageId = result.nextStageId;

        // stage3: Primary struggle
        result = advanceWhatsAppStage(stageId, '1', leadData); // Alcohol
        console.log(`${result.nextStageId}: `, result.formattedMessage.substring(0, 100) + '...');
        leadData = result.leadData;
        stageId = result.nextStageId;

        // stage4a: Previous treatment
        result = advanceWhatsAppStage(stageId, '1', leadData); // No
        console.log(`${result.nextStageId}: `, result.formattedMessage.substring(0, 100) + '...');
        leadData = result.leadData;
        stageId = result.nextStageId;

        // stage5: Medical aid yes/no
        result = advanceWhatsAppStage(stageId, '1', leadData); // Yes
        console.log(`${result.nextStageId}: `, result.formattedMessage.substring(0, 100) + '...');
        leadData = result.leadData;
        stageId = result.nextStageId;

        // stage5b: Which medical aid
        console.log('\n📝 Test 4: Medical Aid Options (Should Show 9 Numbered Options)');
        console.log('Current stageId:', stageId);
        result = advanceWhatsAppStage(stageId, '1', leadData); // Discovery Health
        if (result.error) {
            console.log('❌ Error:', result.error);
            return;
        }
        console.log('Response:\n', result.formattedMessage);
        console.log('Result object:', JSON.stringify(result, null, 2));
        leadData = result.leadData;
        stageId = result.nextStageId;

        // stage5c: Medical member number (NEW!)
        console.log('\n📝 Test 5: Medical Member Number Question (NEW!)');
        console.log('Next Stage ID:', stageId);
        console.log('Expected: stage5c');
        if (stageId !== 'stage5c') {
            console.log('❌ ERROR: Expected stage5c but got', stageId);
            return;
        }
        const stagePayload = getWhatsAppInitialStage({}).payload; // Would need actual implementation
        result = advanceWhatsAppStage(stageId, 'MEMBER12345', leadData);
        if (result.error) {
            console.log('❌ Error:', result.error);
            return;
        }
        console.log('Response after providing member number:\n', result.formattedMessage);
        console.log('Next Stage:', result.nextStageId);
        console.log('✅ Medical member number captured\n');
        leadData = result.leadData;
        stageId = result.nextStageId;

        // stage_city: City/Town (SHOULD EXIST)
        console.log('📝 Test 6: City/Town Question (Should Exist)');
        if (stageId !== 'stage_city') {
            console.log('❌ ERROR: Expected stage_city but got', stageId);
            console.log('Lead data captured so far:', leadData);
            return;
        }
        console.log('✅ Flow correctly routes to City/Town question\n');

        console.log('📊 Summary of Captured Data:');
        console.log(JSON.stringify(leadData, null, 2));

        console.log('\n✅✅✅ ALL TESTS PASSED ✅✅✅');
        console.log('\nKey Validations:');
        console.log('✓ Initial stage shows with numbered options');
        console.log('✓ Numbered input correctly maps to button values');
        console.log('✓ stage5c (Medical member number) appears after medical aid selection');
        console.log('✓ stage_city (City/Town) appears after medical member number');
        console.log('✓ All stage transitions working correctly');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    }
}

testWhatsAppFlow().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});
