import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log('🔍 Checking leads table schema...\n');

    try {
        // Get one lead to see what columns exist
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            console.error('Error:', error.message);
            return;
        }

        if (data) {
            console.log('Current columns in leads table:');
            Object.keys(data).forEach(key => {
                console.log(`  ✓ ${key}`);
            });

            console.log('\n📋 Required columns:');
            const required = ['medical_aid_name', 'medical_member_number', 'city', 'caller_type'];
            required.forEach(col => {
                const exists = col in data;
                console.log(`  ${exists ? '✅' : '❌'} ${col}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSchema();
