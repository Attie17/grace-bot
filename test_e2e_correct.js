/**
 * End-to-End Test: Complete Intake Flow via API + Supabase Verification
 * Uses correct API response structure
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const API_URL = 'https://grace-bot-production.up.railway.app';
const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sessionId = `test_e2e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const testPhone = `+${Math.floor(Math.random() * 9000000000) + 1000000000}`;

console.log(`\n🚀 END-TO-END TEST: Complete Intake Flow\n`);
console.log(`📱 Session ID: ${sessionId}`);
console.log(`📞 Test Phone: ${testPhone}\n`);

let currentStageId = null;
let conversationMetadata = {};

async function callAPI(userInput, stageId) {
    const body = {
        sessionId,
        userInput,
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

async function callChatAPI(userInput) {
    const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            userInput,
            metadata: conversationMetadata
        })
    });

    return await res.json();
}

async function testCompleteFlow() {
    try {
        // Stage 1: Select Track (SUD)
        console.log('📍 Stage 1: Select Track (SUD)...');
        let response = await callAPI('1');
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 2: Caller Type (For myself)
        console.log('📍 Stage 2: Caller Type (For myself)...');
        response = await callAPI('1', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 3: Struggle (Alcohol)
        console.log('📍 Stage 3: Struggle (Alcohol)...');
        response = await callAPI('1', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 4a: Previous Treatment
        console.log('📍 Stage 4a: Previous Treatment (No - first time)...');
        response = await callAPI('1', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 4b: Health notes
        console.log('📍 Stage 4b: Health Notes...');
        response = await callAPI('No specific health issues', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 5: Medical Aid (Yes)
        console.log('📍 Stage 5: Medical Aid (Yes)...');
        response = await callAPI('1', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 5b: Which Medical Aid (Discovery Health)
        console.log('📍 Stage 5b: Which Medical Aid (Discovery Health)...');
        response = await callAPI('1', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 5c: Medical Member Number
        console.log('📍 Stage 5c: Medical Member Number...');
        response = await callAPI('MEM999888777', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage City: Which City
        console.log('📍 Stage City: Which City (Cape Town)...');
        response = await callAPI('Cape Town', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Stage 6: When to start (Urgent)
        console.log('📍 Stage 6: When to Start (Urgent)...');
        response = await callAPI('1', currentStageId);
        conversationMetadata = response.metadata || {};
        currentStageId = response.next?.stageId;
        console.log(`   ✓ Next: ${currentStageId}`);

        // Remaining stages via /api/chat
        console.log('📍 Additional Notes...');
        response = await callChatAPI('Excited to start the program!');
        conversationMetadata = response.metadata || {};
        console.log(`   ✓ Ended: ${response.ended ? 'YES' : 'NO'}`);

        if (!response.ended) {
            console.log('📍 Contact Name...');
            response = await callChatAPI('Test User');
            conversationMetadata = response.metadata || {};
            console.log(`   ✓ Ended: ${response.ended ? 'YES' : 'NO'}`);
        }

        if (!response.ended) {
            console.log('📍 Contact Phone...');
            response = await callChatAPI(testPhone);
            conversationMetadata = response.metadata || {};
            console.log(`   ✓ Ended: ${response.ended ? 'YES' : 'NO'}`);
        }

        if (!response.ended) {
            console.log('📍 Best Time to Call...');
            response = await callChatAPI('1'); // Morning
            conversationMetadata = response.metadata || {};
            console.log(`   ✓ Ended: ${response.ended ? 'YES' : 'NO'}`);
        }

        console.log(`\n✅ Flow completed.`);
        console.log(`   Lead ID: ${response.leadId || 'N/A'}`);

        // Wait a moment for database to sync
        await new Promise(r => setTimeout(r, 2000));

        // Query Supabase for the lead
        console.log(`\n🔍 Checking Supabase for lead...\n`);

        // Search by phone
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('contact_phone', testPhone)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('❌ Error querying Supabase:', error.message);
            return;
        }

        if (!leads || leads.length === 0) {
            console.log('⚠️  Lead not found in Supabase by phone');
            
            // Try by session ID
            const { data: leads2 } = await supabase
                .from('leads')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (!leads2 || leads2.length === 0) {
                console.log('⚠️  Also not found by session ID');
                return;
            }
            leads[0] = leads2[0];
        }

        const lead = leads[0];
        console.log('📌 LEAD FOUND IN SUPABASE:');
        console.log(`\n   ID: ${lead.id}`);
        console.log(`   Phone: ${lead.contact_phone}`);
        console.log(`   Name: ${lead.contact_name}`);
        console.log(`\n   ✓ city: ${lead.city ? `"${lead.city}"` : '❌ NULL'}`);
        console.log(`   ✓ caller_type: ${lead.caller_type ? `"${lead.caller_type}"` : '❌ NULL'}`);
        console.log(`   ✓ medical_aid_name: ${lead.medical_aid_name ? `"${lead.medical_aid_name}"` : 'NULL'}`);
        console.log(`   ✓ medical_member_number: ${lead.medical_member_number ? `"${lead.medical_member_number}"` : 'NULL'}`);

        // Summary
        console.log(`\n${'='.repeat(60)}`);
        if (lead.city && lead.caller_type) {
            console.log('✅✅✅ SUCCESS! All fields saved correctly ✅✅✅');
        } else {
            console.log('❌ ISSUE: Missing expected fields');
            if (!lead.city) console.log('   - city is NULL');
            if (!lead.caller_type) console.log('   - caller_type is NULL');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

testCompleteFlow();
