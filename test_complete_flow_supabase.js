/**
 * Complete Intake Flow Test - All Stages
 * Tracks session ID to check Supabase after
 */

import { advanceWhatsAppStage, getWhatsAppInitialStage } from './src/whatsapp-stages.js';
import crypto from 'crypto';

async function testCompleteIntakeFlow() {
    console.log('=== COMPLETE INTAKE FLOW TEST ===\n');
    
    // Generate a test session ID
    const testSessionId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    console.log('📝 Test Session ID:', testSessionId);
    console.log('(Use this to check Supabase leads table)\n');

    let leadData = {};
    let stage = 'stage1b';

    try {
        // Stage 1b: Track
        console.log('📍 Stage 1b: Select Track');
        let result = getWhatsAppInitialStage();
        console.log('  Question: Track selection');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (SUD) ✓');
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage caller_type: Who calling about
        console.log('\n📍 Stage Caller Type: Who are you calling about?');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (For myself) ✓');
        console.log('  caller_type captured:', result.leadData.caller_type);
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 3: Struggle
        console.log('\n📍 Stage 3: What are you struggling with?');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (Alcohol) ✓');
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 4a: Previous treatment
        console.log('\n📍 Stage 4a: Previous treatment?');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (No - first time) ✓');
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 4b: Health notes (free text - skip for this test)
        console.log('\n📍 Stage 4b: Health notes (free text)');
        console.log('  User: "No specific health issues" ✓');
        result = advanceWhatsAppStage(stage, 'No specific health issues', leadData);
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 5: Medical aid?
        console.log('\n📍 Stage 5: Do you have medical aid?');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (Yes) ✓');
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 5b: Which medical aid?
        console.log('\n📍 Stage 5b: Which medical aid?');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (Discovery Health) ✓');
        console.log('  medical_aid_name:', result.leadData.medical_aid_name);
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 5c: Medical member number
        console.log('\n📍 Stage 5c: Medical member number');
        result = advanceWhatsAppStage(stage, 'MEM12345', leadData);
        console.log('  User: "MEM12345" ✓');
        console.log('  medical_member_number:', result.leadData.medical_member_number);
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage city: City/Town
        console.log('\n📍 Stage City: Which city/town?');
        result = advanceWhatsAppStage(stage, 'Johannesburg', leadData);
        console.log('  User: "Johannesburg" ✓');
        console.log('  city captured:', result.leadData.city);
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 6: When to start?
        console.log('\n📍 Stage 6: When to start?');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (Urgent) ✓');
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage notes: Optional notes (has useAI: true, skip for this test)
        console.log('\n📍 Stage Notes: Any additional notes?');
        console.log('  (Skipping - handled by /api/chat on server)');
        leadData.additional_notes = 'Looking forward to starting treatment';
        stage = 'stage7a';  // Direct to next stage

        // Stage 7a: Contact name
        console.log('\n📍 Stage 7a: Contact name?');
        result = advanceWhatsAppStage(stage, 'John Smith', leadData);
        console.log('  User: "John Smith" ✓');
        console.log('  contact_name:', result.leadData.contact_name);
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 7b: Contact phone
        console.log('\n📍 Stage 7b: Contact phone?');
        result = advanceWhatsAppStage(stage, '+27761234567', leadData);
        console.log('  User: "+27761234567" ✓');
        console.log('  contact_phone:', result.leadData.contact_phone);
        leadData = result.leadData;
        stage = result.nextStageId;

        // Stage 8: Call time preference
        console.log('\n📍 Stage 8: Best time to call?');
        result = advanceWhatsAppStage(stage, '1', leadData);
        console.log('  User: 1 (Morning) ✓');
        leadData = result.leadData;
        stage = result.nextStageId;

        // Closing
        console.log('\n📍 Stage Closing: Form complete');
        console.log('  Result ended:', result.ended);

        console.log('\n' + '='.repeat(60));
        console.log('✅ INTAKE FLOW COMPLETE\n');
        
        console.log('📊 FINAL LEAD DATA CAPTURED:');
        console.log(JSON.stringify(leadData, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('🔍 NOW CHECK SUPABASE LEADS TABLE FOR:');
        console.log('\n  Session ID to search:', testSessionId);
        console.log('  OR use contact_phone: +27761234567');
        console.log('\n  ✓ Is lead record created?');
        console.log('  ✓ city field populated? (should be: "Johannesburg")');
        console.log('  ✓ caller_type field populated? (should be: "myself")');
        console.log('  ✓ UTM fields present? (utm_source, utm_medium, etc.)');
        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('❌ Error during flow:', error.message);
        throw error;
    }
}

testCompleteIntakeFlow();
