import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select('messages, metadata')
    .eq('session_id', 'web_1783018705441_tjqekvm')
    .single();

  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  const messages = data.messages || [];
  console.log('Last 15 messages in conversation:');
  messages.slice(-15).forEach((msg, i) => {
    const content = msg.content?.substring(0, 100) || '(empty)';
    console.log(`${i + 1}. [${msg.role}]: ${content}`);
  });
  
  console.log('\nMetadata:');
  console.log('  Lead Created:', data.metadata?.lead_created);
  console.log('  Lead ID:', data.metadata?.lead_id);
})();
