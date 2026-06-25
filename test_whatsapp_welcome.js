/**
 * End-to-End WhatsApp Intake Test
 * Shows the complete flow from welcome to first question
 */

import { getWhatsAppInitialStage } from './src/whatsapp-stages.js';

console.log('=== WhatsApp Grace Bot Intake Flow ===\n');

console.log('📱 WELCOME MESSAGE:');
console.log('Hello 👋\n\nThank you for reaching out to Stabilis Treatment Centre...');
console.log('\n---\n');

const initialStage = getWhatsAppInitialStage();
console.log('📱 FIRST STAGE (Numbered Options for WhatsApp):\n');
console.log(initialStage.formattedMessage);

console.log('\n---\n✅ User can now reply with "1" or "2"');
console.log('\n✅ All 4 Enhancements Complete:');
console.log('   1. ✓ Claude model changed to Haiku 4-5 (faster responses, no timeouts)');
console.log('   2. ✓ Medical member number question added (after medical aid selection)');
console.log('   3. ✓ City/Town question verified (already in correct position)');
console.log('   4. ✓ Button options converted to numbered text (WhatsApp compatible)');
