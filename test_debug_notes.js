/**
 * Debug test - see full API responses
 */

import fetch from 'node-fetch';

const API_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `debug_${Date.now()}`;

async function test() {
    try {
        // Go through stages quickly to get to notes
        console.log('Going through stages...');
        
        let res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, value: 'sud', stageId: 'stage1b', metadata: {} })
        });
        let data = await res.json();
        
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, value: 'myself', stageId: 'stage_caller_type', metadata: {} })
        });
        data = await res.json();
        
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, value: 'Alcohol', stageId: 'stage3', metadata: {} })
        });
        data = await res.json();
        
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, value: 'No — first time', stageId: 'stage4a', metadata: {} })
        });
        data = await res.json();
        
        // stage4b through /api/chat
        res = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: 'None', stageId: 'stage4b' })
        });
        data = await res.json();
        
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, value: 'Yes', stageId: 'stage5', metadata: {} })
        });
        data = await res.json();
        
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, value: 'Discovery Health', stageId: 'stage5b', metadata: {} })
        });
        data = await res.json();
        
        // stage5c through /api/chat
        res = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: 'MEM123', stageId: 'stage5c' })
        });
        data = await res.json();
        
        // stage_city through /api/chat  
        res = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: 'Pretoria', stageId: 'stage_city' })
        });
        data = await res.json();
        
        res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, value: true, stageId: 'stage6', metadata: {} })
        });
        data = await res.json();
        
        console.log('\n✅ Reached stage6 → notes');
        console.log('Next stage ID:', data.next?.stageId);
        
        // NOW: Call notes through /api/chat
        console.log('\n📍 Calling /api/chat with notes stage...');
        res = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: 'Excited to start!', stageId: 'notes' })
        });
        data = await res.json();
        
        console.log('\n📋 Full Response from notes /api/chat call:');
        console.log(JSON.stringify(data, null, 2));
        
        if (!data.next) {
            console.log('\n❌ No next stage in response! This is the problem.');
        } else {
            console.log('\n✓ Next stage:', data.next.stageId);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
