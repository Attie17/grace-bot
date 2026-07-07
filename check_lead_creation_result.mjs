import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check if lead was created
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, contact_name, contact_phone, track, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (leadsError) {
    console.error('Error fetching leads:', leadsError.message);
    return;
  }

  console.log('\n✅ Last 3 leads in database:\n');
  leads.forEach((lead, idx) => {
    console.log(`${idx + 1}. ${lead.contact_name}`);
    console.log(`   Track: ${lead.track}`);
    console.log(`   Phone: ${lead.contact_phone}`);
    console.log(`   Created: ${lead.created_at}`);
    console.log();
  });

  // Check the most recent conversation
  const { data: convs, error: convError } = await supabase
    .from('conversations')
    .select('session_id, metadata->>lead_created, metadata->>lead_id, messages')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (convError) {
    console.error('Error fetching conversations:', convError.message);
    return;
  }

  if (convs.length > 0) {
    const conv = convs[0];
    const msgCount = conv.messages?.length || 0;
    console.log('Most recent conversation:');
    console.log(`  Session: ${conv.session_id}`);
    console.log(`  Messages: ${msgCount}`);
    console.log(`  Lead created: ${conv['metadata->>lead_created']}`);
    console.log(`  Lead ID: ${conv['metadata->>lead_id']}`);
  }
})().catch(err => console.error('ERROR:', err.message));
