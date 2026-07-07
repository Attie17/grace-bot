import fetch from 'node-fetch';

const body = {
    sessionId: 'test-call-time-direct',
    stageId: 'stage8',
    value: 'any'
};

const response = await fetch('http://localhost:3002/api/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

const data = await response.json();
console.log('Response from /api/stage:');
console.log(JSON.stringify(data, null, 2));
