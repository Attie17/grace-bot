/**
 * Simplified WhatsApp Stage Test - Focus on Medical Number Question
 */

import { advanceWhatsAppStage } from './src/whatsapp-stages.js';

async function testMedicalNumberFlow() {
    console.log('=== Testing Medical Member Number Question ===\n');

    let leadData = {};
    let currentStage = 'stage5b';

    // Simulate being at stage5b (Which medical aid?)
    console.log('📝 Starting at stage5b (Which medical aid?)');
    console.log('Input: "1" (Discovery Health)');
    
    const result = advanceWhatsAppStage(currentStage, '1', leadData);
    
    console.log('\nResult:');
    console.log('  ack:', result.ack);
    console.log('  nextStageId:', result.nextStageId);
    console.log('  leadData:', result.leadData);
    
    if (result.nextStageId === 'stage5c') {
        console.log('\n✅ SUCCESS: Advanced to stage5c');
        console.log('\nStage 5c Response:');
        console.log(result.formattedMessage);
    } else {
        console.log('\n❌ ERROR: Expected stage5c but got:', result.nextStageId);
    }
}

testMedicalNumberFlow().catch(e => console.error(e));
