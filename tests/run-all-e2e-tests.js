/**
 * Master E2E Test Runner
 * Runs all 6 end-to-end tests and provides summary
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
    { name: 'Test 1: For myself + Substance Use', file: 'e2e-test-1-myself-substance.js' },
    { name: 'Test 2: For myself + Mental Health (Crisis)', file: 'e2e-test-2-myself-mental-health-crisis.js' },
    { name: 'Test 3: For someone else (child under 18)', file: 'e2e-test-3-child-minor.js' },
    { name: 'Test 4: For someone else (partner/family/friend)', file: 'e2e-test-4-third-party.js' },
    { name: 'Test 5: I am under 18', file: 'e2e-test-5-i-am-minor.js' },
    { name: 'Test 6: Professional referral', file: 'e2e-test-6-professional.js' }
];

function runTest(testFile) {
    return new Promise((resolve, reject) => {
        const testPath = join(__dirname, testFile);
        const child = spawn('node', [testPath], { shell: true });
        
        let output = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
            process.stdout.write(data);
        });
        
        child.stderr.on('data', (data) => {
            output += data.toString();
            process.stderr.write(data);
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, output });
            } else {
                resolve({ success: false, output, code });
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

async function runAllTests() {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('  STABILIS BOT - END-TO-END TEST SUITE (PROMPT F2)');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    const results = [];
    
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`\n[${i + 1}/${tests.length}] Running: ${test.name}`);
        console.log('─'.repeat(70));
        
        try {
            const result = await runTest(test.file);
            results.push({ ...test, ...result });
            
            // Add 3 second delay between tests to avoid rate limiting
            if (i < tests.length - 1) {
                console.log('\n⏱️  Waiting 3 seconds before next test (rate limit protection)...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error(`\n❌ Test failed with error: ${error.message}`);
            results.push({ ...test, success: false, error: error.message });
        }
        
        console.log('\n');
    }
    
    // Print summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    results.forEach((result, index) => {
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} Test ${index + 1}: ${result.name}`);
    });
    
    console.log('\n' + '─'.repeat(70));
    console.log(`Total: ${results.length} tests`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log('─'.repeat(70));
    
    if (passed === results.length) {
        console.log('\n🎉 ALL TESTS PASSED! Prompt F2 implementation validated.\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Review output above.\n');
        process.exit(1);
    }
}

runAllTests();
