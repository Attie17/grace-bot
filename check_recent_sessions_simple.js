import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select('session_id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('Most recent 5 sessions:');
  data.forEach(conv => {
    const date = new Date(conv.updated_at).toLocaleTimeString();
    console.log(`${date}: ${conv.session_id}`);
  });
})();
