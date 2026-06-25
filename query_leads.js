import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ojqkkqmccqnkvxlexsvt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, contact_name, contact_phone, city, caller_type, track, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Query error:', error);
    process.exit(1);
  }

  console.log('\n=== LEADS TABLE QUERY RESULTS ===\n');
  console.log(`Total rows returned: ${data.length}\n`);
  
  if (data.length === 0) {
    console.log('No leads found in table.');
    process.exit(0);
  }

  data.forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`);
    console.log(`  ID: ${row.id}`);
    console.log(`  contact_name: ${row.contact_name || '(empty)'}`);
    console.log(`  contact_phone: ${row.contact_phone || '(empty)'}`);
    console.log(`  city: ${row.city || '(empty)'}`);
    console.log(`  caller_type: ${row.caller_type || '(empty)'}`);
    console.log(`  track: ${row.track || '(empty)'}`);
    console.log(`  status: ${row.status || '(empty)'}`);
    console.log(`  created_at: ${row.created_at}`);
    console.log();
  });
}

queryLeads();
