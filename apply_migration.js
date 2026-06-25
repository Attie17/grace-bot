import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
    console.log('📋 Applying migration: Add medical_aid_name and medical_member_number columns\n');

    try {
        const sql = `
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS medical_aid_name        TEXT,
    ADD COLUMN IF NOT EXISTS medical_member_number   TEXT;
        `;

        const { data, error } = await supabase.rpc('execute_raw_sql', { sql });

        if (error) {
            console.error('❌ Error:', error.message);
            
            // Try alternative approach using direct SQL execution
            console.log('\n🔄 Attempting alternative migration method...');
            // Supabase doesn't have a direct execute_sql method, so we'd need to use migrations panel
            // For now, let me suggest manual application
            console.log('Note: Please apply this SQL manually in Supabase:');
            console.log(sql);
        } else {
            console.log('✅ Migration applied successfully');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Alternative: Apply this SQL manually in Supabase SQL editor:');
        console.log(`
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS medical_aid_name        TEXT,
    ADD COLUMN IF NOT EXISTS medical_member_number   TEXT;
        `);
    }
}

applyMigration();
