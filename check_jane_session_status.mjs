import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select('session_id, messages, metadata')
    .eq('session_id', 'web_1783018705441_tjqekvm')
    .single();

  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('Jane Conversation Summary:');
  console.log(`  Messages count: ${data.messages?.length || 0}`);
  console.log(`  Lead created: ${data.metadata?.lead_created}`);
  console.log(`  Lead ID: ${data.metadata?.lead_id}`);
  console.log(`  Contact name: ${data.metadata?.leadData?.contact_name}`);
  console.log(`  Contact phone: ${data.metadata?.leadData?.contact_phone}`);
  console.log(`  Contact email: ${data.metadata?.leadData?.contact_email}`);
  
  if (data.messages && data.messages.length > 0) {
    const lastMsg = data.messages[data.messages.length - 1];
    console.log(`\n  Last message:`);
    console.log(`    Role: ${lastMsg.role}`);
    console.log(`    Content: ${lastMsg.content.substring(0, 100)}`);
  }
})();
