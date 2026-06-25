/**
 * End-to-End Test: Complete Intake Flow (CORRECTED)
 * Properly handles stages that must go through /api/chat (stage4b, wellness_intro)
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const API_URL = 'https://grace-bot-production.up.railway.app';
const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sessionId = `test_e2e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const testPhone = `+${Math.floor(Math.random() * 9000000000) + 1000000000}`;

console.log(`\n🚀 END-TO-END TEST: Complete Intake Flow (CORRECTED)\n`);
console.log(`📱 Session ID: ${sessionId}`);
console.log(`📞 Test Phone: ${testPhone}\n`);

let currentStageId = null;
let conversationMetadata = {};

async function callStageAPI(userInput, stageId) {
    const body = {
        sessionId,
        value: userInput,
        metadata: conversationMetadata
    };
    if (stageId) body.stageId = stageId;

    const res = await fetch(`${API_URL}/api/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    return await res.json();
}

async function callChatAPI(userInput, stageId) {
    const body = {
        sessionId,
        message: userInput,
        metadata: conversationMetadata
    };
    if (stageId) body.stageId = stageId;

    const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    return await res.json();
}

async function testCompleteFlow() {
    try {
        // Stage 1: Select Track (SUD)
        console.log('📍 Stage 1: Select Track (SUD)...');
        let response = await callStageAPI('sud', 'stage1b');
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 2: Caller Type (For myself)
        console.log('📍 Stage 2: Caller Type (For myself)...');
        response = await callStageAPI('myself', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 3: Struggle (Alcohol)
        console.log('📍 Stage 3: Struggle (Alcohol)...');
        response = await callStageAPI('Alcohol', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 4a: Previous Treatment
        console.log('📍 Stage 4a: Previous Treatment (No - first time)...');
        response = await callStageAPI('No — first time', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 4b: Health notes - MUST GO THROUGH /api/chat
        console.log('📍 Stage 4b: Health Notes (via /api/chat)...');
        response = await callChatAPI('No specific health issues', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 5: Medical Aid (Yes)
        console.log('📍 Stage 5: Medical Aid (Yes)...');
        response = await callStageAPI('Yes', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 5b: Which Medical Aid (Discovery Health)
        console.log('📍 Stage 5b: Which Medical Aid (Discovery Health)...');
        response = await callStageAPI('Discovery Health', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 5c: Medical Member Number - TEXT FIELD
        console.log('📍 Stage 5c: Medical Member Number (via /api/chat)...');
        response = await callChatAPI('MEM999888777', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage City: Which City - TEXT FIELD
        console.log('📍 Stage City: Which City (via /api/chat)...');
        response = await callChatAPI('Cape Town', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 6: When to start (Urgent)
        console.log('📍 Stage 6: When to Start (Urgent)...');
        response = await callStageAPI(true, currentStageId); // urgent = true
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Remaining stages via /api/chat
        console.log('📍 Additional Notes (via /api/chat)...');
        response = await callChatAPI('Excited to start the program!', currentStageId);
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        if (!response.ended) {
            console.log('📍 Contact Name (via /api/chat)...');
            response = await callChatAPI('Test User', currentStageId);
            currentStageId = response.next?.stageId;
            console.log(`   ✓ Next: ${currentStageId}`);
        }

        if (!response.ended && currentStageId) {
            console.log('📍 Contact Phone (via /api/chat)...');
            response = await callChatAPI(testPhone, currentStageId);
            currentStageId = response.next?.stageId;
            console.log(`   ✓ Next: ${currentStageId}`);
        }

        if (!response.ended && currentStageId) {
            console.log('📍 Best Time to Call (via /api/stage)...');
            response = await callStageAPI('morning', currentStageId); // Use button value, not label
            console.log(`   ✓ Ended: ${response.ended ? 'YES' : 'NO'}`);
        }

        console.log(`\n✅ Flow completed.`);
        console.log(`   Ended: ${response.ended}`);
        console.log(`   Lead ID: ${response.leadId || 'N/A'}`);

        // Wait for database to sync
        await new Promise(r => setTimeout(r, 3000));

        // Query Supabase for the lead
        console.log(`\n🔍 Checking Supabase for lead...\n`);

        // Search by phone
        let { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('contact_phone', testPhone)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!leads || leads.length === 0) {
            // Try by session ID
            ({ data: leads, error } = await supabase
                .from('leads')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false })
                .limit(1));
        }

        if (error || !leads || leads.length === 0) {
            console.log('⚠️  Lead not found in Supabase');
            return;
        }

        const lead = leads[0];
        console.log('📌 LEAD FOUND IN SUPABASE:');
        console.log(`\n   ID: ${lead.id}`);
        console.log(`   Phone: ${lead.contact_phone}`);
        console.log(`   Name: ${lead.contact_name}`);
        console.log(`   Track: ${lead.track || 'N/A'}`);
        console.log(`\n   ✓ city: ${lead.city ? `"${lead.city}"` : '❌ NULL'}`);
        console.log(`   ✓ caller_type: ${lead.caller_type ? `"${lead.caller_type}"` : '❌ NULL'}`);
        console.log(`   ✓ medical_aid_name: ${lead.medical_aid_name ? `"${lead.medical_aid_name}"` : 'NULL'}`);
        console.log(`   ✓ medical_member_number: ${lead.medical_member_number ? `"${lead.medical_member_number}"` : 'NULL'}`);

        // Summary
        console.log(`\n${'='.repeat(70)}`);
        if (lead.city && lead.caller_type && lead.medical_aid_name && lead.medical_member_number) {
            console.log('✅✅✅ SUCCESS! All fields saved correctly ✅✅✅');
            console.log('\n📊 COMPLETE DATA CAPTURED:');
            console.log(`   • City: ${lead.city}`);
            console.log(`   • Caller Type: ${lead.caller_type}`);
            console.log(`   • Medical Aid: ${lead.medical_aid_name}`);
            console.log(`   • Medical Member #: ${lead.medical_member_number}`);
        } else {
            console.log('❌ ISSUE: Missing expected fields');
            if (!lead.city) console.log('   - city is NULL');
            if (!lead.caller_type) console.log('   - caller_type is NULL');
            if (!lead.medical_aid_name) console.log('   - medical_aid_name is NULL');
            if (!lead.medical_member_number) console.log('   - medical_member_number is NULL');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testCompleteFlow();
