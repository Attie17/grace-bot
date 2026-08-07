/**
 * End-to-end test: send a real WhatsApp message via Meta Cloud API.
 *
 * Usage:
 *   node scripts/test-meta-whatsapp.mjs [recipient-number]
 *
 * recipient-number: international format, no +, e.g. 27721234567
 *   Defaults to META_TEST_NUMBER env var.
 *
 * Prerequisites:
 *   META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_ACCESS_TOKEN set in .env.local
 *
 * Run once after setting credentials to confirm messages actually arrive
 * before marking the migration complete.
 */

import '../src/load-env.js';
import { sendWhatsAppViaMeta } from '../src/whatsapp-meta.js';

const recipient = process.argv[2] || process.env.META_TEST_NUMBER;

if (!recipient) {
    console.error('Usage: node scripts/test-meta-whatsapp.mjs <phone-number>');
    console.error('  e.g. node scripts/test-meta-whatsapp.mjs 27721234567');
    console.error('  or:  META_TEST_NUMBER=27721234567 node scripts/test-meta-whatsapp.mjs');
    process.exit(1);
}

if (!process.env.META_WHATSAPP_ACCESS_TOKEN) {
    console.error('META_WHATSAPP_ACCESS_TOKEN is not set. Add it to .env.local and retry.');
    process.exit(1);
}

if (!process.env.META_WHATSAPP_PHONE_NUMBER_ID) {
    console.error('META_WHATSAPP_PHONE_NUMBER_ID is not set. Add it to .env.local and retry.');
    process.exit(1);
}

const message = [
    '✅ *Grace Bot — Meta WhatsApp test*',
    '',
    `Time: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`,
    'If you received this message, the Meta Cloud API integration is working correctly.',
    '',
    '_Stabilis Treatment Centre — Grace Bot_',
].join('\n');

console.log(`Sending test message to: ${recipient}`);

try {
    const result = await sendWhatsAppViaMeta(recipient, message);
    console.log('✅ Success!');
    console.log(`   Message ID: ${result?.messages?.[0]?.id}`);
    console.log('   Check that the message actually arrived on the device.');
    process.exit(0);
} catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
}
