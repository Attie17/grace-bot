import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ojqkkqmccqnkvxlexsvt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConversations() {
  // Get the lead IDs we found
  const leadIds = [
    '01136535-5f5a-4bcd-9661-fdd6959b8a78',
    '27454b94-1fb4-438c-9cd0-500682ef281b',
    '582148e5-a041-4e07-8277-0e1749cd443f'
  ];

  for (const leadId of leadIds) {
    console.log(`\n\n=== CHECKING LEAD: ${leadId} ===`);
    
    // Query conversations table to find sessions linked to this lead
    const { data, error } = await supabase
      .from('conversations')
      .select('session_id, metadata, created_at')
      .like('metadata', `%${leadId}%`)
      .limit(5);

    if (error) {
      console.error('Query error:', error);
      continue;
    }

    if (data.length === 0) {
      console.log('No conversations found for this lead');
      continue;
    }

    for (const conv of data) {
      console.log(`\nSession: ${conv.session_id}`);
      try {
        const metadata = JSON.parse(conv.metadata || '{}');
        console.log(`Metadata:`, JSON.stringify(metadata, null, 2));
      } catch (e) {
        console.log('Could not parse metadata');
      }
    }
  }
}

checkConversations();
