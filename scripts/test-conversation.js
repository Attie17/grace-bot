/**
 * Test conversation script - run locally to validate bot behaviour.
 * Usage: node scripts/test-conversation.js
 */

import '../src/load-env.js';
import { chat, detectCrisis } from '../src/claude-client.js';

const scenarios = [
    { name: "Self-referral ambivalent", message: "I dont know if i really need help. i can stop whenever i want" },
    { name: "Family member distressed", message: "my husband is drinking himself to death and i dont know what to do" },
    { name: "Cost concern", message: "how much does this cost" },
    { name: "Crisis signal", message: "i cant do this anymore" }
];

async function runTests() {
    for (const scenario of scenarios) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`SCENARIO: ${scenario.name}`);
        console.log(`USER: ${scenario.message}`);
        console.log('='.repeat(60));
        const crisis = await detectCrisis(scenario.message);
        console.log(`Crisis check: ${JSON.stringify(crisis)}`);
        if (!crisis.crisis) {
            const response = await chat([], scenario.message);
            console.log(`\nBOT: ${response.text}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

runTests().catch(console.error);
