import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkLatestLead() {
    const { data: leads } = await supabase
        .from('leads')
        .select('id, contact_name, contact_phone, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (leads) {
        console.log('\n✅ Latest lead found:');
        console.log(`   Phone: ${leads.contact_phone}`);
        console.log(`   Name: ${leads.contact_name}`);
        console.log(`   Created: ${new Date(leads.created_at).toLocaleString()}`);
    } else {
        console.log('\n❌ No leads found');
    }
}

checkLatestLead();
