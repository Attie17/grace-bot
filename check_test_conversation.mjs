import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Find the most recent conversation with contact_name = Test
  const { data, error } = await supabase
    .from('conversations')
    .select('session_id, messages, metadata, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('Recent conversations:');
  data.forEach((conv, i) => {
    const leadData = conv.metadata?.leadData;
    const name = leadData?.contact_name;
    const leadCreated = conv.metadata?.lead_created;
    const msgCount = conv.messages?.length || 0;
    const time = new Date(conv.updated_at).toLocaleTimeString();
    console.log(`${i+1}. [${time}] ${name || '(unnamed)'} - ${msgCount} msgs - lead_created: ${leadCreated}`);
  });
  
  // Find Test conversation
  const testConv = data.find(c => c.metadata?.leadData?.contact_name === 'Test');
  if (testConv) {
    console.log(`\n✅ Found Test conversation`);
    console.log(`  Session: ${testConv.session_id}`);
    console.log(`  Messages: ${testConv.messages?.length}`);
    console.log(`  Last message: ${testConv.messages?.slice(-1)[0]?.content?.substring(0, 60)}`);
    console.log(`  Lead created: ${testConv.metadata?.lead_created}`);
    console.log(`  Lead ID: ${testConv.metadata?.lead_id}`);
  } else {
    console.log('\n❌ Test conversation not found in recent 10');
  }
})();
