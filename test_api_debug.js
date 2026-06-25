/**
 * Debug E2E Test - Check API responses
 */

import fetch from 'node-fetch';

const API_URL = 'https://grace-bot-production.up.railway.app';
const sessionId = `test_debug_${Date.now()}`;

console.log(`\n🚀 DEBUG: Testing API Responses\n`);

async function testAPI() {
    try {
        console.log('📍 Testing /api/stage endpoint...\n');
        
        const res = await fetch(`${API_URL}/api/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                userInput: '1',
                metadata: {}
            })
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));

        // Check if there's an error property
        if (data.error) {
            console.log(`\n❌ Error from API: ${data.error}`);
        }
        if (data.message) {
            console.log(`\n📝 Message: ${data.message}`);
        }
        if (!data.nextStageId) {
            console.log(`\n⚠️  No nextStageId in response`);
            console.log(`Available keys: ${Object.keys(data).join(', ')}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();
