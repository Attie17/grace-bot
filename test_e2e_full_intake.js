/**
 * End-to-End Test: Complete Intake Flow via API + Supabase Verification
 * This actually calls the server endpoints and creates real leads in Supabase
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

async function testCompleteFlow() {
    try {
        // Stage 1: Select Track (SUD)
        console.log('📍 Stage 1: Select Track...');
        let res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                userInput: '1', // SUD
                metadata: {}
            })
        });
        let data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 2: Caller Type (For myself)
        console.log('📍 Stage 2: Caller Type...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: '1', // For myself
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 3: Struggle (Alcohol)
        console.log('📍 Stage 3: Struggle...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: '1', // Alcohol
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 4a: Previous Treatment
        console.log('📍 Stage 4a: Previous Treatment...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: '1', // No - first time
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 4b: Health notes
        console.log('📍 Stage 4b: Health Notes...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: 'No specific health issues',
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 5: Medical Aid (Yes)
        console.log('📍 Stage 5: Medical Aid...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: '1', // Yes
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 5b: Which Medical Aid
        console.log('📍 Stage 5b: Which Medical Aid...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: '1', // Discovery Health
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 5c: Medical Member Number
        console.log('📍 Stage 5c: Medical Member Number...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: 'MEM999888777',
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage City: Which City
        console.log('📍 Stage City: Which City...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: 'Cape Town',
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Stage 6: When to start (Urgent)
        console.log('📍 Stage 6: When to Start...');
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stageId: data.nextStageId,
                userInput: '1', // Urgent
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Next: ${data.nextStageId || 'ERROR'}`);

        // Continue through remaining stages with /api/chat
        console.log('📍 Stage Notes: Additional Notes...');
        res = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                userInput: 'Excited to start the program!',
                metadata: data.metadata
            })
        });
        data = await res.json();
        console.log(`   ✓ Conversation ended: ${data.ended ? 'YES' : 'NO'}`);

        if (!data.ended) {
            console.log('   ✓ Continuing to final stages...');
            res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    userInput: 'Test User',
                    metadata: data.metadata
                })
            });
            data = await res.json();

            if (!data.ended) {
                res = await fetch(`${API_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        userInput: testPhone,
                        metadata: data.metadata
                    })
                });
                data = await res.json();

                if (!data.ended) {
                    res = await fetch(`${API_URL}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId,
                            userInput: '1', // Morning
                            metadata: data.metadata
                        })
                    });
                    data = await res.json();
                }
            }
        }

        console.log(`\n✅ Flow completed. Lead created: ${data.leadId ? 'YES' : 'NO'}`);
        if (data.leadId) console.log(`   Lead ID: ${data.leadId}`);

        // Wait a moment for database to sync
        await new Promise(r => setTimeout(r, 2000));

        // Query Supabase for the lead
        console.log(`\n🔍 Checking Supabase for lead...\n`);
        
        let query;
        if (data.leadId) {
            query = supabase.from('leads').select('*').eq('id', data.leadId).single();
        } else {
            // Search by session ID
            query = supabase.from('leads').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(1);
        }

        const { data: lead, error } = await query;

        if (error) {
            console.error('❌ Error querying Supabase:', error.message);
            return;
        }

        if (!lead) {
            console.log('⚠️  Lead not found in Supabase');
            return;
        }

        console.log('📌 LEAD FOUND IN SUPABASE:');
        console.log(`\n   ID: ${lead.id}`);
        console.log(`   Phone: ${lead.contact_phone}`);
        console.log(`   Name: ${lead.contact_name}`);
        console.log(`   Session: ${lead.session_id}`);
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
    }
}

testCompleteFlow();
