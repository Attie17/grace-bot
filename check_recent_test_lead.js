import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTestLead() {
    console.log('🔍 Checking for test lead with phone +27761234567\n');
    
    try {
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('contact_phone', '+27761234567')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }

        if (!leads || leads.length === 0) {
            console.log('⚠️  No lead found with phone +27761234567');
            console.log('\n🧪 This means the test flow didn\'t actually create a lead in Supabase.');
            console.log('   The test is simulating the flow locally but not calling the server endpoints.');
            return;
        }

        const lead = leads[0];
        console.log('📌 Found Test Lead:');
        console.log(`   ID: ${lead.id}`);
        console.log(`   Phone: ${lead.contact_phone}`);
        console.log(`   Name: ${lead.contact_name}`);
        console.log(`   Created: ${lead.created_at}`);
        console.log(`   \n   ✓ city: ${lead.city ? `"${lead.city}"` : '❌ NULL'}`);
        console.log(`   ✓ caller_type: ${lead.caller_type ? `"${lead.caller_type}"` : '❌ NULL'}`);
        console.log(`   ✓ medical_aid_name: ${lead.medical_aid_name ? `"${lead.medical_aid_name}"` : 'NULL'}`);
        console.log(`   ✓ medical_member_number: ${lead.medical_member_number ? `"${lead.medical_member_number}"` : 'NULL'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkTestLead();
