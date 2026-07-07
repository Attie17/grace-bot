import fetch from 'node-fetch';

const sessionId = `test-debug-struggle-${Date.now()}`;

// Go through to the struggle stage
const steps = [
    { stageId: undefined, value: null, label: 'Init' },
    { stageId: 'stage_who_for', value: 'myself', label: 'who_for' },
    { stageId: 'stage_track', value: 'substance', label: 'track' }
];

for (const step of steps) {
    const res = await fetch('http://localhost:3002/api/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            sessionId, 
            ...(step.stageId && { stageId: step.stageId }), 
            ...(step.value !== null && { value: step.value })
        })
    });
    const data = await res.json();
    console.log(`${step.label}: got stage ${data.next?.stageId}`);
}

// Now try alcohol selection
console.log('\nTrying alcohol selection at stage4a...');
const res = await fetch('http://localhost:3002/api/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, stageId: 'stage4a', value: 'alcohol' })
});
const data = await res.json();
console.log('Full response:', JSON.stringify(data, null, 2));
