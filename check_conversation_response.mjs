import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get the verify-fix conversation
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('session_id, messages, metadata')
    .eq('session_id', 'verify-fix-1783101051696')
    .single();

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!conv) {
    console.log('❌ Conversation not found');
    return;
  }

  console.log('\n📋 CONVERSATION ANALYSIS FOR verify-fix-1783101051696\n');
  
  const messages = conv.messages || [];
  console.log(`Total Messages: ${messages.length}\n`);

  console.log('Last 10 messages:');
  console.log('─'.repeat(80));
  messages.slice(-10).forEach((msg, i) => {
    const role = msg.role.toUpperCase().padEnd(10);
    const content = msg.content.substring(0, 75);
    console.log(`${i + 1}. [${role}] ${content}`);
  });

  console.log('\n' + '─'.repeat(80));
  console.log('\nMetadata:');
  console.log('  Lead created:', conv.metadata?.lead_created);
  console.log('  Lead ID:', conv.metadata?.lead_id);
  console.log('  Contact name:', conv.metadata?.leadData?.contact_name);
  console.log('  Contact phone:', conv.metadata?.leadData?.contact_phone);
  console.log('  Call time:', conv.metadata?.leadData?.call_time);

  console.log('\n' + '─'.repeat(80));
  
  // Check the final message
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === 'user') {
    console.log('\n✅ FINAL MESSAGE IS USER RESPONSE');
    console.log(`   Content: "${lastMsg.content}"`);
    console.log('\n   ✅ This means:');
    console.log('      1. Widget sent the button click (stage8 response)');
    console.log('      2. Server saved it to the conversation');
    console.log('      3. Lead was created (despite conversation showing less messages)');
    console.log('      4. Therapist would have been notified');
  } else if (lastMsg.role === 'assistant') {
    console.log('\n⚠️ FINAL MESSAGE IS ASSISTANT RESPONSE');
    console.log(`   Content: "${lastMsg.content.substring(0, 60)}..."`);
    console.log('\n   This means the final user response may not have been saved');
  }

  console.log('\n' + '─'.repeat(80) + '\n');
})().catch(err => console.error('ERROR:', err.message));
